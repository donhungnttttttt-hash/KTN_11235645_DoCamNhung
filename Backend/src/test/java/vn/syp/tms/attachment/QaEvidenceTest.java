package vn.syp.tms.attachment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.qa.QaService;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.*;

class QaEvidenceTest {
    @TempDir Path root;
    final WorkItemStore db=mock(WorkItemStore.class);
    final WorkItemService work=mock(WorkItemService.class);
    final ProjectAudit audit=mock(ProjectAudit.class);
    final QaService qa=mock(QaService.class);
    EvidenceService service;
    final String id="bf5282d8-a074-4a17-a869-48dd73f1dbd0";
    final byte[] content="%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @BeforeEach void setup() throws Exception {
        service=new EvidenceService(db,work,audit,qa,root.toString());
        when(qa.authorize(1,"actor",true)).thenReturn(new QaService.Actor(7,false,true,false,false));
        when(qa.authorizeWriter(1,"actor",70)).thenReturn(new QaService.Writer(new QaService.Actor(7,false,true,false,false),Map.of("type","QA")));
        when(db.row(anyString(),any(Object[].class))).thenAnswer(i->i.<String>getArgument(0).contains("item_type")?Map.of("type","QA"):Map.of("uploaded_by",7L,"original_name","proof.pdf","media_type","application/pdf"));
        when(db.rows(anyString(),any(Object[].class))).thenReturn(List.of());
        when(work.writable(1,"actor")).thenReturn(Map.of("id",99L,"role","TESTER","globalRole","TESTER"));
        when(work.get(1,"actor",70)).thenReturn(Map.of("type","QA"));
        TransactionSynchronizationManager.initSynchronization();
    }
    @AfterEach void cleanup() {if(TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.clearSynchronization();}
    MockMultipartFile file(){return new MockMultipartFile("file","proof.pdf","text/html",content);}
    void complete(int status){for(var callback:TransactionSynchronizationManager.getSynchronizations())callback.afterCompletion(status);}
    void commit(){for(var callback:TransactionSynchronizationManager.getSynchronizations())callback.afterCommit();complete(TransactionSynchronization.STATUS_COMMITTED);}
    List<Path> files() throws Exception {try(var paths=Files.list(root)){return paths.toList();}}
    void denied(Runnable action,String code){assertEquals(code,assertThrows(BusinessException.class,action::run).code());}

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void writerGuardAndCurrentAuthorPrecedeBlobAndDuplicateReplay() throws Exception {
        var file=spy(file());
        when(db.rows(contains("sha256"),any(Object[].class))).thenReturn(List.of(Map.of("id",id)));
        assertEquals(id,service.upload(1,"actor",70,file).get("id"));
        var order=inOrder(qa,db,file);
        order.verify(qa).authorize(1,"actor",true);
        order.verify(db).row(contains("item_type"),eq(1L),eq(70L));
        order.verify(qa).authorizeWriter(1,"actor",70);
        order.verify(file).getSize();order.verify(db).count(contains("COUNT(*)"),eq(1L),eq(70L));
        order.verify(file).getInputStream();
        order.verify(db).rows(argThat(sql->sql.contains("sha256") && sql.endsWith("FOR UPDATE")),eq(1L),eq(70L),eq(7L),anyString(),eq("proof.pdf"));
        verifyNoInteractions(work,audit);assertTrue(files().isEmpty());
    }
    @ParameterizedTest @CsvSource({"401,UNAUTHENTICATED","403,FORBIDDEN","409,INVALID_QA_STATE","409,ARCHIVED","404,NOT_FOUND"})
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    void currentWriterDenialBlocksUploadReplayAndDelete(int status,String code) throws Exception {
        doThrow(new BusinessException(status,code,"current guard denied")).when(qa).authorizeWriter(1,"actor",70);
        var file=spy(file());
        denied(()->service.upload(1,"actor",70,file),code);
        denied(()->service.delete(1,"actor",70,id),code);
        verifyNoInteractions(file,work,audit);
        verify(db,never()).rows(anyString(),any(Object[].class));verify(db,never()).count(anyString(),any(Object[].class));
        verify(db,never()).update(anyString(),any(Object[].class));assertTrue(files().isEmpty());
    }
    @Test void invalidIdentityStopsBeforeDiscoveryOrStorage() throws Exception {
        doThrow(new BusinessException(401,"UNAUTHENTICATED","revoked")).when(qa).authorize(1,"actor",true);
        denied(()->service.upload(1,"actor",70,file()),"UNAUTHENTICATED");denied(()->service.delete(1,"actor",70,id),"UNAUTHENTICATED");
        verifyNoInteractions(db,work,audit);verify(qa,never()).authorizeWriter(anyLong(),anyString(),anyLong());assertTrue(files().isEmpty());
    }
    @ParameterizedTest @CsvSource({"true,false,false","false,true,false","false,false,true"})
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    void pmCreatorTesterAndAssignedDevUploadUsingTypedAuthor(boolean pm,boolean tester,boolean dev) throws Exception {
        when(qa.authorizeWriter(1,"actor",70)).thenReturn(new QaService.Writer(new QaService.Actor(7,pm,tester,dev,false),Map.of("type","QA")));
        var result=service.upload(1,"actor",70,file());Path blob=root.resolve(result.get("id").toString());
        assertEquals("application/pdf",result.get("mediaType"));assertArrayEquals(content,Files.readAllBytes(blob));
        verify(db).update(contains("INSERT INTO work_item_attachments"),anyString(),eq(1L),eq(70L),eq("proof.pdf"),eq("application/pdf"),eq(content.length),anyString(),eq(7L));
        verifyNoInteractions(work);complete(TransactionSynchronization.STATUS_ROLLED_BACK);assertFalse(Files.exists(blob));
    }
    @Test void successfulUploadRetainsBlobAndAuditsAfterCommit() throws Exception {
        var result=service.upload(1,"actor",70,file());commit();assertTrue(Files.exists(root.resolve(result.get("id").toString())));
        verify(audit).record(1L,"actor","WORK_ITEM",70L,"ATTACH_EVIDENCE");
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void databaseFailureStillRegistersRollbackCleanup() throws Exception {
        doThrow(new IllegalStateException("db unavailable")).when(db).update(contains("INSERT INTO work_item_attachments"),any(Object[].class));
        assertThrows(IllegalStateException.class,()->service.upload(1,"actor",70,file()));assertEquals(1,files().size());
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);assertTrue(files().isEmpty());
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void qaUploaderDeleteIsDeferredUntilCommitAndKeepsFreeformReferenceContract() throws Exception {
        Files.write(root.resolve(id),content);service.delete(1,"actor",70,id);assertTrue(Files.exists(root.resolve(id)));
        var order=inOrder(qa,db);order.verify(qa).authorize(1,"actor",true);order.verify(db).row(contains("item_type"),eq(1L),eq(70L));
        order.verify(qa).authorizeWriter(1,"actor",70);order.verify(db).row(argThat(sql->sql.contains("uploaded_by")&&sql.endsWith("FOR UPDATE")),eq(1L),eq(70L),eq(id));
        commit();assertFalse(Files.exists(root.resolve(id)));verifyNoInteractions(work);
        verify(db,never()).count(contains("qa_answers"),any(Object[].class));verify(db,never()).count(contains("qa_confirmations"),any(Object[].class));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void pmMayDeleteAnotherUploaderButAssignedDevCannot() throws Exception {
        when(qa.authorizeWriter(1,"actor",70)).thenReturn(new QaService.Writer(new QaService.Actor(7,false,false,true,false),Map.of("type","QA")));
        when(db.row(contains("uploaded_by"),any(Object[].class))).thenReturn(Map.of("uploaded_by",8L));
        Files.write(root.resolve(id),content);denied(()->service.delete(1,"actor",70,id),"FORBIDDEN");
        verify(db,never()).update(anyString(),any(Object[].class));assertTrue(Files.exists(root.resolve(id)));
        when(qa.authorizeWriter(1,"actor",70)).thenReturn(new QaService.Writer(new QaService.Actor(7,true,false,false,false),Map.of("type","QA")));
        service.delete(1,"actor",70,id);commit();assertFalse(Files.exists(root.resolve(id)));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void creatorTesterCannotDeleteAnotherUploaderAndRollbackKeepsBlob() throws Exception {
        when(db.row(contains("uploaded_by"),any(Object[].class))).thenReturn(Map.of("uploaded_by",8L));
        denied(()->service.delete(1,"actor",70,id),"FORBIDDEN");verify(db,never()).update(anyString(),any(Object[].class));
        when(db.row(contains("uploaded_by"),any(Object[].class))).thenReturn(Map.of("uploaded_by",7L));
        Files.write(root.resolve(id),content);service.delete(1,"actor",70,id);complete(TransactionSynchronization.STATUS_ROLLED_BACK);assertTrue(Files.exists(root.resolve(id)));
    }
    @ParameterizedTest @CsvSource({"bug_verification_attempts","bug_closure_decisions"})
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    void bugHistoryEvidenceRemainsProtected(String table) throws Exception {
        when(db.row(contains("item_type"),any(Object[].class))).thenReturn(Map.of("type","BUG"));
        when(work.get(1,"actor",70)).thenReturn(Map.of("type","BUG"));
        when(work.writable(1,"actor")).thenReturn(Map.of("id",7L,"role","TESTER","globalRole","TESTER"));
        when(db.count(contains(table),any(Object[].class))).thenReturn(1L);Files.write(root.resolve(id),content);
        denied(()->service.delete(1,"actor",70,id),"EVIDENCE_IN_USE");verify(db,never()).update(anyString(),any(Object[].class));assertTrue(Files.exists(root.resolve(id)));
        verify(qa,never()).authorizeWriter(anyLong(),anyString(),anyLong());
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void bugDevOwnershipAndUploaderRulesRemainUnchanged() throws Exception {
        when(db.row(contains("item_type"),any(Object[].class))).thenReturn(Map.of("type","BUG"));
        when(work.writable(1,"actor")).thenReturn(Map.of("id",7L,"role","DEV","globalRole","DEV"));
        when(work.get(1,"actor",70)).thenReturn(Map.of("type","BUG","status","progress","assigneeMembershipId",8L));
        denied(()->service.upload(1,"actor",70,file()),"FORBIDDEN");denied(()->service.delete(1,"actor",70,id),"FORBIDDEN");
        when(work.get(1,"actor",70)).thenReturn(Map.of("type","BUG","status","progress","assigneeMembershipId",7L));
        var result=service.upload(1,"actor",70,file());complete(TransactionSynchronization.STATUS_ROLLED_BACK);assertFalse(Files.exists(root.resolve(result.get("id").toString())));
        when(db.row(contains("uploaded_by"),any(Object[].class))).thenReturn(Map.of("uploaded_by",8L));denied(()->service.delete(1,"actor",70,id),"FORBIDDEN");
        verify(qa,never()).authorizeWriter(anyLong(),anyString(),anyLong());
    }
    @Test void projectAuthorizedReadsPermitClosedQaAndFailBeforeBlobAccess() throws Exception {
        Files.write(root.resolve(id),content);assertTrue(service.list(1,"actor",70).isEmpty());assertArrayEquals(content,service.download(1,"actor",70,id).bytes());
        verify(work,times(2)).get(1,"actor",70);verifyNoInteractions(qa);
        doThrow(new BusinessException(404,"NOT_FOUND","wrong project")).when(work).get(1,"actor",70);
        clearInvocations(db);denied(()->service.download(1,"actor",70,id),"NOT_FOUND");denied(()->service.list(1,"actor",70),"NOT_FOUND");verifyNoInteractions(db);
    }
    @Test void qaCapableReadTransactionsRemainCompatibleWithTypedLocks() throws Exception {
        var tx=EvidenceService.class.getAnnotation(Transactional.class);assertNotNull(tx);assertFalse(tx.readOnly());
        assertEquals(org.springframework.transaction.annotation.Propagation.REQUIRED,tx.propagation());
        for(String name:List.of("list","download")) {
            var method=Arrays.stream(EvidenceService.class.getMethods()).filter(m->m.getName().equals(name)).findFirst().orElseThrow();
            var own=method.getAnnotation(Transactional.class);assertTrue(own==null||!own.readOnly(),name+" must allow QA detail locks");
        }
    }
    @Test void qaDependencyIsMandatory() {
        assertThrows(NullPointerException.class,()->new EvidenceService(db,work,audit,null,root.toString()));
        assertEquals(1,EvidenceService.class.getConstructors().length);
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    void useActualQaPolicy(String scenario) {
        var identity=mock(vn.syp.tms.filework.FileWorkGuard.class);
        var account=mock(vn.syp.tms.identity.IdentityUserRepository.CurrentAccount.class);
        String global=switch(scenario){case "PM"->"PM";case "DEV","OLD_DEV","GLOBAL_DEV_PM"->"DEV";default->"TESTER";};
        String role=switch(scenario){case "PM","GLOBAL_DEV_PM"->"PM";case "DEV","OLD_DEV","REVOKED_CREATOR","PROJECT_DEV_ONLY"->"DEV";default->"TESTER";};
        when(account.getRole()).thenReturn(global);when(identity.lockIdentity("actor")).thenReturn(account);
        if(scenario.equals("DISABLED_OR_STALE_SESSION"))doThrow(new BusinessException(401,"UNAUTHENTICATED","current identity rejected")).when(identity).lockIdentity("actor");
        var item=new HashMap<String,Object>(Map.of("id",70L,"type","QA","status",scenario.equals("CLOSED")?"closed":"open","generation",0L,"createdBy",7L,"assigneeMembershipId",scenario.equals("OLD_DEV")?8L:7L));
        if(scenario.equals("SOURCE_NOT_COMMITTED"))item.put("documentId",10L);
        when(db.row(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("FROM projects"))return scenario.equals("ARCHIVED_PROJECT")?Map.of("id",1L,"archivedAt",java.time.Instant.EPOCH):Map.of("id",1L);
            if(sql.contains("FROM project_memberships")){
                if(scenario.equals("REVOKED_MEMBERSHIP"))throw new BusinessException(404,"NOT_FOUND","inactive membership");
                return Map.of("id",7L,"projectRole",role);
            }
            if(sql.contains("FROM work_items"))return new HashMap<>(item);
            if(sql.contains("FROM import_batches"))return Map.of("id",10L,"status","PREVIEW","fileName","cases.xlsx");
            return Map.of("uploaded_by",7L);
        });
        when(db.rows(anyString(),any(Object[].class))).thenAnswer(i->i.<String>getArgument(0).contains("FROM work_items")?List.of(Map.of("id",70L)):List.of(Map.of("id",id)));
        service=new EvidenceService(db,work,audit,new QaService(db,identity,audit,new com.fasterxml.jackson.databind.ObjectMapper()),root.toString());
    }
    @ParameterizedTest @CsvSource({"OLD_DEV,FORBIDDEN","REVOKED_CREATOR,FORBIDDEN","GLOBAL_DEV_PM,FORBIDDEN","PROJECT_DEV_ONLY,FORBIDDEN","CLOSED,INVALID_QA_STATE","ARCHIVED_PROJECT,ARCHIVED","SOURCE_NOT_COMMITTED,INVALID_QA_CONTEXT","REVOKED_MEMBERSHIP,NOT_FOUND","DISABLED_OR_STALE_SESSION,UNAUTHENTICATED"})
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    void actualCanonicalPolicyBlocksOldDevRevokedCreatorClosedSourceAndRoleEscapes(String scenario,String code) throws Exception {
        useActualQaPolicy(scenario);var file=spy(file());
        denied(()->service.upload(1,"actor",70,file),code);denied(()->service.delete(1,"actor",70,id),code);
        verifyNoInteractions(file,work,audit);verify(db,never()).rows(contains("sha256"),any(Object[].class));
        verify(db,never()).row(contains("uploaded_by"),any(Object[].class));verify(db,never()).update(anyString(),any(Object[].class));assertTrue(files().isEmpty());
    }
    @ParameterizedTest @CsvSource({"PM","TESTER","DEV"})
    void actualCanonicalPolicyAllowsPmCreatorTesterAssignedDevDuplicateAndDelete(String scenario) throws Exception {
        useActualQaPolicy(scenario);assertEquals(id,service.upload(1,"actor",70,file()).get("id"));assertTrue(files().isEmpty());
        Files.write(root.resolve(id),content);service.delete(1,"actor",70,id);commit();assertFalse(Files.exists(root.resolve(id)));verifyNoInteractions(work);
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void sizeContentLimitAndPathGuardsStillPreventStorageChanges() throws Exception {
        var oversized=mock(org.springframework.web.multipart.MultipartFile.class);when(oversized.getSize()).thenReturn((long)EvidenceContent.MAX_BYTES+1);
        denied(()->service.upload(1,"actor",70,oversized),"FILE_TOO_LARGE");verify(oversized,never()).getInputStream();
        var active=new MockMultipartFile("file","proof.pdf","application/pdf","%PDF-1.7\n/JavaScript (bad)\n%%EOF".getBytes());
        assertEquals(422,assertThrows(BusinessException.class,()->service.upload(1,"actor",70,active)).status());
        when(db.count(contains("COUNT(*) FROM work_item_attachments"),any(Object[].class))).thenReturn(100L);
        denied(()->service.upload(1,"actor",70,file()),"ATTACHMENT_LIMIT");assertTrue(files().isEmpty());
        denied(()->service.download(1,"actor",70,"../outside"),"NOT_FOUND");verify(db,never()).update(anyString(),any(Object[].class));
    }
}
