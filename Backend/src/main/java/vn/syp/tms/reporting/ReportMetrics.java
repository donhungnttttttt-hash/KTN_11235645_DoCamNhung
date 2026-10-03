package vn.syp.tms.reporting;

import java.util.*;

/** One definition for every dashboard and workbook, counting run items rather than attempts. */
public final class ReportMetrics {
    private ReportMetrics() {}
    public static boolean excluded(Object value) { return Boolean.TRUE.equals(value) || value instanceof Number n && n.intValue()!=0; }
    public static Map<String,Object> calculate(List<Map<String,Object>> rows) {
        long na=0,ok=0,ng=0,pending=0;
        for(var row:rows) {
            if(excluded(row.get("excluded"))) { na++;continue; }
            switch(String.valueOf(row.get("resultCode"))) { case "OK"->ok++;case "NG"->ng++;case "P"->pending++;default->{} }
        }
        return counts(rows.size(),na,ok,ng,pending);
    }
    public static Map<String,Object> counts(long total,long na,long ok,long ng,long pending) {
        long applicable=total-na;
        var result=new LinkedHashMap<String,Object>();
        result.put("total",total);result.put("na",na);result.put("applicable",applicable);
        result.put("ok",ok);result.put("ng",ng);result.put("pending",pending);result.put("notRun",applicable-ok-ng-pending);
        result.put("executionPercent",percent(ok+ng,applicable));result.put("passPercent",percent(ok,applicable));return result;
    }
    private static Double percent(long value,long denominator) { return denominator==0?null:Math.round(value*10000.0/denominator)/100.0; }
    public static List<Map<String,Object>> group(List<Map<String,Object>> rows,String key,String name) {
        var groups=new LinkedHashMap<Object,List<Map<String,Object>>>();
        rows.forEach(row->groups.computeIfAbsent(row.get(key),ignored->new ArrayList<>()).add(row));
        return groups.entrySet().stream().map(entry->{var metrics=calculate(entry.getValue());metrics.put("id",entry.getKey());metrics.put("name",entry.getValue().getFirst().get(name));return metrics;}).toList();
    }
    public static Map<String,Object> aggregate(List<Map<String,Object>> groups) {
        long total=0,na=0,ok=0,ng=0,pending=0;
        for(var row:groups) {total+=number(row,"total");na+=number(row,"na");ok+=number(row,"ok");ng+=number(row,"ng");pending+=number(row,"pending");}
        return counts(total,na,ok,ng,pending);
    }
    public static List<Map<String,Object>> groupedAggregates(List<Map<String,Object>> rows,String key,String name) {
        var groups=new LinkedHashMap<Object,List<Map<String,Object>>>();
        rows.forEach(row->groups.computeIfAbsent(row.get(key),ignored->new ArrayList<>()).add(row));
        return groups.entrySet().stream().map(entry->{var result=aggregate(entry.getValue());result.put("id",entry.getKey());result.put("name",entry.getValue().getFirst().get(name));return result;}).toList();
    }
    private static long number(Map<String,Object> row,String key) {return ((Number)row.get(key)).longValue();}
}
