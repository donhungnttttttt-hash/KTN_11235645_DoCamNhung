package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;

/** Only an explicitly provisioned isolated native schema; rollback every fixture. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_DB_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+")
class AdminNativeIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url=System.getenv("TMS_TEST_DB_URL");
        if(url==null || !url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_docstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Dedicated native schema required");
        r.add("TMS_DB_URL",()->url);r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_DB_USER"));r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_DB_PASSWORD"));
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
        r.add("TMS_CHATGPT_LOCAL_ENABLED",()->"false");r.add("TMS_OLLAMA_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"false");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
    }
    @Autowired MockMvc mvc;@Autowired IdentityUserRepository users;@Autowired ProjectService projects;@Autowired AdminOverviewService service;@Autowired JdbcTemplate jdbc;
    IdentityUser admin,owner,tester;long first,second;
    @BeforeEach void fixture() {
        String tag=UUID.randomUUID().toString().substring(0,8);
        admin=users.saveAndFlush(new IdentityUser("a1.admin."+tag,"Admin","SECRET","ADMIN"));
        owner=users.saveAndFlush(new IdentityUser("a1.owner."+tag,"Owner","SECRET","ADMIN"));
        tester=users.saveAndFlush(new IdentityUser("a1.tester."+tag,"Tester","SECRET","TESTER"));
        first=projects.create(owner.getId(),new ProjectDtos.CreateProject("A1A"+tag,"First","","Asia/Ho_Chi_Minh")).id();
        second=projects.create(owner.getId(),new ProjectDtos.CreateProject("A1B"+tag,"Second","","Asia/Ho_Chi_Minh")).id();
        projects.addOrUpdateMember(first,owner.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
        projects.addOrUpdateMember(second,owner.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"));
    }
    @org.springframework.lang.NonNull RequestPostProcessor actor(IdentityUser u) {return java.util.Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole())))));}
    @Test void outsiderAdminReadsBothProjectsAndPublicDtoHasNoSecrets() throws Exception {
        String response=mvc.perform(get("/api/v1/admin/projects").param("keyword","A1").with(actor(admin))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(response).contains("First","Second").doesNotContain("SECRET","password","session","token");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,admin.getId())).isZero();
        mvc.perform(get("/api/v1/admin/projects/"+first).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.executionPercent").value(0.0));
        mvc.perform(get("/api/v1/admin/projects/9223372036854775807").with(actor(admin))).andExpect(status().isNotFound());
    }
    @Test void distinctUsersAndScopeAndNoRunDenominator() {
        var selected=service.overview(admin.getId(),first);
        assertThat(selected.totalUsers()).isEqualTo(2);assertThat(selected.enabledUsers()).isEqualTo(2);
        assertThat(selected.totalProjects()).isEqualTo(1);assertThat(selected.metrics()).containsEntry("applicable",0L).containsEntry("executionPercent",0.0);
        var all=service.overview(admin.getId(),null);
        assertThat(all.totalProjects()).isGreaterThanOrEqualTo(2);
        assertThat(all.totalUsers()).isEqualTo(jdbc.queryForObject("SELECT COUNT(*) FROM identity_users",Long.class));
    }
    @Test void projectSearchAcceptsVietnameseNamesAndTreatsWildcardCharactersLiterally() throws Exception {
        jdbc.update("UPDATE projects SET name=? WHERE id=?","Dự án kiểm thử tiếng Việt 100%_",first);
        for(String keyword:List.of("kiểm thử tiếng Việt","%","_")) {
            mvc.perform(get("/api/v1/admin/projects").param("projectId",Long.toString(first)).param("keyword",keyword).with(actor(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].id").value(first));
        }
        for(String keyword:List.of("không tồn tại","%","_")) {
            mvc.perform(get("/api/v1/admin/projects").param("projectId",Long.toString(second)).param("keyword",keyword).with(actor(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        }
    }
    @Test void anonymousTesterAndRevokedAdminDenied() throws Exception {
        mvc.perform(get("/api/v1/admin/overview")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/overview").with(actor(tester))).andExpect(status().isForbidden());
        var stale=actor(admin);jdbc.update("UPDATE identity_users SET role_code='PM' WHERE id=?",admin.getId());users.flush();
        // Clear first-level persistence cache so the current account read reflects DB role.
        entityManager.clear();
        mvc.perform(get("/api/v1/admin/overview").with(stale)).andExpect(status().isForbidden());
    }
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
    private @org.springframework.lang.NonNull String encode(Object value) throws com.fasterxml.jackson.core.JsonProcessingException {
        return Objects.requireNonNull(json.writeValueAsString(value));
    }
    @Test void adminHttpKpisCountCurrentActiveFeatureCasesAndOnlyVisibleNewBugContexts() throws Exception {
        long f=feature("Current metrics"),archived=feature("Archived metrics");byte[] workbook=fiveCases();
        long d=imported(f,workbook),hidden=imported(f,workbook),oldFeatureDocument=imported(archived,workbook);
        var rows=readDocument(d).get("rows");
        for(int index=2;index<5;index++)mvc.perform(put("/api/v1/projects/"+first+"/test-documents/"+d+"/rows/"+rows.get(index).get("rowId").asLong()+"/result")
            .with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(encode(Map.of("status",List.of("OK","P","NA").get(index-2),"expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        long open=bug(f,null,null,"open"),resolved=bug(f,null,null,"resolved");bug(f,null,null,"closed");
        long deleted=bug(f,null,null,"open");mvc.perform(delete("/api/v1/projects/"+first+"/issues/"+deleted).param("expectedVersion","0").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf()))).andExpect(status().isNoContent());
        bug(f,hidden,readDocument(hidden).at("/rows/0/rowId").asLong(),"resolved");bug(archived,null,null,"resolved");
        mvc.perform(post("/api/v1/projects/"+first+"/features/"+f+"/documents/"+hidden+"/archive").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(encode(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        mvc.perform(post("/api/v1/projects/"+first+"/features/"+archived+"/archive").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(encode(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID())))).andExpect(status().isOk());
        long ownerMember=java.util.Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,first,owner.getId()));
        for(int number=900;number<902;number++)jdbc.update("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,status_code,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,?,?,'BUG','Legacy no Feature','Historical only',?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,REPEAT('a',64))",first,number,"LEGACY-"+UUID.randomUUID(),number==900?"open":"resolved",ownerMember,ownerMember,UUID.randomUUID().toString());
        mvc.perform(get("/api/v1/admin/overview").param("projectId",String.valueOf(first)).with(actor(admin))).andExpect(status().isOk())
            .andExpect(jsonPath("$.metrics.total").value(5)).andExpect(jsonPath("$.metrics.tested").value(3)).andExpect(jsonPath("$.metrics.executionPercent").value(60.0))
            .andExpect(jsonPath("$.openBugs").value(2)).andExpect(jsonPath("$.awaitingVerification").value(1));
        mvc.perform(get("/api/v1/admin/projects/"+first).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.metrics.executionPercent").value(60.0))
            .andExpect(jsonPath("$.verificationBugs.length()").value(1)).andExpect(jsonPath("$.verificationBugs[0].id").value(resolved));
        assertThat(open).isNotEqualTo(resolved);assertThat(oldFeatureDocument).isNotEqualTo(d);
    }
    private long feature(String name)throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/projects/"+first+"/features").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(encode(Map.of("name",name,"environment","test","description","","requestKey",UUID.randomUUID())))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsByteArray()).get("id").asLong();
    }
    private byte[] fiveCases()throws Exception {
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook();var output=new java.io.ByteArrayOutputStream()){
            var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);for(int c=0;c<11;c++)header.createCell(c).setCellValue(vn.syp.tms.testcase.TestCaseWorkbook.HEADERS.get(c));
            for(int n=1;n<=5;n++){var row=sheet.createRow(n);var values=List.of(""+n,"ADMIN-SUITE","Case "+n,"","Steps","Expected","","","","","");for(int c=0;c<11;c++)row.createCell(c).setCellValue(values.get(c));}book.write(output);return output.toByteArray();
        }
    }
    private long imported(long f,byte[] bytes)throws Exception {
        long id=json.readTree(mvc.perform(multipart("/api/v1/projects/"+first+"/features/"+f+"/import-previews").file(new org.springframework.mock.web.MockMultipartFile("file","metrics.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).with(actor(admin)).with(java.util.Objects.requireNonNull(csrf()))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray()).get("id").asLong();
        mvc.perform(post("/api/v1/projects/"+first+"/features/"+f+"/import-previews/"+id+"/commit").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf()))).andExpect(status().isOk());return id;
    }
    private com.fasterxml.jackson.databind.JsonNode readDocument(long document)throws Exception{return json.readTree(mvc.perform(get("/api/v1/projects/"+first+"/test-documents/"+document).with(actor(admin))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());}
    private long bug(long f,Long document,Long row,String state)throws Exception {
        var input=new LinkedHashMap<String,Object>();input.put("featureId",f);input.put("documentId",document);input.put("rowId",row);input.put("type","BUG");input.put("monkey",document==null);input.put("title","Current Feature Bug");input.put("description","Metrics fixture");input.put("steps","Steps");input.put("expectedResult","Expected");input.put("actualResult","Actual");input.put("requestKey",UUID.randomUUID());
        long id=json.readTree(mvc.perform(post("/api/v1/projects/"+first+"/issues").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(encode(input))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsByteArray()).get("id").asLong();
        if(!state.equals("open"))mvc.perform(put("/api/v1/projects/"+first+"/issues/"+id+"/status").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(encode(Map.of("status",state,"reason","Manual metrics fixture","expectedVersion",0)))).andExpect(status().isOk());return id;
    }
    @Autowired AdminProjectService management;
    @Autowired DeviceInventoryService inventory;
    @Autowired ProjectStatusReportService statusReports;
    @Autowired AdminAuditService auditRead;
    @Test void historicalReportRemainsReadableOnlyByPmAdminAndLegacyCycleDoesNotCreateActiveWarning() throws Exception {
        jdbc.update("INSERT INTO milestones(project_id,code,name,due_on,created_at,updated_at) VALUES(?,'LATE','Late milestone','2000-01-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",first);
        long milestone=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM milestones WHERE project_id=? AND code='LATE'",Long.class,first));
        long member=Objects.requireNonNull(jdbc.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,first,owner.getId()));
        jdbc.update("INSERT INTO test_cycles(project_id,code,name,milestone_id,created_at,created_by) VALUES(?,'PLAN','Legacy planned cycle',?,UTC_TIMESTAMP(6),?)",first,milestone,member);
        jdbc.update("INSERT INTO project_status_reports(project_id,author_membership_id,summary,delay_reason,recovery_plan,request_key,payload_hash,created_at,created_by) VALUES(?,?, 'Original history','Original reason','Original plan','native-history',REPEAT('a',64),UTC_TIMESTAMP(6),?)",first,member,owner.getId());
        var pm=users.saveAndFlush(new IdentityUser("history.pm."+UUID.randomUUID(),"History PM","not-login","PM"));
        projects.addOrUpdateMember(first,owner.getId(),pm.getId(),new ProjectDtos.SetMember("PM"));
        for(var reader:List.of(admin,pm)){
            mvc.perform(get("/api/v1/projects/"+first+"/status-reports").with(actor(reader))).andExpect(status().isOk()).andExpect(jsonPath("$.canPost").value(false)).andExpect(jsonPath("$.reports.items[0].summary").value("Original history"));
            mvc.perform(post("/api/v1/projects/"+first+"/status-reports").with(actor(reader)).with(Objects.requireNonNull(csrf())).contentType("application/json").content("{}")).andExpect(status().isGone()).andExpect(jsonPath("$.code").value("USE_FEATURE_REPORTS"));
        }
        mvc.perform(get("/api/v1/projects/"+first+"/status-reports").with(actor(tester))).andExpect(status().isForbidden());
        assertThat(service.overview(admin.getId(),first).attention().get("overdueMilestoneCount")).isEqualTo(0);
        assertThat(statusReports.history(admin.getId(),first,true,0,20).milestones()).singleElement().satisfies(m->assertThat(m).containsEntry("scopeCount",0L).containsEntry("deadlineStatus","INSUFFICIENT_DATA"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_status_reports WHERE project_id=?",Long.class,first)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,admin.getId())).isZero();
    }
    @Test void allocationLifecycleAndInitialSelectionShareGuards() {
        var created=inventory.create(admin.getId(),new DeviceInventoryDtos.Asset("INV"+UUID.randomUUID(),"IPAD","iPad",null,"iOS","18","AVAILABLE","",null));
        long assetId=((Number)created.get("id")).longValue();
        var allocation=inventory.assign(admin.getId(),new DeviceInventoryDtos.Assign(assetId,first,owner.getId(),null,"First",0L));
        long allocationId=((Number)allocation.get("id")).longValue();
        assertThatThrownBy(()->inventory.assign(admin.getId(),new DeviceInventoryDtos.Assign(assetId,second,owner.getId(),null,"Duplicate",1L))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        jdbc.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",first);
        inventory.receive(admin.getId(),allocationId,new DeviceInventoryDtos.Return(0L,"AVAILABLE","Returned"));
        assertThatThrownBy(()->inventory.receive(admin.getId(),allocationId,new DeviceInventoryDtos.Return(1L,"AVAILABLE","Again"))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        inventory.assign(admin.getId(),new DeviceInventoryDtos.Assign(assetId,second,owner.getId(),null,"Second",2L));
        assertThat(inventory.assets(admin.getId(),first,"","",0,20).totalElements()).isZero();
        assertThat(inventory.allocations(admin.getId(),null,assetId,true,0,20).totalElements()).isEqualTo(2);
        assertThat(inventory.projectAllocations(tester.getId(),second,0,20).items()).anyMatch(a->((Number)a.get("assetId")).longValue()==assetId);
    }
    @Test void userPagesKeepUnassignedAndDeduplicateMemberships() {
        var all=management.users(admin.getId(),null,tester.getUsername(),null,null,0,1);
        assertThat(all.totalElements()).isEqualTo(1);
        assertThat(all.items()).hasSize(1);
        assertThat((List<?>)all.items().getFirst().get("memberships")).hasSize(2);
        assertThat(management.users(admin.getId(),null,admin.getUsername(),"ADMIN",true,0,20).totalElements()).isEqualTo(1);
        assertThat(management.users(admin.getId(),first,admin.getUsername(),null,null,0,20).totalElements()).isZero();
    }
    @Test void globallyUnassignedSearchMatchesAcrossWordsAndPagesWithoutChangingOldMemberships() throws Exception {
        String tag="frsearch"+UUID.randomUUID().toString().substring(0,8);
        jdbc.update("UPDATE identity_users SET display_name=? WHERE id=?","Đỗ Cẩm Nhung "+tag,tester.getId());
        users.saveAndFlush(new IdentityUser(tag+"a","Đỗ Cẩm Nhung "+tag,"not-a-login","TESTER"));
        users.saveAndFlush(new IdentityUser(tag+"b","Đỗ Ca\u0302\u0309m Nhung "+tag,"not-a-login","TESTER"));
        String keyword="NHUNG "+tag+" do cam";
        String firstPage=mvc.perform(get("/api/v1/admin/users").param("keyword",keyword).param("unassignedOnly","true").param("role","TESTER").param("enabled","true").param("size","1").with(actor(admin)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items.length()").value(1)).andReturn().getResponse().getContentAsString();
        String secondPage=mvc.perform(get("/api/v1/admin/users").param("keyword",keyword).param("unassignedOnly","true").param("role","TESTER").param("enabled","true").param("size","1").param("page","1").with(actor(admin)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items.length()").value(1)).andReturn().getResponse().getContentAsString();
        var json=new com.fasterxml.jackson.databind.ObjectMapper();
        assertThat(json.readTree(firstPage).at("/items/0/id").asText()).isNotEqualTo(json.readTree(secondPage).at("/items/0/id").asText());
        mvc.perform(get("/api/v1/admin/users").param("keyword",keyword).param("role","TESTER").with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=? AND active=TRUE",Long.class,tester.getId())).isEqualTo(2);
        jdbc.update("UPDATE project_memberships SET active=FALSE WHERE user_id=?",tester.getId());
        mvc.perform(get("/api/v1/admin/users").param("keyword",keyword).param("unassignedOnly","true").with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3));
        mvc.perform(get("/api/v1/admin/users").param("keyword",keyword+" missing").param("unassignedOnly","true").with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/admin/users").param("keyword",tag+" '").param("unassignedOnly","true").with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void auditKeywordMatchesPublicLabelsAndIncludesExactlyTheVietnamEndDayAcrossPages() throws Exception {
        String tag="fraudit"+UUID.randomUUID().toString().substring(0,8);
        jdbc.update("UPDATE identity_users SET display_name=? WHERE id=?","Đỗ Cẩm Nhung "+tag,admin.getId());
        for(String utc:List.of("2026-10-18 16:59:59.999999","2026-10-18 17:00:00.000000","2026-10-19 16:59:59.999999","2026-10-19 17:00:00.000000"))
            jdbc.update("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'DEVICE_ASSET',123,'ASSIGN',?)",first,admin.getId(),utc);
        for(int page=0;page<2;page++)mvc.perform(get("/api/v1/admin/audit").param("projectId",Long.toString(first)).param("keyword","NHUNG "+tag+" ban giao").param("from","2026-10-19").param("through","2026-10-19").param("size","1").param("page",Integer.toString(page)).with(actor(admin)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].actionLabel").value("Bàn giao"))
            .andExpect(jsonPath("$.items[0].occurredAt").value(page==0?"2026-10-19T16:59:59.999999Z":"2026-10-18T17:00:00Z"));
        mvc.perform(get("/api/v1/admin/audit").param("from","not-a-date").with(actor(admin))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/audit").param("from","2026-10-20").param("through","2026-10-19").with(actor(admin))).andExpect(status().isUnprocessableEntity());
    }
    @Test void directAdminHandoverAcceptsOnlyTheActiveProjectPm() throws Exception {
        long assetId=((Number)inventory.create(admin.getId(),new DeviceInventoryDtos.Asset("FRPM"+UUID.randomUUID(),"IPAD","iPad",null,"iOS","18","AVAILABLE","",null)).get("id")).longValue();
        String body="{\"assetId\":"+assetId+",\"projectId\":"+first+",\"recipientUserId\":\""+tester.getId()+"\",\"expectedVersion\":0}";
        mvc.perform(post("/api/v1/admin/device-allocations").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(body)).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/admin/device-allocations").with(actor(admin)).with(java.util.Objects.requireNonNull(csrf())).contentType("application/json").content(Objects.requireNonNull(body.replace(tester.getId(),owner.getId())))).andExpect(status().isCreated()).andExpect(jsonPath("$.recipientName").value("Owner"));
    }
    @Test void userSearchAcceptsVietnameseDisplayNamesAndCaseInsensitiveLiteralUsernames() throws Exception {
        jdbc.update("UPDATE identity_users SET display_name=? WHERE id=?","Nguyễn Thị Kiểm thử 100%_",tester.getId());
        for(String keyword:List.of("Nguyễn","Kiểm thử","100%_",tester.getUsername(),tester.getUsername().toUpperCase(Locale.ROOT))) {
            mvc.perform(get("/api/v1/admin/users").param("projectId",Long.toString(first)).param("keyword",keyword).param("size","1").with(actor(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].id").value(tester.getId()))
                .andExpect(jsonPath("$.items[0].displayName").value("Nguyễn Thị Kiểm thử 100%_"));
        }
        for(String keyword:List.of("không tồn tại")) {
            mvc.perform(get("/api/v1/admin/users").param("projectId",Long.toString(first)).param("keyword",keyword).with(actor(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        }
    }
    @Test void centralCreateDoesNotEnrollAdminAndLegacyMembershipRequiresAdmin() {
        var dev=users.saveAndFlush(new IdentityUser("a2.dev."+UUID.randomUUID().toString().substring(0,8),"Developer","SECRET","DEV"));
        var created=management.create(admin.getId(),new AdminProjectService.Create(new ProjectDtos.CreateProject("A2"+UUID.randomUUID().toString().substring(0,8),"Central","","UTC"),List.of(new AdminProjectService.InitialMember(owner.getId(),"PM"),new AdminProjectService.InitialMember(dev.getId(),"DEV"))));
        long id=((Number)created.get("id")).longValue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,id,admin.getId())).isZero();
        assertThat(management.members(admin.getId(),id)).hasSize(2);
        assertThatThrownBy(()->projects.addOrUpdateMember(id,dev.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER"))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        assertThatThrownBy(()->projects.requireNotDev(id,dev.getId())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
    }
    @Test void auditNewFlowVocabularySearchMatchesDisplayedLabelsAcrossPages() throws Exception {
        String tag="frlabels"+UUID.randomUUID().toString().substring(0,8);
        jdbc.update("UPDATE identity_users SET display_name=? WHERE id=?","Đỗ Cẩm Nhung "+tag,admin.getId());
        int entityId=1000;
        for(String[] event:new String[][]{{"MANAGEMENT_REPORT","CREATE"},{"PROJECT_NOTE","UPDATE"},{"WORK_ITEM","STATUS"},{"WORK_ITEM","COMMENT"}})
            jdbc.update("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",first,admin.getId(),event[0],entityId++,event[1]);
        for(String from:List.of("UNEXECUTED","OK","NG","P","NA"))for(String to:List.of("UNEXECUTED","OK","NG","P","NA"))
            jdbc.update("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'TEST_DOCUMENT_ROW',?,?,UTC_TIMESTAMP(6))",first,admin.getId(),entityId++,"RESULT_"+from+"_"+to);
        mvc.perform(get("/api/v1/admin/audit").param("projectId",String.valueOf(first)).param("keyword","quan tri "+tag).with(actor(admin)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].entityType").value("MANAGEMENT_REPORT")).andExpect(jsonPath("$.items[0].entityLabel").value("Báo cáo quản trị")).andExpect(jsonPath("$.items[0].action").value("CREATE"));
        mvc.perform(get("/api/v1/admin/audit").param("projectId",String.valueOf(first)).param("keyword","Note du an "+tag).with(actor(admin)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].entityType").value("PROJECT_NOTE")).andExpect(jsonPath("$.items[0].entityLabel").value("Note dự án"));
        mvc.perform(get("/api/v1/admin/audit").param("projectId",String.valueOf(first)).param("keyword","Issue "+tag).with(actor(admin)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items[0].entityType").value("WORK_ITEM")).andExpect(jsonPath("$.items[0].entityLabel").value("Issue"));
        mvc.perform(get("/api/v1/admin/audit").param("projectId",String.valueOf(first)).param("keyword","doi trang thai "+tag).with(actor(admin)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].action").value("STATUS")).andExpect(jsonPath("$.items[0].actionLabel").value("Đổi trạng thái"));
        var labels=new HashSet<String>();var raw=new HashSet<String>();
        for(int page=0;page<2;page++){
            var response=json.readTree(mvc.perform(get("/api/v1/admin/audit").param("projectId",String.valueOf(first)).param("keyword","OK "+tag+" STATUS Unexecuted").param("page",String.valueOf(page)).param("size","1").with(actor(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items.length()").value(1)).andReturn().getResponse().getContentAsByteArray());
            labels.add(response.at("/items/0/actionLabel").asText());raw.add(response.at("/items/0/action").asText());
        }
        assertThat(labels).containsExactlyInAnyOrder("Status: Unexecuted → OK","Status: OK → Unexecuted");
        assertThat(raw).containsExactlyInAnyOrder("RESULT_UNEXECUTED_OK","RESULT_OK_UNEXECUTED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND action='RESULT_UNEXECUTED_OK'",Long.class,first)).isEqualTo(1L);
    }
}
