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
    record UpdateResult(@NotNull @Pattern(regexp="UNEXECUTED|OK|P|NG|FIXED|NA") String status,
            @NotNull @PositiveOrZero Long expectedVersion,
            @NotNull @Pattern(regexp="[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}") String requestKey) {}
    record Result(Long rowId,String status,long version,Instant updatedAt,String updatedBy) {}
    record Change(long id,String before,String after,Instant occurredAt,String actor) {}
    record Detail(Summary document, List<String> headers, List<Row> rows, Map<String,Integer> columns) {}
    record Download(String fileName, byte[] bytes) {}
}
