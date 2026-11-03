package vn.syp.tms.identity;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.project.ProjectDtos;
import vn.syp.tms.reporting.*;
import vn.syp.tms.workitem.*;

/** Explicit opt-in fixture in the guarded native test schema; never usable against main. */
@EnabledIfEnvironmentVariable(named="TMS_UNIFIED_BROWSER_MANIFEST",matches=".+")
class AccessBrowserFixtureTest extends UnifiedTestingFixtures {
 @Autowired ManagementReportService reports;
 @Autowired FeatureIssueService issues;
 @Test void prepareBrowserFixture()throws Exception{
  testingFixture();assignWorker();
  var pm=account("PM");pm.setCanCreateUsers(true);users.saveAndFlush(java.util.Objects.requireNonNull(pm));
  var guest=account("GUEST");
  long contact=projects.addOrUpdateMember(p,admin.getId(),pm.getId(),new ProjectDtos.SetMember("PM")).membershipId();
  projects.addOrUpdateMember(p,admin.getId(),guest.getId(),new ProjectDtos.SetMember("GUEST"));
  reports.create(p,admin.getId(),new ManagementReportDtos.Create(null,"Báo cáo kiểm tra giao diện","# Tiến độ thử nghiệm\n\nĐây là dữ liệu riêng để kiểm tra quyền Khách."));
  var issue=issues.create(p,admin.getId(),new FeatureIssueDtos.Create("BUG",f,d,row,false,"Issue kiểm tra User hợp nhất","Dữ liệu riêng","Thực hiện kiểm thử","Kết quả đúng","Cần sửa",UUID.randomUUID(),"","Luôn xảy ra","Test","Desktop",contact,null,null,null,null,null));
  long issueId=((Number)issue.get("id")).longValue();
  issues.update(p,admin.getId(),issueId,new FeatureIssueDtos.Update("Issue kiểm tra User hợp nhất","Dữ liệu riêng","Thực hiện kiểm thử","Kết quả đúng","Cần sửa",member,"MEDIUM","Giao User",0L));
  var output=Map.of("admin",admin.getUsername(),"user",worker.getUsername(),"pm",pm.getUsername(),"guest",guest.getUsername(),"password",PASSWORD,"project",p,"feature",f,"document",d,"row",row,"issue",issueId);
  Files.writeString(Path.of(Objects.requireNonNull(System.getenv("TMS_UNIFIED_BROWSER_MANIFEST"))),json.writeValueAsString(output));
 }
}
