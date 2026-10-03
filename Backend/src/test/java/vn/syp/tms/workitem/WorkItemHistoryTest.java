package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.syp.tms.project.ProjectAudit;
import vn.syp.tms.retest.BugRetestLifecycle;
import vn.syp.tms.rules.RuleService;
import vn.syp.tms.shared.web.BusinessException;

/** Exercises service writes without a database; no application data is touched. */
class WorkItemHistoryTest {
    private final WorkItemStore store = mock(WorkItemStore.class);
    private final ProjectAudit audit = mock(ProjectAudit.class);
    private final BugRetestLifecycle retest = mock(BugRetestLifecycle.class);
    private final RuleService rules = mock(RuleService.class);
    private final ObjectMapper json = new ObjectMapper();
    private final WorkItemService service = new WorkItemService(store, audit, retest, rules);
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
        when(store.row(java.util.Objects.requireNonNull(startsWith("SELECT m.id,m.project_role")), eq(1L), eq("pm")))
                .thenReturn(Map.of("id", 7L, "role", "PM"));
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
}
