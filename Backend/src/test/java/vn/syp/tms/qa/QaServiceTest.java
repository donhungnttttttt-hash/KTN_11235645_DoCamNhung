package vn.syp.tms.qa;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.syp.tms.filework.FileWorkGuard;
import vn.syp.tms.identity.IdentityUserRepository;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class QaServiceTest {
    WorkItemStore db=mock(WorkItemStore.class);
    FileWorkGuard guard=mock(FileWorkGuard.class);
    ProjectAudit audit=mock(ProjectAudit.class);
    ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    QaService service=new QaService(db,guard,audit,json);
    Map<String,Object> item, project, source;
    Map<String,Map<String,Object>> commands=new HashMap<>();
    List<Map<String,Object>> answers=new ArrayList<>(), confirmations=new ArrayList<>();
    String global="TESTER", role="TESTER"; long member=7, next=100;
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @BeforeEach void setup() {
        var account=mock(IdentityUserRepository.CurrentAccount.class);
        when(account.getRole()).thenAnswer(i->global);when(guard.lockIdentity("user")).thenReturn(account);
        project=map("id",1L,"code","TMS");
        item=map("id",40L,"projectId",1L,"itemNo",4L,"key","TMS-4","type","QA","title","Question",
            "question","Which behavior?","status","open","priority","MEDIUM","createdBy",7L,
            "creatorName","Tester","createdAt",Instant.EPOCH,"updatedAt",Instant.EPOCH,"version",0L,
            "generation",0L,"contextSnapshot","{}");
        source=map("revisionId",30L,"testCaseId",20L,"revisionNo",1,"caseNo","TC-1","title","Case",
            "steps","Steps","expected","Expected");
        when(db.encode(any())).thenAnswer(i->json.writeValueAsString(i.getArgument(0)));
        when(db.checksum(any())).thenAnswer(i->HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(i.getArgument(0)))));
        when(db.row(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);Object[] a=Arrays.copyOfRange(i.getArguments(),1,i.getArguments().length);
            if(sql.contains("FROM projects"))return project;
            if(sql.contains("user_id=? AND active=TRUE"))return map("id",member,"projectRole",role);
            if(sql.contains("FROM project_memberships"))return map("id",8L);
            if(sql.contains("FROM work_items"))return new HashMap<>(item);
            if(sql.contains("FROM qa_answers"))return answers.stream().filter(r->Objects.equals(r.get("id"),a[a.length-1])).findFirst().orElseThrow();
            if(sql.contains("FROM qa_confirmations"))return confirmations.stream().filter(r->Objects.equals(r.get("id"),a[a.length-1])).findFirst().orElseThrow();
            if(sql.contains("FROM test_case_revisions"))return source;
            if(sql.contains("FROM import_batches"))return map("id",10L,"fileName","cases.xlsx","status","COMMITTED");
            if(sql.contains("FROM file_work_groups"))return map("id",11L,"documentId",10L);
            if(sql.contains("FROM run_items"))return map("id",12L,"testCaseId",20L,"revisionId",30L);
            if(sql.contains("FROM file_work_group_items") || sql.contains("FROM import_rows"))return map("id",1L);
            throw new AssertionError("Unexpected row: "+sql);
        });
        when(db.rows(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("FROM qa_commands")){var c=commands.get(i.getArguments()[2]);return c==null?List.of():List.of(c);}
            if(sql.contains("FROM project_memberships"))return List.of(map("id",i.getArguments()[2]));
            if(sql.contains("FROM work_items")&&sql.endsWith("FOR SHARE"))return List.of(new HashMap<>(item));
            if(sql.contains("FROM work_items"))return List.of();
            return List.of();
        });
        when(db.count(anyString(),any(Object[].class))).thenAnswer(i->i.<String>getArgument(0).contains("MAX(answer_version)")?(long)answers.size():4L);
        when(db.insert(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);Object[] a=i.getArguments();long id=next++;
            if(sql.startsWith("INSERT INTO qa_answers"))answers.add(map("id",id,"workItemId",40L,"generation",a[3],"answerVersion",a[4],"body",a[5],"basisReference",a[6],"authorMembershipId",a[7],"authorName","Dev","answeredAt",Instant.EPOCH));
            if(sql.startsWith("INSERT INTO qa_confirmations")){var answer=answers.getLast();confirmations.add(map("id",id,"workItemId",40L,"generation",a[3],"answerId",a[4],"answerVersion",answer.get("answerVersion"),"body",a[5],"confirmedBy",a[6],"confirmerName","Tester","confirmedAt",Instant.EPOCH));}
            return sql.startsWith("INSERT INTO work_items")?40L:id;
        });
        when(db.update(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);Object[] a=i.getArguments();
            if(sql.startsWith("UPDATE work_items SET status_code")){item.put("status",a[1]);item.put("assigneeMembershipId",a[2]);item.put("version",((Number)item.get("version")).longValue()+1);}
            if(sql.startsWith("UPDATE qa_details SET generation")){item.put("generation",a[1]);item.put("currentAnswerId",a[2]);item.put("currentConfirmationId",a[3]);item.put("currentAnswerVersion",a[2]==null?null:answers.stream().filter(r->Objects.equals(r.get("id"),a[2])).findFirst().orElseThrow().get("answerVersion"));item.put("confirmedAnswerId",a[3]==null?null:a[2]);item.put("confirmationGeneration",a[3]==null?null:a[1]);}
            if(sql.startsWith("INSERT INTO qa_commands"))commands.put((String)a[5],map("workItemId",a[2],"action",a[3],"actorMembershipId",a[4],"checksum",a[6],"response",a[7]));
            return 1;
        });
    }
    static Map<String,Object> map(Object...args){var m=new HashMap<String,Object>();for(int i=0;i<args.length;i+=2)m.put((String)args[i],args[i+1]);return m;}
    void error(String code,Runnable action){assertEquals(code,assertThrows(BusinessException.class,action::run).code());}
    void pm(){role="PM";global="PM";member=9;}
    void dev(){role="DEV";global="DEV";member=8;item.put("assigneeMembershipId",8L);}
    void tester(){role="TESTER";global="TESTER";member=7;}
    long version(){return ((Number)item.get("version")).longValue();}
    QaDtos.Create create(){return new QaDtos.Create(" Question "," Which behavior? ",null,null,null,null,null,null,null,"create_key");}
    QaDtos.Command command(String key){return new QaDtos.Command(" reason ",version(),key);}
    QaDtos.QaDetail answer(String key){return service.answer(1,"user",40,new QaDtos.Answer(" Answer ","https://example.test/spec",version(),key));}
    QaDtos.QaDetail confirm(String key){return service.confirm(1,"user",40,new QaDtos.Confirm((Long)item.get("currentAnswerId"),(Long)item.get("currentAnswerVersion")," Confirmed ",version(),key));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void creatorCanCreateStandaloneWithoutNgOrFixedBuild(){var result=service.create(1,"user",create());assertEquals("QA",result.item().type());verify(db).update(contains("INSERT INTO qa_details"),any(Object[].class));verify(db).update(contains("UPDATE project_counters"),eq(1L));verify(audit).record(1L,"user","QA",40L,"CREATE");}
    @Test void disabledIdentityStopsBeforeProjectReads(){when(guard.lockIdentity("user")).thenThrow(new BusinessException(401,"UNAUTHENTICATED","disabled"));error("UNAUTHENTICATED",()->service.create(1,"user",create()));verifyNoInteractions(db);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void globalDevCannotExploitTesterMembershipToCreate(){global="DEV";error("FORBIDDEN",()->service.create(1,"user",create()));verify(db,never()).rows(contains("qa_commands"),any(Object[].class));}
    @Test void wrongGlobalOrProjectRoleCannotAnswer(){role="DEV";error("FORBIDDEN",()->answer("answer_key"));dev();role="PM";error("FORBIDDEN",()->answer("answer_key"));}
    @Test void unassignedDevCannotAnswer(){dev();item.put("assigneeMembershipId",12L);error("NOT_ASSIGNED",()->answer("answer_key"));}
    @Test void lifecycleRetainsAuthoritativeAnswerAndConfirmation(){pm();service.assign(1,"user",40,new QaDtos.Assign(8L,"assign",0L,"assign_key"));dev();service.start(1,"user",40,command("start_key"));var response=answer("answer_key");assertEquals("resolved",response.item().status());assertEquals("Answer",response.currentAnswer().body());tester();response=confirm("confirm_key");assertEquals("recheck",response.item().status());assertEquals(response.currentAnswer().id(),response.currentConfirmation().answerId());pm();response=service.close(1,"user",40,new QaDtos.Close("complete",false,version(),"close_key"));assertEquals("closed",response.item().status());assertEquals(5L,response.item().version());assertEquals(1,answers.size());assertEquals(1,confirmations.size());}
    @Test void sameDevAssignmentIsVersionedNoopDifferentDevInvalidates(){dev();answer("answer_key");long pin=(Long)item.get("currentAnswerId");pm();var same=service.assign(1,"user",40,new QaDtos.Assign(8L,"same",version(),"same_dev_key"));assertEquals("resolved",same.item().status());assertEquals(pin,same.item().currentAnswerId());assertEquals(0,same.item().generation());var other=service.assign(1,"user",40,new QaDtos.Assign(10L,"transfer",version(),"other_dev_key"));assertEquals("open",other.item().status());assertNull(other.currentAnswer());assertEquals(1,other.item().generation());assertEquals(1,answers.size());}
    @Test void reanswerClearsConfirmationAndMonotonicallyIncrementsVersion(){dev();answer("answer_key");tester();confirm("confirm_key");dev();var result=answer("replacement_key");assertEquals(2,result.currentAnswer().answerVersion());assertNull(result.currentConfirmation());assertEquals("resolved",result.item().status());assertEquals(1,confirmations.size());}
    @Test void onlyCurrentTesterCreatorCanConfirm(){dev();answer("answer_key");tester();member=11;error("NOT_QA_CREATOR",()->confirm("confirm_key"));tester();global="DEV";error("FORBIDDEN",()->confirm("confirm_key"));pm();item.put("createdBy",9L);error("FORBIDDEN",()->confirm("confirm_key"));}
    @Test void staleAnswerCannotConfirmEvenWithCurrentWorkVersion(){dev();var old=answer("answer_key").currentAnswer();answer("replacement_key");tester();error("ANSWER_VERSION_CONFLICT",()->service.confirm(1,"user",40,new QaDtos.Confirm(old.id(),old.answerVersion(),"confirm",version(),"confirm_key")));assertTrue(confirmations.isEmpty());}
    @Test void closeRequiresConfirmationOrExplicitException(){pm();error("QA_CONFIRMATION_REQUIRED",()->service.close(1,"user",40,new QaDtos.Close("done",false,0L,"close_key")));var result=service.close(1,"user",40,new QaDtos.Close("cancel duplicate",true,0L,"close_key"));assertEquals("closed",result.item().status());assertNull(result.currentConfirmation());}
    @Test void reopenInvalidatesPointersRetainsHistory(){dev();answer("answer_key");tester();confirm("confirm_key");pm();service.close(1,"user",40,new QaDtos.Close("done",false,version(),"close_key"));var result=service.reopen(1,"user",40,command("reopen_key"));assertEquals("open",result.item().status());assertEquals(1,result.item().generation());assertNull(result.currentAnswer());assertNull(result.currentConfirmation());assertEquals(1,confirmations.size());}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void exactReplayReturnsOriginalAfterStateAndVersionChange(){dev();var input=new QaDtos.Answer("original",null,0L,"answer_key");var first=service.answer(1,"user",40,input);answer("replacement_key");clearInvocations(db,audit);assertEquals(first,service.answer(1,"user",40,input));verify(db,never()).update(anyString(),any(Object[].class));verify(db,never()).insert(anyString(),any(Object[].class));verifyNoInteractions(audit);}
    @Test void changedBodyOrResourceKeyConflicts(){dev();answer("answer_key");error("IDEMPOTENCY_CONFLICT",()->service.answer(1,"user",40,new QaDtos.Answer("changed",null,0L,"answer_key")));commands.get("answer_key").put("workItemId",99L);error("IDEMPOTENCY_CONFLICT",()->answer("answer_key"));}
    @Test void reassignedDevCannotReplayOldAnswer(){dev();var input=new QaDtos.Answer("answer",null,0L,"answer_key");service.answer(1,"user",40,input);item.put("assigneeMembershipId",10L);error("NOT_ASSIGNED",()->service.answer(1,"user",40,input));}
    @Test void staleVersionDoesNotPersistKey(){dev();error("VERSION_CONFLICT",()->service.answer(1,"user",40,new QaDtos.Answer("answer",null,9L,"answer_key")));assertTrue(commands.isEmpty());assertTrue(answers.isEmpty());}
    @Test void terminalBlocksMutationExceptPmReopen(){dev();item.put("status","closed");error("INVALID_QA_STATE",()->answer("answer_key"));pm();error("INVALID_QA_STATE",()->service.assign(1,"user",40,new QaDtos.Assign(8L,"assign",0L,"assign_key")));}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void provideInfoAddsInternalCommentWithoutChangingQuestion(){dev();service.requestInfo(1,"user",40,command("request_key"));tester();var result=service.provideInfo(1,"user",40,new QaDtos.ProvideInfo("More detail",version(),"provide_key"));assertEquals("progress",result.item().status());assertEquals("Which behavior?",result.item().question());verify(db).insert(contains("INSERT INTO work_item_comments"),eq(1L),eq(40L),eq("More detail"),eq(7L),argThat(k->k instanceof String s&&s.startsWith("qa:")&&s.length()==63));}
    @Test void conflictingPinnedRevisionRejected(){var input=new QaDtos.Create("Q","Body",null,null,null,10L,11L,12L,99L,"create_key");error("INVALID_QA_CONTEXT",()->service.create(1,"user",input));assertTrue(commands.isEmpty());}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void runResolvesCaseAndRevisionWithoutApprovalOrResultRequirement(){var input=new QaDtos.Create("Q","Body",null,null,null,10L,11L,12L,null,"create_key");service.create(1,"user",input);verify(db).update(contains("INSERT INTO qa_details"),eq(1L),eq(40L),eq("Body"),eq(10L),eq(11L),eq(12L),eq(20L),eq(30L),anyString());}
    @Test void archivedCaseBlocksSourceReplayButPmCanCloseExistingQa(){item.put("revisionId",30L);item.put("testCaseId",20L);dev();var input=new QaDtos.Answer("answer",null,0L,"answer_key");service.answer(1,"user",40,input);source.put("archivedAt",Instant.EPOCH);error("ARCHIVED",()->service.answer(1,"user",40,input));pm();assertEquals("closed",service.close(1,"user",40,new QaDtos.Close("archive exception",true,version(),"close_key")).item().status());}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void identityProjectMemberAndItemAreLockedBeforeSourceAndReplay(){
        item.put("revisionId",30L);item.put("testCaseId",20L);dev();answer("answer_key");
        var order=inOrder(guard,db);order.verify(guard).lockIdentity("user");
        order.verify(db).row(contains("FROM projects WHERE id=? FOR UPDATE"),eq(1L));
        order.verify(db).row(contains("user_id=? AND active=TRUE FOR UPDATE"),eq(1L),eq("user"));
        order.verify(db).row(contains("w.id=? FOR UPDATE"),eq(1L),eq(40L));
        order.verify(db).row(contains("rv.id=? FOR SHARE"),eq(1L),eq(30L));
        order.verify(db).rows(contains("FROM qa_commands"),eq(1L),eq("answer_key"));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void realIdentityGuardRejectsStaleSessionBeforeProjectRead(){
        var identities=mock(vn.syp.tms.identity.IdentityService.class);var account=mock(IdentityUserRepository.CurrentAccount.class);
        when(identities.lockCurrent("user")).thenReturn(account);
        var principal=new vn.syp.tms.identity.SessionPrincipal("user",1L);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
            org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(principal,null,List.of()));
        doReturn(map("version",2L)).when(db).row(contains("lock_version AS version FROM identity_users"),eq("user"));
        var guarded=new QaService(db,new FileWorkGuard(db,identities),audit,json);
        try{error("UNAUTHENTICATED",()->guarded.detail(1,"user",40));verify(db,never()).row(contains("FROM projects"),any(Object[].class));}
        finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void revokedMembershipCannotReplayAndArchivedProjectBlocksWrite(){
        dev();answer("answer_key");project.put("archivedAt",Instant.EPOCH);error("ARCHIVED",()->answer("answer_key"));
        project.remove("archivedAt");when(db.row(contains("user_id=? AND active=TRUE"),any(Object[].class))).thenThrow(new BusinessException(404,"NOT_FOUND","revoked"));
        clearInvocations(db);error("NOT_FOUND",()->answer("answer_key"));verify(db,never()).rows(contains("qa_commands"),any(Object[].class));
    }
    @Test void memberAdminAndGlobalDevDoNotGainPmCommands(){
        for(String globalRole:List.of("ADMIN","DEV","TESTER")){global=globalRole;role="MEMBER";error("FORBIDDEN",()->service.assign(1,"user",40,new QaDtos.Assign(8L,"reason",0L,"assign_key")));}
        global="DEV";role="PM";error("FORBIDDEN",()->service.close(1,"user",40,new QaDtos.Close("reason",true,0L,"close_key")));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void targetDevMustBeCurrentEnabledGlobalAndProjectDev(){
        pm();when(db.rows(contains("FROM project_memberships"),any(Object[].class))).thenReturn(List.of());
        error("INVALID_ASSIGNEE",()->service.assign(1,"user",40,new QaDtos.Assign(8L,"reason",0L,"assign_key")));
        verify(db).rows(contains("m.project_role='DEV' AND u.enabled=TRUE AND u.role_code='DEV' FOR SHARE"),eq(1L),eq(8L));
        assertTrue(commands.isEmpty());
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void wrongItemTypeAndCrossProjectSourceAreRejected(){
        item.put("type","BUG");dev();error("WRONG_ITEM_TYPE",()->answer("answer_key"));
        item.put("type","QA");tester();doThrow(new BusinessException(404,"NOT_FOUND","other project")).when(db).row(contains("FROM import_batches"),eq(1L),eq(99L));
        error("NOT_FOUND",()->service.create(1,"user",new QaDtos.Create("Q","body",null,null,null,99L,null,null,null,"create_key")));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void uncommittedDocumentAndGroupDocumentMismatchRejected(){
        when(db.row(contains("FROM import_batches"),any(Object[].class))).thenReturn(map("id",10L,"status","PREVIEW","fileName","draft.xlsx"));
        error("INVALID_QA_CONTEXT",()->service.create(1,"user",new QaDtos.Create("Q","body",null,null,null,10L,null,null,null,"create_key")));
        error("INVALID_QA_CONTEXT",()->service.create(1,"user",new QaDtos.Create("Q","body",null,null,null,99L,11L,null,null,"create_key")));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void replayRequiresCurrentDocumentUsability(){
        item.put("documentId",10L);dev();var input=new QaDtos.Answer("answer",null,0L,"answer_key");service.answer(1,"user",40,input);
        when(db.row(contains("FROM import_batches"),any(Object[].class))).thenReturn(map("id",10L,"status","PREVIEW","fileName","draft.xlsx"));
        error("INVALID_QA_CONTEXT",()->service.answer(1,"user",40,input));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void failedStateAndInvalidInputNeverReserveKey(){
        dev();item.put("status","resolved");error("INVALID_QA_STATE",()->service.start(1,"user",40,command("start_key")));
        error("INVALID_ANSWER",()->service.answer(1,"user",40,new QaDtos.Answer("  ",null,0L,"answer_key")));
        error("INVALID_ANSWER",()->service.answer(1,"user",40,new QaDtos.Answer("answer","x".repeat(1001),0L,"answer_key")));
        error("REASON_REQUIRED",()->service.requestInfo(1,"user",40,new QaDtos.Command(" ",0L,"request_key")));
        error("INVALID_QUESTION",()->service.answer(1,"user",40,new QaDtos.Answer("answer",null,0L,"bad")));
        assertTrue(commands.isEmpty());assertTrue(answers.isEmpty());verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void confirmVersionMismatchAndRepeatWithNewKeyFail(){
        dev();answer("answer_key");tester();
        error("ANSWER_VERSION_CONFLICT",()->service.confirm(1,"user",40,new QaDtos.Confirm((Long)item.get("currentAnswerId"),99L,"yes",version(),"confirm_key")));
        var input=new QaDtos.Confirm((Long)item.get("currentAnswerId"),1L,"yes",version(),"confirm_key");var saved=service.confirm(1,"user",40,input);
        assertEquals(saved,service.confirm(1,"user",40,input));error("INVALID_QA_STATE",()->confirm("another_confirm_key"));assertEquals(1,confirmations.size());
    }
    @Test void closureRequiresExactCurrentConfirmationPins(){
        dev();answer("answer_key");tester();confirm("confirm_key");pm();
        item.put("confirmedAnswerId",999L);error("QA_CONFIRMATION_REQUIRED",()->service.close(1,"user",40,new QaDtos.Close("done",false,version(),"close_key")));
        item.put("confirmedAnswerId",item.get("currentAnswerId"));item.put("confirmationGeneration",999L);
        error("QA_CONFIRMATION_REQUIRED",()->service.close(1,"user",40,new QaDtos.Close("done",false,version(),"close_key")));
    }
    @Test void capabilitiesDistinguishConfirmedCloseExceptionAndCurrentRoles(){
        pm();var detail=service.detail(1,"user",40);assertTrue(detail.item().capabilities().canCloseException());assertFalse(detail.item().capabilities().canClose());
        dev();answer("answer_key");tester();assertTrue(service.detail(1,"user",40).item().capabilities().canConfirm());confirm("confirm_key");
        pm();assertTrue(service.detail(1,"user",40).item().capabilities().canClose());global="DEV";
        assertFalse(service.detail(1,"user",40).item().capabilities().canCloseException());
        assertFalse(service.detail(1,"user",40).item().capabilities().canAssign());
    }
    @Test void archivedSourceDisablesNormalCapabilitiesButAllowsPmException(){
        pm();item.put("revisionId",30L);item.put("testCaseId",20L);source.put("archivedAt",Instant.EPOCH);
        var caps=service.detail(1,"user",40).item().capabilities();assertFalse(caps.canAssign());assertFalse(caps.canComment());assertTrue(caps.canCloseException());
    }
    @Test void writerHelperEnforcesCreatorAndAssignmentWithoutGenericRoleEscape(){
        assertEquals(7,service.authorizeWriter(1,"user",40).actor().membershipId());member=11;
        error("FORBIDDEN",()->service.authorizeWriter(1,"user",40));dev();assertEquals(8,service.authorizeWriter(1,"user",40).actor().membershipId());
        item.put("assigneeMembershipId",11L);error("FORBIDDEN",()->service.authorizeWriter(1,"user",40));pm();item.put("status","closed");
        error("INVALID_QA_STATE",()->service.authorizeWriter(1,"user",40));error("QA_COMMAND_REQUIRED",()->QaService.rejectGenericMutation("QA"));
        assertDoesNotThrow(()->QaService.rejectGenericMutation("BUG"));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void listUsesLiteralKeywordServerActorStableOrderAndExactEnvelope() throws Exception {
        dev();var result=service.list(1,"user",new QaDtos.Filter(2,10,true,"resolved","_%"));
        verify(db).rows(contains("ORDER BY w.updated_at DESC,w.id DESC LIMIT ? OFFSET ? FOR UPDATE"),eq(1L),eq("resolved"),eq("_%"),eq("_%"),eq("_%"),eq(8L),eq(10),eq(20L));
        var tree=json.readTree(json.writeValueAsString(result));assertTrue(tree.has("size"));assertFalse(tree.has("pageSize"));assertEquals(4,tree.get("totalItems").asInt());
        error("INVALID_PAGE",()->service.list(1,"user",new QaDtos.Filter(-1,20,false,null,null)));
        error("INVALID_QA_STATE",()->service.list(1,"user",new QaDtos.Filter(0,20,false,"wontfix",null)));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void historyPaginationIsScopedStableAndContainsTypedRows(){
        dev();answer("answer_key");tester();confirm("confirm_key");
        when(db.rows(contains("FROM qa_answers a"),any(Object[].class))).thenReturn(answers);
        when(db.rows(contains("FROM qa_confirmations c"),any(Object[].class))).thenReturn(confirmations);
        assertEquals(1,service.answers(1,"user",40,0,20).items().getFirst().answerVersion());
        assertEquals(1,service.confirmations(1,"user",40,0,20).items().getFirst().answerVersion());
        verify(db).rows(contains("ORDER BY a.answer_version DESC LIMIT ? OFFSET ? FOR SHARE"),eq(1L),eq(40L),eq(20),eq(0L));
        verify(db).rows(contains("ORDER BY c.id DESC LIMIT ? OFFSET ? FOR SHARE"),eq(1L),eq(40L),eq(20),eq(0L));
        error("INVALID_PAGE",()->service.answers(1,"user",40,0,101));
    }
    @Test void createControllerUsesSessionActorAndReturns201Location(){
        var mocked=mock(QaService.class);var detail=service.detail(1,"user",40);when(mocked.create(1,"user",create())).thenReturn(detail);
        var auth=org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(new vn.syp.tms.identity.SessionPrincipal("user",0L),null,List.of());
        var response=new QaController(mocked).create(auth,1,create());assertEquals(201,response.getStatusCode().value());assertEquals("/api/v1/projects/1/qa/40",java.util.Objects.requireNonNull(response.getHeaders().getLocation(),"Created response must include Location").toString());
        verify(mocked).create(1,"user",create());
    }
    @Test void dtoValidatesMalformedBodyAndAllRoutesUseTypedBodies(){
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()){
            var validator=factory.getValidator();assertFalse(validator.validate(new QaDtos.Create(" ","Q","URGENT",0L,null,null,null,null,null,"bad")).isEmpty());
            assertFalse(validator.validate(new QaDtos.Confirm(0L,0L," ",-1L,"bad")).isEmpty());
            assertTrue(validator.validate(create()).isEmpty());
        }
        for(var method:QaController.class.getDeclaredMethods())for(var parameter:method.getParameters())
            if(parameter.isAnnotationPresent(org.springframework.web.bind.annotation.RequestBody.class))assertTrue(parameter.isAnnotationPresent(jakarta.validation.Valid.class));
    }
    @Test void detailNeverRequestsExclusiveLocksOnCreatorOrAssigneeIdentity(){
        item.put("assigneeMembershipId",8L);item.put("assigneeName","Dev");pm();
        var detail=service.detail(1,"user",40);
        assertEquals("Tester",detail.item().creatorName());assertEquals("Dev",detail.item().assigneeName());
        assertAuthoritativeItemLockScope();
    }
    @Test void mutationNeverRequestsExclusiveLocksOnJoinedIdentityOrAnswerHistory(){
        dev();var result=answer("lock_scope_answer");assertEquals("resolved",result.item().status());
        assertAuthoritativeItemLockScope();
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void listNeverRequestsExclusiveLocksOnCreatorOrAssigneeIdentity(){
        item.put("assigneeMembershipId",8L);item.put("assigneeName","Dev");pm();
        doAnswer(i->List.of(new HashMap<>(item))).when(db).rows(contains("FROM work_items"),any(Object[].class));
        var result=service.list(1,"user",new QaDtos.Filter(0,20,false,null,null));
        assertEquals("Tester",result.items().getFirst().creatorName());assertEquals("Dev",result.items().getFirst().assigneeName());
        assertAuthoritativeItemLockScope();
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    private void assertAuthoritativeItemLockScope(){
        var exclusive=mockingDetails(db).getInvocations().stream()
            .filter(i->Set.of("row","rows").contains(i.getMethod().getName()))
            .map(i->(String)i.getArguments()[0])
            .filter(sql->sql.contains("FROM work_items")&&sql.contains("FOR UPDATE")).toList();
        assertFalse(exclusive.isEmpty(),"Work item/QA authority must still receive exclusive locks");
        for(var sql:exclusive)for(var table:List.of("identity_users","project_memberships","qa_answers","qa_confirmations"))
            assertFalse(sql.contains(table),"Unqualified exclusive item read must not lock joined "+table);
        verify(db,atLeastOnce()).rows(argThat(sql->sql.contains("JOIN identity_users")&&sql.endsWith("FOR SHARE")),any(Object[].class));
    }
}
