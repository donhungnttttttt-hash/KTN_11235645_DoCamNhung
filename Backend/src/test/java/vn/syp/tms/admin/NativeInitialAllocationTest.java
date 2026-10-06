package vn.syp.tms.admin;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.shared.web.BusinessException;

/** Real transaction boundaries, never application schema. Removes only this test's UUID fixtures. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class NativeInitialAllocationTest {
 @DynamicPropertySource static void database(DynamicPropertyRegistry r){AdminNativeIntegrationTest.database(r);}
 @Autowired PlatformTransactionManager transactions;@Autowired JdbcTemplate jdbc;
 @Autowired IdentityUserRepository users;@Autowired AdminProjectService projects;@Autowired DeviceInventoryService inventory;
 @Test void failureOnSecondMachineRollsBackProjectMembershipsAuditAndFirstAllocation(){
  String tag=UUID.randomUUID().toString().substring(0,8);var admin=new IdentityUser("atomic.admin."+tag,"Admin","not-a-login","ADMIN");var pm=new IdentityUser("atomic.pm."+tag,"PM","not-a-login","PM");
  var tx=new TransactionTemplate(Objects.requireNonNull(transactions));long[] ids=new long[4];String failedCode="FAIL"+tag;
  try{
   tx.executeWithoutResult(status->{users.saveAndFlush(admin);users.saveAndFlush(pm);ids[0]=((Number)inventory.create(admin.getId(),asset("FREE"+tag)).get("id")).longValue();ids[1]=((Number)inventory.create(admin.getId(),asset("HELD"+tag)).get("id")).longValue();
    ids[2]=((Number)projects.create(admin.getId(),new AdminProjectService.Create(new ProjectDtos.CreateProject("BASE"+tag,"Base","","UTC"),List.of(new AdminProjectService.InitialMember(pm.getId(),"PM")))).get("id")).longValue();inventory.assign(admin.getId(),new DeviceInventoryDtos.Assign(ids[1],ids[2],pm.getId(),null,"",0L));});
   var initial=List.of(new DeviceInventoryDtos.Initial(ids[0],pm.getId(),null,"",0L),new DeviceInventoryDtos.Initial(ids[1],pm.getId(),null,"",1L));
   assertThatThrownBy(()->projects.create(admin.getId(),new AdminProjectService.Create(new ProjectDtos.CreateProject(failedCode,"Rollback","","UTC"),List.of(new AdminProjectService.InitialMember(pm.getId(),"PM")),initial))).isInstanceOf(BusinessException.class);
   assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE code=?",Long.class,failedCode)).isZero();
   assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM device_allocations WHERE asset_id=?",Long.class,ids[0])).isZero();
   assertThat(jdbc.queryForObject("SELECT lock_version FROM device_assets WHERE id=?",Long.class,ids[0])).isZero();
   assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,pm.getId())).isEqualTo(1);
   var success=projects.create(admin.getId(),new AdminProjectService.Create(new ProjectDtos.CreateProject("OK"+tag,"Success","","UTC"),List.of(new AdminProjectService.InitialMember(pm.getId(),"PM")),List.of(initial.getFirst())));ids[3]=((Number)success.get("id")).longValue();
   assertThat(inventory.allocations(admin.getId(),ids[3],ids[0],false,0,20).totalElements()).isEqualTo(1);
  }finally{
   tx.executeWithoutResult(status->{jdbc.update("DELETE FROM project_audit WHERE actor_id=?",admin.getId());jdbc.update("DELETE FROM device_allocations WHERE asset_id IN (?,?)",ids[0],ids[1]);jdbc.update("DELETE FROM device_assets WHERE id IN (?,?)",ids[0],ids[1]);jdbc.update("DELETE FROM project_memberships WHERE project_id IN (?,?)",ids[2],ids[3]);jdbc.update("DELETE FROM projects WHERE id IN (?,?)",ids[2],ids[3]);jdbc.update("DELETE FROM identity_users WHERE id IN (?,?)",admin.getId(),pm.getId());});
  }
 }
 private DeviceInventoryDtos.Asset asset(String code){return new DeviceInventoryDtos.Asset(code,"IPAD","iPad",null,"iOS","18","AVAILABLE","",null);}
}
