package vn.syp.tms.project;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.shared.web.BusinessException;

class ProjectTimezoneTest {
    @Test void validatesTheSameZoneIdsUsedByReportsAndRejectsNullBlankOrTooLong() {
        for(String zone:new String[]{"UTC","Asia/Ho_Chi_Minh","Europe/Paris","+07:00"})
            assertThatCode(()->ProjectTimezone.validate(zone)).doesNotThrowAnyException();
        for(String zone:new String[]{null,""," ","Invalid/Timezone"," UTC","x".repeat(51)})
            assertThatThrownBy(()->ProjectTimezone.validate(zone)).isInstanceOfSatisfying(BusinessException.class,e->{
                assertThat(e.status()).isEqualTo(422);assertThat(e.code()).isEqualTo("INVALID_TIMEZONE");
            });
    }
}
