package vn.syp.tms.identity;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/** Only invoked by offline provisioning and explicitly configured fresh bootstrap. */
@Service
public class SystemAdminProvisioner {
    public record Mapping(int slot,String sourceId,String expectedUsername,String username,String displayName) {}
    public record ProvisionRequest(String operationId,List<Mapping> mappings,List<String> lockIds,String password) {
        @Override public String toString(){return "ProvisionRequest[REDACTED]";}
    }
    public record ProvisionPreview(String fingerprint,boolean completed) {}
    private final JdbcTemplate db;
    private final PasswordEncoder passwords;
    private final IdentityAudit audit;
    private final TransactionTemplate tx;
    public SystemAdminProvisioner(JdbcTemplate db,PasswordEncoder passwords,IdentityAudit audit,PlatformTransactionManager manager){this.db=db;this.passwords=passwords;this.audit=audit;this.tx=new TransactionTemplate(Objects.requireNonNull(manager));}
    public ProvisionPreview preflight(ProvisionRequest request){
        return Objects.requireNonNull(tx.execute(status->{lock(false);return inspect(request);}));
    }
    public ProvisionPreview apply(ProvisionRequest request,String expectedFingerprint){
        return Objects.requireNonNull(tx.execute(status->{
            lock(true);var preview=inspect(request);
            if(!preview.fingerprint().equals(expectedFingerprint))throw invalid("Provision snapshot changed; run preflight again.");
            if(preview.completed())return preview;
            for(var mapping:request.mappings()){
                db.update("UPDATE identity_users SET username=?,display_name=?,password_hash=?,enabled=TRUE,can_create_users=FALSE,lock_version=lock_version+1 WHERE id=?",
                    mapping.username(),mapping.displayName(),passwords.encode(request.password()),mapping.sourceId());
                expire(mapping.sourceId());audit.record(mapping.sourceId(),mapping.sourceId(),"SYSTEM_ADMIN_PROVISIONED",request.operationId());
            }
            String actor=request.mappings().stream().filter(m->m.slot()==1).findFirst().orElseThrow().sourceId();
            for(String id:request.lockIds()){
                db.update("UPDATE identity_users SET enabled=FALSE,can_create_users=FALSE,lock_version=lock_version+1 WHERE id=?",id);
                expire(id);audit.record(actor,id,"SYSTEM_ADMIN_DISABLED",request.operationId());
            }
            db.update("DELETE FROM system_admin_registry");
            for(var m:request.mappings())db.update("INSERT INTO system_admin_registry(slot,user_id) VALUES(?,?)",m.slot(),m.sourceId());
            db.update("INSERT INTO system_admin_provision_receipts(operation_id,fingerprint) VALUES(?,?)",request.operationId(),preview.fingerprint());
            return new ProvisionPreview(preview.fingerprint(),true);
        }));
    }
    private ProvisionPreview inspect(ProvisionRequest request){
        validate(request);
        var accounts=db.queryForList("SELECT id,username,display_name,role_code,enabled,lock_version FROM identity_users WHERE role_code='ADMIN' ORDER BY id FOR SHARE");
        Set<String> supplied=new HashSet<>(request.lockIds());request.mappings().forEach(m->supplied.add(m.sourceId()));
        if(!supplied.equals(new HashSet<>(accounts.stream().map(row->(String)row.get("id")).toList())))throw invalid("Explicit mapping required for every existing ADMIN UUID.");
        var slots=db.queryForList("SELECT slot,user_id FROM system_admin_registry ORDER BY slot FOR SHARE");
        var receipts=db.queryForList("SELECT fingerprint FROM system_admin_provision_receipts WHERE operation_id=? FOR SHARE",request.operationId());
        boolean completed=!receipts.isEmpty();
        for(var mapping:request.mappings()){
            var account=accounts.stream().filter(row->mapping.sourceId().equals(row.get("id"))).findFirst().orElseThrow(()->invalid("Source UUID not found."));
            if(!Objects.equals(account.get("username"),completed?mapping.username():mapping.expectedUsername()))throw invalid("Source ID no longer matches the approved mapping.");
            var collision=db.queryForList("SELECT id FROM identity_users WHERE username=? AND id<>? FOR SHARE",mapping.username(),mapping.sourceId());
            if(!collision.isEmpty())throw invalid("Target login ID is occupied.");
            if(completed&&(!Boolean.TRUE.equals(account.get("enabled"))||!mapping.displayName().equals(account.get("display_name"))||slots.stream().noneMatch(s->((Number)s.get("slot")).intValue()==mapping.slot()&&mapping.sourceId().equals(s.get("user_id")))))throw invalid("Completed provision differs from current registry; review manually.");
        }
        if(completed){
            if(slots.size()!=2||accounts.stream().anyMatch(a->request.lockIds().contains(a.get("id"))&&Boolean.TRUE.equals(a.get("enabled"))))throw invalid("Completed provision no longer matches locked accounts.");
            return new ProvisionPreview((String)receipts.getFirst().get("fingerprint"),true);
        }
        var metadata=List.of(request.operationId(),request.mappings().stream().sorted(Comparator.comparingInt(m->Objects.requireNonNull(m).slot())).toList(),request.lockIds().stream().sorted().toList(),accounts,slots);
        return new ProvisionPreview(digest(metadata.toString()),false);
    }
    private static void validate(ProvisionRequest request){
        if(request==null||request.operationId()==null||!request.operationId().matches("[a-fA-F0-9-]{36}"))throw invalid("A unique operation UUID is required.");
        if(request.mappings()==null||request.mappings().size()!=2||request.lockIds()==null)throw invalid("Exactly two mappings and an explicit lock list are required.");
        password(request.password(),8);
        var ids=new HashSet<String>();var slots=new HashSet<Integer>();var names=new HashSet<String>();
        for(var mapping:request.mappings()){
            if(mapping==null||mapping.sourceId()==null||!mapping.sourceId().matches("[a-fA-F0-9-]{36}")||!ids.add(mapping.sourceId())||!slots.add(mapping.slot())||!Set.of(1,2).contains(mapping.slot()))throw invalid("Distinct source UUIDs and slots 1/2 required.");
            name(mapping.expectedUsername());name(mapping.username());display(mapping.displayName());
            if(!names.add(mapping.username()))throw invalid("Distinct target login IDs required.");
        }
        for(String id:request.lockIds())if(id==null||!id.matches("[a-fA-F0-9-]{36}")||!ids.add(id))throw invalid("Invalid or duplicate lock UUID.");
    }
    public boolean bootstrap(String firstId,String firstName,String firstPassword,String secondId,String secondName,String secondPassword){
        name(firstId);name(secondId);display(firstName);display(secondName);password(firstPassword,12);password(secondPassword,12);
        if(firstId.equals(secondId))throw invalid("Two different bootstrap IDs required.");
        return Boolean.TRUE.equals(tx.execute(status->{
            lock(true);
            if(db.queryForObject("SELECT COUNT(*) FROM identity_users",Long.class)!=0){
                var current=db.queryForList("SELECT s.slot,u.username,u.role_code,u.enabled FROM system_admin_registry s JOIN identity_users u ON u.id=s.user_id ORDER BY s.slot FOR SHARE");
                if(current.size()!=2||!firstId.equals(current.get(0).get("username"))||!secondId.equals(current.get(1).get("username"))||current.stream().anyMatch(u->!Boolean.TRUE.equals(u.get("enabled"))||!"ADMIN".equals(u.get("role_code")))||db.queryForObject("SELECT COUNT(*) FROM identity_users u WHERE role_code='ADMIN' AND enabled=TRUE AND NOT EXISTS(SELECT 1 FROM system_admin_registry s WHERE s.user_id=u.id)",Long.class)!=0)
                    throw invalid("Existing accounts require explicit offline Admin provisioning.");
                return false;
            }
            createBootstrap(1,firstId,firstName,firstPassword);createBootstrap(2,secondId,secondName,secondPassword);return true;
        }));
    }
    private void createBootstrap(int slot,String username,String displayName,String password){
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,enabled,can_create_users,lock_version,created_at) VALUES(?,?,?,?,'ADMIN',TRUE,FALSE,0,UTC_TIMESTAMP(6))",id,username,displayName,passwords.encode(password));
        db.update("INSERT INTO system_admin_registry(slot,user_id) VALUES(?,?)",slot,id);audit.record(id,id,"ADMIN_BOOTSTRAPPED",null);
    }
    private void lock(boolean exclusive){db.queryForObject("SELECT id FROM application_info WHERE id=1 FOR "+(exclusive?"UPDATE":"SHARE"),Integer.class);}
    private void expire(String id){db.update("DELETE FROM SPRING_SESSION WHERE PRINCIPAL_NAME=?",id);}
    private static void name(String name){if(name==null||!name.matches("[a-z0-9][a-z0-9._-]{2,63}"))throw invalid("Use a normalized login ID of 3–64 characters.");}
    private static void display(String value){if(value==null||value.isBlank()||value.length()>100||!value.equals(value.strip()))throw invalid("Invalid display name.");}
    private static void password(String value,int min){if(value==null||value.length()<min||value.length()>128)throw invalid("Invalid private password length.");}
    private static String digest(String value){try{return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException impossible){throw new IllegalStateException(impossible);}}
    private static IllegalArgumentException invalid(String message){return new IllegalArgumentException(message);}
}
