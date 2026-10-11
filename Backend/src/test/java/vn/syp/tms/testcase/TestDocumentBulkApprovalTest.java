package vn.syp.tms.testcase;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.syp.tms.project.*;
import vn.syp.tms.execution.ExecutionService;
import vn.syp.tms.shared.web.BusinessException;

class TestDocumentBulkApprovalTest {
 final ProjectService projects=mock(ProjectService.class);
 final TestDocumentService documents=mock(TestDocumentService.class);
 final TestCaseService cases=mock(TestCaseService.class);
 final JdbcTemplate db=mock(JdbcTemplate.class);
 final TestDocumentEditingService service=new TestDocumentEditingService(db,projects,documents,cases,mock(ExecutionService.class),mock(ProjectAudit.class));
 TestDocumentDtos.Row row(long id,long revision,boolean archived){return new TestDocumentDtos.Row((int)id,String.valueOf(id),id+100,"C"+id,revision,false,archived,List.of(),List.of(),id,"UNEXECUTED",0,null,null);}
 void source(){when(documents.get(1L,"admin",10L)).thenReturn(new TestDocumentDtos.Detail(null,List.of(),List.of(row(1,11,false),row(2,22,false)),Map.of(),Map.of(),List.of()));}
 TestDocumentDtos.ApproveRows input(long second){return new TestDocumentDtos.ApproveRows(List.of(new TestDocumentDtos.RowRevision(1L,11L),new TestDocumentDtos.RowRevision(2L,second)));}
 @Test void approvesExactCurrentRevisionsAfterProjectAndPmGuards(){source();assertEquals(2,service.approveRows(1,"admin",10,input(22)));var order=inOrder(projects,documents,cases);order.verify(projects).lockWritableProject(1L,"admin");order.verify(projects).requireProjectPm(1L,"admin");order.verify(documents).get(1L,"admin",10L);order.verify(cases).approveRevision(1L,"admin",101L,11L);order.verify(cases).approveRevision(1L,"admin",102L,22L);}
 @Test void validatesWholeSelectionBeforeAnyApproval(){source();assertThrows(BusinessException.class,()->service.approveRows(1,"admin",10,input(23)));verifyNoInteractions(cases);}
 @Test void foreignRowCannotBeApproved(){source();assertThrows(BusinessException.class,()->service.approveRows(1,"admin",10,new TestDocumentDtos.ApproveRows(List.of(new TestDocumentDtos.RowRevision(3L,33L)))));verifyNoInteractions(cases);}
 @Test void duplicateRowsAreRejected(){source();assertThrows(BusinessException.class,()->service.approveRows(1,"admin",10,new TestDocumentDtos.ApproveRows(List.of(new TestDocumentDtos.RowRevision(1L,11L),new TestDocumentDtos.RowRevision(1L,11L)))));verifyNoInteractions(cases);}
 @Test void revokedAuthorityStopsBeforeDocumentRead(){doThrow(new BusinessException(403,"FORBIDDEN","Denied")).when(projects).requireProjectPm(1L,"tester");assertThrows(BusinessException.class,()->service.approveRows(1,"tester",10,input(22)));verifyNoInteractions(documents,cases);}
}
