package vn.syp.tms.filework;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.KeyHolder;
import java.sql.*;
import java.time.Instant;
import vn.syp.tms.testcase.*;
import vn.syp.tms.execution.*;
import vn.syp.tms.project.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class FileWorkExecutionTest {
    final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    final ProjectService projects=mock(ProjectService.class);
    final ProjectAudit audit=mock(ProjectAudit.class);
    final FileWorkGuard guard=mock(FileWorkGuard.class);
    final ExecutionDtos.Attempt input=new ExecutionDtos.Attempt("OK",50L,"","","","request_123",1L);
    final ExecutionService execution=new ExecutionService(jdbc,projects,audit,json,guard);
    final Map<Integer,Object> inserted=new HashMap<>();
    List<Map<String,Object>> duplicate=List.of();
    long runVersion=1;
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @BeforeEach void canonicalSetup() throws Exception {
        when(guard.fileAttempt(eq(1L),eq("actor"),eq(40L),eq(100L),anyLong(),eq(50L),eq(0L))).thenAnswer(i->new FileWorkGuard.Context(new FileWorkGuard.Actor(7,false,true,false),Map.of("id",40L),List.of(),Map.of("id",i.<Long>getArgument(4)),Map.of("physicalAsset",Map.of("id",80L,"assetCode","IPAD-80"),"allocation",Map.of("id",70L),"build",Map.of("id",50L))));
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("request_key=?"))return duplicate;
            if(sql.startsWith("SELECT c.id,c.code"))return List.of(map("statusCode","ACTIVE"));
            if(sql.contains("FROM run_items r"))return List.of(map("id",100L,"fileWorkGroupId",40L,"assigneeMembershipId",7L,"cycleId",20L,"configurationId",30L,"revisionId",101L,"environmentId",41L,"deviceId",42L,"version",runVersion,"excluded",false));
            if(sql.contains("FROM test_cycles c"))return List.of(map("statusCode","ACTIVE"));
            if(sql.contains("FROM test_case_revisions"))return List.of(map("approved_at","date","test_case_id",102L));
            if(sql.contains("FROM execution_attempts a"))return List.of(map("id",200L,"resultCode",inserted.getOrDefault(4,"OK"),"contextSnapshot",inserted.get(10),"fileWorkSessionId",inserted.get(13)));
            return List.of(map("id",7L,"displayName","Tester","username","actor"));
        });
        when(jdbc.queryForObject(anyString(),eq(Long.class),any(Object[].class))).thenReturn(1L);
        var connection=mock(Connection.class);var statement=mock(PreparedStatement.class);
        when(connection.prepareStatement(anyString(),eq(Statement.RETURN_GENERATED_KEYS))).thenReturn(statement);
        doAnswer(i->{inserted.put(i.getArgument(0),i.getArgument(1));return null;}).when(statement).setObject(anyInt(),any());
        when(jdbc.update(any(PreparedStatementCreator.class),any(KeyHolder.class))).thenAnswer(i->{i.<PreparedStatementCreator>getArgument(0).createPreparedStatement(connection);i.<KeyHolder>getArgument(1).getKeyList().add(Map.of("id",200L));return 1;});
    }
    static Map<String,Object> map(Object...pairs){var m=new LinkedHashMap<String,Object>();for(int i=0;i<pairs.length;i+=2)m.put((String)pairs[i],pairs[i+1]);return m;}

    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void groupedRunCannotReplayThroughPublicLegacyAttemptEndpoint() throws Exception {
        var execution=new ExecutionService(jdbc,projects,audit,json,guard);
        String checksum=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
            .digest(json.writeValueAsBytes(input)));
        when(jdbc.queryForList(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("request_key=?"))return List.of(new HashMap<>(Map.of("id",200L,"run_item_id",100L,"executor_membership_id",7L,"request_checksum",checksum)));
            if(sql.contains("FROM execution_attempts a"))return List.of(new HashMap<>(Map.of("id",200L)));
            if(sql.contains("FROM run_items r"))return List.of(new HashMap<>(Map.of("id",100L,"fileWorkGroupId",40L)));
            if(sql.contains("FROM file_work_group_items"))return List.of(new HashMap<>(Map.of("group_id",40L)));
            return List.of(new HashMap<>(Map.of("id",7L)));
        });
        var error=assertThrows(BusinessException.class,()->execution.record(1,"actor",100,input));
        assertEquals("FILE_SESSION_REQUIRED",error.code());
        verifyNoInteractions(audit);
    }

    @Test void disabledOrStaleIdentityStopsLegacyBeforeProjectRead() {
        doThrow(new BusinessException(401,"UNAUTHENTICATED","Denied")).when(guard).lockIdentity("actor");
        assertEquals(401,assertThrows(BusinessException.class,()->execution.record(1,"actor",100,input)).status());
        verifyNoInteractions(jdbc,projects,audit);
    }
    @Test void pausedOrReturnedSessionCannotReplayAnAttempt() {
        when(guard.fileAttempt(1,"actor",40,100,60,50,0L)).thenThrow(new BusinessException(409,"SESSION_NOT_DOING","Paused"));
        assertEquals("SESSION_NOT_DOING",assertThrows(BusinessException.class,()->execution.record(1,"actor",100,input,40,60,0L)).code());
        verifyNoInteractions(jdbc,projects,audit);
    }
    @Test void fileAttemptPersistsActualMachineSessionAndPinnedCanonicalContext() throws Exception {
        var result=execution.record(1,"actor",100,input,40,60,0L);
        assertEquals(200L,result.get("id"));assertEquals(60L,inserted.get(13));assertEquals(50L,inserted.get(5));assertEquals(7L,inserted.get(6));
        var context=json.readTree(inserted.get(10).toString());
        assertEquals("FILE_SESSION",context.get("provenance").asText());assertEquals(101,context.get("revisionId").asLong());
        assertEquals(30,context.get("configurationId").asLong());assertEquals(60,context.get("fileWorkSessionId").asLong());
        assertEquals("IPAD-80",context.get("physicalAsset").get("assetCode").asText());assertEquals("Tester",context.get("executor").get("displayName").asText());
    }
    @Test void fileReplayRetainsSessionIdentityAndCanBypassOnlyOldRunVersion() {
        execution.record(1,"actor",100,input,40,60,0L);
        duplicate=List.of(map("id",200L,"run_item_id",100L,"executor_membership_id",7L,"request_checksum",inserted.get(12)));
        clearInvocations(audit);runVersion=9;
        assertEquals(200L,execution.record(1,"actor",100,input,40,60,0L).get("id"));verifyNoInteractions(audit);
        assertEquals("IDEMPOTENCY_CONFLICT",assertThrows(BusinessException.class,()->execution.record(1,"actor",100,input,40,61,0L)).code());
    }
    @Test void ngAndPendingKeepCanonicalRequiredFields() {
        for(var result:List.of("NG","P")){var attempt=new ExecutionDtos.Attempt(result,50L,"","","","request_123",1L);
            assertEquals(result.equals("NG")?"ACTUAL_REQUIRED":"REASON_REQUIRED",assertThrows(BusinessException.class,()->execution.record(1,"actor",100,attempt,40,60,0L)).code());}
        assertTrue(inserted.isEmpty());
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void unauthorizedRetestCannotSelectAnInternalOrigin() {
        when(jdbc.queryForList(contains("SELECT q.id FROM retest_requests"),any(Object[].class))).thenReturn(List.of());
        assertEquals("NOT_FOUND",assertThrows(BusinessException.class,()->execution.recordRetest(1,"actor",100,input,60,55)).code());
        assertTrue(inserted.isEmpty());
    }
    @Test void authorizedFullCaseRetestRetainsCanonicalVerdictWithoutMachineClaim() throws Exception {
        execution.recordRetest(1,"actor",100,input,60,55);
        assertNull(inserted.get(13));assertEquals("OK",inserted.get(4));
        var snapshot=json.readTree(inserted.get(10).toString());assertEquals("RETEST_FULL_CASE",snapshot.get("provenance").asText());assertFalse(snapshot.has("physicalAsset"));
    }

    final WorkItemStore store=mock(WorkItemStore.class);
    final FileWorkService groups=mock(FileWorkService.class);
    FileWorkExecutionService files(){return new FileWorkExecutionService(store,guard,execution,groups,json);}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    void projectionSetup() throws Exception {
        var sourceCells=new ArrayList<>(Collections.nCopies(14,""));sourceCells.set(0,"SRC-1");sourceCells.set(3,"Original steps");sourceCells.set(6,"Original expected");sourceCells.set(8,"Fixed");sourceCells.set(12,"Unmapped NG");
        var imported=new TestCaseDtos.ImportRowInput(2,"SRC-1","","Inherited title","","Original steps","Original expected","","","","","",sourceCells,Map.of("sourceId",0,"titleVi",1,"stepsVi",3,"expectedVi",6,"result",8,"tester",11));
        String raw=json.writeValueAsString(imported);
        when(guard.group(1,40)).thenReturn(map("id",40L,"documentId",10L,"defaultBuildId",50L));
        when(store.row(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("source_workbook"))return map("sourceWorkbook",null);
            if(sql.contains("FROM import_batches"))return map("fileName","Nhung.xlsx","sheetName","TestCases","mappingVersion","CUSTOMER_V1");
            if(sql.contains("UTC_TIMESTAMP"))return map("asOf",Instant.parse("2026-10-05T18:20:00Z"));return map("id",50L);
        });
        when(store.rows(anyString(),any(Object[].class))).thenAnswer(i->{String sql=i.getArgument(0);
            if(sql.contains("FROM file_work_sessions"))return List.of(map("buildId",51L));
            if(sql.startsWith("SELECT id AS importRowId"))return List.of(map("importRowId",90L,"rowNumber",2,"rawDataJson",raw),map("importRowId",91L,"rowNumber",3,"rawDataJson",raw));
            if(sql.contains("FROM file_work_group_items i")){long selected=i.getArgument(1);boolean attempt=selected==50;
                return List.of(map("importRowId",90L,"rowNumber",2,"runItemId",100L,"testCaseId",102L,"revisionId",101L,"revisionNo",1L,"titleVi","Inherited title","preconditionsVi","","stepsVi","=Bước pin 日本語","expectedVi","Pinned expected","resultCode",attempt?"NG":"NOT_RUN","latestAttemptId",attempt?200L:null,"attemptVersion",attempt?2L:null,"executorMembershipId",attempt?7L:null,"executorName",attempt?"Nhung":null,"executedAt",attempt?Instant.parse("2026-10-05T18:00:00Z"):null,"excluded",false,"pendingBugLink",attempt,"fileWorkSessionId",attempt?60L:null,"contextSnapshot",attempt?Map.of("physicalAsset",Map.of("id",80L,"assetCode","PIN")):null));
            }return List.of();
        });
        when(groups.executionSummary(eq(1L),eq("actor"),eq(40L),anyLong())).thenAnswer(i->map("id",40L,"documentId",10L,"fileName","Nhung.xlsx","cycleId",20L,"configurationId",30L,"environmentId",41L,"deviceId",42L,"selectedBuildId",i.getArgument(3)));
    }
    @SuppressWarnings("unchecked")Map<String,Object> first(Map<String,Object> view){return ((List<Map<String,Object>>)view.get("rows")).getFirst();}
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void archivedLatestAndDefaultBuildRemainReadableAndExportableWithExactPins() throws Exception {
        projectionSetup();
        when(store.row(contains("FROM builds"),any(Object[].class))).thenAnswer(i->{
            String sql=i.getArgument(0);
            if(sql.contains("archived_at IS NULL"))throw new BusinessException(404,"NOT_FOUND","Archived build");
            assertTrue(sql.contains("project_id=? AND id=?"));assertEquals(1L,(Object)i.getArgument(1));
            return map("id",i.getArgument(2));
        });
        var historical=files().view(1,"actor",40,null);assertEquals(51L,historical.get("buildId"));assertEquals(101L,first(historical).get("revisionId"));
        when(store.rows(contains("FROM file_work_sessions"),any(Object[].class))).thenReturn(List.of());
        var fallback=files().view(1,"actor",40,null);assertEquals(50L,fallback.get("buildId"));assertEquals("NG",first(fallback).get("resultCode"));
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(files().export(1,"actor",40,null).content()))){
            assertEquals("NG",book.getSheetAt(0).getRow(1).getCell(8).getStringCellValue());
            assertEquals("Fixed",book.getSheetAt(0).getRow(2).getCell(8).getStringCellValue());
        }
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void viewUsesPinnedRevisionAndExactSelectedBuildWithoutAnnotation() throws Exception {
        projectionSetup();var view=files().view(1,"actor",40,50L);var row=first(view);
        assertEquals(101L,row.get("revisionId"));assertEquals("NG",row.get("resultCode"));assertEquals("FILE_SESSION",row.get("provenance"));
        @SuppressWarnings("unchecked")var cells=(List<String>)row.get("cells");assertEquals("",cells.get(1));assertEquals("=Bước pin 日本語",cells.get(3));assertEquals("NG",cells.get(8));assertEquals("Nhung",cells.get(11));assertEquals("Unmapped NG",cells.get(12));
        @SuppressWarnings("unchecked")var original=(List<String>)row.get("sourceCells");assertEquals("Fixed",original.get(8));assertEquals("Original steps",original.get(3));
        verify(store).rows(argThat(sql->sql.contains("rv.id=i.revision_id") && sql.contains("a.build_id=?") && !sql.contains("current_revision_id")),eq(50L),eq(50L),eq(1L),eq(40L));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void defaultBuildIsLatestSessionAndMissingSelectedBuildIsNotRun() throws Exception {
        projectionSetup();var view=files().view(1,"actor",40,null);var row=first(view);
        assertEquals(51L,view.get("buildId"));assertEquals("NOT_RUN",row.get("resultCode"));assertEquals("NONE",row.get("provenance"));assertNull(row.get("physicalAsset"));assertNull(row.get("latestAttemptId"));
        when(store.rows(contains("FROM file_work_sessions"),any(Object[].class))).thenReturn(List.of());assertEquals(50L,files().view(1,"actor",40,null).get("buildId"));
    }
    @Test void selectedBuildDifferentFromSessionPinCannotAdvertiseRecording() throws Exception {
        projectionSetup();when(groups.executionSummary(eq(1L),eq("actor"),eq(40L),anyLong())).thenReturn(map("id",40L,"capabilities",Map.of("canRecord",true,"canExport",true)));
        var view=files().view(1,"actor",40,50L);
        var summary=(Map<?,?>)view.get("group");var capabilities=(Map<?,?>)summary.get("capabilities");assertEquals(false,capabilities.get("canRecord"));assertEquals(true,capabilities.get("canExport"));
        var current=files().view(1,"actor",40,51L);assertEquals(true,((Map<?,?>)((Map<?,?>)current.get("group")).get("capabilities")).get("canRecord"));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void invalidOrForeignBuildStopsBeforeSourceBlob() throws Exception {
        projectionSetup();when(store.row(contains("FROM builds"),any(Object[].class))).thenThrow(new BusinessException(404,"NOT_FOUND","Foreign"));
        assertEquals(404,assertThrows(BusinessException.class,()->files().view(1,"actor",40,999L)).status());verify(store,never()).row(contains("source_workbook"),any(Object[].class));
    }
    @Test void revokedReadCannotLoadBlobOrExport() {
        when(guard.authorize(1,"actor",false)).thenThrow(new BusinessException(401,"UNAUTHENTICATED","Denied"));
        assertEquals(401,assertThrows(BusinessException.class,()->files().export(1,"actor",40,50L)).status());verifyNoInteractions(store,groups);
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void currentNaOverridesAttemptAndPendingBugLink() throws Exception {
        projectionSetup();var values=store.rows("SELECT FROM file_work_group_items i",50L,50L,1L,40L);var excluded=new LinkedHashMap<>(values.getFirst());excluded.put("excluded",1);
        when(store.rows(contains("FROM file_work_group_items i"),any(Object[].class))).thenReturn(List.of(excluded));
        var row=first(files().view(1,"actor",40,50L));assertEquals("NA",row.get("resultCode"));assertEquals(false,row.get("pendingBugLink"));
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void historicalExecutorNameComesFromAttemptSnapshotInsteadOfRenamedAccount() throws Exception {
        projectionSetup();var values=store.rows("SELECT FROM file_work_group_items i",50L,50L,1L,40L);var historical=new LinkedHashMap<>(values.getFirst());
        historical.put("executorName","Renamed today");historical.put("contextSnapshot",Map.of("executor",Map.of("membershipId",7L,"displayName","Pinned executor"),"physicalAsset",Map.of("id",80L,"assetCode","PIN")));
        when(store.rows(contains("FROM file_work_group_items i"),any(Object[].class))).thenReturn(List.of(historical));
        var row=first(files().view(1,"actor",40,50L));assertEquals("Pinned executor",row.get("executorName"));
    }
    @Test void exporterUsesExactViewResultAndMarksOtherSourceRowsOutsideScope() throws Exception {
        projectionSetup();var downloaded=files().export(1,"actor",40,50L);
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(downloaded.content()))){var data=book.getSheetAt(0);assertEquals("NG",data.getRow(1).getCell(8).getStringCellValue());assertEquals("Fixed",data.getRow(2).getCell(8).getStringCellValue());assertEquals("Nhung",data.getRow(1).getCell(11).getStringCellValue());
            var metadata=book.getSheet("TMS Execution");assertEquals("EXECUTION",metadata.getRow(0).getCell(1).getStringCellValue());assertEquals("2026-10-05T18:20:00Z",metadata.getRow(9).getCell(1).getStringCellValue());
            String all=new org.apache.poi.ss.usermodel.DataFormatter().formatCellValue(metadata.getRow(13).getCell(1));assertEquals("OUT_OF_SCOPE",all);
        }
    }
    // Mockito matcher tokens are synthetic placeholders for non-null SQL parameters.
    @SuppressWarnings("null")
    @Test void exportRefreshesTheExactUpdatedCanonicalAttemptOnThatBuild() throws Exception {
        projectionSetup();assertEquals("NG",first(files().view(1,"actor",40,50L)).get("resultCode"));
        var values=store.rows("SELECT FROM file_work_group_items i",50L,50L,1L,40L);var updated=new LinkedHashMap<>(values.getFirst());updated.put("resultCode","OK");updated.put("latestAttemptId",201L);updated.put("attemptVersion",3L);updated.put("pendingBugLink",false);
        when(store.rows(contains("FROM file_work_group_items i"),any(Object[].class))).thenReturn(List.of(updated));
        try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(files().export(1,"actor",40,50L).content()))){
            assertEquals("OK",book.getSheetAt(0).getRow(1).getCell(8).getStringCellValue());var metadata=book.getSheet("TMS Execution");
            assertEquals("201",metadata.getRow(12).getCell(5).getStringCellValue());assertEquals("3",metadata.getRow(12).getCell(6).getStringCellValue());assertEquals("50",metadata.getRow(12).getCell(10).getStringCellValue());
        }
    }
    @Test void controllerUsesServerActorCreatedStatusAndPrivateUtf8XlsxHeaders() {
        var service=mock(FileWorkExecutionService.class);var controller=new FileWorkExecutionController(service);var auth=mock(org.springframework.security.core.Authentication.class);
        when(auth.getPrincipal()).thenReturn(new vn.syp.tms.identity.SessionPrincipal("actor",0));
        when(service.export(1,"actor",40,50L)).thenReturn(new FileWorkExecutionService.Download("Đỗ Cẩm Nhung.xlsx",new byte[]{1,2}));
        var response=controller.export(auth,1,40,50L);assertEquals("private, no-store",response.getHeaders().getCacheControl());assertTrue(java.util.Objects.requireNonNull(response.getHeaders().getFirst("Content-Disposition"),"Export must include Content-Disposition").contains("filename*=UTF-8''"));assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",java.util.Objects.requireNonNull(response.getHeaders().getContentType(),"Export must include Content-Type").toString());
        var attempt=new FileWorkExecutionService.FileAttempt(60L,0L,"OK",50L,"","","","request_123",1L);when(service.record(1,"actor",40,100,attempt)).thenReturn(Map.of("id",200L));
        assertEquals(201,controller.record(auth,1,40,100,attempt).getStatusCode().value());verify(service).record(1,"actor",40,100,attempt);
    }
}
