package vn.syp.tms.filework;

import static vn.syp.tms.workitem.WorkItemStore.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.execution.*;
import vn.syp.tms.reporting.ReportMetrics;
import vn.syp.tms.testcase.*;
import vn.syp.tms.workitem.WorkItemStore;

@Service @Transactional
public class FileWorkExecutionService {
    private final WorkItemStore db;
    private final FileWorkGuard guard;
    private final ExecutionService execution;
    private final FileWorkService groups;
    private final ObjectMapper json;
    public FileWorkExecutionService(WorkItemStore db,FileWorkGuard guard,ExecutionService execution,FileWorkService groups,ObjectMapper json) {
        this.db=db;this.guard=Objects.requireNonNull(guard);this.execution=execution;this.groups=groups;this.json=json;
    }
    public record FileAttempt(@NotNull @Positive Long sessionId,@NotNull @PositiveOrZero Long expectedSessionVersion,
        @NotBlank @Pattern(regexp="OK|NG|P") String resultCode,@NotNull @Positive Long buildId,
        @Size(max=8000) String actualResult,@Size(max=1000) String reason,@Size(max=1000) String evidenceReference,
        @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey,@NotNull @PositiveOrZero Long expectedVersion) {}
    public record Download(String fileName,byte[] content) {}
    private record Snapshot(Map<String,Object> view,byte[] source,String sheetName,List<FileWorkWorkbook.RowCells> allRows,List<Map<String,Object>> metadataRows) {}

    public Map<String,Object> record(long p,String actor,long group,long run,FileAttempt input) {
        FileWorkGuard.positive(group);FileWorkGuard.positive(run);FileWorkGuard.positive(input.sessionId());FileWorkGuard.positive(input.buildId());
        FileWorkGuard.key(input.requestKey());
        if(input.expectedSessionVersion()==null || input.expectedSessionVersion()<0 || input.expectedVersion()==null || input.expectedVersion()<0)fail(422,"INVALID_SCOPE","Phiên bản phải từ 0.");
        if(text(input.actualResult()).length()>8000 || text(input.reason()).length()>1000 || text(input.evidenceReference()).length()>1000)fail(422,"INVALID_SCOPE","Nội dung vượt giới hạn.");
        return execution.record(p,actor,run,new ExecutionDtos.Attempt(input.resultCode(),input.buildId(),input.actualResult(),input.reason(),input.evidenceReference(),input.requestKey(),input.expectedVersion()),group,input.sessionId(),input.expectedSessionVersion());
    }
    public Map<String,Object> view(long p,String actor,long group,Long buildId){return snapshot(p,actor,group,buildId).view();}
    public Download export(long p,String actor,long group,Long buildId) {
        var snapshot=snapshot(p,actor,group,buildId);var view=snapshot.view();
        @SuppressWarnings("unchecked")var summary=(Map<String,Object>)view.get("group");
        var metadata=new LinkedHashMap<String,Object>();metadata.put("sourceMode","EXECUTION");metadata.put("projectId",p);metadata.put("documentId",summary.get("documentId"));metadata.put("groupId",group);
        for(String key:List.of("cycleId","configurationId","environmentId","deviceId"))metadata.put(key,summary.get(key));
        metadata.put("buildId",view.get("buildId"));metadata.put("asOf",view.get("asOf"));
        return new Download("execution-"+group+"-"+summary.get("fileName"),FileWorkWorkbook.export(snapshot.source(),snapshot.sheetName(),headers(view),snapshot.allRows(),metadata,snapshot.metadataRows()));
    }
    @SuppressWarnings("unchecked")private List<String> headers(Map<String,Object> view){return (List<String>)view.get("headers");}
    private Snapshot snapshot(long p,String actor,long id,Long selected) {
        guard.authorize(p,actor,false);var group=guard.group(p,id);guard.runs(p,id);
        if(selected!=null)FileWorkGuard.positive(selected);
        var latest=db.rows("SELECT build_id AS buildId FROM file_work_sessions WHERE project_id=? AND group_id=? ORDER BY id DESC LIMIT 1",p,id);
        long build=selected!=null?selected:latest.isEmpty()?number(group,"defaultBuildId"):number(latest.getFirst(),"buildId");
        // Retained history/export may use an archived same-project build; command guards still require usable resources.
        db.row("SELECT id FROM builds WHERE project_id=? AND id=? FOR SHARE",p,build);
        var document=db.row("SELECT file_name AS fileName,COALESCE(sheet_name,'TestCases') AS sheetName,mapping_version AS mappingVersion FROM import_batches WHERE project_id=? AND id=? AND status='COMMITTED'",p,number(group,"documentId"));
        Object asOf=db.row("SELECT UTC_TIMESTAMP(6) AS asOf").get("asOf");
        // All read authorization precedes the source BLOB, including export.
        byte[] source=(byte[])db.row("SELECT source_workbook AS sourceWorkbook FROM import_batches WHERE project_id=? AND id=? AND status='COMMITTED'",p,number(group,"documentId")).get("sourceWorkbook");
        String sheetName=document.get("sheetName").toString();var layout=FileWorkWorkbook.layout(source,sheetName,document.get("mappingVersion").toString());
        var pinned=db.rows("""
            SELECT i.import_row_id AS importRowId,ir.source_row_number AS rowNumber,i.run_item_id AS runItemId,
            i.test_case_id AS testCaseId,i.revision_id AS revisionId,tc.case_no AS caseNo,ir.source_case_key AS sourceId,
            r.lock_version AS runVersion,r.assignee_membership_id AS assigneeMembershipId,owner.display_name AS assigneeName,
            COALESCE(sd.excluded,FALSE) AS excluded,sd.reason AS scopeReason,rv.revision_no AS revisionNo,
            rv.title_vi AS titleVi,rv.preconditions_vi AS preconditionsVi,rv.steps_vi AS stepsVi,rv.expected_vi AS expectedVi,
            rv.title_jp AS titleJp,rv.preconditions_jp AS preconditionsJp,rv.steps_jp AS stepsJp,rv.expected_jp AS expectedJp,rv.source_reference AS sourceReference,
            COALESCE(a.result_code,'NOT_RUN') AS resultCode,a.id AS latestAttemptId,a.attempt_no AS attemptVersion,
            a.executor_membership_id AS executorMembershipId,executor.display_name AS executorName,a.executed_at AS executedAt,
            a.file_work_session_id AS fileWorkSessionId,a.context_snapshot AS contextSnapshot,
            (NOT COALESCE(sd.excluded,FALSE) AND a.result_code='NG' AND NOT EXISTS(SELECT 1 FROM work_item_execution_links l JOIN work_items w ON w.project_id=l.project_id AND w.id=l.work_item_id AND w.item_type='BUG' WHERE l.project_id=a.project_id AND l.run_item_id=r.id AND l.attempt_id=a.id)) AS pendingBugLink
            FROM file_work_group_items i JOIN import_rows ir ON ir.project_id=i.project_id AND ir.batch_id=i.document_id AND ir.id=i.import_row_id AND ir.target_case_id=i.test_case_id
            JOIN run_items r ON r.project_id=i.project_id AND r.id=i.run_item_id AND r.test_case_id=i.test_case_id AND r.revision_id=i.revision_id AND r.cycle_id=i.cycle_id AND r.configuration_id=i.configuration_id
            JOIN test_cases tc ON tc.project_id=r.project_id AND tc.id=r.test_case_id
            JOIN test_case_revisions rv ON rv.project_id=r.project_id AND rv.id=i.revision_id AND rv.test_case_id=i.test_case_id
            JOIN project_memberships om ON om.project_id=r.project_id AND om.id=r.assignee_membership_id JOIN identity_users owner ON owner.id=om.user_id
            LEFT JOIN run_scope_decisions sd ON sd.project_id=r.project_id AND sd.id=r.scope_decision_id
            LEFT JOIN execution_attempts a ON a.project_id=r.project_id AND a.run_item_id=r.id AND a.build_id=? AND a.attempt_no=(SELECT MAX(x.attempt_no) FROM execution_attempts x WHERE x.project_id=r.project_id AND x.run_item_id=r.id AND x.build_id=?)
            LEFT JOIN project_memberships em ON em.project_id=a.project_id AND em.id=a.executor_membership_id LEFT JOIN identity_users executor ON executor.id=em.user_id
            WHERE i.project_id=? AND i.group_id=? ORDER BY ir.source_row_number,i.run_item_id
            """,build,build,p,id);
        var byRow=new HashMap<Long,Map<String,Object>>();pinned.forEach(r->byRow.put(number(r,"importRowId"),new LinkedHashMap<>(r)));
        var sources=db.rows("SELECT id AS importRowId,source_row_number AS rowNumber,raw_data_json AS rawDataJson FROM import_rows WHERE project_id=? AND batch_id=? AND target_case_id IS NOT NULL ORDER BY source_row_number,id",p,number(group,"documentId"));
        var rows=new ArrayList<Map<String,Object>>();var allRows=new ArrayList<FileWorkWorkbook.RowCells>();var metaRows=new ArrayList<Map<String,Object>>();
        for(var sourceRow:sources){var imported=readRow(sourceRow.get("rawDataJson"));var original=FileWorkWorkbook.sourceCells(imported,layout);
            if(original.size()!=layout.headers().size())throw new IllegalStateException("Stored source width is inconsistent");
            var row=byRow.remove(number(sourceRow,"importRowId"));List<String> cells=original;var metadata=new LinkedHashMap<String,Object>();
            if(row!=null){boolean excluded=ReportMetrics.excluded(row.get("excluded"));row.put("excluded",excluded);row.put("resultCode",excluded?"NA":row.get("resultCode"));row.put("pendingBugLink",!excluded&&ReportMetrics.excluded(row.get("pendingBugLink")));
                var context=parse(row.remove("contextSnapshot"));boolean attempted=row.get("latestAttemptId")!=null;
                row.put("provenance",attempted?row.get("fileWorkSessionId")!=null?"FILE_SESSION":"RETEST_FULL_CASE".equals(context.get("provenance"))?"RETEST_FULL_CASE":"LEGACY":"NONE");
                row.put("physicalAsset","FILE_SESSION".equals(row.get("provenance"))?context.get("physicalAsset"):null);
                if(attempted && context.get("executor") instanceof Map<?,?> executor && executor.get("displayName")!=null)row.put("executorName",executor.get("displayName"));
                var content=new LinkedHashMap<String,String>();for(String field:List.of("titleVi","preconditionsVi","stepsVi","expectedVi","titleJp","preconditionsJp","stepsJp","expectedJp","sourceReference"))content.put(field,Objects.toString(row.get(field),""));
                cells=FileWorkWorkbook.pinnedCells(imported,layout,content,row.get("resultCode").toString(),Objects.toString(row.get("executorName"),""));
                row.put("sourceCells",original);row.put("cells",cells);rows.add(row);metadata.putAll(row);metadata.put("scope","IN_SCOPE");
            }else{metadata.put("rowNumber",sourceRow.get("rowNumber"));metadata.put("scope","OUT_OF_SCOPE");}
            metadata.put("buildId",build);metaRows.add(metadata);allRows.add(new FileWorkWorkbook.RowCells(((Number)sourceRow.get("rowNumber")).intValue(),cells));
        }
        if(!byRow.isEmpty())throw new IllegalStateException("Pinned file rows are missing from source");
        var summary=new LinkedHashMap<>(groups.executionSummary(p,actor,id,build));
        if(!latest.isEmpty() && number(latest.getFirst(),"buildId")!=build && summary.get("capabilities") instanceof Map<?,?> capabilities){var hints=new LinkedHashMap<String,Object>();capabilities.forEach((key,value)->hints.put(key.toString(),value));hints.put("canRecord",false);summary.put("capabilities",hints);}
        var view=new LinkedHashMap<String,Object>();view.put("group",summary);view.put("buildId",build);view.put("asOf",asOf);view.put("headers",layout.headers());view.put("columns",layout.columns());view.put("rows",rows);
        return new Snapshot(view,source,sheetName,allRows,metaRows);
    }
    private TestCaseDtos.ImportRowInput readRow(Object value){try{return json.readValue(value.toString(),TestCaseDtos.ImportRowInput.class);}catch(Exception e){throw new IllegalStateException("Invalid stored source row",e);}}
    @SuppressWarnings("unchecked")private Map<String,Object> parse(Object value){if(value==null)return Map.of();if(value instanceof Map<?,?>)return (Map<String,Object>)value;try{return json.readValue(value.toString(),Map.class);}catch(Exception e){throw new IllegalStateException("Invalid stored attempt context",e);}}
}
