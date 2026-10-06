package vn.syp.tms.filework;

import static org.assertj.core.api.Assertions.*;
import java.io.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import vn.syp.tms.testcase.TestCaseWorkbook;

/** Only explicit fresh mode on an empty, preprovisioned, exclusively owned schema. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FQ_MODE",matches="fresh-migration")
class NativeFileWorkQaMigrationTest {
    @Test void preservesV16HistoryThenFreshV18EnforcesExactContextAndUniqueDoing() throws Exception {
        NativeFqDatabase.requireMode("fresh-migration");
        try(var c=NativeFqDatabase.connect()) {
            assertThat(NativeFqFixture.scalar(c,"SELECT GET_LOCK(CONCAT('native-fq-',DATABASE()),0)"))
                    .isEqualTo(1);
            try {
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()"))
                        .as("Never reset preexisting tables or views").isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE()")).isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE()")).isZero();
                var old=NativeFqDatabase.flyway("16");assertThat(old.migrate().migrationsExecuted).isEqualTo(16);
                Set<String> owned=tables(c);
                var historical=NativeFqFixture.seed(c,true);
                var before=new LinkedHashMap<String,Snapshot>();
                for(String table:List.of("identity_users","projects","project_memberships","test_case_revisions","import_batches","import_rows","run_items","execution_attempts","work_items","bug_details","work_item_history","work_item_execution_links","project_audit"))before.put(table,snapshot(c,table,null));
                var latest=NativeFqDatabase.flyway("18");assertThat(latest.migrate().migrationsExecuted).isEqualTo(2);
                latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();
                for(var entry:before.entrySet())assertThat(snapshot(c,entry.getKey(),entry.getValue().columns())).as(entry.getKey()).isEqualTo(entry.getValue());
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM execution_attempts WHERE file_work_session_id IS NOT NULL")).isZero();
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM execution_attempts")).isEqualTo(1);
                for(String table:List.of("file_work_groups","file_work_sessions","qa_details","qa_answers","qa_confirmations"))assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM "+table)).isZero();
                assertThat(NativeFqFixture.bytes(c,"SELECT source_workbook FROM import_batches WHERE id=?",historical.document)).isEqualTo(historical.source);
                // Initial emptiness and advisory ownership establish these are this invocation's tables.
                // Clean only the exact migration-created table set, and refuse any foreign object.
                owned.addAll(Set.of("file_work_groups","file_work_group_items","file_work_sessions","file_work_commands","file_work_history","qa_details","qa_answers","qa_confirmations","qa_commands"));
                assertThat(owned).contains("flyway_schema_history","file_work_sessions","qa_details");
                assertThat(tables(c)).isEqualTo(owned);
                NativeFqDatabase.cleanOwned(c,owned);
                assertThat(latest.migrate().migrationsExecuted).isEqualTo(18);
                latest.validate();assertThat(latest.migrate().migrationsExecuted).isZero();
                var first=NativeFqFixture.seed(c,false);var other=NativeFqFixture.seed(c,false);
                long run=first.run(c),group=first.group(c,run),otherRun=other.run(c),otherGroup=other.group(c,otherRun);
                reject(c,"UPDATE file_work_group_items SET revision_id=? WHERE group_id=?",other.revision,group);
                reject(c,"UPDATE file_work_group_items SET run_item_id=? WHERE group_id=?",otherRun,group);
                reject(c,"UPDATE file_work_group_items SET configuration_id=? WHERE group_id=?",other.configuration,group);
                reject(c,"UPDATE file_work_group_items SET group_id=? WHERE group_id=?",otherGroup,group);
                reject(c,"UPDATE file_work_groups SET created_by=? WHERE id=?",other.pmMember,group);
                assertThatThrownBy(()->NativeFqFixture.insert(c,"INSERT INTO file_work_groups(project_id,document_id,cycle_id,configuration_id,created_by,created_at,updated_by,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),'foreign-document',REPEAT('f',64))",first.project,other.document,first.cycle,first.configuration,first.pmMember,first.pmMember)).isInstanceOf(SQLException.class).hasMessageContaining("fk_fw_group_document");
                long session=first.session(c,group,"PAUSED");
                reject(c,"UPDATE file_work_sessions SET allocation_id=? WHERE id=?",other.allocation,session);
                reject(c,"UPDATE file_work_sessions SET build_id=? WHERE id=?",other.build,session);
                reject(c,"UPDATE file_work_sessions SET state='INVALID' WHERE id=?",session);
                reject(c,"UPDATE file_work_sessions SET state='COMPLETED' WHERE id=?",session);
                reject(c,"INSERT INTO file_work_commands(project_id,group_id,session_id,action,actor_membership_id,request_key,request_checksum,response_json,occurred_at) VALUES(?,?,?,'PAUSE',?,'bad-session',REPEAT('a',64),'{}',UTC_TIMESTAMP(6))",other.project,otherGroup,session,other.testerMember);
                long attempt=first.attempt(c,run);
                reject(c,"UPDATE execution_attempts SET file_work_session_id=? WHERE id=?",session,attempt); // PM historical executor differs from session TESTER.
                verifyQaPins(c,first,other);
                // Separate generated-key contention test, explicitly NOT the named review races 6A/6B.
                NativeFqFixture.update(c,"UPDATE file_work_sessions SET state='DOING' WHERE id=?",session);
                verifySeparateDoingKeys(c,first,group);
                NativeFqFixture.update(c,"UPDATE file_work_sessions SET state='PAUSED' WHERE id=?",session);
                assertUniqueWinner(first,group);
                assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM file_work_sessions WHERE state='DOING' AND group_id=?",group)).isEqualTo(1);
            } finally { NativeFqFixture.scalar(c,"SELECT RELEASE_LOCK(CONCAT('native-fq-',DATABASE()))"); }
        }
    }
    private void verifySeparateDoingKeys(Connection c,NativeFqFixture f,long group)throws SQLException {
        long document=NativeFqFixture.insert(c,"INSERT INTO import_batches(project_id,file_name,file_checksum,status,staged_expires_at,imported_by,created_at) VALUES(?,'second.xlsx',REPEAT('d',64),'COMMITTED',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6))",f.project,f.pm);
        long otherGroup=NativeFqFixture.insert(c,"INSERT INTO file_work_groups(project_id,document_id,cycle_id,configuration_id,created_by,created_at,updated_by,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),'native-group-2',REPEAT('e',64))",f.project,document,f.cycle,f.configuration,f.pmMember,f.pmMember);
        assertThatThrownBy(()->f.session(c,otherGroup,"DOING")).isInstanceOf(SQLException.class).hasMessageContaining("uq_fw_session_asset_doing");
        long asset=NativeFqFixture.insert(c,"INSERT INTO device_assets(asset_code,type,model,created_at,created_by,updated_at,updated_by) VALUES(?,'IPAD','iPad',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)","SECOND-"+f.project,f.pm,f.pm);
        long allocation=NativeFqFixture.insert(c,"INSERT INTO device_allocations(asset_id,project_id,recipient_membership_id,assigned_at,assigned_by) VALUES(?,?,?,UTC_TIMESTAMP(6),?)",asset,f.project,f.testerMember,f.pm);
        assertThatThrownBy(()->NativeFqFixture.insert(c,"INSERT INTO file_work_sessions(project_id,group_id,executor_membership_id,allocation_id,asset_id,build_id,state,context_snapshot,started_at,last_transition_at) VALUES(?,?,?,?,?,?,'DOING','{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,group,f.testerMember,allocation,asset,f.build)).isInstanceOf(SQLException.class).hasMessageContaining("uq_fw_session_group_doing");
    }
    private void verifyQaPins(Connection c,NativeFqFixture f,NativeFqFixture other)throws Exception {
        long qa=f.work(c,"QA",2),qa2=f.work(c,"QA",3);
        NativeFqFixture.update(c,"INSERT INTO qa_details(project_id,work_item_id,question,context_snapshot) VALUES(?,?,'Question','{}'),(?,?,'Other question','{}')",f.project,qa,f.project,qa2);
        reject(c,"UPDATE work_items SET status_code='ready' WHERE id=?",qa);
        reject(c,"UPDATE qa_details SET question=' ' WHERE work_item_id=?",qa);
        reject(c,"UPDATE qa_details SET document_id=? WHERE work_item_id=?",other.document,qa);
        long a=NativeFqFixture.insert(c,"INSERT INTO qa_answers(project_id,work_item_id,generation,answer_version,body,basis_reference,author_membership_id,answered_at) VALUES(?,?,0,1,'Answer','basis',?,UTC_TIMESTAMP(6))",f.project,qa,f.devMember);
        long b=NativeFqFixture.insert(c,"INSERT INTO qa_answers(project_id,work_item_id,generation,answer_version,body,basis_reference,author_membership_id,answered_at) VALUES(?,?,0,2,'Second','basis',?,UTC_TIMESTAMP(6))",f.project,qa,f.devMember);
        reject(c,"INSERT INTO qa_answers(project_id,work_item_id,generation,answer_version,body,basis_reference,author_membership_id,answered_at) VALUES(?,?,0,2,'Duplicate','basis',?,UTC_TIMESTAMP(6))",f.project,qa,f.devMember);
        reject(c,"UPDATE qa_answers SET author_membership_id=? WHERE id=?",other.devMember,a);
        NativeFqFixture.update(c,"UPDATE qa_details SET current_answer_id=? WHERE work_item_id=?",a,qa);
        reject(c,"UPDATE qa_details SET current_answer_id=? WHERE work_item_id=?",a,qa2);
        reject(c,"UPDATE qa_details SET generation=1 WHERE work_item_id=?",qa);
        long confirmation=NativeFqFixture.insert(c,"INSERT INTO qa_confirmations(project_id,work_item_id,generation,answer_id,body,confirmed_by,confirmed_at) VALUES(?,?,0,?,'Confirmed',?,UTC_TIMESTAMP(6))",f.project,qa,a,f.testerMember);
        NativeFqFixture.update(c,"UPDATE qa_details SET current_confirmation_id=? WHERE work_item_id=?",confirmation,qa);
        reject(c,"UPDATE qa_details SET current_answer_id=? WHERE work_item_id=?",b,qa);
        reject(c,"UPDATE qa_confirmations SET generation=1 WHERE id=?",confirmation);
        reject(c,"UPDATE qa_confirmations SET confirmed_by=? WHERE id=?",other.testerMember,confirmation);
        assertThat(NativeFqFixture.scalar(c,"SELECT current_answer_id FROM qa_details WHERE work_item_id=?",qa)).isEqualTo(a);
    }
    private void assertUniqueWinner(NativeFqFixture f,long group)throws Exception {
        var ready=new CountDownLatch(2);var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        Callable<Boolean> insert=()->{try(var c=NativeFqDatabase.connect()){
            NativeFqFixture.update(c,"SET SESSION innodb_lock_wait_timeout=3");ready.countDown();
            if(!start.await(5,TimeUnit.SECONDS))throw new AssertionError("Start latch timed out");
            try{f.session(c,group,"DOING");return true;}catch(SQLException e){if(e.getErrorCode()!=1062)throw e;return false;}
        }};
        Future<Boolean> a=pool.submit(insert),b=pool.submit(insert);
        try{assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();assertThat((a.get(8,TimeUnit.SECONDS)?1:0)+(b.get(8,TimeUnit.SECONDS)?1:0)).isEqualTo(1);}
        finally{start.countDown();a.cancel(true);b.cancel(true);pool.shutdownNow();assertThat(pool.awaitTermination(5,TimeUnit.SECONDS)).isTrue();}
    }
    static Set<String> tables(Connection c)throws SQLException {
        var names=new TreeSet<String>();try(var s=c.createStatement();var r=s.executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()")){while(r.next())names.add(r.getString(1));}return names;
    }
    private static void reject(Connection c,String sql,Object...args){assertThatThrownBy(()->NativeFqFixture.update(c,sql,args)).isInstanceOf(SQLException.class).satisfies(e->assertThat(((SQLException)e).getErrorCode()).isIn(1062,1451,1452,3819));}
    private record Snapshot(List<String> columns,List<List<String>> rows){}
    private Snapshot snapshot(Connection c,String table,List<String> selected)throws SQLException {
        var columns=new ArrayList<String>();var rows=new ArrayList<List<String>>();
        try(var s=c.createStatement();var r=s.executeQuery("SELECT "+(selected==null?"*":String.join(",",selected))+" FROM "+table+" ORDER BY 1,2")){
            for(int n=1;n<=r.getMetaData().getColumnCount();n++)columns.add(r.getMetaData().getColumnName(n));
            while(r.next()){var row=new ArrayList<String>();for(int n=1;n<=columns.size();n++){Object value=r.getObject(n);row.add(value instanceof byte[] bytes?Base64.getEncoder().encodeToString(bytes):Objects.toString(value,null));}rows.add(row);}
        }return new Snapshot(columns,rows);
    }
}

/** Shared in this source file so every native entry point validates before opening a connection. */
final class NativeFqDatabase {
    private static final String OPTIONS="?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED";
    static void requireMode(String mode){if(!mode.equals(System.getenv("TMS_TEST_FQ_MODE")))throw new IllegalStateException("Explicit native F/Q mode required");url();credentials();}
    static String url(){
        String value=System.getenv("TMS_TEST_DB_URL");
        if(value==null||!value.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]{1,5}/tms_docstest_[a-f0-9]{12}"+java.util.regex.Pattern.quote(OPTIONS)))throw new IllegalStateException("Exact isolated loopback URL required");
        int port=Integer.parseInt(value.substring(value.indexOf(':',13)+1,value.indexOf('/',13)));
        if(port<1||port>65535)throw new IllegalStateException("Invalid native port");return value;
    }
    static String schema(){String url=url();return url.substring(url.lastIndexOf('/')+1,url.indexOf('?'));}
    static String user(){credentials();return System.getenv("TMS_TEST_DB_USER");}
    static String password(){credentials();return System.getenv("TMS_TEST_DB_PASSWORD");}
    private static void credentials(){if(System.getenv("TMS_TEST_DB_USER")==null||System.getenv("TMS_TEST_DB_USER").isBlank()||System.getenv("TMS_TEST_DB_PASSWORD")==null||System.getenv("TMS_TEST_DB_PASSWORD").isEmpty())throw new IllegalStateException("Native credentials required");}
    static Connection connect()throws SQLException {
        String safe=url();credentials();var properties=new Properties();properties.setProperty("user",user());properties.setProperty("password",password());properties.setProperty("connectTimeout","3000");properties.setProperty("socketTimeout","10000");
        var c=DriverManager.getConnection(safe,properties);
        try(var s=c.createStatement();var r=s.executeQuery("SELECT DATABASE()")){if(!r.next()||!schema().equals(r.getString(1))){c.close();throw new IllegalStateException("Selected native schema mismatch");}}
        return c;
    }
    static Flyway flyway(String target){return Flyway.configure().dataSource(url(),user(),password()).target(target).cleanDisabled(true).load();}
    static void cleanOwned(Connection c,Set<String> owned)throws SQLException {
        assertThat(NativeFqFixture.scalar(c,"SELECT IS_USED_LOCK(CONCAT('native-fq-',DATABASE()))=CONNECTION_ID()")).isEqualTo(1);
        assertThat(NativeFileWorkQaMigrationTest.tables(c)).isEqualTo(owned);
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE()")).isZero();
        assertThat(NativeFqFixture.scalar(c,"SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE()")).isZero();
        Flyway.configure().dataSource(url(),user(),password()).cleanDisabled(false).load().clean();
    }
}

/** Test-owned JDBC fixture; integration calls this inside its rollback transaction. */
final class NativeFqFixture {
    long project,pmMember,testerMember,devMember,dev2Member,environment,device,build,otherBuild,cycle,configuration,suite,testCase,revision,document,row,asset,allocation;
    String pm,tester,dev,dev2;byte[] source;
    static NativeFqFixture seed(Connection c,boolean historical)throws Exception {
        var f=new NativeFqFixture();String tag=UUID.randomUUID().toString().replace("-","").substring(0,12);
        f.pm=user(c,tag,"PM");f.tester=user(c,tag,"TESTER");f.dev=user(c,tag,"DEV");f.dev2=user(c,tag+"b","DEV");
        f.project=insert(c,"INSERT INTO projects(code,name,created_at,created_by,updated_at,updated_by) VALUES(?,'Native FQ',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)","FQ"+tag,f.pm,f.pm);
        f.pmMember=f.member(c,f.pm,"PM");f.testerMember=f.member(c,f.tester,"TESTER");f.devMember=f.member(c,f.dev,"DEV");f.dev2Member=f.member(c,f.dev2,"DEV");
        f.environment=insert(c,"INSERT INTO environments(project_id,code,name,created_at,updated_at) VALUES(?,'QA','QA',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project);
        f.device=insert(c,"INSERT INTO devices(project_id,code,name,os_name,created_at,updated_at) VALUES(?,'IPAD','iPad','iPadOS',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project);
        f.build=insert(c,"INSERT INTO builds(project_id,version_label,platform,created_at,updated_at) VALUES(?,'1','iOS',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project);
        f.otherBuild=insert(c,"INSERT INTO builds(project_id,version_label,platform,created_at,updated_at) VALUES(?,'2','iOS',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project);
        f.cycle=insert(c,"INSERT INTO test_cycles(project_id,code,name,created_at,created_by) VALUES(?,'C1','Native cycle',UTC_TIMESTAMP(6),?)",f.project,f.pmMember);
        f.configuration=insert(c,"INSERT INTO cycle_configurations(project_id,cycle_id,environment_id,device_id,default_build_id,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",f.project,f.cycle,f.environment,f.device,f.build);
        f.suite=insert(c,"INSERT INTO test_suites(project_id,code,name,created_at,updated_at) VALUES(?,'S1','Suite',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project);
        f.testCase=insert(c,"INSERT INTO test_cases(project_id,case_no,suite_id,created_at,updated_at) VALUES(?,'TC1',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",f.project,f.suite);
        f.revision=insert(c,"INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,approved_at,approved_by,created_at,created_by) VALUES(?,?,1,'Pinned title','Steps','Expected',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)",f.project,f.testCase,f.pmMember,f.pmMember);
        update(c,"UPDATE test_cases SET current_revision_id=? WHERE id=?",f.revision,f.testCase);
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
            var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);for(int n=0;n<TestCaseWorkbook.HEADERS.size();n++)header.createCell(n).setCellValue(TestCaseWorkbook.HEADERS.get(n));
            var row=sheet.createRow(1);var cells=List.of("TC1","S1","Source title","","Steps","Expected","","","","","original-reference");for(int n=0;n<cells.size();n++)row.createCell(n).setCellValue(cells.get(n));book.write(out);f.source=out.toByteArray();
        }
        String hash=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(f.source));
        f.document=insert(c,"INSERT INTO import_batches(project_id,file_name,file_checksum,status,total_rows,valid_rows,staged_expires_at,committed_at,imported_by,created_at,sheet_name,source_workbook) VALUES(?,'original.xlsx',?,'COMMITTED',1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),'TestCases',?)",f.project,hash,f.pm,f.source);
        String raw="{\"caseNo\":\"TC1\",\"suiteCode\":\"S1\",\"titleVi\":\"Source title\",\"stepsVi\":\"Steps\",\"expectedVi\":\"Expected\",\"sourceReference\":\"original-reference\"}";
        f.row=insert(c,"INSERT INTO import_rows(project_id,batch_id,source_row_number,source_case_key,suite_code,raw_data_json,target_case_id,created_at,result_status,result_version,result_updated_at,result_updated_by,result_request_key) VALUES(?,?,2,'TC1','S1',?,?,UTC_TIMESTAMP(6),'FIXED',3,UTC_TIMESTAMP(6),?,'historic-annotation')",f.project,f.document,raw,f.testCase,f.tester);
        f.asset=insert(c,"INSERT INTO device_assets(asset_code,type,model,os_name,created_at,created_by,updated_at,updated_by) VALUES(?,'IPAD','iPad','iPadOS',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)","FQ"+tag,f.pm,f.pm);
        f.allocation=insert(c,"INSERT INTO device_allocations(asset_id,project_id,recipient_membership_id,assigned_at,assigned_by) VALUES(?,?,?,UTC_TIMESTAMP(6),?)",f.asset,f.project,f.testerMember,f.pm);
        if(historical){long run=f.run(c),attempt=f.attempt(c,run),bug=f.work(c,"BUG",1);
            update(c,"UPDATE run_items SET latest_attempt_id=? WHERE id=?",attempt,run);
            update(c,"INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,build_id,environment_id,device_id,test_case_id,revision_id,standalone_reason,context_snapshot) VALUES(?,?,'INTERNAL_V1','Steps','Expected','Observed',?,?,?,?,?,'','{}')",f.project,bug,f.build,f.environment,f.device,f.testCase,f.revision);
            update(c,"INSERT INTO work_item_execution_links(project_id,work_item_id,run_item_id,attempt_id,linked_by,linked_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))",f.project,bug,run,attempt,f.pmMember);
            update(c,"INSERT INTO work_item_history(project_id,work_item_id,event_type,to_status,reason,details_json,actor_membership_id,occurred_at) VALUES(?,?,'CREATE','open','Historical reason','{\"preserve\":true}',?,UTC_TIMESTAMP(6))",f.project,bug,f.pmMember);
            update(c,"INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'DOCUMENT_ROW',?,'RESULT',UTC_TIMESTAMP(6))",f.project,f.tester,f.row);
        }return f;
    }
    private static String user(Connection c,String tag,String role)throws SQLException {String id=UUID.randomUUID().toString();update(c,"INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES(?,?,?,'not-a-login',?,UTC_TIMESTAMP(6))",id,"fq."+tag+"."+role,role,role);return id;}
    private long member(Connection c,String user,String role)throws SQLException{return insert(c,"INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project,user,role);}
    long run(Connection c)throws SQLException{return insert(c,"INSERT INTO run_items(project_id,cycle_id,configuration_id,test_case_id,revision_id,assignee_membership_id,created_at) VALUES(?,?,?,?,?,?,UTC_TIMESTAMP(6))",project,cycle,configuration,testCase,revision,testerMember);}
    long attempt(Connection c,long run)throws SQLException{return insert(c,"INSERT INTO execution_attempts(project_id,run_item_id,attempt_no,result_code,build_id,executor_membership_id,executed_at,actual_result,reason,evidence_reference,context_snapshot,request_key,request_checksum) VALUES(?,?,1,'NG',?,?,UTC_TIMESTAMP(6),'Historical observed','','historic-evidence','{\"historical\":true}','historic-attempt',REPEAT('a',64))",project,run,build,pmMember);}
    long work(Connection c,String type,int number)throws SQLException{return insert(c,"INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,created_by,updated_by,created_at,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,'Historical description',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,REPEAT('b',64))",project,number,"FQ-"+project+"-"+number,type,"Native "+type,pmMember,pmMember,"native-work-"+number);}
    long group(Connection c,long run)throws SQLException {long group=insert(c,"INSERT INTO file_work_groups(project_id,document_id,cycle_id,configuration_id,created_by,created_at,updated_by,updated_at,request_key,request_checksum) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),'native-group',REPEAT('c',64))",project,document,cycle,configuration,pmMember,pmMember);update(c,"INSERT INTO file_work_group_items(project_id,group_id,document_id,cycle_id,configuration_id,import_row_id,run_item_id,test_case_id,revision_id) VALUES(?,?,?,?,?,?,?,?,?)",project,group,document,cycle,configuration,row,run,testCase,revision);return group;}
    long session(Connection c,long group,String state)throws SQLException{return insert(c,"INSERT INTO file_work_sessions(project_id,group_id,executor_membership_id,allocation_id,asset_id,build_id,state,context_snapshot,started_at,last_transition_at) VALUES(?,?,?,?,?,?,?,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project,group,testerMember,allocation,asset,build,state);}
    static int update(Connection c,String sql,Object...args)throws SQLException{try(var s=c.prepareStatement(sql)){bind(s,args);s.setQueryTimeout(8);return s.executeUpdate();}}
    static long insert(Connection c,String sql,Object...args)throws SQLException{try(var s=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)){bind(s,args);s.setQueryTimeout(8);s.executeUpdate();try(var r=s.getGeneratedKeys()){if(!r.next())throw new SQLException("No fixture key");return r.getLong(1);}}}
    static long scalar(Connection c,String sql,Object...args)throws SQLException{try(var s=c.prepareStatement(sql)){bind(s,args);s.setQueryTimeout(8);try(var r=s.executeQuery()){if(!r.next())throw new SQLException("No scalar result");return r.getLong(1);}}}
    static byte[] bytes(Connection c,String sql,Object...args)throws SQLException{try(var s=c.prepareStatement(sql)){bind(s,args);try(var r=s.executeQuery()){if(!r.next())throw new SQLException("No workbook");return r.getBytes(1);}}}
    private static void bind(PreparedStatement s,Object[] args)throws SQLException{for(int n=0;n<args.length;n++)s.setObject(n+1,args[n]);}
}
