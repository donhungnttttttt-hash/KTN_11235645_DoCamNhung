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
    @Test void historicalEvidenceHttpReadsReturnOriginalForMembersAndDenyGuestAndOutside()throws Exception{
        String key="AR09-"+UUID.randomUUID(),blob=UUID.randomUUID().toString();
        byte[] original="%PDF-1.7\nAR09 historical original bytes\n%%EOF".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        db.update("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,status_code,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,1,?,'BUG','Historical evidence','AR09 synthetic','closed',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,REPEAT('a',64))",p,key,member(pm),member(pm),key);
        long work=Objects.requireNonNull(db.queryForObject("SELECT id FROM work_items WHERE item_key=?",Long.class,key));
        String digest=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(original));
        db.update("INSERT INTO work_item_attachments(id,project_id,work_item_id,original_name,media_type,byte_size,sha256,uploaded_by,uploaded_at) VALUES(?,?,?,'historic.pdf','application/pdf',?,?,?,UTC_TIMESTAMP(6))",blob,p,work,original.length,digest,member(pm));
        var storage=java.nio.file.Path.of(System.getenv("TMS_ATTACHMENT_ROOT"));java.nio.file.Files.write(storage.resolve(blob),original,java.nio.file.StandardOpenOption.CREATE_NEW);
        var guest=user("ar09guest"+UUID.randomUUID().toString().substring(0,8),"GUEST");
        projects.addOrUpdateMember(p,admin.getId(),guest.getId(),new vn.syp.tms.project.ProjectDtos.SetMember("GUEST"));
        String route=path("/work-items/"+work+"/attachments/"+blob+"/content");
        for(var reader:List.of(pm,a))assertThat(mvc.perform(get(route).with(actor(reader))).andExpect(status().isOk()).andExpect(header().string("X-Content-Type-Options","nosniff")).andReturn().getResponse().getContentAsByteArray()).isEqualTo(original);
        mvc.perform(get(route).with(actor(guest))).andExpect(status().isForbidden());
        mvc.perform(get(route).with(actor(outside))).andExpect(status().isNotFound());
        // A distinct missing UUID retains metadata and fails explicitly, with no blob overwrite/removal.
        String missing=UUID.randomUUID().toString();db.update("INSERT INTO work_item_attachments(id,project_id,work_item_id,original_name,media_type,byte_size,sha256,uploaded_by,uploaded_at) VALUES(?,?,?,'missing.pdf','application/pdf',?,?,?,UTC_TIMESTAMP(6))",missing,p,work,original.length,digest,member(pm));
        mvc.perform(get(path("/work-items/"+work+"/attachments/"+missing+"/content")).with(actor(a))).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("STORAGE_UNAVAILABLE"));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM work_item_attachments WHERE id=?",Long.class,missing)).isEqualTo(1);
        assertThat(java.nio.file.Files.readAllBytes(storage.resolve(blob))).isEqualTo(original);
    }
    @Test void historicalEvidenceWritesRemainGoneWithoutMetadataOrBlobChanges()throws Exception{
        var before=projectRows();
        var root=java.nio.file.Path.of(System.getenv("TMS_ATTACHMENT_ROOT"));
        java.util.Map<String,String> blobs=new TreeMap<>();
        try(var files=java.nio.file.Files.list(root)){for(var file:files.toList())if(java.nio.file.Files.isRegularFile(file))blobs.put(file.getFileName().toString(),HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(java.nio.file.Files.readAllBytes(file))));}
        mvc.perform(multipart(path("/work-items/1/attachments")).file(new MockMultipartFile("file","legacy.pdf","application/pdf","%PDF-1.7\n%%EOF".getBytes())).with(actor(pm)).with(csrf())).andExpect(status().isGone());
        mvc.perform(delete(path("/work-items/1/attachments/90900000-0000-4000-8000-000000000001")).with(actor(pm)).with(csrf())).andExpect(status().isGone());
        assertThat(projectRows()).isEqualTo(before);
        java.util.Map<String,String> after=new TreeMap<>();
        try(var files=java.nio.file.Files.list(root)){for(var file:files.toList())if(java.nio.file.Files.isRegularFile(file))after.put(file.getFileName().toString(),HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(java.nio.file.Files.readAllBytes(file))));}
        assertThat(after).isEqualTo(blobs);
    }
    @Test void newProjectOnlyImportAndCycleWritesAreGoneWithoutCreatingLegacyData()throws Exception{
        mvc.perform(multipart(path("/import-previews")).file(new MockMultipartFile("file","old.xlsx","application/octet-stream",internal())).with(actor(pm)).with(csrf())).andExpect(status().isGone()).andExpect(jsonPath("$.code").value("FEATURE_REQUIRED"));
        mvc.perform(post(path("/test-cycles")).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("code","OLD","name","Legacy cycle")))).andExpect(status().isGone());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM import_batches WHERE project_id=?",Long.class,p)).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM test_cycles WHERE project_id=?",Long.class,p)).isZero();
    }
    @Test void oldRunFileworkRetestAndApprovalWritesAreRetiredBeforePayloadProcessing()throws Exception{
        var before=projectRows();
        for(String endpoint:List.of("/file-work-groups","/file-work-groups/1/sessions","/file-work-sessions/1/resume","/run-items/1/attempts","/test-cycles/1/scope","/work-items/1/retest-coverage","/work-items/1/retest-requests","/retest-requests/1/results","/work-items/1/closure","/test-documents/1/approvals","/test-cases/1/revisions/1/approve"))
            mvc.perform(post(path(endpoint)).with(actor(pm)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isGone());
        mvc.perform(put(path("/test-documents/1/rows/1/second-test")).with(actor(pm)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isGone());
        assertThat(projectRows()).isEqualTo(before);
    }
    @Test void legacyQaAndWorkItemMutationsRemainGoneWithoutDataOrAuditChanges()throws Exception{
        var before=projectRows();
        for(String endpoint:List.of("/qa","/qa/1/start","/qa/1/request-info","/qa/1/provide-info","/qa/1/answers","/qa/1/confirmations","/qa/1/close","/qa/1/reopen","/work-items","/work-items/1/transitions","/work-items/batch-transitions","/work-items/1/execution-links","/work-items/1/comments","/work-items/1/clarifications"))
            mvc.perform(post(path(endpoint)).with(actor(pm)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isGone()).andExpect(jsonPath("$.code").value("USE_FEATURE_ISSUES"));
        for(String endpoint:List.of("/qa/1/assignment","/work-items/1","/work-items/1/external-reference"))
            mvc.perform(put(path(endpoint)).with(actor(pm)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isGone());
        assertThat(projectRows()).isEqualTo(before);
    }
    /** Snapshot every project-scoped table, including versions, audit and legacy child records. */
    private Map<String,List<String>> projectRows(){
        var snapshot=new TreeMap<String,List<String>>();
        for(String table:db.queryForList("SELECT table_name FROM information_schema.columns WHERE table_schema=DATABASE() AND column_name='project_id' ORDER BY table_name",String.class)){
            assertThat(table).matches("[a-z0-9_]+");var rows=db.queryForList("SELECT * FROM `"+table+"` WHERE project_id=?",p).stream().map(Map::toString).sorted().toList();snapshot.put(table,rows);
        }
        return snapshot;
    }
    @Test void oldRunReportRoutesRejectWorkerAndRedirectManagersToCurrentReporting()throws Exception{
        for(String endpoint:List.of("/reports/summary","/reports/export.xlsx")){
            mvc.perform(get(path(endpoint)).with(actor(a))).andExpect(status().isForbidden());
            mvc.perform(get(path(endpoint)).with(actor(pm))).andExpect(status().isGone());
            mvc.perform(get(path(endpoint)).with(actor(outside))).andExpect(status().isNotFound());
        }
    }
}
