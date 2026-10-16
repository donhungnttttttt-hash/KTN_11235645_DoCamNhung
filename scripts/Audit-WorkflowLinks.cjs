// Read-only integration audit. No file contents, credentials or person names are emitted.
const fs=require('node:fs');
const path=require('node:path');
const {localQuery}=require('./database/mysql-client.cjs');
const query=localQuery();
const checks={
 GROUP_MIXED_ASSIGNEES:`SELECT COUNT(*) FROM (SELECT i.project_id,i.group_id FROM file_work_group_items i JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id GROUP BY i.project_id,i.group_id HAVING COUNT(DISTINCT r.assignee_membership_id)>1) mixed`,
 RUN_LATEST_ATTEMPT_MISMATCH:`SELECT COUNT(*) FROM run_items r JOIN execution_attempts a ON a.id=r.latest_attempt_id WHERE a.project_id<>r.project_id OR a.run_item_id<>r.id`,
 DOCUMENT_RETEST_CASE_MISMATCH:`SELECT COUNT(*) FROM test_document_retests d JOIN import_rows ir ON ir.id=d.row_id JOIN run_items r ON r.id=d.run_item_id WHERE d.project_id<>ir.project_id OR d.project_id<>r.project_id OR d.test_case_id<>ir.target_case_id OR d.test_case_id<>r.test_case_id`,
 CASE_CURRENT_REVISION_MISMATCH:`SELECT COUNT(*) FROM test_cases c JOIN test_case_revisions r ON r.id=c.current_revision_id WHERE r.project_id<>c.project_id OR r.test_case_id<>c.id`,
 RUN_REVISION_MISMATCH:`SELECT COUNT(*) FROM run_items i JOIN test_case_revisions r ON r.id=i.revision_id WHERE r.project_id<>i.project_id OR r.test_case_id<>i.test_case_id`,
 GROUP_SOURCE_MISMATCH:`SELECT COUNT(*) FROM file_work_group_items i JOIN file_work_groups g ON g.id=i.group_id JOIN import_rows ir ON ir.id=i.import_row_id JOIN run_items r ON r.id=i.run_item_id WHERE i.project_id<>g.project_id OR i.document_id<>g.document_id OR i.cycle_id<>g.cycle_id OR i.configuration_id<>g.configuration_id OR ir.batch_id<>i.document_id OR ir.target_case_id<>i.test_case_id OR r.cycle_id<>i.cycle_id OR r.configuration_id<>i.configuration_id OR r.revision_id<>i.revision_id OR r.test_case_id<>i.test_case_id OR r.project_id<>i.project_id OR ir.project_id<>i.project_id`,
 BUG_ATTEMPT_MISMATCH:`SELECT COUNT(*) FROM work_item_execution_links l JOIN execution_attempts a ON a.id=l.attempt_id WHERE a.project_id<>l.project_id OR a.run_item_id<>l.run_item_id`,
 QA_GROUP_DOCUMENT_MISMATCH:`SELECT COUNT(*) FROM qa_details q JOIN file_work_groups g ON g.id=q.group_id WHERE q.project_id<>g.project_id OR (q.document_id IS NOT NULL AND q.document_id<>g.document_id)`,
 QA_RUN_REVISION_MISMATCH:`SELECT COUNT(*) FROM qa_details q JOIN run_items r ON r.id=q.run_item_id WHERE q.project_id<>r.project_id OR (q.revision_id IS NOT NULL AND q.revision_id<>r.revision_id) OR (q.test_case_id IS NOT NULL AND q.test_case_id<>r.test_case_id)`,
 COMMITTED_UNMAPPED_VALID_ROW:`SELECT COUNT(*) FROM import_rows ir JOIN import_batches b ON b.project_id=ir.project_id AND b.id=ir.batch_id WHERE b.status='COMMITTED' AND ir.is_valid=TRUE AND ir.target_case_id IS NULL`
};
try {
 const sql=Object.entries(checks).map(([name,select])=>`SELECT '${name}' AS checkName,(${select}) AS violations`).join(' UNION ALL ');
 const result=query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; START TRANSACTION READ ONLY; '+sql+'; COMMIT;').map(row=>{const [name,count]=row.split('\t');return {name,count:Number(count)};});
 const projects=query(`SELECT JSON_OBJECT('projectId',p.id,'projectCode',p.code,'documents',(SELECT COUNT(*) FROM import_batches b WHERE b.project_id=p.id AND b.status='COMMITTED'),'fileGroups',(SELECT COUNT(*) FROM file_work_groups g WHERE g.project_id=p.id),'runs',(SELECT COUNT(*) FROM run_items r WHERE r.project_id=p.id),'sourceRows',(SELECT COUNT(*) FROM import_rows ir JOIN import_batches b ON b.id=ir.batch_id AND b.project_id=ir.project_id WHERE ir.project_id=p.id AND b.status='COMMITTED')) FROM projects p ORDER BY p.id;`).map(JSON.parse);
 const report={checkedAt:new Date().toISOString(),readOnly:true,checks:result,failures:result.filter(r=>r.count),projects};
 const target=path.resolve(__dirname,'..',process.argv[2]||'var/ui-audit','workflow-links.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(report.failures.length)process.exitCode=1;
}catch{console.error('Workflow audit failed; no application data was changed and no credentials were printed.');process.exitCode=1;}
