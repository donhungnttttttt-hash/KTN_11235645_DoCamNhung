package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static vn.syp.tms.support.MockMvcContracts.csrf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import vn.syp.tms.identity.IdentityUser;
import vn.syp.tms.identity.IdentityUserRepository;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.project.ProjectDtos;
import vn.syp.tms.project.ProjectService;

/** Real controllers/security/services/JDBC against the exact root-owned integration schema only. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE", matches="integration")
class NativeProjectNotesIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        // Reuse only the guarded property helper, never inherit the parent's @Test methods.
        // It admits localhost:3307/tms_docstest_2060e04c986c, checks SELECT DATABASE(),
        // disables bootstrap/providers/Redmine and draft/chat/session cleanup schedules.
        FeatureIntegrationTest.database(registry);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired IdentityUserRepository users;
    @Autowired ProjectService projects;

    IdentityUser creator, admin, pm, tester, dev, outsidePm;
    long project, otherProject;

    @BeforeEach
    void fixture() {
        String tag=UUID.randomUUID().toString().substring(0,8);
        creator=user("creator"+tag,"ADMIN");admin=user("admin"+tag,"ADMIN");
        pm=user("pm"+tag,"PM");tester=user("tester"+tag,"TESTER");
        dev=user("dev"+tag,"DEV");outsidePm=user("outside"+tag,"PM");
        project=projects.create(creator.getId(),new ProjectDtos.CreateProject("NT"+tag,"Notes native","Fixture-owned notes project","Asia/Ho_Chi_Minh")).id();
        otherProject=projects.create(creator.getId(),new ProjectDtos.CreateProject("NO"+tag,"Other notes","Separate fixture-owned project","Asia/Ho_Chi_Minh")).id();
        for(var member:Map.of(pm,"PM",tester,"TESTER",dev,"DEV").entrySet())
            projects.addOrUpdateMember(project,creator.getId(),member.getKey().getId(),new ProjectDtos.SetMember(member.getValue()));
        projects.addOrUpdateMember(otherProject,creator.getId(),outsidePm.getId(),new ProjectDtos.SetMember("PM"));
    }

    IdentityUser user(String name,String role) {
        return users.saveAndFlush(new IdentityUser("notes."+name,name,"not-login",role));
    }
    RequestPostProcessor actor(IdentityUser user) {
        return authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(user.getId(),user.getVersion()),null,
            List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole()))));
    }
    String path(long p,String tail) {return "/api/v1/projects/"+p+"/notes"+tail;}
    String encode(Object value) throws Exception {return json.writeValueAsString(value);}
    JsonNode body(MvcResult result) throws Exception {return json.readTree(result.getResponse().getContentAsByteArray());}
    JsonNode create(long p,IdentityUser user,String title,String text) throws Exception {
        return body(mvc.perform(post(path(p,"")).with(actor(user)).with(csrf()).contentType("application/json")
            .content(encode(Map.of("title",title,"body",text)))).andExpect(status().isCreated())
            .andExpect(header().exists("Location")).andReturn());
    }

    @Test
    void pmCrudPersistsExactBodyAndSoftDeleteKeepsAttributedHistory() throws Exception {
        String original="Dòng thứ nhất\n\n<script>literal text</script>\n  Nội dung cuối  \n";
        JsonNode created=create(project,pm,"  Ghi chú dự án  ",original);
        long id=created.path("id").asLong();
        assertThat(created.path("title").asText()).isEqualTo("Ghi chú dự án");
        assertThat(created.path("body").asText()).isEqualTo(original);
        assertThat(created.path("version").asLong()).isZero();
        assertThat(created.path("createdBy").asText()).isEqualTo(pm.getId());
        mvc.perform(get(path(project,"/"+id)).with(actor(tester))).andExpect(status().isOk())
            .andExpect(jsonPath("$.body").value(original));
        String edited="Nội dung mới\r\nGiữ nguyên khoảng trắng  \n";
        mvc.perform(put(path(project,"/"+id)).with(actor(pm)).with(csrf()).contentType("application/json")
            .content(encode(Map.of("title","Đã sửa","body",edited,"expectedVersion",0))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.body").value(edited)).andExpect(jsonPath("$.version").value(1));
        assertThat(db.queryForObject("SELECT body FROM project_notes WHERE project_id=? AND id=?",String.class,project,id)).isEqualTo(edited);
        mvc.perform(get(path(project,"?page=0&size=1")).with(actor(dev))).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(id));
        mvc.perform(delete(path(project,"/"+id+"?expectedVersion=1")).with(actor(pm)).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(path(project,"/"+id)).with(actor(tester))).andExpect(status().isNotFound());
        mvc.perform(get(path(project,"")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_notes WHERE project_id=? AND id=? AND archived_at IS NOT NULL AND lock_version=2 AND created_by=? AND updated_by=?",Long.class,project,id,pm.getId(),pm.getId())).isEqualTo(1);
        assertThat(db.queryForList("SELECT action FROM project_audit WHERE project_id=? AND entity_type='PROJECT_NOTE' AND entity_id=? AND actor_id=? ORDER BY id",String.class,project,id,pm.getId())).containsExactly("CREATE","UPDATE","ARCHIVE");
    }

    @Test
    void membersReadButCannotCreateUpdateOrDeleteAndOutsidePmCannotCrossScope() throws Exception {
        long id=create(project,pm,"Protected","Actual note body").path("id").asLong();
        for(var worker:List.of(tester,dev)) {
            mvc.perform(get(path(project,"/"+id)).with(actor(worker))).andExpect(status().isOk());
            mvc.perform(post(path(project,"")).with(actor(worker)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Denied","body","Denied")))).andExpect(status().isForbidden());
            mvc.perform(put(path(project,"/"+id)).with(actor(worker)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Denied","body","Denied","expectedVersion",0)))).andExpect(status().isForbidden());
            mvc.perform(delete(path(project,"/"+id+"?expectedVersion=0")).with(actor(worker)).with(csrf())).andExpect(status().isForbidden());
        }
        mvc.perform(get(path(project,"")).with(actor(outsidePm))).andExpect(status().isNotFound());
        mvc.perform(get(path(project,"/"+id)).with(actor(outsidePm))).andExpect(status().isNotFound());
        mvc.perform(post(path(project,"")).with(actor(outsidePm)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Denied","body","Denied")))).andExpect(status().isNotFound());
        mvc.perform(put(path(project,"/"+id)).with(actor(outsidePm)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Denied","body","Denied","expectedVersion",0)))).andExpect(status().isNotFound());
        mvc.perform(delete(path(project,"/"+id+"?expectedVersion=0")).with(actor(outsidePm)).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(get(path(project,"/"+id)).with(actor(pm))).andExpect(jsonPath("$.body").value("Actual note body")).andExpect(jsonPath("$.version").value(0));
    }

    @Test
    void adminWithoutMembershipCanCrudButForgedCrossProjectNoteIdsNeverResolve() throws Exception {
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=? AND project_id IN (?,?)",Long.class,admin.getId(),project,otherProject)).isZero();
        long own=create(project,admin,"Admin note","Admin content").path("id").asLong();
        long foreign=create(otherProject,admin,"Other project note","Other project content").path("id").asLong();
        mvc.perform(get(path(otherProject,"/"+foreign)).with(actor(admin))).andExpect(status().isOk());
        mvc.perform(get(path(project,"/"+foreign)).with(actor(admin))).andExpect(status().isNotFound());
        mvc.perform(get(path(project,"/"+foreign)).with(actor(pm))).andExpect(status().isNotFound());
        mvc.perform(put(path(project,"/"+foreign)).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Wrong project","body","Wrong project","expectedVersion",0)))).andExpect(status().isNotFound());
        mvc.perform(delete(path(project,"/"+foreign+"?expectedVersion=0")).with(actor(admin)).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(put(path(project,"/"+own)).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Updated by Admin","body","Updated","expectedVersion",0)))).andExpect(status().isOk());
        mvc.perform(delete(path(project,"/"+own+"?expectedVersion=1")).with(actor(admin)).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(path(otherProject,"/"+foreign)).with(actor(admin))).andExpect(status().isOk()).andExpect(jsonPath("$.body").value("Other project content"));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=? AND project_id IN (?,?)",Long.class,admin.getId(),project,otherProject)).isZero();
        assertThat(db.queryForObject("SELECT created_by FROM project_notes WHERE id=?",String.class,own)).isEqualTo(admin.getId());
    }

    @Test
    void staleVersionsAndMissingDeleteVersionCannotOverwriteOrArchiveCurrentContent() throws Exception {
        long id=create(project,pm,"Versioned","Original").path("id").asLong();
        mvc.perform(put(path(project,"/"+id)).with(actor(pm)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Current","body","Current content","expectedVersion",0)))).andExpect(status().isOk());
        mvc.perform(put(path(project,"/"+id)).with(actor(admin)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Stale","body","Lost update","expectedVersion",0)))).andExpect(status().isConflict());
        mvc.perform(delete(path(project,"/"+id+"?expectedVersion=0")).with(actor(admin)).with(csrf())).andExpect(status().isConflict());
        mvc.perform(delete(path(project,"/"+id)).with(actor(pm)).with(csrf())).andExpect(status().isUnprocessableEntity());
        mvc.perform(get(path(project,"/"+id)).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.body").value("Current content")).andExpect(jsonPath("$.version").value(1));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_notes WHERE project_id=? AND id=? AND archived_at IS NULL",Long.class,project,id)).isEqualTo(1);
    }

    @Test
    void archivedProjectNotesRemainReadableAndAllWritersIncludingAdminAreBlocked() throws Exception {
        long id=create(project,pm,"Archive fixture","Still readable").path("id").asLong();
        // Only this test's newly created fixture project is archived; no application data is touched.
        db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",project);
        for(var reader:List.of(pm,tester,dev,admin))
            mvc.perform(get(path(project,"/"+id)).with(actor(reader))).andExpect(status().isOk()).andExpect(jsonPath("$.body").value("Still readable"));
        for(var writer:List.of(pm,admin)) {
            mvc.perform(post(path(project,"")).with(actor(writer)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Denied","body","Denied")))).andExpect(status().isConflict());
            mvc.perform(put(path(project,"/"+id)).with(actor(writer)).with(csrf()).contentType("application/json").content(encode(Map.of("title","Denied","body","Denied","expectedVersion",0)))).andExpect(status().isConflict());
            mvc.perform(delete(path(project,"/"+id+"?expectedVersion=0")).with(actor(writer)).with(csrf())).andExpect(status().isConflict());
        }
        mvc.perform(get(path(project,"/"+id)).with(actor(pm))).andExpect(jsonPath("$.version").value(0));
    }
}
