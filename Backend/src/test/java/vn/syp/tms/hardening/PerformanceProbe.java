package vn.syp.tms.hardening;

import static org.assertj.core.api.Assertions.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.IdentityUser;

/** Opt-in only: -Dtest=PerformanceProbe#measureLoad. Own Testcontainers DB, no live data. */
class PerformanceProbe extends SystemJourneyTest {
    @Test void measureLoad() throws Exception {
        long seeded=System.nanoTime();seed();
        long seedMs=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-seeded);
        var clients=new ArrayList<Client>();String password=UUID.randomUUID()+"-Load!",hash=passwords.encode(password);
        for(int i=0;i<20;i++) {
            var user=users.saveAndFlush(new IdentityUser("load."+tag+"."+i,"Load "+i,hash,"TESTER"));
            pm.write("PUT",base+"/members/"+user.getId(),Map.of("projectRole","TESTER"),200);
            var client=new Client();client.login(user.getUsername(),password);clients.add(client);
        }
        for(int i=0;i<3;i++)tester.get(base+"/reports/summary",200);
        var results=new LinkedHashMap<String,Object>();results.put("dataset",Map.of("runItems",10000,"bugs",1000,"cases",1000,"cycles",20,"concurrentSessions",20));
        results.put("seedMs",seedMs);results.put("java",System.getProperty("java.version"));results.put("os",System.getProperty("os.name"));
        results.put("availableProcessors",Runtime.getRuntime().availableProcessors());results.put("maxJvmHeapBytes",Runtime.getRuntime().maxMemory());
        results.put("mysql","8.4.8 Docker Desktop");results.put("hikariPool",5);results.put("jacocoEnabled",true);
        int failures=0;Files.createDirectories(Path.of("target/performance"));
        try(var pool=Executors.newFixedThreadPool(20)) {
            for(String endpoint:List.of("/work-items?page=0&size=50","/test-cycles?page=0&size=20","/reports/summary")) {
                var start=new CountDownLatch(1);var futures=new ArrayList<Future<List<Sample>>>();long began=System.nanoTime();
                for(var client:clients)futures.add(pool.submit(()->{
                    start.await();var latencies=new ArrayList<Sample>();
                    for(int n=0;n<5;n++) {
                        long before=System.nanoTime();int status;
                        try {
                            var response=client.raw("GET",base+endpoint,null,null,Map.of());status=response.statusCode();
                            if(status==200) {
                                var data=json.readTree(response.body());
                                if(endpoint.equals("/reports/summary")) {
                                    assertThat(data.path("metrics").path("total").asInt()).isEqualTo(10000);
                                    assertThat(data.path("metrics").path("bugs").asInt()).isEqualTo(1000);
                                    assertThat(data.path("source").path("items").size()).isEqualTo(50);
                                } else assertThat(data.path("items").size()).isLessThanOrEqualTo(50);
                            }
                        } catch(java.io.IOException e) {status=0;}
                        latencies.add(new Sample(TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-before),status));
                    }return latencies;
                }));
                start.countDown();var samples=new ArrayList<Sample>();for(var future:futures)samples.addAll(future.get(3,TimeUnit.MINUTES));
                samples.sort(Comparator.comparingLong(sample -> sample.ms()));double elapsed=(System.nanoTime()-began)/1_000_000_000.0;
                var statuses=new TreeMap<Integer,Long>();samples.forEach(sample->statuses.merge(sample.status(),1L,(left, right) -> left + right));
                int errors=(int)samples.stream().filter(sample->sample.status()!=200).count();failures+=errors;
                results.put(endpoint,Map.of("requests",samples.size(),"failures",errors,"statuses",statuses,"p50Ms",samples.get(49).ms(),"p95Ms",samples.get(94).ms(),"maxMs",samples.get(99).ms(),"requestsPerSecond",Math.round(10000.0/elapsed)/100.0));
                json.writerWithDefaultPrettyPrinter().writeValue(Path.of("target/performance/sprint-10.json").toFile(),results);
            }
        }
        results.put("explainWorkItems",db.queryForList("EXPLAIN SELECT id,title FROM work_items WHERE project_id=? AND item_type='BUG' ORDER BY updated_at DESC,id DESC LIMIT 50",p));
        results.put("explainRunScope",db.queryForList("EXPLAIN SELECT id,latest_attempt_id FROM run_items WHERE project_id=? ORDER BY id LIMIT 10001",p));
        results.put("limits","Local synthetic closed-loop sample, 100 requests per endpoint after 3 report warmups. Not a production SLA or sustained soak; includes real HTTP sessions and JSON serialization, excludes browser rendering.");
        json.writerWithDefaultPrettyPrinter().writeValue(Path.of("target/performance/sprint-10.json").toFile(),results);
        System.out.println("S10 performance evidence: target/performance/sprint-10.json (300 requests, 20 users, 10000 runs/1000 bugs)");
        assertThat(failures).as("non-200 responses; evidence saved even on failure").isZero();
    }
    private record Sample(long ms,int status) {}
    protected void seed() throws Exception {
        long suite=pm.write("POST",base+"/test-suites",Map.of("code","LOAD","name","Synthetic","sortOrder",0),200).path("id").asLong();
        long env=pm.write("POST",base+"/catalogs/environments",Map.of("code","QA","name","Synthetic"),200).path("id").asLong();
        long device=pm.write("POST",base+"/catalogs/devices",Map.of("code","WEB","name","Synthetic"),200).path("id").asLong();
        long build=pm.write("POST",base+"/catalogs/builds",Map.of("versionLabel","LOAD","platform","WEB"),200).path("id").asLong();
        long owner=java.util.Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND project_role='PM'",Long.class,p));
        // Bulk fixture is test-only; all real FK/check constraints stay enabled.
        var cases=new ArrayList<Object[]>();for(int i=1;i<=1000;i++)cases.add(new Object[]{p,"LOAD-"+i,suite});
        db.batchUpdate("INSERT INTO test_cases(project_id,case_no,suite_id,created_at,updated_at) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",cases);
        db.update("INSERT INTO test_case_revisions(project_id,test_case_id,revision_no,title_vi,steps_vi,expected_vi,approved_at,approved_by,created_at,created_by) SELECT project_id,id,1,'Synthetic case','Synthetic steps','Synthetic expected',UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),? FROM test_cases WHERE project_id=?",owner,owner,p);
        db.update("UPDATE test_cases c JOIN test_case_revisions r ON r.project_id=c.project_id AND r.test_case_id=c.id SET c.current_revision_id=r.id WHERE c.project_id=?",p);
        for(int i=1;i<=20;i++) {
            long cycle=pm.write("POST",base+"/test-cycles",Map.of("code","LOAD-"+i,"name","Synthetic "+i),200).path("id").asLong();
            pm.write("POST",base+"/test-cycles/"+cycle+"/configurations",Map.of("environmentId",env,"deviceId",device,"buildId",build,"expectedVersion",0),200);
            long config=pm.get(base+"/test-cycles/"+cycle+"/configurations",200).get(0).path("id").asLong();
            db.update("INSERT INTO run_items(project_id,cycle_id,configuration_id,test_case_id,revision_id,assignee_membership_id,created_at) SELECT project_id,?,?,id,current_revision_id,?,UTC_TIMESTAMP(6) FROM test_cases WHERE project_id=? AND MOD(id,2)=?",cycle,config,member,p,i%2);
            db.update("UPDATE test_cycles SET status_code='ACTIVE',activated_at=UTC_TIMESTAMP(6),activated_by=?,lock_version=2 WHERE id=?",owner,cycle);
        }
        db.update("INSERT INTO execution_attempts(project_id,run_item_id,attempt_no,result_code,build_id,executor_membership_id,executed_at,actual_result,reason,evidence_reference,context_snapshot,request_key,request_checksum) SELECT project_id,id,1,IF(MOD(id,10)=0,'NG','OK'),?,?,UTC_TIMESTAMP(6),'Synthetic result','','',JSON_OBJECT('fixture','S10'),CONCAT('load-',id),REPEAT('a',64) FROM run_items WHERE project_id=?",build,member,p);
        db.update("UPDATE run_items r JOIN execution_attempts a ON a.project_id=r.project_id AND a.run_item_id=r.id SET r.latest_attempt_id=a.id,r.lock_version=1 WHERE r.project_id=?",p);
        db.update("INSERT INTO work_items(project_id,item_no,item_key,item_type,title,description,created_by,updated_by,created_at,updated_at,request_key,request_checksum) SELECT project_id,id,CONCAT('LOAD-',?,'-',id),'BUG','Synthetic bug','Anonymous load fixture',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),CONCAT('bug-',id),REPEAT('b',64) FROM execution_attempts WHERE project_id=? AND result_code='NG'",tag,member,member,p);
        db.update("INSERT INTO bug_details(project_id,work_item_id,policy_version,steps,expected_result,actual_result,build_id,environment_id,device_id,test_case_id,revision_id,standalone_reason,context_snapshot) SELECT w.project_id,w.id,'INTERNAL_V1','Synthetic steps','Expected','Actual',?,?,?,r.test_case_id,r.revision_id,'',JSON_OBJECT('fixture','S10') FROM work_items w JOIN execution_attempts a ON a.project_id=w.project_id AND a.id=w.item_no JOIN run_items r ON r.project_id=a.project_id AND r.id=a.run_item_id WHERE w.project_id=?",build,env,device,p);
        db.update("INSERT INTO work_item_execution_links(project_id,work_item_id,run_item_id,attempt_id,linked_by,linked_at) SELECT w.project_id,w.id,a.run_item_id,a.id,?,UTC_TIMESTAMP(6) FROM work_items w JOIN execution_attempts a ON a.project_id=w.project_id AND a.id=w.item_no WHERE w.project_id=?",member,p);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM run_items WHERE project_id=?",Integer.class,p)).isEqualTo(10000);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM bug_details WHERE project_id=?",Integer.class,p)).isEqualTo(1000);
    }
}
