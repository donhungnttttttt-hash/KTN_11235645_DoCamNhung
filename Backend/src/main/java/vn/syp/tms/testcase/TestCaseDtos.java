package vn.syp.tms.testcase;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public interface TestCaseDtos {
    record CasePage(List<CaseSummary> items, long totalItems, int page, int pageSize, int totalPages) {}

    // ===== Suites =====
    record SuiteSummary(
            Long id,
            Long projectId,
            String code,
            String name,
            @Size(max=500) String description,
            Long parentId,
            int sortOrder,
            long caseCount,
            Instant createdAt
    ) {}

    record CreateSuite(
            @NotBlank @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9_-]{0,31}") String code,
            @NotBlank @Size(max=100) String name,
            @Size(max=500) String description,
            Long parentId,
            Integer sortOrder
    ) {}

    record UpdateSuite(
            @Size(min=1, max=100) String name,
            @Size(max=500) String description,
            Long parentId,
            Integer sortOrder
    ) {}

    // ===== Cases & Revisions =====
    record CaseSummary(
            Long id,
            Long projectId,
            String caseNo,
            Long suiteId,
            Long currentRevisionId,
            String titleVi,
            boolean approved,
            Instant approvedAt,
            Instant createdAt
    ) {}

    record RevisionSummary(
            Long id,
            int revisionNo,
            String titleVi,
            boolean approved,
            Instant approvedAt,
            Instant createdAt,
            Long createdBy,
            String createdByUserId
    ) {}

    record RevisionDetail(
            Long id,
            int revisionNo,
            String titleVi,
            String preconditionsVi,
            String stepsVi,
            String expectedVi,
            String titleJp,
            String preconditionsJp,
            String stepsJp,
            String expectedJp,
            String sourceReference,
            boolean approved,
            Instant approvedAt,
            Instant createdAt,
            Long createdBy,
            String createdByUserId
    ) {}

    record CaseDetail(
            Long id,
            Long projectId,
            String caseNo,
            Long suiteId,
            Long currentRevisionId,
            RevisionDetail currentRevision,
            List<RevisionSummary> revisions,
            Instant createdAt
    ) {}

    record CreateCase(
            @NotBlank @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9_-]{0,31}") String caseNo,
            @NotNull Long suiteId,
            @NotBlank String titleVi,
            String preconditionsVi,
            @NotBlank String stepsVi,
            @NotBlank String expectedVi,
            String titleJp,
            String preconditionsJp,
            String stepsJp,
            String expectedJp,
            String sourceReference
    ) {}

    record CreateRevision(
            @NotBlank String titleVi,
            String preconditionsVi,
            @NotBlank String stepsVi,
            @NotBlank String expectedVi,
            String titleJp,
            String preconditionsJp,
            String stepsJp,
            String expectedJp,
            String sourceReference,
            @NotNull Long expectedCurrentRevisionId
    ) {}

    // ===== Import =====
    record ImportRowInput(
            int rowNumber,
            String caseNo,
            String suiteCode,
            String titleVi,
            String preconditionsVi,
            String stepsVi,
            String expectedVi,
            String titleJp,
            String preconditionsJp,
            String stepsJp,
            String expectedJp,
            String sourceReference,
            List<String> sourceCells,
            java.util.Map<String,Integer> sourceColumns
    ) {
        public ImportRowInput(int rowNumber, String caseNo, String suiteCode, String titleVi, String preconditionsVi,
                String stepsVi, String expectedVi, String titleJp, String preconditionsJp, String stepsJp,
                String expectedJp, String sourceReference) {
            this(rowNumber, caseNo, suiteCode, titleVi, preconditionsVi, stepsVi, expectedVi, titleJp,
                    preconditionsJp, stepsJp, expectedJp, sourceReference, null, null);
        }
    }

    record ImportPreviewRequest(
            @NotBlank String fileName,
            List<ImportRowInput> rows
    ) {}

    record ImportBatchSummary(
            Long id,
            Long projectId,
            String fileName,
            String fileChecksum,
            String status,
            int totalRows,
            int validRows,
            int errorRows,
            Instant stagedExpiresAt,
            Instant committedAt,
            Instant createdAt
    ) {}

    record ImportRowDetail(
            Long id,
            int rowNumber,
            String sourceCaseKey,
            String suiteCode,
            String titleVi,
            boolean valid,
            String errorMessage
    ) {}

    record ImportPreviewDetail(
            Long id,
            Long projectId,
            String fileName,
            String status,
            int totalRows,
            int validRows,
            int errorRows,
            List<ImportRowDetail> rows,
            String format,
            String sheetName
    ) {}
}

