package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.workitem.WorkItemStore;

class AdminAuditLabelsTest {
    @Test void newFlowObjectsAndActionsAreReadableWithoutInventingLegacyWorkItemTypes(){
        assertThat(AdminAuditLabels.label("MANAGEMENT_REPORT")).isEqualTo("Báo cáo quản trị");
        assertThat(AdminAuditLabels.label("PROJECT_NOTE")).isEqualTo("Note dự án");
        assertThat(AdminAuditLabels.label("WORK_ITEM")).isEqualTo("Issue");
        assertThat(AdminAuditLabels.label("STATUS")).isEqualTo("Đổi trạng thái");
        assertThat(AdminAuditLabels.label("COMMENT")).isEqualTo("Thêm ghi chú");
        assertThat(AdminAuditLabels.label("RESULT_UNEXECUTED_UNKNOWN")).isEqualTo("RESULT_UNEXECUTED_UNKNOWN");
        assertThat(AdminAuditLabels.label("FUTURE_EVENT")).isEqualTo("FUTURE_EVENT");
    }
    @Test void everyKnownCaseStatusPairUsesExactlyTheDisplayedVocabularyInSearch(){
        String sql=AdminAuditLabels.expression("e.action");
        for(String from:List.of("UNEXECUTED","OK","NG","P","NA"))for(String to:List.of("UNEXECUTED","OK","NG","P","NA")){
            String code="RESULT_"+from+"_"+to;
            String expected="Status: "+(from.equals("UNEXECUTED")?"Unexecuted":from)+" → "+(to.equals("UNEXECUTED")?"Unexecuted":to);
            assertThat(AdminAuditLabels.label(code)).isEqualTo(expected);
            assertThat(sql).contains(" WHEN '"+code+"' THEN _utf8mb4'"+expected+"'");
        }
        assertThat(sql).endsWith(" ELSE e.action END").doesNotContain("UNKNOWN","SUBSTRING","REGEXP");
    }
    @Test void keywordCountAndPageUseTheDisplayedLabelsWhileResponseKeepsRawCodes(){
        var db=mock(WorkItemStore.class);var identity=mock(IdentityService.class);
        when(identity.current("admin")).thenReturn(new IdentityUser("admin","Synthetic Admin","not-login","ADMIN"));
        var countSql=new AtomicReference<String>();var countArgs=new AtomicReference<List<Object>>();
        when(db.count(Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(call->{
            String sql=call.getArgument(0);countSql.set(sql);countArgs.set(Arrays.asList((Object[])call.getRawArguments()[1]));
            assertThat(sql).contains("_utf8mb4'Báo cáo quản trị'","_utf8mb4'Note dự án'","_utf8mb4'Issue'","_utf8mb4'Status: Unexecuted → OK'").doesNotContain("metadata","request_id","password_hash");
            return 1L;
        });
        when(db.rows(Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(call->{
            String sql=call.getArgument(0),count=countSql.get();
            assertThat(sql.substring(sql.indexOf(" WHERE 1=1"),sql.indexOf(" ORDER BY e.occurredAt"))).isEqualTo(count.substring(count.indexOf(" WHERE 1=1")));
            var arguments=Arrays.asList((Object[])call.getRawArguments()[1]);
            assertThat(arguments.subList(0,arguments.size()-2)).isEqualTo(countArgs.get());
            return List.of(new LinkedHashMap<String,Object>(Map.of("entityType","TEST_DOCUMENT_ROW","action","RESULT_UNEXECUTED_OK","entityId","1")));
        });
        var result=new AdminAuditService(db,identity).list("admin",1L,"status Unexecuted OK",null,null,0,1);
        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.items()).singleElement().satisfies(row->assertThat(row).containsEntry("entityType","TEST_DOCUMENT_ROW").containsEntry("action","RESULT_UNEXECUTED_OK").containsEntry("actionLabel","Status: Unexecuted → OK"));
    }
}
