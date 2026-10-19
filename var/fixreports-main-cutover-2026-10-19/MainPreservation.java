package vn.syp.tms.testcase;
import static vn.syp.tms.testcase.FixReportsSnapshotMigrationTest.*;
import com.fasterxml.jackson.core.type.TypeReference;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
public class MainPreservation {
 public static void main(String[] args) throws Exception {
  Path dir=Path.of(args[1]); String mode=args[0];
  var proof=new LinkedHashMap<String,Object>();proof.put("mode",mode);proof.put("schema","tms");proof.put("databaseWrites",false);
  try {
   String url=System.getenv("CUTOVER_DB_URL");
   require("jdbc:mysql://127.0.0.1:3307/tms?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED".equals(url),"EXACT_MAIN_URL_REQUIRED");
   try(var connection=DriverManager.getConnection(url,System.getenv("CUTOVER_DB_USER"),System.getenv("CUTOVER_DB_PASSWORD"))) {
    connection.setReadOnly(true);connection.setAutoCommit(false);
    require("tms".equals(text(connection,"SELECT DATABASE()")),"MAIN_SCHEMA_REQUIRED");
    require(number(connection,"SELECT COUNT(*) FROM flyway_schema_history WHERE success=0")==0,"FAILED_MIGRATION");
    long version=number(connection,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1");
    if("before".equals(mode)) {
     require(version==30,"PRE_VERSION30_REQUIRED");
     var original=new TreeMap<>(capture(connection,null));int allTables=original.size();
     original.keySet().removeIf(t->t.equalsIgnoreCase("spring_session")||t.equalsIgnoreCase("spring_session_attributes"));
     var before=new LinkedHashMap<String,Object>();before.put("version",version);before.put("tableCount",allTables);before.put("original",original);
     before.put("sources",sources(connection));
     before.put("cycles",query(connection,"SELECT c.id,c.project_id,c.created_by,EXISTS(SELECT 1 FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=c.project_id AND m.id=c.created_by) AS source_actor_exists FROM test_cycles c ORDER BY c.project_id,c.id"));
     before.put("unfiled",query(connection,"SELECT c.id,c.project_id FROM test_cases c WHERE NOT EXISTS(SELECT 1 FROM import_rows r WHERE r.project_id=c.project_id AND r.target_case_id=c.id) ORDER BY c.project_id,c.id"));
     before.put("backupSha256",System.getenv("CUTOVER_BACKUP_SHA256"));
     write(dir.resolve("main-before.json"),before,true);
     proof.put("status","PASS");proof.put("tableCount",allTables);proof.put("preservedTables",original.size());proof.put("rows",original.values().stream().mapToLong(t->t.rows().size()).sum());
    } else {
     require("after".equals(mode)&&version==33,"AFTER_VERSION33_REQUIRED");
     var before=JSON.readTree(Files.readAllBytes(dir.resolve("main-before.json")));
     var original=JSON.convertValue(before.path("original"),new TypeReference<TreeMap<String,TableImage>>(){});
     var sources=JSON.convertValue(before.path("sources"),new TypeReference<ArrayList<Source>>(){});
     var cycles=JSON.convertValue(before.path("cycles"),new TypeReference<ArrayList<Map<String,Object>>>(){});
     var unfiled=JSON.convertValue(before.path("unfiled"),new TypeReference<ArrayList<Map<String,Object>>>(){});
     var eligibleCycles=new HashSet<String>();for(var cycle:cycles)if(truth(cycle.get("source_actor_exists")))eligibleCycles.add(n(cycle,"project_id")+":"+n(cycle,"id"));
     var after=capture(connection,original);long oldRows=0;
     for(var entry:original.entrySet())for(var row:entry.getValue().rows().entrySet()) {
      require(Objects.equals(row.getValue(),after.get(entry.getKey()).rows().get(row.getKey())),"ORIGINAL_ROW_CHANGED_"+entry.getKey()+"_PK_SHA_"+row.getKey());oldRows++;
     }
                var clonedCases=new HashSet<Long>();var verified=new ArrayList<Map<String,Object>>();var exceptions=new ArrayList<Map<String,Object>>();long clones=0,rows=0,recovered=0;
                for(var cycle:cycles)require(number(connection,"SELECT COUNT(*) FROM testing_features WHERE project_id=? AND source_cycle_id=? AND migration_key=?",n(cycle,"project_id"),n(cycle,"id"),"CYCLE:"+n(cycle,"id"))==(truth(cycle.get("source_actor_exists"))?1:0),"CYCLE_FEATURE_MAPPING_"+n(cycle,"id"));
                for(var source:sources) {
                    var copies=query(connection,"SELECT id,feature_id,source_workbook,file_name,file_checksum,mapping_version,sheet_name FROM import_batches WHERE project_id=? AND source_batch_id=? ORDER BY id",source.project(),source.id());
                    var recorded=query(connection,"SELECT code FROM testing_migration_exceptions WHERE project_id=? AND source_batch_id=?",source.project(),source.id());
                    if(source.failure()!=null) {
                        require(copies.isEmpty(),"INVALID_SOURCE_WAS_COPIED_"+source.id());
                        require(recorded.stream().anyMatch(r->"SOURCE_CONTENT_UNAVAILABLE".equals(r.get("code"))),"SOURCE_EXCEPTION_MISSING_"+source.id());
                        exceptions.add(Map.of("projectId",source.project(),"sourceDocumentId",source.id(),"reason",source.failure(),"retainedOriginal",true));continue;
                    }
                    var expectedKeys=new TreeSet<String>();if(source.cycles().isEmpty())expectedKeys.add("ORPHAN");else for(long cycle:source.cycles()) {
                        if(eligibleCycles.contains(source.project()+":"+cycle))expectedKeys.add("CYCLE:"+cycle);
                        else {require(number(connection,"SELECT COUNT(*) FROM testing_migration_exceptions WHERE project_id=? AND source_batch_id=? AND code='AMBIGUOUS_CYCLE' AND details LIKE ?",source.project(),source.id(),"%cycle "+cycle)>0,"AMBIGUOUS_CYCLE_EXCEPTION_MISSING_"+source.id());exceptions.add(Map.of("projectId",source.project(),"sourceDocumentId",source.id(),"cycleId",cycle,"reason","AMBIGUOUS_CYCLE","retainedOriginal",true));}
                    }
                    require(copies.size()==expectedKeys.size(),"CLONE_MAPPING_COUNT_"+source.id());
                    var actualKeys=new TreeSet<String>();
                    for(var copy:copies) {
                        long document=n(copy,"id"),feature=n(copy,"feature_id");
                        actualKeys.add(text(connection,"SELECT migration_key FROM testing_features WHERE project_id=? AND id=?",source.project(),feature));
                        require(sha((byte[])copy.get("source_workbook")).equals(source.workbookHash()),"CLONE_WORKBOOK_SHA_"+document);
                        require(tupleHash(copy,List.of("file_name","file_checksum","mapping_version","sheet_name")).equals(source.metadataHash()),"CLONE_FILE_METADATA_"+document);
                        var copiedRows=query(connection,"SELECT r.id,r.source_import_row_id,r.target_case_id,r.source_row_number,r.raw_data_json,r.result_status,c.owning_document_id,c.current_revision_id FROM import_rows r JOIN test_cases c ON c.project_id=r.project_id AND c.id=r.target_case_id WHERE r.project_id=? AND r.batch_id=? ORDER BY r.source_row_number,r.id",source.project(),document);
                        require(copiedRows.size()==source.rows().size(),"CLONE_CASE_COUNT_"+document);
                        var bySource=new HashMap<Long,Map<String,Object>>();for(var row:copiedRows)require(bySource.put(n(row,"source_import_row_id"),row)==null,"DUPLICATE_SOURCE_ROW_"+document);
                        for(var old:source.rows()) {
                            var row=bySource.get(old.id());require(row!=null,"CLONE_ROW_MISSING_"+old.id());long caseId=n(row,"target_case_id"),rowId=n(row,"id"),revision=n(row,"current_revision_id");
                            require(caseId!=old.caseId()&&clonedCases.add(caseId)&&n(row,"owning_document_id")==document,"MUTABLE_CASE_SHARED_"+caseId);
                            require(n(row,"source_row_number")==old.rowNumber()&&sha(bytes(row.get("raw_data_json"))).equals(old.rawHash()),"CLONE_RAW_JSON_"+rowId);
                            require(revisionHash(connection,source.project(),caseId,revision).equals(old.revisionHash()),"CLONE_CURRENT_REVISION_"+caseId);
                            require(overlayHash(connection,source.project(),rowId).equals(old.overlayHash()),"CLONE_CELL_OVERLAY_"+rowId);
                            require("UNEXECUTED".equals(row.get("result_status")),"CLONE_RESULT_NOT_RESET_"+rowId);
                            require(number(connection,"SELECT COUNT(*) FROM test_document_assignments WHERE project_id=? AND document_id=? AND row_id=? AND assignee_membership_id IS NULL AND first_tester_membership_id IS NULL AND latest_tester_membership_id IS NULL",source.project(),document,rowId)==1,"CLONE_ASSIGNMENT_NOT_RESET_"+rowId);
                            require(number(connection,"SELECT COUNT(*) FROM testing_migration_case_map WHERE project_id=? AND feature_id=? AND document_id=? AND old_case_id=? AND old_revision_id=? AND new_case_id=? AND new_revision_id=?",source.project(),feature,document,old.caseId(),old.revisionId(),caseId,revision)==1,"CASE_MAPPING_MISSING_"+caseId);rows++;
                        }
                        verified.add(Map.of("projectId",source.project(),"sourceDocumentId",source.id(),"featureId",feature,"documentId",document,"rowCount",copiedRows.size(),"workbookSha256",source.workbookHash()));clones++;
                    }
                    require(actualKeys.equals(expectedKeys),"WRONG_CYCLE_OR_ORPHAN_MAPPING_"+source.id());
                    if(source.padded()) {require(recorded.stream().anyMatch(r->"SOURCE_CONTENT_RECOVERED_V33".equals(r.get("code"))),"PADDED_CUSTOMER_NOT_RECOVERED_"+source.id());recovered++;}
                }
                for(var row:unfiled)require(number(connection,"SELECT COUNT(*) FROM testing_migration_case_map WHERE project_id=? AND old_case_id=?",n(row,"project_id"),n(row,"id"))==0,"UNFILED_CASE_FABRICATED_WORKBOOK_"+n(row,"id"));
                var expectedFailures=new TreeSet<Long>();sources.stream().filter(s->s.failure()!=null||s.padded()||s.cycles().stream().anyMatch(c->!eligibleCycles.contains(s.project()+":"+c))).forEach(s->expectedFailures.add(s.id()));
                for(var row:query(connection,"SELECT source_batch_id,code FROM testing_migration_exceptions")) {
                    long id=n(row,"source_batch_id");require(expectedFailures.contains(id),"UNEXPECTED_MIGRATION_EXCEPTION_"+id);
                    require(Set.of("SOURCE_CONTENT_UNAVAILABLE","SOURCE_CONTENT_RECOVERED_V33","AMBIGUOUS_CYCLE").contains(row.get("code")),"UNEXPECTED_MIGRATION_EXCEPTION_CODE_"+id);
                }

     var flyway=Flyway.configure().dataSource(url,System.getenv("CUTOVER_DB_USER"),System.getenv("CUTOVER_DB_PASSWORD")).locations("classpath:db/migration","classpath:db/demo").cleanDisabled(true).createSchemas(false).load();
     flyway.validate();require(flyway.info().pending().length==0,"PENDING_MIGRATIONS_REMAIN");
     proof.put("status","PASS");proof.put("preVersion",30);proof.put("postVersion",33);proof.put("originalTableCount",before.path("tableCount").asInt());proof.put("preservedTables",original.size());proof.put("sessionTablesExcludedFromRowComparison",2);proof.put("oldRowsVerifiedIdentical",oldRows);
     proof.put("cloneCount",clones);proof.put("cloneRowsVerified",rows);proof.put("paddedSourcesRecoveredV33",recovered);proof.put("sourceExceptions",exceptions);proof.put("unfiledCasesRetained",unfiled.size());proof.put("verifiedCopies",verified);proof.put("flywayValidation","PASS");proof.put("pendingMigrations",0);
    }
    connection.rollback();
   }
  } catch(Throwable failure) {proof.put("status","FAIL");proof.put("failure",failure instanceof SafeFailure?failure.getMessage():"UNEXPECTED_"+failure.getClass().getSimpleName());}
  write(dir.resolve("main-"+mode+"-proof.json"),proof,true);
  System.out.println(JSON.writeValueAsString(proof));if(!"PASS".equals(proof.get("status")))System.exit(1);
 }
}
