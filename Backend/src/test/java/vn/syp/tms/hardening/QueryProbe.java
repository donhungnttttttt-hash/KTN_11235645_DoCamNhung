package vn.syp.tms.hardening;

import static org.mockito.Mockito.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import vn.syp.tms.workitem.WorkItemStore;

/** Opt-in diagnosis: captures timings of real queries, then EXPLAIN ANALYZE with the same bind values. */
class QueryProbe extends PerformanceProbe {
    @MockitoSpyBean WorkItemStore store;
    @Test void diagnose() throws Exception {
        seed();var queries=Collections.synchronizedList(new ArrayList<Map<String,Object>>());
        doAnswer(call->{
            long start=System.nanoTime();Object result=call.callRealMethod();
            var row=new LinkedHashMap<String,Object>();row.put("sql",call.getArgument(0));
            row.put("args",call.getRawArguments()[1]);row.put("ms",TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start));
            row.put("returnedRows",((List<?>)result).size());queries.add(row);return result;
        }).when(store).rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
        tester.get(base+"/reports/summary",200);reset(store);
        for(var query:queries)query.put("plan",db.queryForList("EXPLAIN ANALYZE "+query.get("sql"),(Object[])query.remove("args")));
        Files.createDirectories(Path.of("target/performance"));json.writerWithDefaultPrettyPrinter().writeValue(Path.of("target/performance/sprint-10-query-plans.json").toFile(),queries);
        System.out.println("S10 exact report queries and plans saved: "+queries.size());
    }
}
