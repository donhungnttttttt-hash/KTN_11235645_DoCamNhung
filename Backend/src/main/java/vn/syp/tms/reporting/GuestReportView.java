package vn.syp.tms.reporting;

import java.util.*;
import vn.syp.tms.ai.FeatureFacts;
import vn.syp.tms.workitem.WorkItemStore;

/** Explicit projection, never a workspace DTO with fields hidden only in the browser. */
public final class GuestReportView {
    private GuestReportView(){}
    public static Map<String,Object> summary(WorkItemStore db,long project){
        return Map.of("project",db.row("SELECT id,code,name FROM projects WHERE id=?",project),
            "metrics",new FeatureFacts(db).metrics(project,null),"asOf",java.time.Instant.now(),"timeZone","Asia/Ho_Chi_Minh");
    }
    public static Map<String,Object> report(Map<String,Object> source){
        var result=new LinkedHashMap<String,Object>();
        for(String key:List.of("id","title","markdown","createdAt","updatedAt"))if(source.containsKey(key))result.put(key,source.get(key));
        return result;
    }
}
