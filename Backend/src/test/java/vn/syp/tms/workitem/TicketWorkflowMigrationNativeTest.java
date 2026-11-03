package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import java.sql.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Destructive only within the native runner's owned disposable schema. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_USERS_URL",matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+")
class TicketWorkflowMigrationNativeTest {
    private Flyway flyway(String target,boolean demo){
        String url=System.getenv("TMS_TEST_USERS_URL");if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+"))throw new IllegalStateException("Owned test schema required");
        var config=Flyway.configure().dataSource(url,System.getenv("TMS_TEST_USERS_USER"),System.getenv("TMS_TEST_USERS_PASSWORD")).locations(demo?new String[]{"classpath:db/migration","classpath:db/demo"}:new String[]{"classpath:db/migration"}).cleanDisabled(false);if(target!=null)config.target(target);return config.load();
    }
    private Connection connection()throws SQLException{return DriverManager.getConnection(System.getenv("TMS_TEST_USERS_URL"),System.getenv("TMS_TEST_USERS_USER"),System.getenv("TMS_TEST_USERS_PASSWORD"));}
    private List<String> rows(String sql)throws SQLException{try(var c=connection();var s=c.createStatement();var r=s.executeQuery(sql)){var result=new ArrayList<String>();while(r.next()){var parts=new ArrayList<String>();for(int i=1;i<=r.getMetaData().getColumnCount();i++)parts.add(Objects.toString(r.getString(i),"<null>"));result.add(String.join("|",parts));}return result;}}
    private void sql(String sql)throws SQLException{try(var c=connection();var s=c.createStatement()){s.execute(sql);}}
    private String hash(List<String> rows)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(String.join("\n",rows).getBytes(StandardCharsets.UTF_8)));}
    @BeforeEach void clean(){flyway(null,false).clean();}
    @AfterAll static void restore(){var self=new TicketWorkflowMigrationNativeTest();self.flyway(null,false).clean();self.flyway(null,false).migrate();}
    @Test void freshCoreAndDemoSupportCanonicalMetricsWithoutAlteringSharedStatuses()throws Exception{
        flyway(null,false).migrate();var statuses=rows("SELECT * FROM work_item_statuses ORDER BY code");
        assertThat(rows("SELECT COUNT(*) FROM ticket_notifications")).containsExactly("0");
        flyway(null,false).clean();flyway(null,true).migrate();
        assertThat(rows("SELECT * FROM work_item_statuses ORDER BY code")).isEqualTo(statuses);
        assertThat(flyway(null,true).migrate().migrationsExecuted).isZero();
    }
    @Test void upgrade38PreservesOldColumnsHistoryAndClosedAmbiguity()throws Exception{
        flyway("38",true).migrate();
        var ids=rows("SELECT w.id FROM work_items w JOIN work_item_feature_context x ON x.project_id=w.project_id AND x.work_item_id=w.id WHERE w.item_type='BUG' ORDER BY w.id LIMIT 3");assertThat(ids).hasSize(3);
        sql("UPDATE work_items SET status_code='closed' WHERE id="+ids.get(0));sql("UPDATE work_items SET status_code='resolved' WHERE id="+ids.get(1));sql("UPDATE work_items SET status_code='recheck' WHERE id="+ids.get(2));
        String context="SELECT project_id,work_item_id,feature_id,document_id,row_id,monkey,deleted_at,created_by_user_id FROM work_item_feature_context ORDER BY project_id,work_item_id";
        var queries=List.of("SELECT * FROM work_items ORDER BY id","SELECT * FROM work_item_feature_history ORDER BY id","SELECT project_id,work_item_id,item_type,policy_version,steps,expected_result,actual_result,build_id,environment_id,device_id,test_case_id,revision_id,standalone_reason,fixed_build_id,context_snapshot FROM bug_details ORDER BY project_id,work_item_id","SELECT * FROM qa_details ORDER BY project_id,work_item_id","SELECT * FROM identity_users ORDER BY id","SELECT * FROM project_memberships ORDER BY id",context,"SELECT version,checksum FROM flyway_schema_history WHERE CAST(version AS UNSIGNED)<=38 ORDER BY installed_rank");
        var before=new ArrayList<String>();for(String query:queries)before.add(hash(rows(query)));
        assertThat(flyway(null,true).migrate().migrationsExecuted).isEqualTo(1);
        var after=new ArrayList<String>();for(String query:queries)after.add(hash(rows(query)));assertThat(after).isEqualTo(before);
        System.out.println("Ticket V38->V39 preservation SHA256 before="+before+" after="+after);
        assertThat(rows("SELECT ticket_state,closure_reason FROM work_item_feature_context WHERE work_item_id="+ids.get(0))).containsExactly("<null>|<null>");
        assertThat(rows("SELECT finalized,legacy_workflow,fixed FROM ticket_workflow_metrics WHERE work_item_id="+ids.get(0))).containsExactly("1|1|<null>");
        assertThat(rows("SELECT finalized,awaiting_verification FROM ticket_workflow_metrics WHERE work_item_id="+ids.get(1))).containsExactly("0|1");
        assertThat(rows("SELECT finalized,awaiting_verification FROM ticket_workflow_metrics WHERE work_item_id="+ids.get(2))).containsExactly("0|1");
        assertThat(rows("SELECT COUNT(*) FROM work_item_feature_context WHERE test_version_id IS NOT NULL OR test_version_name IS NOT NULL")).containsExactly("0");
        assertThatThrownBy(()->sql("UPDATE work_item_feature_context SET ticket_state='CLOSED',closure_reason=NULL WHERE work_item_id="+ids.get(0))).isInstanceOf(SQLException.class).hasMessageContaining("ck_ticket_closure");
        assertThatThrownBy(()->sql("UPDATE work_item_feature_context SET ticket_state=NULL,closure_reason='FIXED' WHERE work_item_id="+ids.get(0))).isInstanceOf(SQLException.class).hasMessageContaining("ck_ticket_closure");
        assertThat(rows("SELECT ticket_state,closure_reason FROM work_item_feature_context WHERE work_item_id="+ids.get(0))).containsExactly("<null>|<null>");
    }
}
