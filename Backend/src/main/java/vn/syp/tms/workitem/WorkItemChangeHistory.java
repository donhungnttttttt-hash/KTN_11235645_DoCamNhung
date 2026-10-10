package vn.syp.tms.workitem;

import static vn.syp.tms.workitem.WorkItemStore.text;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Versioned audit payload for fields persisted by the work-item update operation. */
final class WorkItemChangeHistory {
    private static final List<String> EDITABLE_FIELDS = List.of(
            "title", "description", "priority", "categoryId", "milestoneId", "assigneeMembershipId");
    private static final List<String> BUG_FIELDS = List.of("steps", "expectedResult", "actualResult");

    private WorkItemChangeHistory() {}

    static Map<String, Object> updateDetails(Map<String, Object> existing, WorkItemDtos.Update input) {
        var before = new LinkedHashMap<String, Object>();
        for (String field : EDITABLE_FIELDS) before.put(field, existing.get(field));
        before.put("version", existing.get("version"));

        var after = new LinkedHashMap<String, Object>();
        after.put("title", text(input.title()));
        after.put("description", text(input.description()));
        after.put("priority", input.priority());
        after.put("categoryId", input.categoryId());
        after.put("milestoneId", input.milestoneId());
        after.put("assigneeMembershipId", input.assigneeMembershipId());
        after.put("expectedVersion", input.expectedVersion());

        if ("BUG".equals(existing.get("type"))) {
            for (String field : BUG_FIELDS) before.put(field, existing.get(field));
            after.put("steps", text(input.steps()));
            after.put("expectedResult", text(input.expectedResult()));
            after.put("actualResult", text(input.actualResult()));
        }
        // Relationships, current permissions and immutable execution snapshots have
        // their own records. Never persist the expanded GET response on every edit.
        return Map.of("formatVersion", 2, "before", before, "after", after);
    }
}
