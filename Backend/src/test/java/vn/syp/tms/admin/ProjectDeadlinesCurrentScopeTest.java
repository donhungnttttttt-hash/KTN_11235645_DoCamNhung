package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.workitem.WorkItemStore;

class ProjectDeadlinesCurrentScopeTest {
    @Test void milestoneMetadataUsesOnlyExplicitlyLinkedCurrentVisibleIssuesForActiveWarnings(){
        var db=mock(WorkItemStore.class);
        when(db.rows(Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(call->{
            String sql=call.getArgument(0);
            assertThat(sql).contains("FROM milestones ms","w.milestone_id=ms.id","work_item_feature_context","w.item_type IN ('BUG','QA')","deleted_at IS NULL","archived_at IS NULL")
                .doesNotContain("test_cycles","run_items");return List.of();
        });
        assertThat(new ProjectDeadlines(db).milestones(1L,Instant.now())).isEmpty();
    }
}
