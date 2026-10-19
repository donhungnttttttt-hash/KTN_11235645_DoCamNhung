const fs=require('node:fs'),root='Backend/src/main/java/';
let text=fs.readFileSync(root+'db/migration/V32__copy_feature_documents.java','utf8');
text=text.replace('public class V32__copy_feature_documents','public class V33__recover_padded_customer_documents');
text=text.replace("WHERE status='COMMITTED' AND feature_id IS NULL ORDER BY project_id,id","WHERE status='COMMITTED' AND feature_id IS NULL AND EXISTS(SELECT 1 FROM testing_migration_exceptions e WHERE e.project_id=import_batches.project_id AND e.source_batch_id=import_batches.id AND e.code='SOURCE_CONTENT_UNAVAILABLE') ORDER BY project_id,id");
text=text.replace('catch(Exception bad){exception(p,d,"SOURCE_CONTENT_UNAVAILABLE",bad.getMessage());continue;}','catch(Exception bad){continue;}');
text=text.replace('columns=sheet.getRow(0).getLastCellNum();','columns="CUSTOMER_V1".equals(source.get("mapping_version"))?vn.syp.tms.testcase.TestCaseWorkbook.effectiveCustomerWidth(sheet):sheet.getRow(0).getLastCellNum();');
text=text.replace('        long d=insert("INSERT INTO import_batches','        exception(p,old,"SOURCE_CONTENT_RECOVERED_V33","Đã phục hồi nguồn hợp lệ bằng cấu trúc cột hiệu lực của parser; giữ nguyên exception gốc và graph cũ.");\n        long d=insert("INSERT INTO import_batches');
text=text.replace('/** Copy first. No old rows, users, issues, device/configuration or private AI data are changed. */','/** Recover only valid sources skipped by V32 header-width validation; applied V31/V32 stay unchanged. */');
fs.writeFileSync(root+'db/migration/V33__recover_padded_customer_documents.java',text);
