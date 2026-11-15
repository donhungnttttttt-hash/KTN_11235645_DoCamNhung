package vn.syp.tms.reporting;

import static org.assertj.core.api.Assertions.*;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class GuestDashboardMathTest {
 @Test void managementWeightIsCostOnly() {
  assertThat(GuestDashboardMath.dailyCost(4,1,true)).isEqualTo(4500);
  assertThat(GuestDashboardMath.dailyCost(4,1,true)*2).isEqualTo(9000);
  assertThat(GuestDashboardMath.dailyTarget(4,true)).isEqualTo(200);
  assertThat(GuestDashboardMath.dailyTarget(0,true)).isZero();
 }
 @Test void weekendsAndEmptyScopeAreNotHealthyEvidence() {
  assertThat(GuestDashboardMath.workingDay(LocalDate.of(2026,11,15))).isFalse();
  assertThat(GuestDashboardMath.dailyCost(4,1,false)).isZero();
  assertThat(GuestDashboardMath.progressRisk(0,0,0)).isEqualTo("INSUFFICIENT_DATA");
  assertThat(GuestDashboardMath.progressRisk(500,100,200)).isEqualTo("HIGH");
  assertThat(GuestDashboardMath.progressRisk(500,180,200)).isEqualTo("WATCH");
  assertThat(GuestDashboardMath.progressRisk(500,200,200)).isEqualTo("ON_TRACK");
 }
 @Test void changedScopeOrNoWorkersCannotBeAssessedAgainstAnOldTarget(){
  assertThat(GuestDashboardMath.progressRisk(10,10,100,100,2)).isEqualTo("INSUFFICIENT_DATA");
  assertThat(GuestDashboardMath.progressRisk(100,50,50,100,0)).isEqualTo("INSUFFICIENT_DATA");
 }
}
