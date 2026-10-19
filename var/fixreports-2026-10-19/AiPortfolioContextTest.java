package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class AiPortfolioContextTest {
    final ObjectMapper json=new ObjectMapper();
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    final IdentityService identity=mock(IdentityService.class);
    final LocalAiAccess sessions=mock(LocalAiAccess.class);
    final IdentityUserRepository.CurrentAccount account=mock(IdentityUserRepository.CurrentAccount.class);
    final AiPortfolioContext context=new AiPortfolioContext(new WorkItemStore(jdbc,json),identity,sessions,json);
    final List<Map<String,Object>> projects=new ArrayList<>();
    final List<String> queries=new ArrayList<>();
    String role="TESTER";
    @BeforeEach void setup() {
        when(identity.lockCurrent("owner")).thenReturn(account);
        when(account.getRole()).thenAnswer(call->role);
        when(sessions.current("owner")).thenReturn(new SessionPrincipal("owner",0));
        when(jdbc.queryForObject(anyString(),eq(Long.class),any(Object[].class))).thenReturn(0L);
        projects.add(project(1,"TESTER",11));projects.add(project(2,"DEV",12));
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenAnswer(call->{
            String sql=call.getArgument(0);queries.add(sql);
            if(sql.contains("FROM projects p")) {
                Object[] args=(Object[])call.getRawArguments()[1];
                return projects.stream().filter(p->!sql.contains("p.id=?")||Objects.equals(p.get("id"),args[args.length-1])).map(LinkedHashMap::new).toList();
            }
            if(sql.contains("COUNT(*) AS total"))return List.of(new LinkedHashMap<>(Map.of("total",5L,"na",1L,"ok",2L,"ng",1L,"pending",1L)));
            return List.of();
        });
    }
    Map<String,Object> project(long id,String projectRole,long member) {
        var row=new LinkedHashMap<String,Object>();row.put("id",id);row.put("code","P"+id);row.put("name","Dự án "+id);
        row.put("role",projectRole);row.put("membershipId",member);row.put("membershipVersion",0L);row.put("archived",false);return row;
    }
    @Test void scopeUsesOnlyCurrentMembershipAndFingerprintExcludesPresentationChanges() {
        var first=context.current("owner");assertThat(first.projects()).hasSize(2);
        assertThat(first.reference()).matches("portfolio-v1:[0-9a-f]{64}");
        projects.getFirst().put("name","Tên mới");assertThat(context.current("owner").reference()).isEqualTo(first.reference());
        assertThat(queries.getFirst()).contains("m.user_id=?","m.active=TRUE");verify(sessions,atLeastOnce()).current("owner");
    }
    @Test void membershipRemovalOrRoleChangeFencesOldHistoryAndNewInference() {
        String before=context.current("owner").reference();projects.removeLast();
        assertThatThrownBy(()->context.assertCurrent("owner",before)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("NOT_FOUND"));
        String after=context.current("owner").reference();projects.getFirst().put("role","PM");
        assertThatThrownBy(()->context.prepare("owner",after,"portfolio-key")).isInstanceOf(BusinessException.class);
    }
    @Test void membershipReactivationVersionCannotRestoreOldConversation() {
        String before=context.current("owner").reference();projects.getFirst().put("membershipVersion",2L);
        assertThat(context.current("owner").reference()).isNotEqualTo(before);
    }
    @Test void globalAdminCanUseAllProjectsWithoutMembership() {
        role="ADMIN";context.current("owner");assertThat(queries.getFirst()).doesNotContain("WHERE m.user_id");
    }
    @Test void pmCanReadBackgroundProjectsOutsideMembershipWithoutReceivingCrudRights() {
        role="PM";
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenAnswer(call->{
            String sql=call.getArgument(0);queries.add(sql);
            if(!sql.contains("FROM projects p")) return List.of();
            return sql.contains("LEFT JOIN project_memberships")
                ? projects.stream().map(LinkedHashMap::new).toList() : List.of();
        });
        var scope=context.current("owner");
        assertThat(scope.projects()).hasSize(2);
        assertThat(scope.role()).isEqualTo("PM");
    }
    @Test void testerSnapshotDoesNotRetrieveProjectManagementTotals() {
        var scope=context.current("owner");
        var task=context.prepare("owner",scope.reference(),"restricted-context-key");
        var facts=task.data().path("sources").get(0).path("facts");
        assertThat(facts.has("execution")).isFalse();
        assertThat(facts.has("workByStatus")).isFalse();
        assertThat(task.data().path("capabilities").path("managementReport").asBoolean(true)).isFalse();
    }
    @Test void restrictedUsersCannotRequestManagementReportsOrBulkExportsButCanAskOwnProgress() {
        var scope=context.current("owner");
        for(String question:List.of("Xuất toàn bộ test case dự án ra Excel", "Lập báo cáo quản lý toàn dự án"))
            assertThatThrownBy(()->context.prepare("owner",scope.reference(),"restricted-intent",question)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("AI_CAPABILITY_DENIED"));
        assertThatCode(()->context.prepare("owner",scope.reference(),"own-progress","Tiến độ công việc của tôi thế nào?")).doesNotThrowAnyException();
    }
    @Test void selectedProjectDoesNotRemoveAuthorizedBackgroundFacts() {
        role="ADMIN";
        var scope=context.currentProject("owner",2);
        var task=context.prepareProject("owner",2,scope.reference(),"background-context-key");
        assertThat(task.data().path("targetProjectId").asLong()).isEqualTo(2);
        assertThat(task.sources()).hasSize(2);
    }
    @Test void adminAuthorityDoesNotInventAnActiveProjectAssignment() {
        role="ADMIN";projects.getFirst().put("membershipId",0L);projects.getFirst().put("membershipRole",null);
        var scope=context.current("owner");var data=context.prepare("owner",scope.reference(),"portfolio-key").data();
        var facts=data.path("sources").get(0).path("facts");
        assertThat(facts.path("accessRole").asText()).isEqualTo("ADMIN");assertThat(facts.path("myRole").isNull()).isTrue();
    }
    @Test void managementSnapshotCountsPendingAndNaAsTestedInTheFullDenominator() {
        role="PM";
        String ref=context.current("owner").reference();var task=context.prepare("owner",ref,"portfolio-key");
        assertThat(task.data().path("scope").asText()).isEqualTo("MY_PROJECTS");
        assertThat(task.data().path("totalProjects").asInt()).isEqualTo(2);
        assertThat(task.sources()).hasSize(2);
        var metrics=task.data().path("sources").get(0).path("facts").path("execution");
        assertThat(metrics.path("executionPercent").asDouble()).isEqualTo(100.0);
        assertThat(metrics.path("applicable").asLong()).isEqualTo(5);
        assertThat(task.data().path("limitations").asText()).contains("NA","P");
    }
    @Test void manyProjectsDiscloseSnapshotLimitsAndKeepTheFullPermissionFingerprint() {
        for(int i=3;i<=45;i++)projects.add(project(i,"TESTER",100+i));
        String ref=context.current("owner").reference();var task=context.prepare("owner",ref,"portfolio-key");
        assertThat(task.sources()).hasSize(AiPortfolioContext.MAX_PROJECTS);
        assertThat(task.data().path("totalProjects").asInt()).isEqualTo(45);
        assertThat(task.data().path("truncated").asBoolean()).isTrue();
        projects.removeLast();assertThat(context.current("owner").reference()).isNotEqualTo(ref);
    }
    @Test void emptyScopeDoesNotInventProjectFacts() {
        projects.clear();var scope=context.current("owner");var task=context.prepare("owner",scope.reference(),"portfolio-key");
        assertThat(task.sources()).isEmpty();assertThat(task.data().path("totalProjects").asInt()).isZero();
    }
    @Test void archivedProjectsRemainIdentifiableWithoutFetchingNewBusinessFacts() {
        projects.getFirst().put("archived",true);var scope=context.current("owner");
        var snapshot=context.prepare("owner",scope.reference(),"portfolio-key");
        assertThat(snapshot.data().path("sources").get(0).path("facts").path("archived").asBoolean()).isTrue();
        assertThat(snapshot.data().path("sources").get(0).path("facts").has("execution")).isFalse();
    }
    @Test void selectedProjectComesFirstAndAllAuthorizedBackgroundGrantsFenceItsHistory() {
        var scope=context.currentProject("owner",2);assertThat(scope.reference()).matches("project-chat-v1:[0-9a-f]{64}");assertThat(scope.projects()).hasSize(1);
        var task=context.prepareProject("owner",2,scope.reference(),"project-chat-key");assertThat(task.data().path("scope").asText()).isEqualTo("PROJECT_CHAT");assertThat(task.sources()).hasSize(2);
        var facts=task.data().path("sources").get(0).path("facts");assertThat(facts.path("projectId").asLong()).isEqualTo(2);assertThat(facts.has("testCycles")).isFalse();assertThat(facts.has("sourceFiles")).isTrue();
        projects.getFirst().put("membershipVersion",12L);assertThat(context.currentProject("owner",2).reference()).isNotEqualTo(scope.reference());
        projects.getLast().put("membershipVersion",1L);assertThatThrownBy(()->context.prepareProject("owner",2,scope.reference(),"project-chat-key")).isInstanceOf(BusinessException.class);
    }
    @Test void selectedProjectRequiresAnActiveGrantAndArchivedSourcesAreReadonly() {
        var scope=context.currentProject("owner",1);projects.getFirst().put("archived",true);
        context.assertProjectCurrent("owner",1,scope.reference(),false);
        assertThatThrownBy(()->context.prepareProject("owner",1,scope.reference(),"project-chat-key")).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("ARCHIVED"));
        projects.removeFirst();assertThat(context.currentProject("owner",1).projects()).isEmpty();
        assertThatThrownBy(()->context.assertProjectCurrent("owner",1,scope.reference(),false)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("NOT_FOUND"));
    }

    @Test void managementAnalysisIsDeniedBeforeProviderAdmissionWhileReadableProgressRemainsAllowed(){
        var scope=context.current("owner");
        for(String question:List.of("Phân tích tổng hợp toàn dự án như màn Tổng hợp & Phân tích","Provide whole-project management analysis")){
            var store=mock(AiChatStore.class);var gateway=mock(AiProviderGateway.class);var typed=mock(AiContextService.class);
            when(store.thread("owner",1)).thenReturn(new AiChatStore.ThreadView(1,null,AiPortfolioContext.PURPOSE,null,scope.reference(),"OPENAI_API","test-model",null,null));
            var selection=new AiProviderGateway.ResolvedSelection("OPENAI_API","test-model",null,0);when(gateway.resolve(eq("owner"),any())).thenReturn(selection);when(store.history("owner",1)).thenReturn(List.of());
            when(store.reserve(eq("owner"),eq(1L),anyString(),anyString(),eq(selection),any(),anyBoolean())).thenReturn(new AiChatStore.Reservation(2,true));
            when(gateway.generate(anyString(),any(),anyString(),any(),anyString(),any())).thenReturn(new OpenAiResponsesClient.Output(json.createObjectNode().put("text","Must not generate"),"resp_test","test-model",1,1));
            when(gateway.withCurrent(eq("owner"),eq(selection),any())).thenAnswer(call->((java.util.function.Supplier<?>)call.getArgument(2)).get());
            assertThatThrownBy(()->new AiChatService(store,typed,gateway,json,context).send("owner",1,question,"analysis-policy-001")).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("AI_CAPABILITY_DENIED"));verifyNoInteractions(gateway);
        }
        for(String question:List.of("Phân tích tiến độ file Long file.xlsx và việc của tôi","Tổng hợp tiến độ cá nhân của tôi trong toàn bộ dự án đang tham gia","Analyze my assigned work progress across all projects"))
            assertThatCode(()->context.prepare("owner",scope.reference(),"personal-positive",question)).doesNotThrowAnyException();
    }
}
