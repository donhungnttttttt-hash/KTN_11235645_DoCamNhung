package vn.syp.tms.testcase;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public interface TestDocumentDtos {
    record Summary(Long id, Long projectId, String fileName, String sheetName, String format,
            int totalRows, int caseCount, Instant createdAt, Instant updatedAt, String updatedBy,
            boolean hasSourceFile, Map<String, Long> sourceCounts) {}
    record Page(List<Summary> items, long totalItems, int page, int pageSize, int totalPages) {}
    record Row(int rowNumber, String sourceId, Long caseId, String caseNo, Long revisionId,
            boolean approved, boolean archived, List<String> cells, List<String> sourceCells) {}
    record Detail(Summary document, List<String> headers, List<Row> rows, Map<String,Integer> columns) {}
    record Download(String fileName, byte[] bytes) {}
}
