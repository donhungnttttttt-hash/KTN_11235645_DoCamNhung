package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static vn.syp.tms.support.MockMvcContracts.csrf;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

/** HTTP boundary is retired; service-level fixtures and historical reads remain available. */
class FeatureLegacyRetirementIntegrationTest extends FeatureIntegrationTest {
    @Test void newProjectOnlyImportAndCycleWritesAreGoneWithoutCreatingLegacyData()throws Exception{
        mvc.perform(multipart(path("/import-previews")).file(new MockMultipartFile("file","old.xlsx","application/octet-stream",internal())).with(actor(pm)).with(csrf())).andExpect(status().isGone()).andExpect(jsonPath("$.code").value("FEATURE_REQUIRED"));
        mvc.perform(post(path("/test-cycles")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("code","OLD","name","Legacy cycle")))).andExpect(status().isGone());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_batches WHERE project_id=?",Long.class,p)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM test_cycles WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void oldRunFileworkRetestAndApprovalWritesAreRetiredBeforePayloadProcessing()throws Exception{
        for(String endpoint:List.of("/file-work-groups","/file-work-groups/1/sessions","/file-work-sessions/1/resume","/run-items/1/attempts","/test-cycles/1/scope","/work-items/1/retest-coverage","/work-items/1/retest-requests","/retest-requests/1/results","/work-items/1/closure","/test-documents/1/approvals","/test-cases/1/revisions/1/approve"))
            mvc.perform(post(path(endpoint)).with(actor(pm)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isGone());
        mvc.perform(put(path("/test-documents/1/rows/1/second-test")).with(actor(pm)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isGone());
    }
    @Test void oldRunReportRoutesRejectWorkerAndRedirectManagersToCurrentReporting()throws Exception{
        for(String endpoint:List.of("/reports/summary","/reports/export.xlsx")){
            mvc.perform(get(path(endpoint)).with(actor(a))).andExpect(status().isForbidden());
            mvc.perform(get(path(endpoint)).with(actor(pm))).andExpect(status().isGone());
            mvc.perform(get(path(endpoint)).with(actor(outside))).andExpect(status().isNotFound());
        }
    }
}
