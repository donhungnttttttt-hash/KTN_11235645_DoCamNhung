package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.syp.tms.identity.SystemAdminProvisioner.*;

@EnabledIfEnvironmentVariable(named="TMS_TEST_USERS_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+")
class SystemAdminProvisionNativeTest {
 JdbcTemplate db;SystemAdminProvisioner provision;final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(4);
 private static Flyway flyway(){
  String url=System.getenv("TMS_TEST_USERS_URL");if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Owned test schema required");
  return Flyway.configure().dataSource(url,System.getenv("TMS_TEST_USERS_USER"),System.getenv("TMS_TEST_USERS_PASSWORD")).cleanDisabled(false).load();
 }
 @BeforeEach void setup(){
  flyway().clean();flyway().migrate();
  var ds=new DriverManagerDataSource(Objects.requireNonNull(System.getenv("TMS_TEST_USERS_URL")),Objects.requireNonNull(System.getenv("TMS_TEST_USERS_USER")),Objects.requireNonNull(System.getenv("TMS_TEST_USERS_PASSWORD")));
  db=new JdbcTemplate(ds);provision=new SystemAdminProvisioner(db,encoder,new IdentityAudit(db),new DataSourceTransactionManager(ds));
 }
 @AfterAll static void leaveCore(){flyway().clean();flyway().migrate();}
 String account(String name,String role){String id=UUID.randomUUID().toString();db.update("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,enabled,can_create_users,lock_version,created_at) VALUES(?,?,?,?,?,TRUE,FALSE,0,UTC_TIMESTAMP(6))",id,name,name,encoder.encode("Fixture-before-only"),role);return id;}
 ProvisionRequest request(){
  String one=account("old.first","ADMIN"),two=account("old.second","ADMIN"),old=account("old.handover","ADMIN");
  return new ProvisionRequest(UUID.randomUUID().toString(),List.of(new Mapping(1,one,"old.first","admin","admin"),new Mapping(2,two,"old.second","admin2","admin2")),List.of(old),"Fixture-only-secret");
 }
 @Test void renamesInPlaceAndLocksHandoverWithoutChangingHistory(){
  var request=request();var before=db.queryForList("SELECT id,created_at FROM identity_users ORDER BY id");
  var preview=provision.preflight(request);assertThat(db.queryForObject("SELECT COUNT(*) FROM system_admin_registry",Long.class)).isZero();
  provision.apply(request,preview.fingerprint());
  assertThat(db.queryForList("SELECT id,created_at FROM identity_users ORDER BY id")).isEqualTo(before);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM system_admin_registry",Long.class)).isEqualTo(2);
  for(var mapping:request.mappings()){
   var user=db.queryForMap("SELECT * FROM identity_users WHERE id=?",mapping.sourceId());assertThat(user.get("username")).isEqualTo(mapping.username());
   assertThat(encoder.matches(request.password(),(String)user.get("password_hash"))).isTrue();assertThat(((Number)user.get("lock_version")).longValue()).isEqualTo(1);
  }
  assertThat(db.queryForObject("SELECT enabled FROM identity_users WHERE id=?",Boolean.class,request.lockIds().getFirst())).isFalse();
 }
 @Test void replayDoesNotResetPasswordAgain(){
  var request=request();var preview=provision.preflight(request);provision.apply(request,preview.fingerprint());
  var before=db.queryForList("SELECT * FROM identity_users ORDER BY id");
  assertThat(provision.apply(request,preview.fingerprint()).completed()).isTrue();
  assertThat(db.queryForList("SELECT * FROM identity_users ORDER BY id")).isEqualTo(before);
  assertThat(provision.preflight(request).fingerprint()).isEqualTo(preview.fingerprint());
 }
 @Test void conflictOrUnknownMappingAbortsWithoutPartialChanges(){
  var request=request();account("admin","USER");var before=db.queryForList("SELECT * FROM identity_users ORDER BY id");
  assertThatThrownBy(()->provision.preflight(request)).isInstanceOf(IllegalArgumentException.class);
  assertThat(db.queryForList("SELECT * FROM identity_users ORDER BY id")).isEqualTo(before);
  db.update("DELETE FROM identity_users WHERE username='admin'");account("unknown.admin","ADMIN");
  assertThatThrownBy(()->provision.preflight(request)).isInstanceOf(IllegalArgumentException.class);
 }
 @Test void staleFingerprintCannotOverwriteConcurrentAccountEdit(){
  var request=request();var preview=provision.preflight(request);
  db.update("UPDATE identity_users SET lock_version=lock_version+1 WHERE id=?",request.mappings().getFirst().sourceId());
  assertThatThrownBy(()->provision.apply(request,preview.fingerprint())).isInstanceOf(IllegalArgumentException.class);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM system_admin_registry",Long.class)).isZero();
 }
 @Test void concurrentProvisionKeepsOnlyTwoSlots() throws Exception {
  var request=request();var preview=provision.preflight(request);
  try(var pool=Executors.newFixedThreadPool(2)){
   var first=pool.submit(()->provision.apply(request,preview.fingerprint()));var second=pool.submit(()->provision.apply(request,preview.fingerprint()));
   first.get(20,TimeUnit.SECONDS);second.get(20,TimeUnit.SECONDS);
  }
  assertThat(db.queryForObject("SELECT COUNT(*) FROM system_admin_registry",Long.class)).isEqualTo(2);
  assertThat(db.queryForObject("SELECT MAX(lock_version) FROM identity_users",Long.class)).isEqualTo(1);
 }
 @Test void freshBootstrapRequiresTwoConfiguredAccountsAndNeverResetsExistingOnRestart(){
  assertThatThrownBy(()->provision.bootstrap("admin","admin","Fixture-only-secret","","admin2","Fixture-only-secret")).isInstanceOf(IllegalArgumentException.class);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM identity_users",Long.class)).isZero();
  assertThat(provision.bootstrap("admin","admin","Fixture-only-secret","admin2","admin2","Fixture-only-secret")).isTrue();
  var before=db.queryForList("SELECT * FROM identity_users ORDER BY id");
  assertThat(provision.bootstrap("admin","admin","Another-fixture-secret","admin2","admin2","Another-fixture-secret")).isFalse();
  assertThat(db.queryForList("SELECT * FROM identity_users ORDER BY id")).isEqualTo(before);
 }
}
