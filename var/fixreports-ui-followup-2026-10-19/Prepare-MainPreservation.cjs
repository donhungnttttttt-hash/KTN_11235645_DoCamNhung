// Creates/compiles SELECT-only verification tooling; never starts Spring or migrates.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'var/fixreports-main-cutover-2026-10-19');
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'Backend/src/test/java/vn/syp/tms/testcase/FixReportsSnapshotMigrationTest.java'),'utf8');
const start=source.indexOf('                var clonedCases=new HashSet<Long>()'),end=source.indexOf('                require(flyway.migrate().migrationsExecuted==0,');
if(start<0||end<start)throw Error('Reviewed SELECT-only clone verification block not found');
const block=source.slice(start,end);
if(/\.migrate\(|\.clean\(|\.repair\(|executeUpdate\(/.test(block))throw Error('Mutation forbidden in main preservation verifier');
const java=`package vn.syp.tms.testcase;
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
${block}
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
`;
fs.writeFileSync(path.join(out,'MainPreservation.java'),java);
const xml=fs.readFileSync(path.join(root,'Backend/target/surefire-reports/TEST-vn.syp.tms.ai.ChatGptOAuthClientTest.xml'),'utf8');
const raw=/<property name="java.class.path" value="([^"]+)"/.exec(xml)?.[1];if(!raw)throw Error('Resolved classpath required');
const cp=raw.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const quote=v=>'"'+v.replaceAll('\\','/')+'"';
const classes=path.join(out,'classes');fs.mkdirSync(classes,{recursive:true});
fs.writeFileSync(path.join(out,'javac.args'),['-encoding','UTF-8','-proc:none','-d',quote(classes),'-classpath',quote(cp),quote(path.join(root,'Backend/src/test/java/vn/syp/tms/testcase/FixReportsSnapshotMigrationTest.java')),quote(path.join(out,'MainPreservation.java'))].join('\n'));
const c=spawnSync('rtk',['proxy','C:/Program Files/Java/jdk-21/bin/javac.exe','@'+path.join(out,'javac.args')],{cwd:root,stdio:'inherit',shell:false});if(c.status!==0)process.exit(c.status??1);
fs.writeFileSync(path.join(out,'java.args'),['-cp',quote([classes,cp].join(path.delimiter)),'vn.syp.tms.testcase.MainPreservation'].join('\n'));
console.log('SELECT-only main preservation verifier compiled. No DB or runtime changed.');
