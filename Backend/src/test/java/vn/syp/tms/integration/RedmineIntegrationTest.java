package vn.syp.tms.integration;

import static vn.syp.tms.support.MockMvcContracts.jsonBytes;

import org.springframework.lang.NonNull;

import static vn.syp.tms.support.MockMvcContracts.csrf;
import vn.syp.tms.workitem.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.catalog.*;
import vn.syp.tms.testcase.*;
import vn.syp.tms.execution.*;

@SpringBootTest(properties="TMS_REDMINE_WORKER_ENABLED=false") @AutoConfigureMockMvc @Testcontainers
class RedmineIntegrationTest {
    @org.junit.jupiter.api.io.TempDir static java.nio.file.Path evidenceRoot;
    @Container static final MySQLContainer<?> mysql=new MySQLContainer<>("mysql:8.4.8");
    // JUnit @Container owns and closes this instance.
    static { mysql.withDatabaseName("tms_integration_test").withUsername("test").withPassword("ephemeral-test-only"); }
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        r.add("TMS_DB_URL",mysql::getJdbcUrl); r.add("TMS_DB_USER",mysql::getUsername); r.add("TMS_DB_PASSWORD",mysql::getPassword);
        r.add("TMS_MIGRATION_USER",mysql::getUsername); r.add("TMS_MIGRATION_PASSWORD",mysql::getPassword);
        r.add("TMS_ATTACHMENT_ROOT",()->evidenceRoot.toString());
    }
    @Autowired ProjectService projects; @Autowired TestCaseService library; @Autowired CatalogService catalogs; @Autowired WorkItemService workItems;
    @Autowired ExecutionService execution; @Autowired IdentityUserRepository users; @Autowired JdbcTemplate db;
    @Autowired MockMvc mvc; @Autowired ObjectMapper json;
    @Autowired vn.syp.tms.attachment.EvidenceService evidence;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean ProjectAudit audit;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean RedmineConfiguration config;
    @org.springframework.test.context.bean.override.mockito.MockitoBean RedmineClient remote;
    @Autowired RedmineWorker worker;
    IdentityUser pm,tester,other; long p,member,revision,env,device,build,attempt,run;
    @BeforeEach void fixture() {
        db.update("UPDATE redmine_outbox SET status='SUPERSEDED' WHERE active_binding IS NOT NULL");
        String suffix=UUID.randomUUID().toString().substring(0,8);
        pm=users.saveAndFlush(new IdentityUser("owner."+suffix,"PM thử","unused-hash","ADMIN"));
        tester=users.saveAndFlush(new IdentityUser("tester."+suffix,"Tester thử","unused-hash","TESTER"));
        other=users.saveAndFlush(new IdentityUser("other."+suffix,"Ngoài dự án","unused-hash","ADMIN"));
        p=projects.create(pm.getId(),new ProjectDtos.CreateProject("W"+suffix,"Dự án bug","","UTC")).id();
        member=projects.addOrUpdateMember(p,pm.getId(),tester.getId(),new ProjectDtos.SetMember("TESTER")).membershipId();
        long suite=library.createSuite(p,pm.getId(),new TestCaseDtos.CreateSuite("AUTH","Đăng nhập","",null,0)).id();
        var c=library.createCase(p,pm.getId(),new TestCaseDtos.CreateCase("TC-1",suite,"Đăng nhập","Có tài khoản","Nhập thông tin","Vào trang chủ",null,null,null,null,null));
        revision=c.currentRevisionId(); library.approveRevision(p,pm.getId(),c.id(),revision);
        env=catalogs.createEnvironment(p,pm.getId(),new CatalogDtos.CreateEnvironment("QA","QA thử","")).id();
        device=catalogs.createDevice(p,pm.getId(),new CatalogDtos.CreateDevice("WEB","Máy thử","PC","Windows","11")).id();
        build=catalogs.createBuild(p,pm.getId(),new CatalogDtos.CreateBuild("1.0","1","WEB","",null)).id();
        long cycle=id(execution.create(p,pm.getId(),new ExecutionDtos.CreateCycle("C1","Hồi quy",null)));
        execution.configure(p,pm.getId(),cycle,new ExecutionDtos.Configuration(env,device,build,0L));
        long config=id(execution.configurations(p,pm.getId(),cycle).getFirst());
        execution.addScope(p,pm.getId(),cycle,new ExecutionDtos.AddScope(config,List.of(revision),member,1L));
        execution.activate(p,pm.getId(),cycle,new ExecutionDtos.Version(2L));
        run=id(execution.runs(p,tester.getId(),cycle,0,20,false,false).items().getFirst());
        attempt=id(execution.record(p,tester.getId(),run,new ExecutionDtos.Attempt("NG",build,"Màn hình trắng","","","attempt-fixture",0L)));
    }
    long id(Map<String,Object> row) { return ((Number)row.get("id")).longValue(); }
    @NonNull RequestPostProcessor actor(IdentityUser u) { return java.util.Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(u.getId(),u.getVersion()),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole()))))); }
    @NonNull String path(String tail) { return "/api/v1/projects/"+p+"/work-items"+tail; }
    Map<String,Object> bug() {
        var data=new LinkedHashMap<String,Object>();
        data.put("type","BUG"); data.put("title","Không vào được trang chủ"); data.put("description","Mô tả nội bộ");
        data.put("steps","1. Đăng nhập"); data.put("expectedResult","Hiển thị tổng quan"); data.put("actualResult","Màn hình trắng");
        data.put("buildId",build); data.put("environmentId",env); data.put("deviceId",device); data.put("revisionId",revision);
        data.put("attemptId",attempt); data.put("requestKey",UUID.randomUUID().toString()); return data;
    }
    JsonNode create(IdentityUser actor,Map<String,Object> input) throws Exception {
        return json.readTree(mvc.perform(post(path("")).with(actor(actor)).with(csrf()).contentType("application/json").content(jsonBytes(json,input)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    JsonNode postJson(String endpoint,IdentityUser who,Object body,int expected) throws Exception {
        var response=mvc.perform(post(java.util.Objects.requireNonNull(endpoint)).with(actor(who)).with(csrf()).contentType("application/json").content(jsonBytes(json,body))).andExpect(status().is(expected)).andReturn().getResponse();
        return response.getContentAsString().isBlank()?json.nullNode():json.readTree(response.getContentAsString());
    }
    long resolvedBug() throws Exception {
        long bug=create(tester,bug()).path("id").asLong();
        postJson(path("/"+bug+"/transitions"),pm,Map.of("status","resolved","fixedBuildId",build,"reason","Dev báo đã sửa","expectedVersion",0),200);return bug;
    }

    @Test void projectMembersCanReadConfigurationWithoutSecrets() throws Exception {
        String endpoint="/api/v1/projects/"+p+"/integrations/redmine";
        mvc.perform(get(endpoint).with(actor(pm))).andExpect(status().isOk())
            .andExpect(jsonPath("$.configured").value(false)).andExpect(jsonPath("$.canManage").value(true))
            .andExpect(jsonPath("$.apiKey").doesNotExist());
        mvc.perform(get(endpoint).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.canManage").value(false));
        mvc.perform(get(endpoint).with(actor(other))).andExpect(status().isNotFound());
        mvc.perform(get(endpoint)).andExpect(status().isUnauthorized());
    }
    @Test void onlyProjectPmCanQueuePublicationAndMissingMappingDoesNotCreateDelivery() throws Exception {
        long bug=create(tester,bug()).path("id").asLong();
        var payload=Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Công bố bản thử");
        String endpoint=path("/"+bug+"/redmine-deliveries");
        postJson(endpoint,tester,payload,403);
        postJson(endpoint,other,payload,404);
        mvc.perform(post(endpoint).with(actor(pm)).contentType("application/json").content(jsonBytes(json,payload))).andExpect(status().isForbidden());
        postJson(endpoint,pm,payload,409);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM redmine_outbox WHERE project_id=?",Long.class,p)).isZero();
    }
    RedmineConfiguration.Mapping configure() {
        var mapping=new RedmineConfiguration.Mapping(1,2,3,Map.of("open",1L,"progress",2L,"recheck",3L,"clarify",4L,"ready",5L,"planning",6L,"resolved",7L,"unreproducible",8L,"wontfix",9L,"closed",10L),Map.of("HIGH",3L,"MEDIUM",2L,"LOW",1L));
        doReturn(true).when(config).configured(p);doReturn(mapping).when(config).mapping(p);
        doReturn(java.net.URI.create("http://127.0.0.1:3080")).when(config).base();doReturn(String.format("%064x",p)).when(config).instanceHash();
        return mapping;
    }
    @Test void queuesImmutableSnapshotIdempotentlyAndRejectsConcurrentPublication() throws Exception {
        configure();long bug=create(tester,bug()).path("id").asLong();
        var body=new LinkedHashMap<String,Object>(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Duyệt gửi"));
        String endpoint=path("/"+bug+"/redmine-deliveries");
        var first=postJson(endpoint,pm,body,202);assertThat(first.path("deliveries").get(0).path("status").asText()).isEqualTo("QUEUED");
        postJson(endpoint,pm,body,202);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM redmine_outbox WHERE project_id=?",Long.class,p)).isEqualTo(1);
        String snapshot=db.queryForObject("SELECT payload_json FROM redmine_outbox WHERE project_id=?",String.class,p);
        assertThat(snapshot).contains("Bước tái hiện","QA thử").doesNotContain("Mô tả nội bộ","unused-hash");
        body.put("reason","Nội dung khác");postJson(endpoint,pm,body,409);
        body.put("requestKey",UUID.randomUUID().toString());postJson(endpoint,pm,body,409);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM redmine_bindings WHERE project_id=?",Long.class,p)).isEqualTo(1);
    }
    @Test void staleVersionAndArchiveCannotQueue() throws Exception {
        configure();long bug=create(tester,bug()).path("id").asLong();String endpoint=path("/"+bug+"/redmine-deliveries");
        postJson(endpoint,pm,Map.of("expectedVersion",1,"requestKey",UUID.randomUUID().toString(),"reason","Duyệt gửi"),409);
        db.update("UPDATE projects SET archived_at=UTC_TIMESTAMP(6) WHERE id=?",p);
        postJson(endpoint,pm,Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Duyệt gửi"),409);
        mvc.perform(get("/api/v1/projects/"+p+"/integrations/redmine").with(actor(pm))).andExpect(jsonPath("$.canManage").value(false));
        assertThat(db.queryForObject("SELECT COUNT(*) FROM redmine_outbox WHERE project_id=?",Long.class,p)).isZero();
    }
    long queueBug() throws Exception {
        configure();long bug=create(tester,bug()).path("id").asLong();
        postJson(path("/"+bug+"/redmine-deliveries"),pm,Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Duyệt gửi"),202);
        return bug;
    }
    RedminePayload queuedPayload() throws Exception {return json.readValue(db.queryForObject("SELECT payload_json FROM redmine_outbox WHERE project_id=? ORDER BY id DESC LIMIT 1",String.class,p),RedminePayload.class);}
    String deliveryStatus(){return db.queryForObject("SELECT status FROM redmine_outbox WHERE project_id=? ORDER BY id DESC LIMIT 1",String.class,p);}
    void reconcile(long bug) throws Exception {postJson(path("/"+bug+"/redmine-reconciliations"),pm,Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Đối chiếu kết quả"),202);}
    @Test void workerPublishesOutsideDatabaseTransactionAndRecordsBinding() throws Exception {
        queueBug();var snapshot=queuedPayload();
        when(remote.find(any(),anyString())).thenAnswer(invocation->{assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();return List.of();});
        when(remote.create(any(),any())).thenReturn(42L);when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,snapshot));
        assertThat(worker.runOne()).isTrue();assertThat(deliveryStatus()).isEqualTo("DELIVERED");
        assertThat(db.queryForObject("SELECT external_issue_id FROM redmine_bindings WHERE project_id=?",Long.class,p)).isEqualTo(42);
        verify(remote,times(1)).create(eq(snapshot),any());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM redmine_delivery_attempts WHERE project_id=?",Long.class,p)).isEqualTo(1);
        long bug=java.util.Objects.requireNonNull(db.queryForObject("SELECT work_item_id FROM redmine_bindings WHERE project_id=?",Long.class,p));
        mvc.perform(get(path("/"+bug+"/redmine")).with(actor(tester))).andExpect(status().isOk()).andExpect(jsonPath("$.binding.externalIssueId").value(42)).andExpect(jsonPath("$.binding.deliveredPayload.subject").isString()).andExpect(jsonPath("$.binding.instance_hash").doesNotExist());
    }
    @Test void timeoutAfterCreateReconcilesExistingTicketWithoutAnotherCreate() throws Exception {
        long bug=queueBug();var snapshot=queuedPayload();
        when(remote.find(any(),anyString())).thenReturn(List.of());
        when(remote.create(any(),any())).thenThrow(new RedmineClient.Failure("REMOTE_INVALID_OR_TIMEOUT",0,true,true,0));
        worker.runOne();assertThat(deliveryStatus()).isEqualTo("UNCERTAIN");
        when(remote.find(any(),anyString())).thenReturn(List.of(new RedmineClient.Remote(42,snapshot)));
        when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,snapshot));
        reconcile(bug);worker.runOne();assertThat(deliveryStatus()).isEqualTo("DELIVERED");verify(remote,times(1)).create(any(),any());
    }
    @Test void noMatchAfterUnknownCreateNeverAuthorizesAnotherPost() throws Exception {
        long bug=queueBug();when(remote.find(any(),anyString())).thenReturn(List.of());
        when(remote.create(any(),any())).thenThrow(new RedmineClient.Failure("REMOTE_INVALID_OR_TIMEOUT",0,true,true,0));
        worker.runOne();reconcile(bug);worker.runOne();assertThat(deliveryStatus()).isEqualTo("UNCERTAIN");
        verify(remote,times(1)).create(any(),any());
    }
    @Test void revokedPmCannotDispatchAlreadyQueuedPublication() throws Exception {
        queueBug();db.update("UPDATE project_memberships SET active=FALSE WHERE project_id=? AND user_id=?",p,pm.getId());
        worker.runOne();assertThat(deliveryStatus()).isEqualTo("FAILED");verifyNoInteractions(remote);
    }
    @Test void concurrentWorkersCannotPublishSameJobTwice() throws Exception {
        queueBug();var snapshot=queuedPayload();when(remote.find(any(),anyString())).thenReturn(List.of());
        when(remote.create(any(),any())).thenReturn(42L);when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,snapshot));
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a=executor.submit(()->worker.runOne());var b=executor.submit(()->worker.runOne());a.get();b.get();
        }
        assertThat(deliveryStatus()).isEqualTo("DELIVERED");verify(remote,times(1)).create(any(),any());
    }
    @Test void expiredLeaseRecoversReadOnlyAndDoesNotRecreateUnknownTicket() throws Exception {
        queueBug();db.update("UPDATE redmine_outbox SET status='RUNNING',lease_key=?,lease_until=UTC_TIMESTAMP(6)-INTERVAL 1 MINUTE,attempt_count=1 WHERE project_id=?",UUID.randomUUID().toString(),p);
        when(remote.find(any(),anyString())).thenReturn(List.of());worker.runOne();
        assertThat(deliveryStatus()).isEqualTo("UNCERTAIN");verify(remote,never()).create(any(),any());
    }
    @Test void externalStatusIsObservedWithoutChangingInternalBugOrTestResult() throws Exception {
        long bug=queueBug();var snapshot=queuedPayload();
        when(remote.find(any(),anyString())).thenReturn(List.of());when(remote.create(any(),any())).thenReturn(42L);
        when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,snapshot));worker.runOne();
        var changed=new RedminePayload(1,2,10,2,snapshot.subject(),snapshot.description(),snapshot.marker(),true);
        when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,changed));
        reconcile(bug);worker.runOne();assertThat(deliveryStatus()).isEqualTo("CONFLICT");
        assertThat(db.queryForObject("SELECT status_code FROM work_items WHERE project_id=? AND id=?",String.class,p,bug)).isEqualTo("open");
        assertThat(db.queryForObject("SELECT result_code FROM execution_attempts WHERE id=?",String.class,attempt)).isEqualTo("NG");
        verify(remote,never()).update(anyLong(),any(),any());
    }
    @Test void definitiveAuthFailureCanBeRetriedAndRetryIsVersionedAndAudited() throws Exception {
        queueBug();when(remote.find(any(),anyString())).thenReturn(List.of());
        when(remote.create(any(),any())).thenThrow(new RedmineClient.Failure("REMOTE_AUTH",401,false,false,0));worker.runOne();
        assertThat(deliveryStatus()).isEqualTo("FAILED");
        var job=db.queryForMap("SELECT id,lock_version FROM redmine_outbox WHERE project_id=?",p);
        String endpoint="/api/v1/projects/"+p+"/redmine-deliveries/"+job.get("id")+"/retry";
        postJson(endpoint,tester,Map.of("expectedVersion",job.get("lock_version"),"reason","Cập nhật quyền"),403);
        postJson(endpoint,pm,Map.of("expectedVersion",0,"reason","Cập nhật quyền"),409);
        postJson(endpoint,pm,Map.of("expectedVersion",job.get("lock_version"),"reason","Cập nhật quyền"),202);
        doReturn(42L).when(remote).create(any(),any());when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,queuedPayload()));worker.runOne();
        assertThat(deliveryStatus()).isEqualTo("DELIVERED");verify(remote,times(2)).create(any(),any());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM project_audit WHERE project_id=? AND entity_type='REDMINE' AND action='RETRY'",Long.class,p)).isEqualTo(1);
    }
    @Test void rateLimitRetriesAreBoundedAndCannotBePolledImmediately() throws Exception {
        queueBug();when(remote.find(any(),anyString())).thenThrow(new RedmineClient.Failure("REMOTE_RATE_LIMIT",429,false,true,120));
        worker.runOne();assertThat(deliveryStatus()).isEqualTo("RETRY_WAIT");assertThat(worker.runOne()).isFalse();
        db.update("UPDATE redmine_outbox SET next_attempt_at=UTC_TIMESTAMP(6),attempt_count=4 WHERE project_id=?",p);worker.runOne();
        assertThat(deliveryStatus()).isEqualTo("FAILED");verify(remote,never()).create(any(),any());
    }
    @Test void publicationUpdatesOnlyWhenRemoteStillMatchesLastDeliveredSnapshot() throws Exception {
        long bug=queueBug();var original=queuedPayload();when(remote.find(any(),anyString())).thenReturn(List.of());when(remote.create(any(),any())).thenReturn(42L);
        when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,original));worker.runOne();
        postJson(path("/"+bug+"/transitions"),pm,Map.of("status","progress","reason","Bắt đầu sửa","expectedVersion",0),200);
        postJson(path("/"+bug+"/redmine-deliveries"),pm,Map.of("expectedVersion",1,"requestKey",UUID.randomUUID().toString(),"reason","Gửi tiến độ"),202);
        var updated=queuedPayload();when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,original),new RedmineClient.Remote(42,updated));
        worker.runOne();assertThat(deliveryStatus()).isEqualTo("DELIVERED");verify(remote).update(eq(42L),eq(updated),any());
        assertThat(db.queryForObject("SELECT delivered_source_version FROM redmine_bindings WHERE project_id=?",Long.class,p)).isEqualTo(1);
    }
    @Test void pmMustReviewTheCurrentConflictAndWorkerRechecksBeforeOverwriting() throws Exception {
        long bug=queueBug();var wanted=queuedPayload();var changed=new RedminePayload(1,2,10,2,"Sửa trực tiếp",wanted.description(),wanted.marker(),true);
        when(remote.find(any(),anyString())).thenReturn(List.of(new RedmineClient.Remote(42,changed)));when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,changed));
        worker.runOne();assertThat(deliveryStatus()).isEqualTo("CONFLICT");
        var body=new LinkedHashMap<String,Object>(Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Duyệt lại"));
        postJson(path("/"+bug+"/redmine-deliveries"),pm,body,409);body.put("observedFingerprint","a".repeat(64));postJson(path("/"+bug+"/redmine-deliveries"),pm,body,409);
        body.put("observedFingerprint",db.queryForObject("SELECT observed_fingerprint FROM redmine_bindings WHERE project_id=?",String.class,p));postJson(path("/"+bug+"/redmine-deliveries"),pm,body,202);
        var changedAgain=new RedminePayload(1,2,2,2,"Sửa lần nữa",wanted.description(),wanted.marker(),true);
        when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,changedAgain));worker.runOne();
        assertThat(deliveryStatus()).isEqualTo("CONFLICT");verify(remote,never()).update(anyLong(),any(),any());
    }
    @Test void duplicateMarkersAndMappingChangesFailClosed() throws Exception {
        queueBug();var payload=queuedPayload();when(remote.find(any(),anyString())).thenReturn(List.of(new RedmineClient.Remote(41,payload),new RedmineClient.Remote(42,payload)));
        worker.runOne();assertThat(deliveryStatus()).isEqualTo("CONFLICT");verify(remote,never()).create(any(),any());
        doReturn("b".repeat(64)).when(config).instanceHash();
        long bug=java.util.Objects.requireNonNull(db.queryForObject("SELECT work_item_id FROM redmine_bindings WHERE project_id=?",Long.class,p));
        postJson(path("/"+bug+"/redmine-reconciliations"),pm,Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Đối chiếu"),409);
    }
    @Test void manualReferencePreventsCreatingASecondExternalTicket() throws Exception {
        configure();long bug=create(tester,bug()).path("id").asLong();
        mvc.perform(put(path("/"+bug+"/external-reference")).with(actor(pm)).with(csrf()).contentType("application/json").content(jsonBytes(json,Map.of("provider","REDMINE","externalId","100","url","http://127.0.0.1:3080/issues/100","expectedVersion",0)))).andExpect(status().isOk());
        long version=((Number)workItems.get(p,pm.getId(),bug).get("version")).longValue();
        var response=postJson(path("/"+bug+"/redmine-deliveries"),pm,Map.of("expectedVersion",version,"requestKey",UUID.randomUUID().toString(),"reason","Gửi bug"),409);
        assertThat(response.path("code").asText()).isEqualTo("REDMINE_MANUAL_REFERENCE");
    }
    @Test void lateWorkerCannotOverwriteTheReconciledLeaseAndNeverCreatesTwice() throws Exception {
        queueBug();var payload=queuedPayload();var entered=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);
        when(remote.find(any(),anyString())).thenReturn(List.of()).thenReturn(List.of(new RedmineClient.Remote(42,payload)));
        when(remote.create(any(),any())).thenAnswer(i->{entered.countDown();assertThat(release.await(15,java.util.concurrent.TimeUnit.SECONDS)).isTrue();return 42L;});
        when(remote.read(eq(42L),any(),anyString())).thenReturn(new RedmineClient.Remote(42,payload));
        try(var executor=java.util.concurrent.Executors.newSingleThreadExecutor()) {
            var late=executor.submit(()->worker.runOne());assertThat(entered.await(15,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            db.update("UPDATE redmine_outbox SET lease_until=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE project_id=?",p);
            worker.runOne();release.countDown();late.get(15,java.util.concurrent.TimeUnit.SECONDS);
        } finally {release.countDown();}
        assertThat(deliveryStatus()).isEqualTo("DELIVERED");verify(remote,times(1)).create(any(),any());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM redmine_delivery_attempts WHERE project_id=?",Long.class,p)).isEqualTo(2);
    }
    @Test void exhaustedExpiredLeaseStopsForManualReconciliation() throws Exception {
        queueBug();db.update("UPDATE redmine_outbox SET status='RUNNING',lease_key=?,lease_until=UTC_TIMESTAMP(6)-INTERVAL 1 MINUTE,attempt_count=5 WHERE project_id=?",UUID.randomUUID().toString(),p);
        worker.runOne();assertThat(deliveryStatus()).isEqualTo("UNCERTAIN");verifyNoInteractions(remote);
    }
    @Test void publicationUsesOriginalBugContextAfterCatalogRename() throws Exception {
        configure();long bug=create(tester,bug()).path("id").asLong();db.update("UPDATE environments SET name='Tên môi trường mới' WHERE id=?",env);
        postJson(path("/"+bug+"/redmine-deliveries"),pm,Map.of("expectedVersion",0,"requestKey",UUID.randomUUID().toString(),"reason","Duyệt gửi"),202);
        assertThat(queuedPayload().description()).contains("QA thử").doesNotContain("Tên môi trường mới");
    }
}
