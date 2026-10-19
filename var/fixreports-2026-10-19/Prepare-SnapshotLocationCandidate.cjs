// Preparation only. Never executes Java, Maven, Flyway or JDBC.
const fs=require('node:fs'),path=require('node:path');
const base=__dirname,root=path.resolve(base,'../..');
let java=fs.readFileSync(path.join(root,'Backend/src/test/java/vn/syp/tms/testcase/FixReportsSnapshotMigrationTest.java'),'utf8');
function replaceJava(old,value){if(!java.includes(old))throw Error('Java source seam missing');java=java.replace(old,value);}
replaceJava('static final ObjectMapper JSON=new ObjectMapper();','static final ObjectMapper JSON=new ObjectMapper();\n    static final String[] LOCATIONS={"classpath:db/migration","classpath:db/demo"};');
replaceJava('proof.put("status","NOT_RUN");','proof.put("status","NOT_RUN");proof.put("migrationLocations",List.of(LOCATIONS));\n        boolean mayWriteProof=!Files.exists(evidence.resolve("snapshot-proof.json"));');
replaceJava('require(!Files.exists(evidence.resolve("snapshot-before.json")),"IMMUTABLE_BEFORE_MANIFEST_ALREADY_EXISTS");',String.raw`boolean resume="true".equals(System.getenv("TMS_SNAPSHOT_RESUME_VALIDATED_LOCATION_FAILURE"));
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
            }`);
replaceJava('write(evidence.resolve("snapshot-before.json"),before,true);',String.raw`if(resume) {
                    require(JSON.readTree(JSON.writeValueAsBytes(before)).equals(immutableBefore),"RESUME_ORIGINAL_DATA_OR_SCHEMA_CHANGED");
                    proof.put("resumeOriginalTableImagesVerified",original.size());
                    proof.put("resumedGuardReason","FIRST_LOCATION_ONLY_VALIDATE_FAILURE_V30_ALL_76_ORIGINAL_TABLE_IMAGES_AND_SOURCE_EVIDENCE_IDENTICAL");
                    var oldValidation=Flyway.configure().dataSource(url,user,password).locations("classpath:db/migration").target("33").cleanDisabled(true).createSchemas(false).load().validateWithResult();
                    var diagnosis=validationEvidence(oldValidation);
                    write(evidence.resolve("snapshot-resume-default-location-validation.json"),diagnosis,true);
                    proof.put("priorLocationValidation",diagnosis);
                    var missing=new TreeSet<String>();boolean onlyMissing=true;
                    for(var invalid:oldValidation.invalidMigrations) {
                        missing.add(invalid.version);
                        if(invalid.errorDetails==null||!"APPLIED_VERSIONED_MIGRATION_NOT_RESOLVED".equals(invalid.errorDetails.errorCode.toString()))onlyMissing=false;
                    }
                    require(!oldValidation.validationSuccessful&&onlyMissing&&oldValidation.invalidMigrations.size()==2&&missing.equals(Set.of("20","22")),"RESUME_NOT_ONLY_MISSING_DEMO_V20_V22");
                } else write(beforePath,before,true);`);
replaceJava('var flyway=Flyway.configure().dataSource(url,user,password).target("33").cleanDisabled(true).load();\n                require(flyway.migrate().migrationsExecuted==3,"EXPECTED_V31_V32_V33_ONLY");flyway.validate();',String.raw`var flyway=Flyway.configure().dataSource(url,user,password).locations(LOCATIONS).target("33").cleanDisabled(true).createSchemas(false).load();
                var preValidation=flyway.validateWithResult();proof.put("preMigrationValidation",validationEvidence(preValidation));
                write(evidence.resolve(resume?"snapshot-resume-corrected-location-validation.json":"snapshot-corrected-location-validation.json"),validationEvidence(preValidation),true);
                require(preValidation.validationSuccessful,"CORRECTED_LOCATION_VALIDATION_FAILED");
                int migrated=flyway.migrate().migrationsExecuted;proof.put("migrationsExecuted",migrated);
                require(migrated==3,"EXPECTED_V31_V32_V33_ONLY");flyway.validate();`);
replaceJava('static SortedMap<String,TableImage> capture(',String.raw`static Map<String,Object> validationEvidence(org.flywaydb.core.api.output.ValidateResult result) {
        var invalid=new ArrayList<Map<String,String>>();
        for(var entry:result.invalidMigrations)invalid.add(Map.of("version",entry.version!=null&&entry.version.matches("[0-9.]{1,32}")?entry.version:"UNVERSIONED","code",safeValidationCode(entry.errorDetails)));
        return Map.of("validationSuccessful",result.validationSuccessful,"validatedMigrationCount",result.validateCount,"overallCode",safeValidationCode(result.errorDetails),"invalidMigrations",invalid);
    }
    static String safeValidationCode(org.flywaydb.core.api.ErrorDetails details) {String code=details==null?"NONE":details.errorCode.toString();return code.matches("[A-Z_]{1,100}")?code:"UNEXPECTED_CODE";}
    static String fileSha(Path path) throws Exception {var digest=MessageDigest.getInstance("SHA-256");try(var stream=Files.newInputStream(path)){byte[] buffer=new byte[8192];int count;while((count=stream.read(buffer))!=-1)digest.update(buffer,0,count);}return HexFormat.of().formatHex(digest.digest());}

    static SortedMap<String,TableImage> capture(`);
replaceJava('write(evidence.resolve("snapshot-proof.json"),proof,false);\n            // Never propagate','write(evidence.resolve(mayWriteProof?"snapshot-proof.json":"snapshot-refused-proof.json"),proof,!mayWriteProof);\n            // Never propagate');
fs.writeFileSync(path.join(base,'FixReportsSnapshotMigrationTest.candidate.java'),java,{flag:'wx'});
let runner=fs.readFileSync(path.join(base,'Run-SnapshotMigration.cjs'),'utf8');
function replaceRunner(old,value){if(!runner.includes(old))throw Error('Runner source seam missing');runner=runner.replace(old,value);}
replaceRunner('function compileOnly(){','function compileOnly(candidate=false){');
replaceRunner("quote(path.join(root,'Backend','src','test','java','vn','syp','tms','testcase','FixReportsSnapshotMigrationTest.java'))","quote(candidate?path.join(__dirname,'FixReportsSnapshotMigrationTest.candidate.java'):path.join(root,'Backend','src','test','java','vn','syp','tms','testcase','FixReportsSnapshotMigrationTest.java'))");
replaceRunner("if(process.argv.length!==3||process.argv[2]!=='--execute')throw Error('Explicit --execute required after root Maven slot grant');",String.raw`if(process.argv.length===3&&process.argv[2]==='--compile-candidate-only'){compileOnly(true);return;}
 const resume=process.argv.length===4&&process.argv[3]==='--resume-validated-location-failure';
 if(process.argv[2]!=='--execute'||(!resume&&process.argv.length!==3))throw Error('Explicit --execute [--resume-validated-location-failure] required after root Maven slot grant');`);
replaceRunner("if(fs.existsSync(path.join(__dirname,'snapshot-before.json')))throw Error('Immutable before-manifest exists; refuse destructive replay/overwrite');",String.raw`const beforePath=path.join(__dirname,'snapshot-before.json'),proofPath=path.join(__dirname,'snapshot-proof.json'),firstLogPath=path.join(__dirname,'snapshot-migration.log');
 const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 let resumeEnv={};
 if(resume){
  const before=JSON.parse(fs.readFileSync(beforePath,'utf8')),prior=JSON.parse(fs.readFileSync(proofPath,'utf8'));
  if(before.schema!==SCHEMA||before.backupSha256!==BACKUP_SHA||before.preVersion!==30||before.oldTables?.length!==76||prior.schema!==SCHEMA||prior.backupSha256!==BACKUP_SHA||prior.status!=='FAIL'||prior.failure!=='UNEXPECTED_FlywayValidateException'||prior.mainUntouched!==true)throw Error('Only first location-validation failure with immutable V30/76-table before-manifest can resume');
  resumeEnv={TMS_SNAPSHOT_RESUME_VALIDATED_LOCATION_FAILURE:'true',TMS_SNAPSHOT_IMMUTABLE_BEFORE_SHA256:hashFile(beforePath),TMS_SNAPSHOT_FIRST_FAILURE_PROOF_SHA256:hashFile(proofPath),TMS_SNAPSHOT_FIRST_FAILURE_LOG_SHA256:hashFile(firstLogPath)};
 }else if(fs.existsSync(beforePath))throw Error('Immutable before-manifest exists; explicit validated location-failure resume required');`);
replaceRunner("const environment={...process.env,TMS_TEST_FEATURE_MODE:","const environment={...process.env,...resumeEnv,TMS_TEST_FEATURE_MODE:");
replaceRunner("const log=fs.openSync(path.join(__dirname,'snapshot-migration.log'),'wx');let result;",String.raw`if(resume){
  // Archive, never overwrite, the first failure proof and log before a new run.
  fs.copyFileSync(proofPath,path.join(__dirname,'snapshot-first-location-failure-proof.json'),fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(firstLogPath,path.join(__dirname,'snapshot-first-location-failure.log'),fs.constants.COPYFILE_EXCL);
 }
 const log=fs.openSync(path.join(__dirname,resume?'snapshot-migration-resumed.log':'snapshot-migration.log'),'wx');let result;`);
replaceRunner("const proofPath=path.join(__dirname,'snapshot-proof.json');\n if(fs.existsSync(proofPath))","if(fs.existsSync(proofPath))");
replaceRunner('flywayReplayMigrationsExecuted:proof.flywayReplayMigrationsExecuted,mainUntouched:', 'migrationsExecuted:proof.migrationsExecuted,resumedGuardReason:proof.resumedGuardReason,migrationLocations:proof.migrationLocations,flywayReplayMigrationsExecuted:proof.flywayReplayMigrationsExecuted,mainUntouched:');
fs.writeFileSync(path.join(base,'Run-SnapshotMigration.candidate.cjs'),runner,{flag:'wx'});
console.log('Prepared two outside-Backend candidates only; no execution or database access.');
