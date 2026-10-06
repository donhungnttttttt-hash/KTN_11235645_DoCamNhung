package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.retest.BugRetestLifecycle;
import vn.syp.tms.rules.RuleService;
import vn.syp.tms.qa.QaService;
import vn.syp.tms.shared.web.BusinessException;

/** Exercises service writes without a database; no application data is touched. */
class WorkItemHistoryTest {
    private final WorkItemStore store = mock(WorkItemStore.class);
    private final ProjectAudit audit = mock(ProjectAudit.class);
    private final BugRetestLifecycle retest = mock(BugRetestLifecycle.class);
    private final RuleService rules = mock(RuleService.class);
    private final QaService qa = mock(QaService.class);
    private final ObjectMapper json = new ObjectMapper();
    private final WorkItemService service = new WorkItemService(store, audit, retest, rules, qa);
    private final Map<String, Object> existing = new LinkedHashMap<>();

    @BeforeEach
    void setUp() {
        existing.put("id", 9L); existing.put("type", "BUG"); existing.put("version", 3L);
        existing.put("status", "open"); existing.put("title", "Tiêu đề cũ");
        existing.put("description", "Mô tả cũ"); existing.put("priority", "MEDIUM");
        existing.put("categoryId", null); existing.put("milestoneId", null);
        existing.put("assigneeMembershipId", null);
        existing.put("steps", "Bước cũ"); existing.put("expectedResult", "Mong đợi cũ");
        existing.put("actualResult", "Thực tế cũ");
        existing.put("contextSnapshot", "large existing context ".repeat(1000));
        existing.put("futureDisplayPayload", "must not be persisted automatically");
        when(store.row(java.util.Objects.requireNonNull(startsWith("SELECT id,code,archived_at")), eq(1L)))
                .thenReturn(Map.of("id", 1L));
        when(store.row(java.util.Objects.requireNonNull(startsWith("SELECT m.id,CASE WHEN")), eq(1L), eq("pm")))
                .thenReturn(Map.of("id", 7L, "role", "PM", "systemRole", "PM"));
        when(store.row(java.util.Objects.requireNonNull(contains("FROM work_items w")), eq(1L), eq(9L)))
                .thenAnswer(invocation -> new LinkedHashMap<>(existing));
        when(store.rows(java.util.Objects.requireNonNull(contains("FROM work_item_clarifications")), eq(1L), eq(9L)))
                .thenReturn(List.of(Map.of("id", 8L, "conclusion", "Clarification ".repeat(1000))));
        when(store.rows(java.util.Objects.requireNonNull(contains("FROM work_item_external_references")), eq(1L), eq(9L)))
                .thenReturn(List.of(Map.of("id", 6L, "url", "https://tracker.example/9")));
        when(store.encode(any())).thenAnswer(invocation -> json.writeValueAsString(invocation.getArgument(0)));
    }

    private WorkItemDtos.Update change(long version) {
        return new WorkItemDtos.Update("  Tiêu đề mới  ", null, "HIGH", null, null, null,
                "  Bước mới  ", "  Mong đợi mới  ", "  Thực tế mới  ", "Sửa nội dung", version);
    }

    @Test
    void updateHistoryKeepsEditableBeforeAfterValuesWithoutCopyingRelatedData() throws Exception {
        service.update(1L, "pm", 9L, change(3L));
        var capture = ArgumentCaptor.forClass(Object.class);
        verify(store).encode(capture.capture());
        var details = json.valueToTree(capture.getValue());
        assertThat(details.path("before").path("title").asText()).isEqualTo("Tiêu đề cũ");
        assertThat(details.path("before").path("steps").asText()).isEqualTo("Bước cũ");
        assertThat(details.path("before").path("version").asLong()).isEqualTo(3L);
        assertThat(details.path("before").get("assigneeMembershipId").isNull()).isTrue();
        for (String repeated : List.of("contextSnapshot", "links", "clarifications", "externalReferences", "allowedTransitions", "futureDisplayPayload")) {
            assertThat(details.path("before").has(repeated)).as(repeated).isFalse();
        }
        assertThat(details.path("after").path("title").asText()).isEqualTo("Tiêu đề mới");
        assertThat(details.path("after").path("description").asText()).isEmpty();
        assertThat(details.path("after").path("steps").asText()).isEqualTo("Bước mới");
        assertThat(details.path("after").path("expectedResult").asText()).isEqualTo("Mong đợi mới");
        assertThat(details.path("after").path("actualResult").asText()).isEqualTo("Thực tế mới");
        assertThat(details.path("after").path("expectedVersion").asLong()).isEqualTo(3L);
        // Fixture has >30 KB of related data; changing a title must not duplicate it.
        assertThat(json.writeValueAsBytes(capture.getValue()).length).isLessThan(1500);
        verify(retest).invalidate(1L, 9L, false);
        verify(audit).record(1L, "pm", "WORK_ITEM", 9L, "UPDATE");
    }

    @Test
    void ordinaryTasksDoNotRecordBugFieldsThatAreNotPersisted() {
        existing.put("type", "TASK");
        service.update(1L, "pm", 9L, change(3L));
        var capture = ArgumentCaptor.forClass(Object.class);
        verify(store).encode(capture.capture());
        var details = json.valueToTree(capture.getValue());
        for (String field : List.of("steps", "expectedResult", "actualResult")) {
            assertThat(details.path("before").has(field)).isFalse();
            assertThat(details.path("after").has(field)).isFalse();
        }
        assertThat(details.path("before").path("priority").asText()).isEqualTo("MEDIUM");
        assertThat(details.path("after").path("priority").asText()).isEqualTo("HIGH");
        verifyNoInteractions(retest);
    }

    @Test
    void staleUpdateDoesNotAppendHistoryOrAudit() {
        assertThatThrownBy(() -> service.update(1L, "pm", 9L, change(2L)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Dữ liệu đã thay đổi");
        verify(store, never()).encode(any());
        verify(store, never()).insert(java.util.Objects.requireNonNull(anyString()), any(Object[].class));
        verifyNoInteractions(audit, retest);
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    private void commandRequired(Runnable command) {
        assertThatThrownBy(command::run).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.code()).isEqualTo("QA_COMMAND_REQUIRED"));
        verify(store, never()).update(anyString(), any(Object[].class));
        verify(store, never()).insert(anyString(), any(Object[].class));
        verifyNoInteractions(audit, retest);
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void genericQaCreateCannotReplayOrCreateSubtypeLessRow() {
        when(store.checksum(any())).thenReturn("typed-checksum");
        when(store.rows(contains("FROM work_items WHERE"),eq(1L),eq("create-key")))
                .thenReturn(List.of(Map.of("id",9L,"created_by",7L,"request_checksum","typed-checksum")));
        commandRequired(() -> service.create(1L,"pm",new WorkItemDtos.Create("QA","Question","Body","MEDIUM",
                null,null,null,null,null,null,null,null,null,null,null,null,"create-key")));
        verify(store,never()).checksum(any());
        verify(store,never()).rows(contains("request_key"),any(Object[].class));
    }

    @Test void everyGenericQaMutationRequiresTypedCommandBeforeVersionOrBugRules() {
        existing.put("type","QA");
        commandRequired(() -> service.update(1,"pm",9,change(0)));
        commandRequired(() -> service.transition(1,"pm",9,new WorkItemDtos.Transition("resolved","answer",null,0L)));
        commandRequired(() -> service.link(1,"pm",9,new WorkItemDtos.Link(1L,0L)));
        commandRequired(() -> service.external(1,"pm",9,new WorkItemDtos.ExternalReference("REDMINE","9","https://example.test/9",0L)));
        commandRequired(() -> service.clarify(1,"pm",9,new WorkItemDtos.Clarification("INTERNAL","source","pm",java.time.Instant.now(),"answer",0L)));
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void batchContainingQaPrevalidatesAllItemsBeforeFirstMutation() {
        when(store.row(contains("FROM work_items w"),eq(1L),eq(10L))).thenReturn(new LinkedHashMap<>(Map.of("id",10L,"type","QA","status","open","version",3L)));
        commandRequired(() -> service.batch(1,"pm",new WorkItemDtos.Batch(List.of(new WorkItemDtos.BatchEntry(9,3L),new WorkItemDtos.BatchEntry(10,3L)),"progress","batch",null)));
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void qaCommentUsesCanonicalWriterBeforeReplayAndDoesNotWriteAnAnswer() {
        existing.put("type","QA");
        when(qa.authorizeWriter(1,"pm",9)).thenReturn(new QaService.Writer(new QaService.Actor(7,true,false,false,false),existing));
        when(store.rows(contains("FROM work_item_comments"),eq(1L),eq(9L),eq("comment-key"))).thenReturn(List.of(Map.of("id",55L,"body","note","author_membership_id",7L)));
        assertThat(service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key"))).isEqualTo(Map.of("id",55L));
        var ordered=inOrder(qa,store);
        ordered.verify(qa).authorizeWriter(1,"pm",9);
        ordered.verify(store).rows(contains("FROM work_item_comments"),eq(1L),eq(9L),eq("comment-key"));
        verify(store,never()).insert(anyString(),any(Object[].class));
        verifyNoInteractions(retest,audit);
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void currentQaWriterDenialBlocksPreviouslyValidCommentReplay() {
        existing.put("type","QA");
        for(String code:List.of("FORBIDDEN","INVALID_QA_STATE","ARCHIVED","UNAUTHENTICATED","INVALID_QA_CONTEXT")) {
            doThrow(new BusinessException(403,code,"current guard failed")).when(qa).authorizeWriter(1,"pm",9);
            assertThatThrownBy(() -> service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key")))
                    .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo(code));
        }
        verify(store,never()).rows(contains("FROM work_item_comments"),any(Object[].class));
        verify(store,never()).insert(anyString(),any(Object[].class));
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void qaCommentReplayRejectsDifferentBodyOrAuthorAndNewCommentStaysInternal() {
        existing.put("type","QA");
        when(qa.authorizeWriter(1,"pm",9)).thenReturn(new QaService.Writer(new QaService.Actor(7,true,false,false,false),existing));
        for(var replay:List.of(Map.<String,Object>of("id",55L,"body","different","author_membership_id",7L),
                Map.<String,Object>of("id",55L,"body","note","author_membership_id",8L))) {
            when(store.rows(contains("FROM work_item_comments"),eq(1L),eq(9L),eq("comment-key"))).thenReturn(List.of(replay));
            assertThatThrownBy(()->service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key")))
                    .isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.code()).isEqualTo("IDEMPOTENCY_CONFLICT"));
        }
        when(store.rows(contains("FROM work_item_comments"),eq(1L),eq(9L),eq("comment-key"))).thenReturn(List.of());
        service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key"));
        verify(store).insert(contains("VALUES(?,?,?,'INTERNAL',?,UTC_TIMESTAMP(6),?)"),eq(1L),eq(9L),eq("note"),eq(7L),eq("comment-key"));
        verify(store,never()).update(anyString(),any(Object[].class));verifyNoInteractions(retest);
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void legacyBugCommentsKeepTheirPolicyAndUseCurrentIdentityProjectGuard() {
        when(store.rows(contains("FROM work_item_comments"),eq(1L),eq(9L),eq("comment-key")))
                .thenReturn(List.of(Map.of("id",55L,"body","note","author_membership_id",7L)));
        assertThat(service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key"))).isEqualTo(Map.of("id",55L));
        verify(qa).authorize(1,"pm",true);
        verify(qa,never()).authorizeWriter(anyLong(),anyString(),anyLong());
        verify(qa,never()).detail(anyLong(),anyString(),anyLong());
    }

    @Test void qaCreateDtoRecognizesTypeForExplicitCommandError() {
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(new WorkItemDtos.Create("QA","Question","Body","MEDIUM",
                null,null,null,null,null,null,null,null,null,null,null,null,"create-key"))).isEmpty();
        }
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void ordinaryMutationReadsBeginOnlyAfterCurrentIdentityProjectGuard() {
        var commands=List.<Runnable>of(
            ()->service.update(1,"pm",9,change(0)),
            ()->service.transition(1,"pm",9,new WorkItemDtos.Transition("progress","reason",null,0L)),
            ()->service.link(1,"pm",9,new WorkItemDtos.Link(1L,0L)),
            ()->service.external(1,"pm",9,new WorkItemDtos.ExternalReference("TRACKER","9","https://example.test/9",0L)),
            ()->service.clarify(1,"pm",9,new WorkItemDtos.Clarification("INTERNAL","source","pm",java.time.Instant.now(),"note",0L)),
            ()->service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key")));
        for(var command:commands) {
            clearInvocations(store,qa);
            try {command.run();}catch(BusinessException expected) { /* State/version denial follows authorization. */ }
            var guardOrder=mockingDetails(qa).getInvocations().stream().filter(i->i.getMethod().getName().equals("authorize"))
                .findFirst().map(invocation -> java.util.Objects.requireNonNull(invocation).getSequenceNumber()).orElse(Integer.MAX_VALUE);
            var firstRead=mockingDetails(store).getInvocations().stream()
                .filter(i->Set.of("row","rows","count").contains(i.getMethod().getName()))
                .filter(i->!i.<String>getArgument(0).endsWith("FOR UPDATE")&&!i.<String>getArgument(0).endsWith("FOR SHARE"))
                .findFirst().orElseThrow();
            assertThat(guardOrder).as("identity/project guard before consistent read for %s",firstRead.getArgument(0).toString())
                .isLessThan(firstRead.getSequenceNumber());
            var order=inOrder(qa,store);
            order.verify(qa).authorize(1,"pm",true);
            verify(store,never()).update(anyString(),any(Object[].class));
        }
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void qaCommentRoutingAndCurrentReplayFollowCanonicalLocks() {
        existing.put("type","QA");
        when(qa.authorizeWriter(1,"pm",9)).thenReturn(new QaService.Writer(new QaService.Actor(7,true,false,false,false),existing));
        when(store.rows(contains("FROM work_item_comments"),eq(1L),eq(9L),eq("comment-key")))
            .thenReturn(List.of(Map.of("id",55L,"body","note","author_membership_id",7L)));
        assertThat(service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key"))).isEqualTo(Map.of("id",55L));
        var order=inOrder(qa,store);
        order.verify(qa).authorize(1,"pm",true);
        order.verify(store).row(contains("SELECT w.item_type AS type"),eq(1L),eq(9L));
        order.verify(qa).authorizeWriter(1,"pm",9);
        order.verify(store).rows(argThat(sql->sql.contains("FROM work_item_comments")&&sql.endsWith("FOR UPDATE")),eq(1L),eq(9L),eq("comment-key"));
        verify(store,never()).insert(anyString(),any(Object[].class));
    }

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void bugCommentReplayAlsoUsesCurrentReadAfterWriteGuard() {
        when(store.rows(contains("FROM work_item_comments"),eq(1L),eq(9L),eq("comment-key")))
            .thenReturn(List.of(Map.of("id",55L,"body","note","author_membership_id",7L)));
        assertThat(service.comment(1,"pm",9,new WorkItemDtos.Comment("note","INTERNAL","comment-key"))).isEqualTo(Map.of("id",55L));
        var order=inOrder(qa,store);
        order.verify(qa).authorize(1,"pm",true);
        order.verify(store).row(contains("SELECT w.item_type AS type"),eq(1L),eq(9L));
        order.verify(store).row(endsWith("FROM projects WHERE id=? FOR UPDATE"),eq(1L));
        order.verify(store).rows(argThat(sql->sql.contains("FROM work_item_comments")&&sql.endsWith("FOR UPDATE")),eq(1L),eq(9L),eq("comment-key"));
        verify(qa,never()).authorizeWriter(anyLong(),anyString(),anyLong());
        verify(store,never()).insert(anyString(),any(Object[].class));
    }
}
