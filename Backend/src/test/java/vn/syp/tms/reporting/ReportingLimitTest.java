package vn.syp.tms.reporting;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.workitem.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;

class ReportingLimitTest {
    @Test void overLimitIsRejectedBeforeWorkbookGenerationRatherThanTruncatingTotals() {
        var db=mock(WorkItemStore.class);var work=mock(WorkItemService.class);var book=mock(ReportWorkbook.class);var audit=mock(ProjectAudit.class);
        var service=new ReportingService(db,work,book,audit);
        when(db.row(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(Map.of("id",1L,"timezone","UTC"));
        when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(Collections.nCopies(ReportingService.MAX_EXPORT_RUNS+1,Map.of("id",1L)));
        assertThatThrownBy(()->service.export(1,"member",null,null)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("REPORT_LIMIT"));
        verifyNoInteractions(book,audit);
        when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(List.of(Map.of("total",ReportingService.MAX_RUNS+1L,"na",0L,"ok",0L,"ng",0L,"pending",0L)));
        assertThatThrownBy(()->service.summary(1,"member",null,null,0)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("REPORT_LIMIT"));
    }
}
