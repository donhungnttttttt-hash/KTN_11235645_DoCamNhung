package vn.syp.tms.testcase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

public class TestCaseRepositories {

    @Repository
    public interface TestSuiteRepository extends JpaRepository<TestCaseEntities.TestSuite, Long> {
        List<TestCaseEntities.TestSuite> findByProjectIdAndArchivedAtIsNullOrderBySortOrderAscIdAsc(Long projectId);
        Optional<TestCaseEntities.TestSuite> findByProjectIdAndCode(Long projectId, String code);
        Optional<TestCaseEntities.TestSuite> findByProjectIdAndId(Long projectId, Long id);
        boolean existsByProjectIdAndCode(Long projectId, String code);
    }

    @Repository
    public interface TestCaseRepository extends JpaRepository<TestCaseEntities.TestCase, Long> {
        @org.springframework.data.jpa.repository.Query("""
            select c from LibraryTestCase c where c.projectId = :projectId and c.archivedAt is null
            and (:suiteId is null or c.suiteId = :suiteId)
            and (lower(c.caseNo) like :term escape '!' or exists (
                select r.id from LibraryCaseRevision r where r.id=c.currentRevisionId and lower(r.titleVi) like :term escape '!'))
            """)
        org.springframework.data.domain.Page<TestCaseEntities.TestCase> search(
                @org.springframework.data.repository.query.Param("projectId") Long projectId,
                @org.springframework.data.repository.query.Param("suiteId") Long suiteId,
                @org.springframework.data.repository.query.Param("term") String term,
                org.springframework.data.domain.Pageable page);
        List<TestCaseEntities.TestCase> findByProjectIdAndArchivedAtIsNullOrderByIdDesc(Long projectId);
        List<TestCaseEntities.TestCase> findByProjectIdAndSuiteIdAndArchivedAtIsNullOrderByIdDesc(Long projectId, Long suiteId);
        Optional<TestCaseEntities.TestCase> findByProjectIdAndId(Long projectId, Long id);
        Optional<TestCaseEntities.TestCase> findByProjectIdAndCaseNo(Long projectId, String caseNo);
        boolean existsByProjectIdAndCaseNo(Long projectId, String caseNo);
        long countByProjectIdAndSuiteIdAndArchivedAtIsNull(Long projectId, Long suiteId);
    }

    @Repository
    public interface TestCaseRevisionRepository extends JpaRepository<TestCaseEntities.TestCaseRevision, Long> {
        List<TestCaseEntities.TestCaseRevision> findByProjectIdAndTestCaseIdOrderByRevisionNoDesc(Long projectId, Long testCaseId);
        Optional<TestCaseEntities.TestCaseRevision> findByProjectIdAndTestCaseIdAndRevisionNo(Long projectId, Long testCaseId, int revisionNo);
        Optional<TestCaseEntities.TestCaseRevision> findByProjectIdAndTestCaseIdAndId(Long projectId, Long testCaseId, Long id);
        Optional<TestCaseEntities.TestCaseRevision> findTopByProjectIdAndTestCaseIdOrderByRevisionNoDesc(Long projectId, Long testCaseId);
    }

    @Repository
    public interface ImportBatchRepository extends JpaRepository<TestCaseEntities.ImportBatch, Long> {
        Optional<TestCaseEntities.ImportBatch> findFirstByProjectIdAndFileChecksumAndMappingVersionAndStatusOrderByIdDesc(Long projectId, String fileChecksum, String mappingVersion, String status);
        List<TestCaseEntities.ImportBatch> findByProjectIdAndFileChecksumAndImportedByOrderByIdDesc(Long projectId, String fileChecksum, String importedBy);
        List<TestCaseEntities.ImportBatch> findByProjectIdOrderByCreatedAtDesc(Long projectId);
        Optional<TestCaseEntities.ImportBatch> findByIdAndProjectId(Long id, Long projectId);
    }

    @Repository
    public interface ImportRowRepository extends JpaRepository<TestCaseEntities.ImportRow, Long> {
        List<TestCaseEntities.ImportRow> findByProjectIdAndBatchIdOrderByRowNumberAsc(Long projectId, Long batchId);
    }
}

