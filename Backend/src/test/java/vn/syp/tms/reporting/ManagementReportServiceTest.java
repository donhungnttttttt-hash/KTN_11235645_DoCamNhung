package vn.syp.tms.reporting;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.project.*;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.shared.web.BusinessException;

class ManagementReportServiceTest {
    final ProjectService projects=mock(ProjectService.class);
    final IdentityService identity=mock(IdentityService.class);
    final WorkItemStore db=mock(WorkItemStore.class);
    final ManagementReportService service=new ManagementReportService(db,projects,identity,mock(ProjectAudit.class));
    @Test void testerCannotReadManagementSummaryEvenWithProjectMembership() {
        when(identity.isAdmin("tester")).thenReturn(false);
        assertThatThrownBy(()->service.summary(1,"tester",null)).isInstanceOfSatisfying(BusinessException.class,error->assertThat(error.status()).isEqualTo(403));
    }
    @Test void fabricatedProjectIsDeniedBeforeAnyReportCanBeRead() {
        doThrow(new BusinessException(404,"NOT_FOUND","No grant")).when(projects).requireReadAccess(9L,"outside");
        assertThatThrownBy(()->service.get(9,"outside",1)).isInstanceOfSatisfying(BusinessException.class,error->assertThat(error.status()).isEqualTo(404));
    }
}
