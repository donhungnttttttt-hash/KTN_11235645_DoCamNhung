package vn.syp.tms.testcase;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Restored backup validator only: no Spring context, provider, scheduler, main DB or cleanup. */
@EnabledIfEnvironmentVariable(named="TMS_TEST_FEATURE_MODE", matches="snapshot")
class FixReportsSnapshotMigrationTest {
    static final String SCHEMA="tms_docstest_4106ddac5f8d";
    static final String BACKUP_SHA="dd945970478c48c4eb550fdda6fa2b0ade9b19d162b1556c6a31a674ad386f73";
    static final ObjectMapper JSON=new ObjectMapper();
    static final String[] LOCATIONS={"classpath:db/migration","classpath:db/demo"};
    static final List<String> REVISION=List.of("title_vi","preconditions_vi","steps_vi","expected_vi","title_jp","preconditions_jp","steps_jp","expected_jp","source_reference","created_by","created_by_user_id");
    record TableImage(List<String> columns,List<String> primaryKey,SortedMap<String,String> rows) {}
    record SourceRow(long id,long caseId,long revisionId,long rowNumber,String rawHash,String revisionHash,String overlayHash) {}
    record Source(long project,long id,String workbookHash,String metadataHash,List<SourceRow> rows,SortedSet<Long> cycles,String failure,boolean padded) {}
    static final class SafeFailure extends RuntimeException {SafeFailure(String code){super(code);}}

    @Test void restoredV30RetainsEveryOriginalRowAndCopiesVerifiedIndependentFeatureSources() throws Exception {
        Path evidence=Path.of("..","var","fixreports-2026-10-19").toAbsolutePath().normalize();
        var proof=new LinkedHashMap<String,Object>();proof.put("schema",SCHEMA);proof.put("backupSha256",BACKUP_SHA);
        proof.put("mainUntouched",true);proof.put("mainUntouchedBasis","Only exact isolated-schema JDBC URL admitted; no main connection opened; backup provenance hash checked by dedicated runner");
        proof.put("status","NOT_RUN");proof.put("migrationLocations",List.of(LOCATIONS));
        boolean mayWriteProof=!Files.exists(evidence.resolve("snapshot-proof.json"));
        try {
            String url=System.getenv("TMS_TEST_DB_URL"),user=System.getenv("TMS_TEST_DB_USER"),password=System.getenv("TMS_TEST_DB_PASSWORD");
            String suffix=":3307/"+SCHEMA+"?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED";
            require(("jdbc:mysql://127.0.0.1"+suffix).equals(url)||("jdbc:mysql://localhost"+suffix).equals(url),"WRONG_TARGET_URL");
            require(BACKUP_SHA.equals(System.getenv("TMS_SNAPSHOT_BACKUP_SHA256")),"BACKUP_PROVENANCE_REQUIRED");
            require(Files.isDirectory(evidence),"EVIDENCE_DIRECTORY_MISSING");
            var manifest=JSON.readTree(Files.readAllBytes(evidence.resolve("final-migration-targets.json")));
            require(BACKUP_SHA.equals(manifest.path("backupSha256").asText())&&manifest.path("sessionRowsExcluded").asBoolean(),"REVIEWED_MANIFEST_REQUIRED");
            boolean reviewedTarget=false;for(var target:manifest.path("targets"))if(SCHEMA.equals(target.path("schema").asText())&&"main-v30-snapshot".equals(target.path("purpose").asText())&&"RESTORED_V30".equals(target.path("status").asText())&&target.path("tableCount").asInt()==76)reviewedTarget=true;
            require(reviewedTarget,"REVIEWED_SNAPSHOT_TARGET_REQUIRED");
            Path repo=evidence.getParent().getParent(),backup=repo.resolve(manifest.path("backup").asText()).normalize();
            require(backup.startsWith(repo.resolve("var/mysql-native/backups").normalize())&&backup.toString().endsWith(".sql"),"REVIEWED_BACKUP_PATH_REQUIRED");
            var backupDigest=MessageDigest.getInstance("SHA-256");try(var input=Files.newInputStream(backup)){byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1)backupDigest.update(buffer,0,count);}
            require(BACKUP_SHA.equals(HexFormat.of().formatHex(backupDigest.digest())),"BACKUP_SHA_MISMATCH");
            boolean resume="true".equals(System.getenv("TMS_SNAPSHOT_RESUME_VALIDATED_LOCATION_FAILURE"));
            Path beforePath=evidence.resolve("snapshot-before.json");
            require(resume==Files.exists(beforePath),"EXPLICIT_LOCATION_FAILURE_RESUME_REQUIRED");
            JsonNode immutableBefore=null;
            if(resume) {
                require(sha(Files.readAllBytes(beforePath)).equals(System.getenv("TMS_SNAPSHOT_IMMUTABLE_BEFORE_SHA256")),"IMMUTABLE_BEFORE_SHA_MISMATCH");
                Path firstProof=evidence.resolve("snapshot-first-location-failure-proof.json"),firstLog=evidence.resolve("snapshot-first-location-failure.log");
                require(sha(Files.readAllBytes(firstProof)).equals(System.getenv("TMS_SNAPSHOT_FIRST_FAILURE_PROOF_SHA256")),"FIRST_FAILURE_PROOF_SHA_MISMATCH");
                require(fileSha(firstLog).equals(System.getenv("TMS_SNAPSHOT_FIRST_FAILURE_LOG_SHA256")),"FIRST_FAILURE_LOG_SHA_MISMATCH");
                mayWriteProof=true;
                var prior=JSON.readTree(Files.readAllBytes(firstProof));
                require("FAIL".equals(prior.path("status").asText())&&"UNEXPECTED_FlywayValidateException".equals(prior.path("failure").asText())&&SCHEMA.equals(prior.path("schema").asText())&&BACKUP_SHA.equals(prior.path("backupSha256").asText())&&prior.path("mainUntouched").asBoolean(),"ONLY_FIRST_LOCATION_VALIDATE_FAILURE_RESUMABLE");
                immutableBefore=JSON.readTree(Files.readAllBytes(beforePath));
                require(SCHEMA.equals(immutableBefore.path("schema").asText())&&BACKUP_SHA.equals(immutableBefore.path("backupSha256").asText())&&immutableBefore.path("preVersion").asInt()==30&&immutableBefore.path("oldTables").size()==76,"INVALID_IMMUTABLE_BEFORE");
                proof.put("snapshotBeforeSha256",System.getenv("TMS_SNAPSHOT_IMMUTABLE_BEFORE_SHA256"));
                proof.put("firstFailureProofSha256",System.getenv("TMS_SNAPSHOT_FIRST_FAILURE_PROOF_SHA256"));proof.put("firstFailureLogSha256",System.getenv("TMS_SNAPSHOT_FIRST_FAILURE_LOG_SHA256"));
            }
            try(var connection=DriverManager.getConnection(url,user,password)) {
                require(SCHEMA.equals(text(connection,"SELECT DATABASE()")),"WRONG_CONNECTED_SCHEMA");
                require(number(connection,"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'")==76,"RESTORED_76_TABLES_REQUIRED");
                require(number(connection,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")==30,"PRE_VERSION_30_REQUIRED");
                require(number(connection,"SELECT COUNT(*) FROM projects")>0&&number(connection,"SELECT COUNT(*) FROM import_batches WHERE status='COMMITTED'")>0,"REFUSE_EMPTY_OR_SYNTHETIC_TARGET");
                var original=capture(connection,null);
                var sources=sources(connection);
                var cycles=query(connection,"SELECT c.id,c.project_id,c.created_by,EXISTS(SELECT 1 FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=c.project_id AND m.id=c.created_by) AS source_actor_exists FROM test_cycles c ORDER BY c.project_id,c.id");
                var eligibleCycles=new HashSet<String>();for(var cycle:cycles)if(truth(cycle.get("source_actor_exists")))eligibleCycles.add(n(cycle,"project_id")+":"+n(cycle,"id"));
                var unfiled=query(connection,"SELECT c.id,c.project_id FROM test_cases c WHERE NOT EXISTS(SELECT 1 FROM import_rows r WHERE r.project_id=c.project_id AND r.target_case_id=c.id) ORDER BY c.project_id,c.id");
                var before=new LinkedHashMap<String,Object>();before.put("schema",SCHEMA);before.put("backupSha256",BACKUP_SHA);before.put("preVersion",30);
                var projectManifest=new ArrayList<Map<String,Object>>();
                for(var project:query(connection,"SELECT id,code FROM projects ORDER BY id"))projectManifest.add(Map.of("projectId",n(project,"id"),"codeSha256",sha(Objects.toString(project.get("code"),"").getBytes(StandardCharsets.UTF_8))));
                before.put("projects",projectManifest);
                before.put("oldTables",images(original));before.put("sources",sources.stream().map(FixReportsSnapshotMigrationTest::sourceEvidence).toList());
                before.put("cycles",cycles.stream().map(c->Map.of("projectId",n(c,"project_id"),"cycleId",n(c,"id"),"sourceActorAvailable",truth(c.get("source_actor_exists")))).toList());
                before.put("unfiledCases",unfiled.stream().map(c->Map.of("projectId",n(c,"project_id"),"caseId",n(c,"id"),"reason","UNFILED_CASE_RETAINED_NO_WORKBOOK")).toList());
                if(resume) {
                    require(JSON.readTree(JSON.writeValueAsBytes(before)).equals(immutableBefore),"RESUME_ORIGINAL_DATA_OR_SCHEMA_CHANGED");
                    proof.put("resumeOriginalTableImagesVerified",original.size());
                    proof.put("resumedGuardReason","FIRST_LOCATION_ONLY_VALIDATE_FAILURE_V30_ALL_76_ORIGINAL_TABLE_IMAGES_AND_SOURCE_EVIDENCE_IDENTICAL");
                    var oldValidation=Flyway.configure().dataSource(url,user,password).locations("classpath:db/migration").target("33").cleanDisabled(true).createSchemas(false).load().validateWithResult();
                    var diagnosis=validationEvidence(oldValidation);
                    write(evidence.resolve("snapshot-resume-default-location-validation.json"),diagnosis,true);
                    proof.put("priorLocationValidation",diagnosis);
                    var missing=new TreeSet<String>();var pending=new TreeSet<String>();boolean onlyExpected=true;
                    for(var invalid:oldValidation.invalidMigrations) {
                        String code=safeValidationCode(invalid.errorDetails);
                        if("APPLIED_VERSIONED_MIGRATION_NOT_RESOLVED".equals(code))missing.add(invalid.version);
                        else if("RESOLVED_VERSIONED_MIGRATION_NOT_APPLIED".equals(code))pending.add(invalid.version);
                        else onlyExpected=false;
                    }
                    require(!oldValidation.validationSuccessful&&onlyExpected&&oldValidation.invalidMigrations.size()==5&&missing.equals(Set.of("20","22"))&&pending.equals(Set.of("31","32","33")),"RESUME_NOT_ONLY_MISSING_DEMO_V20_V22_AND_THREE_PENDING");
                } else write(beforePath,before,true);

                var flyway=Flyway.configure().dataSource(url,user,password).locations(LOCATIONS).target("33").cleanDisabled(true).createSchemas(false).load();
                var preValidation=flyway.validateWithResult();proof.put("preMigrationValidation",validationEvidence(preValidation));
                write(evidence.resolve(resume?"snapshot-resume-corrected-location-validation.json":"snapshot-corrected-location-validation.json"),validationEvidence(preValidation),true);
                var pendingVersions=new TreeSet<String>();
                for(var invalid:preValidation.invalidMigrations){require("RESOLVED_VERSIONED_MIGRATION_NOT_APPLIED".equals(safeValidationCode(invalid.errorDetails)),"CORRECTED_LOCATION_HAS_NON_PENDING_VALIDATION_ERROR");pendingVersions.add(invalid.version);}
                require(!preValidation.validationSuccessful&&preValidation.invalidMigrations.size()==3&&pendingVersions.equals(Set.of("31","32","33")),"EXACT_THREE_PENDING_MIGRATIONS_REQUIRED");
                var pendingInfo=flyway.info().pending();
                require(pendingInfo.length==3&&Arrays.stream(pendingInfo).map(i->i.getVersion().toString()).collect(java.util.stream.Collectors.toSet()).equals(pendingVersions),"EXACT_PENDING_INFO_REQUIRED");
                proof.put("preMigrationValidationInterpretation","All applied history valid; only exact reviewed V31/V32/V33 pending. No ignore patterns, repair, or validateOnMigrate bypass.");
                int migrated=flyway.migrate().migrationsExecuted;proof.put("migrationsExecuted",migrated);
                require(migrated==3,"EXPECTED_V31_V32_V33_ONLY");flyway.validate();
                require(number(connection,"SELECT CAST(version AS UNSIGNED) FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1")==33,"POST_VERSION_33_REQUIRED");
                var after=capture(connection,original);
                long oldRows=0;
                for(var entry:original.entrySet()) {
                    var current=after.get(entry.getKey());if(current==null)throw new SafeFailure("OLD_TABLE_MISSING_"+entry.getKey());
                    for(var row:entry.getValue().rows().entrySet()) {
                        require(Objects.equals(row.getValue(),current.rows().get(row.getKey())),"ORIGINAL_ROW_CHANGED_"+entry.getKey()+"_PK_SHA_"+row.getKey());oldRows++;
                    }
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
                            var row=bySource.get(old.id());if(row==null)throw new SafeFailure("CLONE_ROW_MISSING_"+old.id());long caseId=n(row,"target_case_id"),rowId=n(row,"id"),revision=n(row,"current_revision_id");
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
                require(flyway.migrate().migrationsExecuted==0,"FLYWAY_REPLAY_NOT_ZERO");
                proof.put("status","PASS");proof.put("oldTableCount",original.size());proof.put("oldRowsVerifiedIdentical",oldRows);proof.put("oldTableFingerprints",images(after));
                proof.put("sourceDocuments",sources.size());proof.put("verifiedCopies",verified);proof.put("cloneCount",clones);proof.put("cloneRowsVerified",rows);proof.put("paddedSourcesRecoveredV33",recovered);
                proof.put("sourceExceptions",exceptions);proof.put("unfiledCasesRetained",unfiled.size());proof.put("flywayReplayMigrationsExecuted",0);proof.put("postVersion",33);
                write(evidence.resolve("snapshot-proof.json"),proof,false);
            }
        } catch(Throwable failure) {
            proof.put("status","FAIL");proof.put("failure",failure instanceof SafeFailure?failure.getMessage():"UNEXPECTED_"+failure.getClass().getSimpleName());
            write(evidence.resolve(mayWriteProof?"snapshot-proof.json":"snapshot-refused-proof.json"),proof,!mayWriteProof);
            // Never propagate a cause/message which might contain real project content or SQL values.
            throw new AssertionError("Snapshot migration validation failed; inspect sanitized snapshot-proof.json");
        }
    }

    static Map<String,Object> validationEvidence(org.flywaydb.core.api.output.ValidateResult result) {
        var invalid=new ArrayList<Map<String,String>>();
        for(var entry:result.invalidMigrations)invalid.add(Map.of("version",entry.version!=null&&entry.version.matches("[0-9.]{1,32}")?entry.version:"UNVERSIONED","code",safeValidationCode(entry.errorDetails)));
        return Map.of("validationSuccessful",result.validationSuccessful,"validatedMigrationCount",result.validateCount,"overallCode",safeValidationCode(result.errorDetails),"invalidMigrations",invalid);
    }
    static String safeValidationCode(org.flywaydb.core.api.ErrorDetails details) {String code=details==null?"NONE":details.errorCode.toString();return code.matches("[A-Z_]{1,100}")?code:"UNEXPECTED_CODE";}
    static String fileSha(Path path) throws Exception {var digest=MessageDigest.getInstance("SHA-256");try(var stream=Files.newInputStream(path)){byte[] buffer=new byte[8192];int count;while((count=stream.read(buffer))!=-1)digest.update(buffer,0,count);}return HexFormat.of().formatHex(digest.digest());}

    static SortedMap<String,TableImage> capture(Connection c,Map<String,TableImage> before) throws Exception {
        var result=new TreeMap<String,TableImage>();
        var names=before==null?query(c,"SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name").stream().map(r->Objects.toString(r.get("table_name"))).toList():new ArrayList<>(before.keySet());
        for(String table:names) {
            var columns=before==null?query(c,"SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? ORDER BY ordinal_position",table).stream().map(r->Objects.toString(r.get("column_name"))).toList():before.get(table).columns();
            var pk=before==null?query(c,"SELECT column_name FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name=? AND constraint_name='PRIMARY' ORDER BY ordinal_position",table).stream().map(r->Objects.toString(r.get("column_name"))).toList():before.get(table).primaryKey();
            require(!pk.isEmpty(),"PRIMARY_KEY_REQUIRED_"+table);var rows=new TreeMap<String,String>();
            try(var statement=c.prepareStatement("SELECT "+String.join(",",columns.stream().map(FixReportsSnapshotMigrationTest::quoted).toList())+" FROM "+quoted(table));var cursor=statement.executeQuery()) {
                while(cursor.next()) {
                    var digest=MessageDigest.getInstance("SHA-256");var key=MessageDigest.getInstance("SHA-256");
                    for(int i=0;i<columns.size();i++){byte[] value=cursor.getBytes(i+1);frame(digest,columns.get(i).getBytes(StandardCharsets.UTF_8));frame(digest,value);if(pk.contains(columns.get(i))){frame(key,columns.get(i).getBytes(StandardCharsets.UTF_8));frame(key,value);}}
                    require(rows.put(HexFormat.of().formatHex(key.digest()),HexFormat.of().formatHex(digest.digest()))==null,"PK_HASH_COLLISION_"+table);
                }
            }
            result.put(table,new TableImage(columns,pk,Collections.unmodifiableSortedMap(rows)));
        }
        return Collections.unmodifiableSortedMap(result);
    }
    static List<Map<String,Object>> images(Map<String,TableImage> tables) throws Exception {
        var result=new ArrayList<Map<String,Object>>();for(var entry:tables.entrySet()){var t=entry.getValue();result.add(Map.of("table",entry.getKey(),"columns",t.columns(),"primaryKeyColumns",t.primaryKey(),"rowCount",t.rows().size(),"rowFingerprints",t.rows(),"tableSha256",sha(JSON.writeValueAsBytes(t.rows()))));}return result;
    }
    static List<Source> sources(Connection c) throws Exception {
        var result=new ArrayList<Source>();
        for(var batch:query(c,"SELECT id,project_id,file_name,file_checksum,mapping_version,sheet_name,source_workbook FROM import_batches WHERE status='COMMITTED' ORDER BY project_id,id")) {
            long p=n(batch,"project_id"),d=n(batch,"id");var cycles=new TreeSet<Long>();
            for(var row:query(c,"SELECT cycle_id FROM file_work_groups WHERE project_id=? AND document_id=?",p,d))cycles.add(n(row,"cycle_id"));
            for(var row:query(c,"SELECT x.cycle_id FROM test_document_retests t JOIN import_rows r ON r.project_id=t.project_id AND r.id=t.row_id JOIN run_items x ON x.project_id=t.project_id AND x.id=t.run_item_id WHERE r.project_id=? AND r.batch_id=?",p,d))cycles.add(n(row,"cycle_id"));
            for(var row:query(c,"SELECT x.cycle_id FROM run_items x JOIN import_rows r ON r.project_id=x.project_id AND r.target_case_id=x.test_case_id WHERE r.project_id=? AND r.batch_id=?",p,d))cycles.add(n(row,"cycle_id"));
            String failure=null;boolean padded=false;int width=0,headerWidth=0;byte[] workbook=(byte[])batch.get("source_workbook");
            if(workbook==null||workbook.length==0)failure="MISSING_WORKBOOK";
            else try(var book=new XSSFWorkbook(new ByteArrayInputStream(workbook))) {
                var sheet=book.getSheet(Objects.toString(batch.get("sheet_name"),""));
                if(sheet==null||sheet.getRow(0)==null)failure="MISSING_WORKBOOK_SHEET_OR_HEADER";
                else {headerWidth=sheet.getRow(0).getLastCellNum();width="CUSTOMER_V1".equals(batch.get("mapping_version"))?TestCaseWorkbook.effectiveCustomerWidth(sheet):headerWidth;}
            }catch(Exception invalid){failure="CORRUPT_WORKBOOK";}
            var rows=new ArrayList<SourceRow>();
            var sourceRows=query(c,"SELECT id,target_case_id,source_row_number,raw_data_json FROM import_rows WHERE project_id=? AND batch_id=? AND target_case_id IS NOT NULL ORDER BY source_row_number,id",p,d);
            for(var row:sourceRows) {
                long id=n(row,"id"),caseId=n(row,"target_case_id");var revisions=query(c,"SELECT current_revision_id FROM test_cases WHERE project_id=? AND id=?",p,caseId);
                long revision=revisions.isEmpty()?0:n(revisions.getFirst(),"current_revision_id");
                if(revision==0||number(c,"SELECT COUNT(*) FROM test_case_revisions WHERE project_id=? AND test_case_id=? AND id=?",p,caseId,revision)!=1){if(failure==null)failure="INCOMPLETE_CURRENT_REVISION";continue;}
                if(number(c,"SELECT COUNT(*) FROM import_rows WHERE project_id=? AND target_case_id=? AND batch_id<>?",p,caseId,d)>0&&failure==null)failure="AMBIGUOUS_CASE_FILE_ASSOCIATION";
                try {
                    var input=JSON.readValue(Objects.toString(row.get("raw_data_json")),TestCaseDtos.ImportRowInput.class);
                    if("CUSTOMER_V1".equals(batch.get("mapping_version"))) {
                        int size=input.sourceCells()==null?-1:input.sourceCells().size();
                        if(size!=width&&failure==null)failure="SOURCE_CELL_WIDTH_MISMATCH";
                        if(size==width&&size!=headerWidth)padded=true;
                    }
                }catch(Exception invalid){if(failure==null)failure="INVALID_RAW_JSON";}
                if(number(c,"SELECT COUNT(*) FROM test_document_cell_edits WHERE project_id=? AND row_id=? AND (column_index<0 OR column_index>=?)",p,id,width)>0&&failure==null)failure="OVERLAY_OUTSIDE_WORKBOOK";
                rows.add(new SourceRow(id,caseId,revision,n(row,"source_row_number"),sha(bytes(row.get("raw_data_json"))),revisionHash(c,p,caseId,revision),overlayHash(c,p,id)));
            }
            result.add(new Source(p,d,workbook==null?"MISSING":sha(workbook),tupleHash(batch,List.of("file_name","file_checksum","mapping_version","sheet_name")),List.copyOf(rows),Collections.unmodifiableSortedSet(cycles),failure,padded));
        }
        return result;
    }
    static Map<String,Object> sourceEvidence(Source s) {var value=new LinkedHashMap<String,Object>();value.put("projectId",s.project());value.put("sourceDocumentId",s.id());value.put("workbookSha256",s.workbookHash());value.put("expectedCycleIds",s.cycles());value.put("orphan",s.cycles().isEmpty());value.put("targetRows",s.rows().size());value.put("validPaddedCustomer",s.failure()==null&&s.padded());value.put("exceptionReason",s.failure());value.put("expectedCloneCount",s.failure()!=null?0:s.cycles().isEmpty()?1:s.cycles().size());return value;}
    static String revisionHash(Connection c,long p,long id,long revision) throws Exception {var rows=query(c,"SELECT "+String.join(",",REVISION)+" FROM test_case_revisions WHERE project_id=? AND test_case_id=? AND id=?",p,id,revision);require(rows.size()==1,"CURRENT_REVISION_MISSING_"+id);return tupleHash(rows.getFirst(),REVISION);}
    static String overlayHash(Connection c,long p,long row) throws Exception {var digest=MessageDigest.getInstance("SHA-256");for(var edit:query(c,"SELECT column_index,cell_value,lock_version FROM test_document_cell_edits WHERE project_id=? AND row_id=? ORDER BY column_index",p,row))frame(digest,tupleHash(edit,List.of("column_index","cell_value","lock_version")).getBytes(StandardCharsets.UTF_8));return HexFormat.of().formatHex(digest.digest());}
    static String tupleHash(Map<String,Object> row,List<String> columns) throws Exception {var digest=MessageDigest.getInstance("SHA-256");for(String column:columns){frame(digest,column.getBytes(StandardCharsets.UTF_8));frame(digest,bytes(row.get(column)));}return HexFormat.of().formatHex(digest.digest());}
    static byte[] bytes(Object value) {return value==null?null:value instanceof byte[] raw?raw:value.toString().getBytes(StandardCharsets.UTF_8);}
    static String sha(byte[] value) throws Exception {return value==null?"NULL":HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));}
    static void frame(MessageDigest digest,byte[] value) {digest.update(ByteBuffer.allocate(4).putInt(value==null?-1:value.length).array());if(value!=null)digest.update(value);}
    static String quoted(String identifier) {require(identifier.matches("[A-Za-z0-9_]+"),"UNSAFE_METADATA_IDENTIFIER");return "`"+identifier+"`";}
    static List<Map<String,Object>> query(Connection c,String sql,Object...args) throws SQLException {try(var statement=c.prepareStatement(sql)){for(int i=0;i<args.length;i++)statement.setObject(i+1,args[i]);try(var rows=statement.executeQuery()){var result=new ArrayList<Map<String,Object>>();var meta=rows.getMetaData();while(rows.next()){var row=new LinkedHashMap<String,Object>();for(int i=1;i<=meta.getColumnCount();i++)row.put(meta.getColumnLabel(i).toLowerCase(Locale.ROOT),rows.getObject(i));result.add(row);}return result;}}}
    static long number(Connection c,String sql,Object...args) throws SQLException {var rows=query(c,sql,args);require(!rows.isEmpty(),"SCALAR_ROW_MISSING");return ((Number)rows.getFirst().values().iterator().next()).longValue();}
    static String text(Connection c,String sql,Object...args) throws SQLException {var rows=query(c,sql,args);require(!rows.isEmpty(),"SCALAR_TEXT_MISSING");return Objects.toString(rows.getFirst().values().iterator().next(),"");}
    static long n(Map<String,Object> row,String key) {var value=row.get(key);return value==null?0:((Number)value).longValue();}
    static boolean truth(Object value) {return Boolean.TRUE.equals(value)||value instanceof Number number&&number.longValue()!=0;}
    static void require(boolean condition,String code) {if(!condition)throw new SafeFailure(code);}
    static void write(Path file,Object content,boolean immutable) throws Exception {byte[] data=JSON.writerWithDefaultPrettyPrinter().writeValueAsBytes(content);if(immutable)Files.write(file,data,StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE);else Files.write(file,data,StandardOpenOption.CREATE,StandardOpenOption.TRUNCATE_EXISTING,StandardOpenOption.WRITE);}
}
