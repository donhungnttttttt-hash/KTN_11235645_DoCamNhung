package vn.syp.tms.workitem;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.testcase.TestDocumentService;

class FeatureIssueServiceTest {
 final WorkItemStore db=mock(WorkItemStore.class);
 final IdentityService identity=mock(IdentityService.class);
 final FeatureIssueService service=new FeatureIssueService(db,identity,mock(ProjectAudit.class),mock(TestDocumentService.class),new com.fasterxml.jackson.databind.ObjectMapper());
 FeatureIssueDtos.Create input(String type,Long document,Long row,boolean monkey){return new FeatureIssueDtos.Create(type,3L,document,row,monkey,"Issue","Question","Steps","Expected","Actual",UUID.randomUUID());}
 @Test void rejectsRemovedTypesAndMonkeyQaBeforeWriting(){
  for(String type:List.of("TASK","REQUEST","IMPROVEMENT"))assertEquals("INVALID_ISSUE",assertThrows(BusinessException.class,()->service.create(1,"person",input(type,null,null,false))).code());
  assertEquals("INVALID_ISSUE",assertThrows(BusinessException.class,()->service.create(1,"person",input("QA",null,null,true))).code());
  verifyNoInteractions(db);
 }
 @Test void sourceDocumentAndRowMustBeACompletePair(){
  assertEquals("INVALID_CONTEXT",assertThrows(BusinessException.class,()->service.create(1,"person",input("BUG",2L,null,false))).code());
  assertEquals("INVALID_CONTEXT",assertThrows(BusinessException.class,()->service.create(1,"person",input("BUG",null,8L,false))).code());
  verifyNoInteractions(db);
 }
 @Test void developerCannotCreateAnIssueEvenWithValidProjectMembership(){
  var user=mock(IdentityUserRepository.CurrentAccount.class);when(user.getRole()).thenReturn("DEV");when(identity.lockCurrent("dev")).thenReturn(user);
  when(db.row(java.util.Objects.requireNonNull(contains("FROM projects")),any(Object[].class))).thenReturn(Map.of("id",1L,"code","AA"));
  when(db.rows(java.util.Objects.requireNonNull(contains("FROM project_memberships")),any(Object[].class))).thenReturn(List.of(Map.of("id",5L,"projectRole","DEV")));
  assertEquals("FORBIDDEN",assertThrows(BusinessException.class,()->service.create(1,"dev",input("BUG",null,null,true))).code());
  verify(db,never()).insert(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
 }
}
