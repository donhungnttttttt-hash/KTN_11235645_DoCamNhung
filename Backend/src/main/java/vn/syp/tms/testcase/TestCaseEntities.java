package vn.syp.tms.testcase;

import jakarta.persistence.*;
import java.time.Instant;

public class TestCaseEntities {

    @Entity
    @Table(name = "test_suites")
    public static class TestSuite {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "project_id", nullable = false)
        private Long projectId;

        @Column(nullable = false, length = 32)
        private String code;

        @Column(nullable = false, length = 100)
        private String name;

        @Column(length = 500)
        private String description;

        @Column(name = "parent_id")
        private Long parentId;

        @Column(name = "sort_order", nullable = false)
        private int sortOrder = 0;

        @Column(name = "archived_at")
        private Instant archivedAt;

        @Column(name = "created_at", nullable = false)
        private Instant createdAt;

        @Column(name = "updated_at", nullable = false)
        private Instant updatedAt;

        @PrePersist
        protected void onCreate() {
            createdAt = Instant.now();
            updatedAt = createdAt;
        }

        @PreUpdate
        protected void onUpdate() {
            updatedAt = Instant.now();
        }

        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Long getParentId() { return parentId; }
        public void setParentId(Long parentId) { this.parentId = parentId; }
        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
        public Instant getArchivedAt() { return archivedAt; }
        public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
        public Instant getCreatedAt() { return createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
    }

    @Entity(name = "LibraryTestCase")
    @Table(name = "test_cases")
    public static class TestCase {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "project_id", nullable = false)
        private Long projectId;

        @Column(name = "case_no", nullable = false, length = 32)
        private String caseNo;

        @Column(name = "suite_id", nullable = false)
        private Long suiteId;

        @Column(name = "current_revision_id")
        private Long currentRevisionId;

        @Column(name = "archived_at")
        private Instant archivedAt;

        @Column(name = "created_at", nullable = false)
        private Instant createdAt;

        @Column(name = "updated_at", nullable = false)
        private Instant updatedAt;

        @PrePersist
        protected void onCreate() {
            createdAt = Instant.now();
            updatedAt = createdAt;
        }

        @PreUpdate
        protected void onUpdate() {
            updatedAt = Instant.now();
        }

        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getCaseNo() { return caseNo; }
        public void setCaseNo(String caseNo) { this.caseNo = caseNo; }
        public Long getSuiteId() { return suiteId; }
        public void setSuiteId(Long suiteId) { this.suiteId = suiteId; }
        public Long getCurrentRevisionId() { return currentRevisionId; }
        public void setCurrentRevisionId(Long currentRevisionId) { this.currentRevisionId = currentRevisionId; }
        public Instant getArchivedAt() { return archivedAt; }
        public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
        public Instant getCreatedAt() { return createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
    }

    @Entity(name = "LibraryCaseRevision")
    @Table(name = "test_case_revisions")
    public static class TestCaseRevision {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "project_id", nullable = false)
        private Long projectId;

        @Column(name = "test_case_id", nullable = false)
        private Long testCaseId;

        @Column(name = "revision_no", nullable = false)
        private int revisionNo;

        @Column(name = "title_vi", nullable = false)
        private String titleVi;

        @Column(name = "preconditions_vi", columnDefinition = "TEXT")
        private String preconditionsVi;

        @Column(name = "steps_vi", nullable = false, columnDefinition = "TEXT")
        private String stepsVi;

        @Column(name = "expected_vi", nullable = false, columnDefinition = "TEXT")
        private String expectedVi;

        @Column(name = "title_jp")
        private String titleJp;

        @Column(name = "preconditions_jp", columnDefinition = "TEXT")
        private String preconditionsJp;

        @Column(name = "steps_jp", columnDefinition = "TEXT")
        private String stepsJp;

        @Column(name = "expected_jp", columnDefinition = "TEXT")
        private String expectedJp;

        @Column(name = "source_reference")
        private String sourceReference;

        @Column(name = "translator_membership_id")
        private Long translatorMembershipId;

        @Column(name = "reviewer_membership_id")
        private Long reviewerMembershipId;

        @Column(name = "approved_at")
        private Instant approvedAt;

        @Column(name = "approved_by")
        private Long approvedBy;

        @Column(length = 64)
        private String checksum;

        @Column(name = "created_at", nullable = false)
        private Instant createdAt;

        @Column(name = "created_by", nullable = false)
        private Long createdBy;

        @PrePersist
        protected void onCreate() {
            createdAt = Instant.now();
        }

        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public Long getTestCaseId() { return testCaseId; }
        public void setTestCaseId(Long testCaseId) { this.testCaseId = testCaseId; }
        public int getRevisionNo() { return revisionNo; }
        public void setRevisionNo(int revisionNo) { this.revisionNo = revisionNo; }
        public String getTitleVi() { return titleVi; }
        public void setTitleVi(String titleVi) { this.titleVi = titleVi; }
        public String getPreconditionsVi() { return preconditionsVi; }
        public void setPreconditionsVi(String preconditionsVi) { this.preconditionsVi = preconditionsVi; }
        public String getStepsVi() { return stepsVi; }
        public void setStepsVi(String stepsVi) { this.stepsVi = stepsVi; }
        public String getExpectedVi() { return expectedVi; }
        public void setExpectedVi(String expectedVi) { this.expectedVi = expectedVi; }
        public String getTitleJp() { return titleJp; }
        public void setTitleJp(String titleJp) { this.titleJp = titleJp; }
        public String getPreconditionsJp() { return preconditionsJp; }
        public void setPreconditionsJp(String preconditionsJp) { this.preconditionsJp = preconditionsJp; }
        public String getStepsJp() { return stepsJp; }
        public void setStepsJp(String stepsJp) { this.stepsJp = stepsJp; }
        public String getExpectedJp() { return expectedJp; }
        public void setExpectedJp(String expectedJp) { this.expectedJp = expectedJp; }
        public String getSourceReference() { return sourceReference; }
        public void setSourceReference(String sourceReference) { this.sourceReference = sourceReference; }
        public Long getTranslatorMembershipId() { return translatorMembershipId; }
        public void setTranslatorMembershipId(Long translatorMembershipId) { this.translatorMembershipId = translatorMembershipId; }
        public Long getReviewerMembershipId() { return reviewerMembershipId; }
        public void setReviewerMembershipId(Long reviewerMembershipId) { this.reviewerMembershipId = reviewerMembershipId; }
        public Instant getApprovedAt() { return approvedAt; }
        public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
        public Long getApprovedBy() { return approvedBy; }
        public void setApprovedBy(Long approvedBy) { this.approvedBy = approvedBy; }
        public String getChecksum() { return checksum; }
        public void setChecksum(String checksum) { this.checksum = checksum; }
        public Instant getCreatedAt() { return createdAt; }
        public Long getCreatedBy() { return createdBy; }
        public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    }

    @Entity
    @Table(name = "import_batches")
    public static class ImportBatch {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "project_id", nullable = false)
        private Long projectId;

        @Column(name = "file_name", nullable = false)
        private String fileName;

        @Column(name = "file_checksum", nullable = false, length = 64)
        private String fileChecksum;

        @Column(nullable = false, length = 32)
        private String status = "PREVIEW";

        @Column(name = "mapping_version", nullable = false, length = 32)
        private String mappingVersion = "1.0";

        @Column(name = "sheet_name", length = 255)
        private String sheetName;

        @Lob
        @Column(name = "source_workbook", columnDefinition = "MEDIUMBLOB")
        private byte[] sourceWorkbook;

        @Column(name = "total_rows", nullable = false)
        private int totalRows = 0;

        @Column(name = "valid_rows", nullable = false)
        private int validRows = 0;

        @Column(name = "error_rows", nullable = false)
        private int errorRows = 0;

        @Column(name = "staged_expires_at", nullable = false)
        private Instant stagedExpiresAt;

        @Column(name = "committed_at")
        private Instant committedAt;

        @Column(name = "imported_by", nullable = false, length = 36)
        private String importedBy;

        @Column(name = "created_at", nullable = false)
        private Instant createdAt;

        @PrePersist
        protected void onCreate() {
            createdAt = Instant.now();
        }

        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getFileChecksum() { return fileChecksum; }
        public void setFileChecksum(String fileChecksum) { this.fileChecksum = fileChecksum; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getMappingVersion() { return mappingVersion; }
        public void setMappingVersion(String mappingVersion) { this.mappingVersion = mappingVersion; }
        public String getSheetName() { return sheetName; }
        public void setSheetName(String sheetName) { this.sheetName = sheetName; }
        public byte[] getSourceWorkbook() { return sourceWorkbook; }
        public void setSourceWorkbook(byte[] sourceWorkbook) { this.sourceWorkbook = sourceWorkbook; }
        public int getTotalRows() { return totalRows; }
        public void setTotalRows(int totalRows) { this.totalRows = totalRows; }
        public int getValidRows() { return validRows; }
        public void setValidRows(int validRows) { this.validRows = validRows; }
        public int getErrorRows() { return errorRows; }
        public void setErrorRows(int errorRows) { this.errorRows = errorRows; }
        public Instant getStagedExpiresAt() { return stagedExpiresAt; }
        public void setStagedExpiresAt(Instant stagedExpiresAt) { this.stagedExpiresAt = stagedExpiresAt; }
        public Instant getCommittedAt() { return committedAt; }
        public void setCommittedAt(Instant committedAt) { this.committedAt = committedAt; }
        public String getImportedBy() { return importedBy; }
        public void setImportedBy(String importedBy) { this.importedBy = importedBy; }
        public Instant getCreatedAt() { return createdAt; }
    }

    @Entity
    @Table(name = "import_rows")
    public static class ImportRow {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "project_id", nullable = false)
        private Long projectId;

        @Column(name = "batch_id", nullable = false)
        private Long batchId;

        @Column(name = "source_row_number", nullable = false)
        private int rowNumber;

        @Column(name = "source_case_key", length = 64)
        private String sourceCaseKey;

        @Column(name = "suite_code", length = 32)
        private String suiteCode;

        @Column(name = "raw_data_json", nullable = false, columnDefinition = "JSON")
        private String rawDataJson;

        @Column(name = "error_message", length = 500)
        private String errorMessage;

        @Column(name = "is_valid", nullable = false)
        private boolean valid = true;

        @Column(name = "target_case_id")
        private Long targetCaseId;

        @Column(name = "created_at", nullable = false)
        private Instant createdAt;

        @PrePersist
        protected void onCreate() {
            createdAt = Instant.now();
        }

        public Long getId() { return id; }
        public Long getProjectId() { return projectId; }
        public void setProjectId(Long projectId) { this.projectId = projectId; }
        public Long getBatchId() { return batchId; }
        public void setBatchId(Long batchId) { this.batchId = batchId; }
        public int getRowNumber() { return rowNumber; }
        public void setRowNumber(int rowNumber) { this.rowNumber = rowNumber; }
        public String getSourceCaseKey() { return sourceCaseKey; }
        public void setSourceCaseKey(String sourceCaseKey) { this.sourceCaseKey = sourceCaseKey; }
        public String getSuiteCode() { return suiteCode; }
        public void setSuiteCode(String suiteCode) { this.suiteCode = suiteCode; }
        public String getRawDataJson() { return rawDataJson; }
        public void setRawDataJson(String rawDataJson) { this.rawDataJson = rawDataJson; }
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }
        public Long getTargetCaseId() { return targetCaseId; }
        public void setTargetCaseId(Long targetCaseId) { this.targetCaseId = targetCaseId; }
        public Instant getCreatedAt() { return createdAt; }
    }
}

