package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Opt-in empty native test schema only; never runs against the application database. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FRESH_MIGRATION",matches="true")
class NativeInventoryMigrationTest {
 @Test void upgradePreservesLogicalDeviceAndFreshSchemaEnforcesInventoryHistory() throws Exception {
  String url=System.getenv("TMS_TEST_DB_URL"),user=System.getenv("TMS_TEST_DB_USER"),password=System.getenv("TMS_TEST_DB_PASSWORD");
  if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+"))throw new IllegalArgumentException("Dedicated native test schema required");
  try(var c=DriverManager.getConnection(url,user,password);var sql=c.createStatement()){
   assertThat(count(sql,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")).as("Refuse any preexisting schema contents").isZero();
   var old=Flyway.configure().dataSource(url,user,password).target("14").cleanDisabled(true).load();assertThat(old.migrate().migrationsExecuted).isEqualTo(14);
   seed(sql);
   sql.executeUpdate("INSERT INTO devices(id,project_id,code,name,created_at,updated_at) VALUES(1,1,'WEB','Logical browser',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
   sql.executeUpdate("INSERT INTO environments(id,project_id,code,name,created_at,updated_at) VALUES(1,1,'QA','QA',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
   sql.executeUpdate("INSERT INTO builds(id,project_id,version_label,platform,created_at,updated_at) VALUES(1,1,'1','WEB',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
   sql.executeUpdate("INSERT INTO test_cycles(id,project_id,code,name,created_at,created_by) VALUES(1,1,'C1','Historical cycle',UTC_TIMESTAMP(6),1)");
   sql.executeUpdate("INSERT INTO cycle_configurations(id,project_id,cycle_id,environment_id,device_id,default_build_id,created_at) VALUES(1,1,1,1,1,1,UTC_TIMESTAMP(6))");
   var latest=Flyway.configure().dataSource(url,user,password).target("16").cleanDisabled(true).load();assertThat(latest.migrate().migrationsExecuted).isEqualTo(2);
   assertThat(count(sql,"SELECT COUNT(*) FROM cycle_configurations c JOIN devices d ON d.id=c.device_id WHERE d.name='Logical browser'")).isEqualTo(1);
   assertThat(count(sql,"SELECT COUNT(*) FROM device_assets")).isZero();latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();
   assertThat(count(sql,"SELECT COUNT(*) FROM project_status_reports")).isZero();
   // The initial emptiness guard establishes that only this invocation owns these tables.
   Flyway.configure().dataSource(url,user,password).cleanDisabled(false).load().clean();
   assertThat(latest.migrate().migrationsExecuted).isEqualTo(16);latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();seed(sql);
   sql.executeUpdate("INSERT INTO device_assets(id,asset_code,type,model,serial,created_at,created_by,updated_at,updated_by) VALUES(1,'IP-1','IPAD','iPad','SERIAL-1',UTC_TIMESTAMP(6),'actor',UTC_TIMESTAMP(6),'actor')");
   assertThatThrownBy(()->sql.executeUpdate("INSERT INTO device_assets(asset_code,type,model,created_at,created_by,updated_at,updated_by) VALUES('IP-1','IPAD','Other',UTC_TIMESTAMP(6),'actor',UTC_TIMESTAMP(6),'actor')")).isInstanceOf(SQLException.class);
   assertThatThrownBy(()->sql.executeUpdate("INSERT INTO device_assets(asset_code,type,model,serial,created_at,created_by,updated_at,updated_by) VALUES('IP-2','IPAD','Other','SERIAL-1',UTC_TIMESTAMP(6),'actor',UTC_TIMESTAMP(6),'actor')")).isInstanceOf(SQLException.class);
   String assign="INSERT INTO device_allocations(asset_id,project_id,recipient_membership_id,assigned_at,assigned_by) VALUES(1,1,1,UTC_TIMESTAMP(6),'actor')";
   var start=new CountDownLatch(1);
   try(var executor=Executors.newFixedThreadPool(2)){
    Callable<Boolean> request=()->{start.await();try(var connection=DriverManager.getConnection(url,user,password);var stmt=connection.createStatement()){stmt.executeUpdate(assign);return true;}catch(SQLIntegrityConstraintViolationException expected){return false;}};
    var a=executor.submit(request);var b=executor.submit(request);start.countDown();assertThat((a.get(10,TimeUnit.SECONDS)?1:0)+(b.get(10,TimeUnit.SECONDS)?1:0)).isEqualTo(1);
   }
   assertThatThrownBy(()->sql.executeUpdate("UPDATE device_allocations SET returned_at=UTC_TIMESTAMP(6)")).isInstanceOf(SQLException.class);
   sql.executeUpdate("UPDATE device_allocations SET returned_at=UTC_TIMESTAMP(6),returned_by='actor',returned_condition='AVAILABLE'");sql.executeUpdate(assign);
   assertThat(count(sql,"SELECT COUNT(*) FROM device_allocations")).isEqualTo(2);assertThat(count(sql,"SELECT COUNT(*) FROM device_allocations WHERE returned_at IS NULL")).isEqualTo(1);
   sql.executeUpdate("INSERT INTO project_status_reports(project_id,author_membership_id,summary,delay_reason,recovery_plan,request_key,payload_hash,created_at,created_by) VALUES(1,1,'Update','','','key',REPEAT('a',64),UTC_TIMESTAMP(6),'actor')");
   assertThatThrownBy(()->sql.executeUpdate("INSERT INTO project_status_reports(project_id,author_membership_id,summary,delay_reason,recovery_plan,request_key,payload_hash,created_at,created_by) VALUES(1,1,'Other','','','key',REPEAT('b',64),UTC_TIMESTAMP(6),'actor')")).isInstanceOf(SQLException.class);
   assertThat(count(sql,"SELECT COUNT(*) FROM project_status_reports")).isEqualTo(1);
   sql.executeUpdate("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(NULL,'actor','DEVICE_ASSET',1,'CREATE',UTC_TIMESTAMP(6))");
  }
 }
 private void seed(Statement sql)throws SQLException{
  sql.executeUpdate("INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES('actor','inventory.actor','Actor','not-a-login','ADMIN',UTC_TIMESTAMP(6))");
  sql.executeUpdate("INSERT INTO projects(id,code,name,created_at,created_by,updated_at,updated_by) VALUES(1,'INV','Inventory test',UTC_TIMESTAMP(6),'actor',UTC_TIMESTAMP(6),'actor')");
  sql.executeUpdate("INSERT INTO project_memberships(id,project_id,user_id,project_role,created_at,updated_at) VALUES(1,1,'actor','PM',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
 }
 private long count(Statement sql,String query)throws SQLException{try(var rows=sql.executeQuery(query)){assertThat(rows.next()).isTrue();return rows.getLong(1);}}
}
