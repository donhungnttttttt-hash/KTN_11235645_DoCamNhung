package vn.syp.tms.workitem;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.retest.BugRetestLifecycle;
import vn.syp.tms.rules.RuleService;
import vn.syp.tms.qa.QaService;
import vn.syp.tms.qa.QaDtos;
import vn.syp.tms.shared.web.BusinessException;

class DeveloperPermissionsTest {
    private static @org.springframework.lang.NonNull String itemLookupSql() {
        String fragment="WHERE w.project_id=? AND w.id=?";
        contains(fragment);return fragment;
    }
    final WorkItemStore db=mock(WorkItemStore.class);
    final BugRetestLifecycle retest=mock(BugRetestLifecycle.class);
    final QaService qa=mock(QaService.class);
    final RuleService rules=mock(RuleService.class);
    final WorkItemService service=spy(new WorkItemService(db,mock(ProjectAudit.class),retest,rules,qa));
    final Map<String,Object> member=Map.of("id",7L,"role","DEV","systemRole","DEV");
    Map<String,Object> item(String type,String status,long assigned) {return new HashMap<>(Map.of("id",11L,"type",type,"status",status,"assigneeMembershipId",assigned,"version",2L));}
    void fixture(Map<String,Object> item){doReturn(member).when(service).writable(1L,"dev");doReturn(item).when(service).get(1L,"dev",11L);}
    @Test void deniesUnassignedNonBugTerminalAndOtherDestinations(){
        for(var item:List.of(item("BUG","open",8),item("TASK","open",7),item("BUG","closed",7))) {
            fixture(item);assertEquals(403,assertThrows(BusinessException.class,()->service.transition(1,"dev",11,new WorkItemDtos.Transition("progress","fix",null,2L))).status());
        }
        fixture(item("BUG","open",7));
        for(String status:List.of("closed","open","reopened","wontfix","in_progress"))assertEquals(403,assertThrows(BusinessException.class,()->service.transition(1,"dev",11,new WorkItemDtos.Transition(status,"fix",null,2L))).status());
        verifyNoInteractions(retest);
    }
    @Test void assignedDevCanResolveOnlyWithBuildAndInvalidatesRetest(){
        fixture(item("BUG","progress",7));
        when(db.row("SELECT terminal FROM work_item_statuses WHERE code=?","resolved")).thenReturn(Map.of("terminal",false));
        assertEquals("FIXED_BUILD_REQUIRED",assertThrows(BusinessException.class,()->service.transition(1,"dev",11,new WorkItemDtos.Transition("resolved","fixed",null,2L))).code());
        reset(retest);
        when(db.row("SELECT id FROM builds WHERE project_id=? AND id=? AND archived_at IS NULL",1L,3L)).thenReturn(Map.of("id",3L));
        service.transition(1,"dev",11,new WorkItemDtos.Transition("resolved","fixed",3L,2L));
        verify(retest).invalidate(1,11,false);
        verify(db).update("UPDATE bug_details SET fixed_build_id=? WHERE project_id=? AND work_item_id=?",3L,1L,11L);
    }
    @Test void versionAndReasonStillRequired(){
        fixture(item("BUG","open",7));
        assertEquals(409,assertThrows(BusinessException.class,()->service.transition(1,"dev",11,new WorkItemDtos.Transition("progress","fix",null,1L))).status());
        assertEquals(422,assertThrows(BusinessException.class,()->service.transition(1,"dev",11,new WorkItemDtos.Transition("progress","",null,2L))).status());
    }
    @Test void assignedDevCanStartUsingCanonicalProgressStatus(){
        fixture(item("BUG","open",7));
        when(db.row("SELECT terminal FROM work_item_statuses WHERE code=?","progress")).thenReturn(Map.of("terminal",false));
        service.transition(1,"dev",11,new WorkItemDtos.Transition("progress","Started investigation",null,2L));
        verify(db).update("UPDATE work_items SET status_code=? WHERE project_id=? AND id=?","progress",1L,11L);
        verifyNoInteractions(retest);
    }
    @Test void assignedDevGetsCanonicalProgressAndResolvedOptions(){
        var current=item("BUG","open",7);
        doReturn(member).when(service).membership(1L,"dev");
        when(db.row(itemLookupSql(),eq(1L),eq(11L))).thenReturn(current);
        var destinations=List.of(Map.<String,Object>of("id","progress","label","Đang xử lý"),Map.<String,Object>of("id","resolved","label","Đã xử lý"));
        when(db.rows("SELECT code AS id,label_vi AS label FROM work_item_statuses WHERE code IN ('progress','resolved') AND code<>? ORDER BY sort_order","open")).thenReturn(destinations);
        assertEquals(destinations,service.get(1L,"dev",11L).get("allowedTransitions"));
    }
    @Test void globalDevIsRestrictedEvenWithOldPmMembership(){
        assertTrue(WorkItemService.developer(Map.of("role","PM","systemRole","DEV")));
        doReturn(Map.of("id",7L,"role","PM","systemRole","DEV")).when(service).writable(1L,"dev");
        assertEquals(403,assertThrows(BusinessException.class,()->service.batch(1,"dev",null)).status());
    }

    @Test void qaMetadataUsesCurrentTypedAuthorityAndDistinctLabels(){
        when(rules.titlePrefix(1L)).thenReturn("");
        doReturn(Map.of("id",7L,"role","PM","systemRole","PM")).when(service).membership(1,"dev");
        var labels=List.of(Map.<String,Object>of("id","resolved","label","Đã sửa - chờ kiểm thử lại"));
        when(db.rows("SELECT code AS id,label_vi AS label,color,terminal FROM work_item_statuses ORDER BY sort_order")).thenReturn(labels);
        for(var current:List.of(new QaService.Actor(7,true,false,false,false),new QaService.Actor(7,false,true,false,false),
                new QaService.Actor(7,false,false,true,false),new QaService.Actor(7,false,false,false,false),new QaService.Actor(7,true,false,false,true))) {
            when(qa.authorize(1,"dev",false)).thenReturn(current);
            var metadata=service.metadata(1,"dev");
            assertFalse(metadata.containsKey("qaStatuses"));
            assertEquals(!current.archived()&&(current.pm()||current.tester()),metadata.get("canCreateQa"));
            assertTrue(((List<?>)metadata.get("types")).stream().anyMatch(type->((Map<?,?>)type).get("id").equals("QA")));
            var byType=(Map<?,?>)metadata.get("statusesByType");
            assertEquals(labels,byType.get("BUG"));
            assertTrue(((List<?>)byType.get("QA")).contains(Map.of("id","resolved","label","Đã trả lời","terminal",false)));
        }
        var ordered=inOrder(qa,service);
        ordered.verify(qa).authorize(1,"dev",false);
        ordered.verify(service).membership(1,"dev");
    }

    @Test void metadataDeniesInvalidCurrentIdentityBeforeLegacyMembership(){
        when(qa.authorize(1,"dev",false)).thenThrow(new BusinessException(401,"UNAUTHENTICATED","disabled/stale session"));
        assertEquals(401,assertThrows(BusinessException.class,()->service.metadata(1,"dev")).status());
        verify(service,never()).membership(anyLong(),anyString());
    }

    QaDtos.QaDetail qaDetail(boolean writable) {
        var caps=new QaDtos.Capabilities(false,false,false,false,false,false,false,false,false,writable,writable);
        return new QaDtos.QaDetail(new QaDtos.QaSummary(11,1,4,"P-4","QA","Current QA","Current question","resolved","Đã trả lời","MEDIUM",
            null,null,8L,"Current Dev",9L,"Current Tester",java.time.Instant.EPOCH,java.time.Instant.EPOCH,20,2,
            null,null,null,null,null,null,null,null,caps),Map.of("current",true),null,null);
    }

    @Test void genericQaGetUsesOnlyCurrentTypedProjectionAndCapabilities(){
        var discovery=item("QA","open",7);discovery.put("title","stale");discovery.put("canComment",true);
        when(db.row(itemLookupSql(),eq(1L),eq(11L))).thenReturn(discovery);
        when(qa.detail(1,"dev",11)).thenReturn(qaDetail(false));
        var detail=service.get(1,"dev",11);
        assertEquals("Current QA",detail.get("title"));assertEquals("Current question",detail.get("description"));
        assertEquals(20L,detail.get("version"));assertEquals(8L,detail.get("assigneeMembershipId"));
        assertEquals("resolved",detail.get("status"));assertEquals("Đã trả lời",detail.get("statusLabel"));
        assertEquals(List.of(),detail.get("allowedTransitions"));assertEquals(false,detail.get("canComment"));assertEquals(false,detail.get("canAttach"));
        assertFalse(detail.containsKey("fixedBuildId"));assertFalse(detail.containsKey("policyVersion"));
        verify(service,never()).membership(anyLong(),anyString());verifyNoInteractions(retest);
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void genericListAndOverviewProjectQaWithTypedLabelsAndCapabilities(){
        when(qa.authorize(1,"dev",false)).thenReturn(new QaService.Actor(7,false,false,true,false));
        doReturn(member).when(service).membership(1,"dev");
        when(qa.detail(1,"dev",11)).thenReturn(qaDetail(true));
        when(db.rows(contains("FROM work_items w"),any(Object[].class))).thenReturn(List.of(item("QA","resolved",7),item("BUG","resolved",7)));
        var rows=service.list(1,"dev",0,20,null,null,null,null,null,null).items();
        assertEquals("Đã trả lời",rows.getFirst().get("statusLabel"));assertEquals(true,rows.getFirst().get("canAttach"));
        assertEquals("BUG",rows.get(1).get("type"));
        var overview=(List<?>)service.overview(1,"dev").get("items");
        assertEquals("Đã trả lời",((Map<?,?>)overview.getFirst()).get("statusLabel"));
    }

    @Test void unchangedBugGetNeverEntersQaLockingGuardEvenInReadOnlyRetestCaller(){
        doReturn(member).when(service).membership(1,"dev");
        when(db.row(itemLookupSql(),eq(1L),eq(11L))).thenReturn(item("BUG","resolved",7));
        service.get(1,"dev",11);
        verifyNoInteractions(qa);
        assertNotNull(WorkItemService.class.getAnnotation(org.springframework.transaction.annotation.Transactional.class));
        for(String method:List.of("get","metadata","list","overview","history","comments")) {
            for(var m:WorkItemService.class.getDeclaredMethods())if(m.getName().equals(method)) {
                var tx=m.getAnnotation(org.springframework.transaction.annotation.Transactional.class);
                assertTrue(tx==null||!tx.readOnly(),method+" must inherit write transaction for QA locks");
            }
        }
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void qaTransitionNeverGrantsDevGenericCommandEvenWhenAssigned(){
        fixture(item("QA","open",7));
        assertEquals("QA_COMMAND_REQUIRED",assertThrows(BusinessException.class,()->service.transition(1,"dev",11,new WorkItemDtos.Transition("progress","start",null,2L))).code());
        verify(db,never()).update(anyString(),any(Object[].class));verifyNoInteractions(retest);
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void redmineQaStateRejectsBeforeIntegrationProjectionInWriteTransaction() throws Exception {
        when(db.row(itemLookupSql(),eq(1L),eq(11L))).thenReturn(item("QA","open",7));
        when(qa.detail(1,"dev",11)).thenReturn(qaDetail(false));
        var redmine=new vn.syp.tms.integration.RedmineService(db,service,
            mock(vn.syp.tms.integration.RedmineConfiguration.class),new com.fasterxml.jackson.databind.ObjectMapper(),mock(ProjectAudit.class));
        assertEquals("QA_COMMAND_REQUIRED",assertThrows(BusinessException.class,()->redmine.state(1,"dev",11)).code());
        verify(db,never()).rows(contains("redmine_bindings"),any(Object[].class));
        verify(db,never()).rows(contains("redmine_outbox"),any(Object[].class));
        verify(db,never()).rows(contains("redmine_delivery_attempts"),any(Object[].class));
        verify(service,never()).membership(anyLong(),anyString());
        var state=vn.syp.tms.integration.RedmineService.class.getMethod("state",long.class,String.class,long.class);
        var tx=state.getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        assertTrue(tx==null||!tx.readOnly());
        assertFalse(vn.syp.tms.integration.RedmineService.class.getAnnotation(org.springframework.transaction.annotation.Transactional.class).readOnly());
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void redmineNonQaStateKeepsProjectionAndQueueStillRequiresBug(){
        doReturn(Map.of("id",7L,"role","PM","systemRole","PM")).when(service).membership(1,"dev");
        doReturn(Map.of("id",7L,"role","PM","systemRole","PM")).when(service).writable(1,"dev");
        var redmine=new vn.syp.tms.integration.RedmineService(db,service,
            mock(vn.syp.tms.integration.RedmineConfiguration.class),new com.fasterxml.jackson.databind.ObjectMapper(),mock(ProjectAudit.class));
        for(String type:List.of("BUG","REQUEST","TASK","IMPROVEMENT")) {
            doReturn(item(type,"open",7)).when(service).get(1,"dev",11);
            var state=redmine.state(1,"dev",11);
            assertEquals(2L,state.get("sourceVersion"));assertNull(state.get("binding"));assertEquals(List.of(),state.get("deliveries"));
        }
        doReturn(item("QA","open",7)).when(service).get(1,"dev",11);
        assertEquals("BUG_REQUIRED",assertThrows(BusinessException.class,()->redmine.queue(1,"dev",11,
            new vn.syp.tms.integration.RedmineDtos.Publish(2L,"publish-key","publish",null),false)).code());
        verify(db,never()).insert(anyString(),any(Object[].class));verify(db,never()).update(anyString(),any(Object[].class));
    }
}
