package vn.syp.tms.attachment;

import static vn.syp.tms.workitem.WorkItemStore.*;
import java.io.IOException;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.workitem.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.qa.QaService;

@Service @Transactional
public class EvidenceService {
    private static final Logger log=LoggerFactory.getLogger(EvidenceService.class);
    private final WorkItemStore db; private final WorkItemService work; private final ProjectAudit audit; private final QaService qa; private final Path root;
    public EvidenceService(WorkItemStore db,WorkItemService work,ProjectAudit audit,QaService qa,@Value("${TMS_ATTACHMENT_ROOT:./var/evidence}") String root) {
        this.db=db;this.work=work;this.audit=audit;this.qa=Objects.requireNonNull(qa);this.root=Path.of(root).toAbsolutePath().normalize();
    }
    // QA detail takes current locks; retain the class read/write transaction for these reads.
    public List<Map<String,Object>> list(long p,String actor,long workId) {
        work.get(p,actor,workId);
        return db.rows("SELECT id,original_name AS name,media_type AS mediaType,byte_size AS size,uploaded_at AS uploadedAt,uploaded_by AS uploadedBy FROM work_item_attachments WHERE project_id=? AND work_item_id=? ORDER BY uploaded_at,id",p,workId);
    }
    public Map<String,Object> upload(long p,String actor,long workId,MultipartFile file) {
        var writer=writer(p,actor,workId);
        if(file.getSize()>EvidenceContent.MAX_BYTES) fail(413,"FILE_TOO_LARGE","Chứng cứ tối đa 20 MiB mỗi tệp.");
        if(db.count("SELECT COUNT(*) FROM work_item_attachments WHERE project_id=? AND work_item_id=?",p,workId)>=100) fail(422,"ATTACHMENT_LIMIT","Tối đa 100 chứng cứ trên một công việc.");
        byte[] bytes;
        try(var input=file.getInputStream()) { bytes=input.readNBytes(EvidenceContent.MAX_BYTES+1); }
        catch(IOException e) { throw unavailable(); }
        String name=EvidenceContent.filename(file.getOriginalFilename()),media=EvidenceContent.identify(bytes,name);
        String digest=sha256(bytes);
        var duplicate=db.rows("SELECT id,original_name AS name,media_type AS mediaType,byte_size AS size FROM work_item_attachments WHERE project_id=? AND work_item_id=? AND uploaded_by=? AND sha256=? AND original_name=? FOR UPDATE",p,workId,writer.membershipId(),digest,name);
        if(!duplicate.isEmpty()) return duplicate.getFirst();
        String id=UUID.randomUUID().toString(); Path target=file(id);
        Path temporary=null;
        try {
            Files.createDirectories(root);
            if(Files.isSymbolicLink(root)) throw new IOException();
            temporary=Files.createTempFile(root,"upload-",".tmp"); Files.write(temporary,bytes);
            Files.move(temporary,target,StandardCopyOption.ATOMIC_MOVE);
        } catch(IOException e) { if(temporary!=null) remove(temporary); throw unavailable(); }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) { if(status!=STATUS_COMMITTED) remove(target); }
        });
        db.update("INSERT INTO work_item_attachments(id,project_id,work_item_id,original_name,media_type,byte_size,sha256,uploaded_by,uploaded_at) VALUES(?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",id,p,workId,name,media,bytes.length,digest,writer.membershipId());
        audit.record(p,actor,"WORK_ITEM",workId,"ATTACH_EVIDENCE");
        return Map.of("id",id,"name",name,"mediaType",media,"size",bytes.length);
    }
    public record Download(String name,String mediaType,byte[] bytes) {}
    public Download download(long p,String actor,long workId,String id) {
        work.get(p,actor,workId);
        var data=db.row("SELECT original_name,media_type FROM work_item_attachments WHERE project_id=? AND work_item_id=? AND id=?",p,workId,id);
        try { Path path=file(id); if(Files.isSymbolicLink(path) || Files.size(path)>EvidenceContent.MAX_BYTES) throw new IOException();
            return new Download((String)data.get("original_name"),(String)data.get("media_type"),Files.readAllBytes(path)); }
        catch(IOException e) { throw unavailable(); }
    }
    public void delete(long p,String actor,long workId,String id) {
        var writer=writer(p,actor,workId);
        var data=db.row("SELECT uploaded_by FROM work_item_attachments WHERE project_id=? AND work_item_id=? AND id=? FOR UPDATE",p,workId,id);
        if(!writer.pm() && number(data,"uploaded_by")!=writer.membershipId()) fail(403,"FORBIDDEN","Chỉ người tải lên hoặc PM được gỡ chứng cứ.");
        if(db.count("SELECT COUNT(*) FROM bug_verification_attempts WHERE project_id=? AND work_item_id=? AND evidence_attachment_id=?",p,workId,id)>0 || db.count("SELECT COUNT(*) FROM bug_closure_decisions WHERE project_id=? AND work_item_id=? AND evidence_attachment_id=?",p,workId,id)>0) fail(409,"EVIDENCE_IN_USE","Chứng cứ đã được dùng để xác minh hoặc đóng lỗi; cần giữ lại trong lịch sử.");
        Path target=file(id);
        db.update("DELETE FROM work_item_attachments WHERE project_id=? AND work_item_id=? AND id=?",p,workId,id);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { remove(target); }
        });
        audit.record(p,actor,"WORK_ITEM",workId,"REMOVE_EVIDENCE");
    }
    private record EvidenceWriter(long membershipId,boolean pm) {}
    private EvidenceWriter writer(long p,String actor,long workId) {
        // Lock current identity/project before routing establishes a REPEATABLE READ snapshot.
        // Locks stay in this outer command transaction, including replay and file callbacks.
        qa.authorize(p,actor,true);
        var type=db.row("SELECT w.item_type AS type FROM work_items w WHERE w.project_id=? AND w.id=?",p,workId);
        if("QA".equals(type.get("type"))) {
            var current=qa.authorizeWriter(p,actor,workId).actor();
            return new EvidenceWriter(current.membershipId(),current.pm());
        }
        var member=work.writable(p,actor);var item=work.get(p,actor,workId);
        if(WorkItemService.developer(member) && !WorkItemService.ownBug(member,item))fail(403,"FORBIDDEN","Dev chỉ bổ sung chứng cứ cho bug đang được giao.");
        return new EvidenceWriter(number(member,"id"),!WorkItemService.developer(member)&&"PM".equals(member.get("role")));
    }
    private Path file(String id) {
        try { if(!UUID.fromString(id).toString().equals(id)) throw new IllegalArgumentException(); }
        catch(IllegalArgumentException e) { fail(404,"NOT_FOUND","Không tìm thấy chứng cứ."); }
        Path file=root.resolve(id).normalize(); if(!file.startsWith(root)) fail(404,"NOT_FOUND","Không tìm thấy chứng cứ."); return file;
    }
    /** Startup reconciliation after a crash; fresh uploads and unknown files are left alone. */
    @Transactional(readOnly=true)
    public int reconcileOrphans() {
        if(!Files.isDirectory(root) || Files.isSymbolicLink(root)) return 0;
        int removed=0; var cutoff=java.time.Instant.now().minus(java.time.Duration.ofHours(24));
        try(var files=Files.list(root)) {
            for(Path path:files.toList()) {
                if(Files.isSymbolicLink(path) || !Files.isRegularFile(path) || !Files.getLastModifiedTime(path).toInstant().isBefore(cutoff)) continue;
                String name=path.getFileName().toString();
                if(name.startsWith("upload-") && name.endsWith(".tmp")) { Files.deleteIfExists(path);removed++;continue; }
                try { if(!UUID.fromString(name).toString().equals(name)) continue; } catch(IllegalArgumentException e) { continue; }
                if(db.count("SELECT COUNT(*) FROM work_item_attachments WHERE id=?",name)==0) { Files.deleteIfExists(path);removed++; }
            }
        } catch(IOException e) { log.warn("Evidence reconciliation incomplete; storage maintenance required"); }
        return removed;
    }
    private static String sha256(byte[] bytes) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); } catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); } }
    private static vn.syp.tms.shared.web.BusinessException unavailable() { return new vn.syp.tms.shared.web.BusinessException(503,"STORAGE_UNAVAILABLE","Kho chứng cứ chưa sẵn sàng. Nội dung của bạn chưa bị xóa; hãy thử lại."); }
    private void remove(Path path) { try { Files.deleteIfExists(path); } catch(IOException e) { log.warn("Evidence cleanup pending; storage maintenance required"); } }
}
