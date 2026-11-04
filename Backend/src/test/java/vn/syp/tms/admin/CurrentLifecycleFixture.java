package vn.syp.tms.admin;
import java.sql.*;
import java.util.*;
import java.io.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import vn.syp.tms.testcase.TestCaseWorkbook;
/** Current-schema UUID-owned fixture, used inside rollback transactions. */
final class CurrentLifecycleFixture {
    long project,pmMember,testerMember,devMember,dev2Member,environment,device,build,otherBuild,cycle,configuration,suite,testCase,revision,document,row,asset,allocation;
    String pm,tester,dev,dev2;byte[] source;
    static CurrentLifecycleFixture seed(Connection c,boolean historical)throws Exception {
        var f=new CurrentLifecycleFixture();String tag=UUID.randomUUID().toString().replace("-","").substring(0,12);
        f.pm=user(c,tag,"PM");f.tester=user(c,tag+"t","USER");f.dev=user(c,tag+"d","USER");f.dev2=user(c,tag+"b","USER");
        f.project=insert(c,"INSERT INTO projects(code,name,created_at,created_by,updated_at,updated_by) VALUES(?,'Native FQ',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),?)","FQ"+tag,f.pm,f.pm);
        f.pmMember=f.member(c,f.pm,"PM");f.testerMember=f.member(c,f.tester,"USER");f.devMember=f.member(c,f.dev,"USER");f.dev2Member=f.member(c,f.dev2,"USER");
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
