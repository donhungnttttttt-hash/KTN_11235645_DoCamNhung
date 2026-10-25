package vn.syp.tms.testcase;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import jakarta.validation.constraints.*;

public interface TestDocumentDtos {
    record Summary(Long id, Long projectId, String fileName, String sheetName, String format,
            int totalRows, int caseCount, Instant createdAt, Instant updatedAt, String updatedBy,
            boolean hasSourceFile, Map<String, Long> sourceCounts, Map<String,Long> resultCounts) {}
    record Page(List<Summary> items, long totalItems, int page, int pageSize, int totalPages) {}
    record Row(int rowNumber, String sourceId, Long caseId, String caseNo, Long revisionId,
            boolean approved, boolean archived, List<String> cells, List<String> sourceCells,
            Long rowId, String resultStatus, long resultVersion, Instant resultUpdatedAt, String resultUpdatedBy) {}
    record UpdateResult(@NotNull @Pattern(regexp="UNEXECUTED|OK|P|NG|NA") String status,
            @NotNull @PositiveOrZero Long expectedVersion,
            @NotNull @Pattern(regexp="[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}") String requestKey,
            @Positive Long testVersionId,java.time.LocalDate executedOn) {
        public UpdateResult(String status,Long expectedVersion,String requestKey){this(status,expectedVersion,requestKey,null,null);}
    }
    record Result(Long rowId,String status,long version,Instant updatedAt,String updatedBy,Long testVersionId,String testVersionName,java.time.LocalDate executedOn) {
        public Result(Long rowId,String status,long version,Instant updatedAt,String updatedBy){this(rowId,status,version,updatedAt,updatedBy,null,null,null);}
    }
    record Change(long id,String before,String after,Instant occurredAt,String actor,String testVersionName,java.time.LocalDate executedOn) {
        public Change(long id,String before,String after,Instant occurredAt,String actor){this(id,before,after,occurredAt,actor,null,null);}
    }
    record Detail(Summary document, List<String> headers, List<Row> rows, Map<String,Integer> columns,
            Map<Long,Map<Integer,Long>> cellVersions, List<Map<String,Object>> secondTests) {}
    record EditCell(@NotNull @Size(max=8000) String value, @NotNull @PositiveOrZero Long expectedVersion,
            @NotNull @Positive Long expectedRevisionId) {}
    record RowRevision(@NotNull @Positive Long rowId,@NotNull @Positive Long expectedRevisionId) {}
    record ApproveRows(@NotEmpty @Size(max=500) List<@NotNull @jakarta.validation.Valid RowRevision> rows) {}
    record AssignSecondTest(@NotNull @Positive Long cycleId, @NotNull @Positive Long configurationId,
            @NotNull @Positive Long assigneeMembershipId, @NotNull @Size(max=2000) String note,
            @NotNull @PositiveOrZero Long expectedVersion, @NotNull @PositiveOrZero Long expectedCycleVersion,
            @PositiveOrZero Long expectedRunVersion, @NotNull @Positive Long expectedRevisionId) {}
    record Download(String fileName, byte[] bytes) {}
}
