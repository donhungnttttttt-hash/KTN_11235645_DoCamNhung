package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.project.ProjectDtos;

class UnifiedUserIssueNativeTest extends UnifiedTestingFixtures {
    @Autowired FeatureIssueService issues;
    private long contact;
    @BeforeEach void prepare()throws Exception{testingFixture();var pm=account("PM");contact=projects.addOrUpdateMember(p,admin.getId(),pm.getId(),new ProjectDtos.SetMember("PM")).membershipId();}
    private Map<String,Object> create(String actor,boolean monkey){return issues.create(p,actor,new FeatureIssueDtos.Create("BUG",f,monkey?null:d,monkey?null:row,monkey,"Bug","Description","Steps","Expected","Actual",UUID.randomUUID(),"","Always","Test","Desktop",contact,null,null,null,null,null));}
    private void assign(Map<String,Object> item){issues.update(p,admin.getId(),((Number)item.get("id")).longValue(),new FeatureIssueDtos.Update("Bug","Description","Steps","Expected","Actual",member,"MEDIUM","Assigned",((Number)item.get("version")).longValue()));}
    @SuppressWarnings("unchecked") private Set<String> statuses(Map<String,Object> item){var out=new HashSet<String>();for(var value:(List<Map<String,Object>>)item.get("allowedStatuses"))out.add(value.get("id").toString());return out;}
    @Test void creatorAndAssigneeGetsUnionOfTransitions(){
        var own=create(worker.getId(),true);long id=((Number)own.get("id")).longValue();
        assertThat(statuses(own)).isEmpty();assign(own);
        var both=issues.get(p,worker.getId(),id);assertThat(statuses(both)).containsExactly("progress");
        issues.transition(p,worker.getId(),id,new FeatureIssueDtos.Status("progress","Started",1L));
        issues.transition(p,worker.getId(),id,new FeatureIssueDtos.Status("resolved","Processed",2L));
        assertThat(statuses(issues.get(p,worker.getId(),id))).containsExactlyInAnyOrder("open","closed");
        assertThat(issues.transition(p,worker.getId(),id,new FeatureIssueDtos.Status("closed","Validated by creator",3L))).containsEntry("status","closed");
    }
    @Test void assignedOnlyKeepsDeveloperLimitsAndResolveDoesNotPassCase(){
        var created=create(admin.getId(),false);assign(created);long id=((Number)created.get("id")).longValue();
        assertThat(statuses(issues.get(p,worker.getId(),id))).containsExactly("progress");
        assertThatThrownBy(()->issues.transition(p,worker.getId(),id,new FeatureIssueDtos.Status("closed","Not permitted",1L))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
        issues.transition(p,worker.getId(),id,new FeatureIssueDtos.Status("progress","Started",1L));
        issues.transition(p,worker.getId(),id,new FeatureIssueDtos.Status("resolved","Fixed",2L));
        assertThat(documents.get(p,worker.getId(),d).rows().getFirst().resultStatus()).isEqualTo("UNEXECUTED");
        var unrelated=account("USER");projects.addOrUpdateMember(p,admin.getId(),unrelated.getId(),new ProjectDtos.SetMember("USER"));
        assertThat(statuses(issues.get(p,unrelated.getId(),id))).isEmpty();
    }
    @Test void userCanCreateQaAndBugFromCase(){
        assertThat(create(worker.getId(),false)).containsEntry("type","BUG").containsEntry("featureEnvironment","Current server");
        assertThat(issues.create(p,worker.getId(),new FeatureIssueDtos.Create("QA",f,d,row,false,"QA","Question","Steps","Expected","Actual",UUID.randomUUID(),null,null,null,null,contact,null,null,null,null,null))).containsEntry("type","QA").containsEntry("ticketState","SPEC_CONFIRM");
    }
}
