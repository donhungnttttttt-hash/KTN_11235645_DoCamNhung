package vn.syp.tms.feature;

import static org.assertj.core.api.Assertions.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.testcase.TestDocumentDtos;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.project.ProjectDtos;

class UnifiedUserTestingNativeTest extends UnifiedTestingFixtures {
    @BeforeEach void prepare()throws Exception{testingFixture();}
    @Test void userExecutesAssignedCaseAndVersionDateUpdateOnlyTargetCase(){
        assignWorker();long version=((Number)features.createTestVersion(p,admin.getId(),f,new FeatureDtos.CreateTestVersion("iPad 1.0",UUID.randomUUID())).get("id")).longValue();
        var command=new TestDocumentDtos.UpdateResult("NG",0L,UUID.randomUUID().toString(),version,LocalDate.of(2026,11,2));
        var result=features.updateResult(p,worker.getId(),d,row,command);
        assertThat(result.status()).isEqualTo("NG");assertThat(result.testVersionName()).isEqualTo("iPad 1.0");assertThat(result.executedOn()).isEqualTo(LocalDate.of(2026,11,2));
        assertThat(documents.get(p,worker.getId(),d).rows().get(1).resultStatus()).isEqualTo("UNEXECUTED");
        assertThat(documents.resultHistory(p,worker.getId(),d,row,0)).hasSize(1);
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",member);
        assertThatThrownBy(()->features.updateResult(p,worker.getId(),d,row,command)).isInstanceOf(BusinessException.class);
    }
    @Test void userCannotManageFeatureOrWriteUnassignedCase(){
        assertThatThrownBy(()->features.createTestVersion(p,worker.getId(),f,new FeatureDtos.CreateTestVersion("No",UUID.randomUUID()))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
        assertThatThrownBy(()->features.updateResult(p,worker.getId(),d,row,new TestDocumentDtos.UpdateResult("OK",0L,UUID.randomUUID().toString()))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
    }
    @Test void guestAndDisabledUserNotAssignable(){
        var guest=account("GUEST");long guestMember=projects.addOrUpdateMember(p,admin.getId(),guest.getId(),new ProjectDtos.SetMember("GUEST")).membershipId();
        assertThatThrownBy(()->features.assign(p,admin.getId(),d,new FeatureDtos.Assignments(documentVersion(),UUID.randomUUID(),List.of(new FeatureDtos.Scope(guestMember,List.of(row)))))).isInstanceOf(BusinessException.class);
        worker.setEnabled(false);users.saveAndFlush(Objects.requireNonNull(worker));
        assertThatThrownBy(this::assignWorker).isInstanceOf(BusinessException.class);
    }
}
