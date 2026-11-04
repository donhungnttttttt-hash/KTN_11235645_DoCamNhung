package vn.syp.tms.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static vn.syp.tms.workitem.WorkItemStore.number;

/** Policy 1 canonical JSON: fixed field order, numeric IDs ascending, distinct sorted run IDs. */
public final class LegacyArchiveSnapshot {
    private static final ObjectMapper JSON=new ObjectMapper();
    private final Map<String,Object> snapshot;
    private final long cycleCount,retestCount;
    public LegacyArchiveSnapshot(long projectId,long projectVersion,List<Map<String,Object>> cycles,List<Map<String,Object>> retests) {
        var grouped=new TreeMap<Long,Map<String,Object>>();var runs=new TreeMap<Long,SortedSet<Long>>();
        for(var row:cycles) {
            long id=number(row,"id");
            grouped.computeIfAbsent(id,k->ordered("id",id,"status",row.get("status"),"version",number(row,"version")));
            runs.computeIfAbsent(id,k->new TreeSet<>());
            if(row.get("runId") instanceof Number run)runs.get(id).add(run.longValue());
        }
        grouped.forEach((id,row)->row.put("runIds",List.copyOf(runs.get(id))));
        var sortedRetests=new TreeMap<Long,Map<String,Object>>();
        for(var row:retests)sortedRetests.put(number(row,"id"),ordered("id",number(row,"id"),"status",row.get("status"),"version",number(row,"version")));
        cycleCount=grouped.size();retestCount=sortedRetests.size();
        snapshot=ordered("policyVersion",1,"projectId",projectId,"projectVersion",projectVersion,"cycles",List.copyOf(grouped.values()),"retests",List.copyOf(sortedRetests.values()));
    }
    private static Map<String,Object> ordered(Object... values) {var map=new LinkedHashMap<String,Object>();for(int i=0;i<values.length;i+=2)map.put((String)values[i],values[i+1]);return map;}
    private static String encode(Object value) {try{return JSON.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Cannot encode legacy archive snapshot",e);}}
    public String canonicalJson(){return encode(snapshot);}
    public String fingerprint(){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonicalJson().getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    public long cycleCount(){return cycleCount;}
    public long retestCount(){return retestCount;}
    public boolean hasBlockers(){return cycleCount+retestCount>0;}
    public List<Map<String,Object>> blockers(){var result=new ArrayList<Map<String,Object>>();if(cycleCount>0)result.add(ordered("code","UNFINISHED_CYCLES","count",cycleCount));if(retestCount>0)result.add(ordered("code","OPEN_RETESTS","count",retestCount));return List.copyOf(result);}
    public String persistedJson(){var result=new LinkedHashMap<>(snapshot);result.put("fingerprint",fingerprint());result.put("blockers",blockers());return encode(result);}
    public static Map<String,Object> summary(Object persisted) {
        if(persisted==null)return null;
        try {var node=JSON.readTree(persisted.toString());return ordered("policyVersion",node.path("policyVersion").asInt(),"fingerprint",node.path("fingerprint").asText(),"blockers",JSON.convertValue(node.path("blockers"),List.class));}
        catch(Exception e){throw new IllegalStateException("Invalid stored legacy archive snapshot",e);}
    }
}
