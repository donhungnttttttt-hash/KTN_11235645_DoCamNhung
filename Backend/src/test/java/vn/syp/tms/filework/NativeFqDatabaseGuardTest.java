package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.sql.DriverManager;
import java.util.*;
import org.junit.jupiter.api.Test;

class NativeFqDatabaseGuardTest {
    private Map<String,String> valid() {
        return new HashMap<>(Map.of("TMS_TEST_FQ_MODE","integration","TMS_TEST_DB_USER","fixture",
            "TMS_TEST_DB_PASSWORD","test-only","TMS_TEST_DB_URL","jdbc:mysql://127.0.0.1:3307/tms_docstest_012345abcdef?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED"));
    }
    @Test void rejectsUnsafeConfigurationBeforeOpeningAnyConnection() {
        var cases=new ArrayList<Map<String,String>>();
        String url=valid().get("TMS_TEST_DB_URL");
        for(String bad:List.of(url.replace("tms_docstest_012345abcdef","tms"),url.replace("127.0.0.1","remote.example"),
                url.replace(":3307/",":0/"),url.replace(":3307/",":65536/"),url+"&database=tms",url.replace("sslMode=DISABLED","sslMode=REQUIRED"))) {
            var env=valid();env.put("TMS_TEST_DB_URL",bad);cases.add(env);
        }
        for(String field:List.of("TMS_TEST_DB_URL","TMS_TEST_DB_USER","TMS_TEST_DB_PASSWORD","TMS_TEST_FQ_MODE")) {
            var absent=valid();absent.remove(field);cases.add(absent);
            var blank=valid();blank.put(field,"");cases.add(blank);
        }
        var wrong=valid();wrong.put("TMS_TEST_FQ_MODE","fresh-migration");cases.add(wrong);
        try(var driver=mockStatic(DriverManager.class)) {
            for(var env:cases)assertThatThrownBy(()->NativeFqDatabase.connect("integration",env)).isInstanceOf(IllegalStateException.class);
            driver.verifyNoInteractions();
        }
    }
    @Test void acceptsOnlyExactModeAndSafeUrlWithoutConnecting() {
        NativeFqDatabase.requireMode("integration",valid());
        var local=valid();local.put("TMS_TEST_DB_URL",local.get("TMS_TEST_DB_URL").replace("127.0.0.1","localhost"));
        NativeFqDatabase.requireMode("integration",local);
    }
}
