package vn.syp.tms.reporting;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class FeatureProgressContractTest {
    @Test void pendingAndNaAreTestedAndNaStaysInTheTotal() {
        var rows=List.of(row("NOT_RUN",false),row("NOT_RUN",false),row("OK",false),row("P",false),row("NA",true));
        var metrics=ReportMetrics.calculate(rows);
        assertThat(metrics.get("total")).isEqualTo(5L);
        assertThat(metrics.get("executionPercent")).isEqualTo(60d);
        assertThat(metrics.get("applicable")).isEqualTo(5L);
        assertThat(metrics.get("notRun")).isEqualTo(2L);
    }
    @Test void emptyScopeHasZeroProgressAndNeverNanOrInfinity() {
        assertThat(ReportMetrics.calculate(List.of()).get("executionPercent")).isEqualTo(0d);
    }
    private Map<String,Object> row(String status,boolean na) { return Map.of("resultCode",status,"excluded",na); }
}
