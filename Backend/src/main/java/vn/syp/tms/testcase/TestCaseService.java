package vn.syp.tms.testcase;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.MembershipRepository;
import vn.syp.tms.project.ProjectMembership;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.shared.web.BusinessException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class TestCaseService {

    private final TestCaseRepositories.TestSuiteRepository suiteRepository;
    private final TestCaseRepositories.TestCaseRepository caseRepository;
    private final TestCaseRepositories.TestCaseRevisionRepository revisionRepository;
    private final TestCaseRepositories.ImportBatchRepository batchRepository;
    private final TestCaseRepositories.ImportRowRepository rowRepository;
    private final ProjectService projectService;
    private final MembershipRepository membershipRepository;
    private final ObjectMapper json;
    private final TestCaseWorkbook workbook;
    private final jakarta.validation.Validator validator;
    private final vn.syp.tms.project.ProjectAudit audit;

    public TestCaseService(
            TestCaseRepositories.TestSuiteRepository suiteRepository,
            TestCaseRepositories.TestCaseRepository caseRepository,
            TestCaseRepositories.TestCaseRevisionRepository revisionRepository,
            TestCaseRepositories.ImportBatchRepository batchRepository,
            TestCaseRepositories.ImportRowRepository rowRepository,
            ProjectService projectService,
            MembershipRepository membershipRepository,
            ObjectMapper json, TestCaseWorkbook workbook, jakarta.validation.Validator validator, vn.syp.tms.project.ProjectAudit audit
    ) {
        this.suiteRepository = suiteRepository;
        this.caseRepository = caseRepository;
        this.revisionRepository = revisionRepository;
        this.batchRepository = batchRepository;
        this.rowRepository = rowRepository;
        this.projectService = projectService;
        this.membershipRepository = membershipRepository;
        this.json = json;
        this.workbook = workbook; this.validator = validator; this.audit = audit;
    }

    private Long getMemberId(Long projectId, String userId) {
        ProjectMembership m = membershipRepository.findByProjectIdAndUserId(projectId, userId);
        if (m == null || !m.isActive()) {
            throw new BusinessException(403, "FORBIDDEN", "Bạn không phải thành viên của dự án này.");
        }
        return m.getId();
    }

    // ===== Suites =====

    public List<TestCaseDtos.SuiteSummary> listSuites(Long projectId, String userId) {
        projectService.requireReadAccess(projectId, userId);
        List<TestCaseEntities.TestSuite> suites = suiteRepository.findByProjectIdAndArchivedAtIsNullOrderBySortOrderAscIdAsc(projectId);
        return suites.stream().map(s -> {
            long count = caseRepository.countByProjectIdAndSuiteIdAndArchivedAtIsNull(projectId, s.getId());
            return new TestCaseDtos.SuiteSummary(s.getId(), s.getProjectId(), s.getCode(), s.getName(), s.getDescription(), s.getParentId(), s.getSortOrder(), count, s.getCreatedAt());
        }).collect(Collectors.toList());
    }

    public TestCaseDtos.SuiteSummary createSuite(Long projectId, String userId, TestCaseDtos.CreateSuite input) {
        projectService.lockWritableProject(projectId, userId);
        if (suiteRepository.existsByProjectIdAndCode(projectId, input.code())) {
            throw new BusinessException(400, "DUPLICATE_CODE", "Mã nhóm test case đã tồn tại.");
        }
        validateParent(projectId, null, input.parentId());
        TestCaseEntities.TestSuite suite = new TestCaseEntities.TestSuite();
        suite.setProjectId(projectId);
        suite.setCode(input.code());
        suite.setName(input.name());
        suite.setDescription(input.description());
        suite.setParentId(input.parentId());
        suite.setSortOrder(input.sortOrder() != null ? input.sortOrder() : 0);
        suiteRepository.save(suite);
        audit.record(projectId,userId,"TEST_SUITE",suite.getId(),"CREATE");
        return new TestCaseDtos.SuiteSummary(suite.getId(), suite.getProjectId(), suite.getCode(), suite.getName(), suite.getDescription(), suite.getParentId(), suite.getSortOrder(), 0, suite.getCreatedAt());
    }

    public TestCaseDtos.SuiteSummary updateSuite(Long projectId, String userId, Long suiteId, TestCaseDtos.UpdateSuite input) {
        projectService.lockWritableProject(projectId, userId);
        TestCaseEntities.TestSuite suite = suiteRepository.findByProjectIdAndId(projectId, suiteId)
                .orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy nhóm test case."));

        if (input.name() != null) {
            if (input.name().isBlank()) throw new BusinessException(422,"VALIDATION_ERROR","Tên nhóm không được để trống.");
            suite.setName(input.name());
        }
        if (input.description() != null) suite.setDescription(input.description());
        if (suite.getArchivedAt() != null) throw conflict("Nhóm đã được lưu trữ.");
        if (input.parentId() != null) {
            validateParent(projectId, suiteId, input.parentId());
            suite.setParentId(input.parentId());
        }
        if (input.sortOrder() != null) suite.setSortOrder(input.sortOrder());
        suiteRepository.save(suite);
        audit.record(projectId,userId,"TEST_SUITE",suiteId,"UPDATE");
        long count = caseRepository.countByProjectIdAndSuiteIdAndArchivedAtIsNull(projectId, suite.getId());
        return new TestCaseDtos.SuiteSummary(suite.getId(), suite.getProjectId(), suite.getCode(), suite.getName(), suite.getDescription(), suite.getParentId(), suite.getSortOrder(), count, suite.getCreatedAt());
    }

    public void archiveSuite(Long projectId, String userId, Long suiteId) {
        projectService.lockWritableProject(projectId, userId);
        TestCaseEntities.TestSuite suite = suiteRepository.findByProjectIdAndId(projectId, suiteId)
                .orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy nhóm test case."));
        if (caseRepository.countByProjectIdAndSuiteIdAndArchivedAtIsNull(projectId, suiteId) > 0 ||
                suiteRepository.findByProjectIdAndArchivedAtIsNullOrderBySortOrderAscIdAsc(projectId).stream().anyMatch(child -> suiteId.equals(child.getParentId())))
            throw conflict("Chỉ lưu trữ nhóm không còn test case hoặc nhóm con đang hoạt động.");
        suite.setArchivedAt(Instant.now());
        audit.record(projectId,userId,"TEST_SUITE",suiteId,"ARCHIVE");
        suiteRepository.save(suite);
    }

    // ===== Cases =====

    public TestCaseDtos.CasePage searchCases(Long projectId,String userId,Long suiteId,String keyword,int page,int size) {
        projectService.requireReadAccess(projectId,userId);
        if (page<0 || size<1 || size>100 || keyword.length()>255) throw new BusinessException(422,"INVALID_SEARCH","Tham số tìm kiếm không hợp lệ.");
        if (suiteId!=null) activeSuite(projectId,suiteId);
        String term="%"+keyword.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        var result=caseRepository.search(projectId,suiteId,term,org.springframework.data.domain.PageRequest.of(page,size,org.springframework.data.domain.Sort.by("id").descending()));
        var items=result.getContent().stream().map(c->{
            var rev=revisionRepository.findByProjectIdAndTestCaseIdAndId(projectId,c.getId(),c.getCurrentRevisionId()).orElseThrow();
            return new TestCaseDtos.CaseSummary(c.getId(),projectId,c.getCaseNo(),c.getSuiteId(),c.getCurrentRevisionId(),rev.getTitleVi(),rev.getApprovedAt()!=null,rev.getApprovedAt(),c.getCreatedAt());
        }).toList();
        return new TestCaseDtos.CasePage(items,result.getTotalElements(),page,size,result.getTotalPages());
    }

    public List<TestCaseDtos.CaseSummary> listCases(Long projectId, String userId, Long suiteId) {
        projectService.requireReadAccess(projectId, userId);
        List<TestCaseEntities.TestCase> cases = (suiteId != null)
                ? caseRepository.findByProjectIdAndSuiteIdAndArchivedAtIsNullOrderByIdDesc(projectId, suiteId)
                : caseRepository.findByProjectIdAndArchivedAtIsNullOrderByIdDesc(projectId);

        return cases.stream().map(c -> {
            String titleVi = "";
            boolean approved = false;
            Instant approvedAt = null;
            if (c.getCurrentRevisionId() != null) {
                Optional<TestCaseEntities.TestCaseRevision> revOpt = revisionRepository.findByProjectIdAndTestCaseIdAndId(projectId, c.getId(), c.getCurrentRevisionId());
                if (revOpt.isPresent()) {
                    TestCaseEntities.TestCaseRevision rev = revOpt.get();
                    titleVi = rev.getTitleVi();
                    approved = rev.getApprovedAt() != null;
                    approvedAt = rev.getApprovedAt();
                }
            }
            return new TestCaseDtos.CaseSummary(c.getId(), c.getProjectId(), c.getCaseNo(), c.getSuiteId(), c.getCurrentRevisionId(), titleVi, approved, approvedAt, c.getCreatedAt());
        }).collect(Collectors.toList());
    }

    public TestCaseDtos.CaseDetail getCaseDetail(Long projectId, String userId, Long caseId) {
        projectService.requireReadAccess(projectId, userId);
        TestCaseEntities.TestCase c = caseRepository.findByProjectIdAndId(projectId, caseId)
                .orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy test case."));

        List<TestCaseEntities.TestCaseRevision> revs = revisionRepository.findByProjectIdAndTestCaseIdOrderByRevisionNoDesc(projectId, caseId);
        List<TestCaseDtos.RevisionSummary> revSummaries = revs.stream().map(r ->
                new TestCaseDtos.RevisionSummary(r.getId(), r.getRevisionNo(), r.getTitleVi(), r.getApprovedAt() != null, r.getApprovedAt(), r.getCreatedAt(), r.getCreatedBy())
        ).collect(Collectors.toList());

        TestCaseDtos.RevisionDetail currentDetail = null;
        if (c.getCurrentRevisionId() != null) {
            for (TestCaseEntities.TestCaseRevision r : revs) {
                if (r.getId().equals(c.getCurrentRevisionId())) {
                    currentDetail = new TestCaseDtos.RevisionDetail(
                            r.getId(), r.getRevisionNo(), r.getTitleVi(), r.getPreconditionsVi(), r.getStepsVi(), r.getExpectedVi(),
                            r.getTitleJp(), r.getPreconditionsJp(), r.getStepsJp(), r.getExpectedJp(), r.getSourceReference(),
                            r.getApprovedAt() != null, r.getApprovedAt(), r.getCreatedAt(), r.getCreatedBy()
                    );
                    break;
                }
            }
        }

        return new TestCaseDtos.CaseDetail(c.getId(), c.getProjectId(), c.getCaseNo(), c.getSuiteId(), c.getCurrentRevisionId(), currentDetail, revSummaries, c.getCreatedAt());
    }

    public TestCaseDtos.CaseDetail createCase(Long projectId, String userId, TestCaseDtos.CreateCase input) {
        projectService.lockWritableProject(projectId, userId);
        if (caseRepository.existsByProjectIdAndCaseNo(projectId, input.caseNo())) {
            throw new BusinessException(400, "DUPLICATE_CASE_NO", "Mã test case đã tồn tại.");
        }
        suiteRepository.findByProjectIdAndId(projectId, input.suiteId())
                .orElseThrow(() -> new BusinessException(404, "SUITE_NOT_FOUND", "Nhóm test case không tồn tại."));

        Long memberId = getMemberId(projectId, userId);

        TestCaseEntities.TestCase tc = new TestCaseEntities.TestCase();
        activeSuite(projectId, input.suiteId());
        validate(input);
        tc.setProjectId(projectId);
        tc.setCaseNo(input.caseNo());
        tc.setSuiteId(input.suiteId());
        caseRepository.save(tc);

        TestCaseEntities.TestCaseRevision rev = new TestCaseEntities.TestCaseRevision();
        rev.setProjectId(projectId);
        rev.setTestCaseId(tc.getId());
        rev.setRevisionNo(1);
        rev.setTitleVi(input.titleVi());
        rev.setPreconditionsVi(input.preconditionsVi());
        rev.setStepsVi(input.stepsVi());
        rev.setExpectedVi(input.expectedVi());
        rev.setTitleJp(input.titleJp());
        rev.setPreconditionsJp(input.preconditionsJp());
        rev.setStepsJp(input.stepsJp());
        rev.setExpectedJp(input.expectedJp());
        rev.setSourceReference(input.sourceReference());
        rev.setCreatedBy(memberId);
        rev.setChecksum(TestCaseWorkbook.sha256(serialize(input).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        revisionRepository.save(rev);
        audit.record(projectId,userId,"TEST_CASE_REVISION",rev.getId(),"CREATE");

        tc.setCurrentRevisionId(rev.getId());
        caseRepository.save(tc);

        return getCaseDetail(projectId, userId, tc.getId());
    }

    public TestCaseDtos.RevisionDetail addRevision(Long projectId, String userId, Long caseId, TestCaseDtos.CreateRevision input) {
        projectService.lockWritableProject(projectId, userId);
        TestCaseEntities.TestCase tc = caseRepository.findByProjectIdAndId(projectId, caseId)
                .orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy test case."));

        validate(input);
        if (tc.getArchivedAt()!=null) throw conflict("Test case đã được lưu trữ.");
        if (!Objects.equals(tc.getCurrentRevisionId(), input.expectedCurrentRevisionId())) throw conflict("Test case đã có phiên bản mới. Hãy tải lại trước khi lưu.");
        int maxRev = revisionRepository.findTopByProjectIdAndTestCaseIdOrderByRevisionNoDesc(projectId, caseId)
                .map(revision -> revision.getRevisionNo())
                .orElse(0);

        Long memberId = getMemberId(projectId, userId);

        TestCaseEntities.TestCaseRevision rev = new TestCaseEntities.TestCaseRevision();
        rev.setProjectId(projectId);
        rev.setTestCaseId(tc.getId());
        rev.setRevisionNo(maxRev + 1);
        rev.setTitleVi(input.titleVi());
        rev.setPreconditionsVi(input.preconditionsVi());
        rev.setStepsVi(input.stepsVi());
        rev.setExpectedVi(input.expectedVi());
        rev.setTitleJp(input.titleJp());
        rev.setPreconditionsJp(input.preconditionsJp());
        rev.setStepsJp(input.stepsJp());
        rev.setExpectedJp(input.expectedJp());
        rev.setSourceReference(input.sourceReference());
        rev.setCreatedBy(memberId);
        rev.setChecksum(TestCaseWorkbook.sha256(serialize(input).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        revisionRepository.save(rev);
        audit.record(projectId,userId,"TEST_CASE_REVISION",rev.getId(),"CREATE");

        tc.setCurrentRevisionId(rev.getId());
        caseRepository.save(tc);

        return new TestCaseDtos.RevisionDetail(
                rev.getId(), rev.getRevisionNo(), rev.getTitleVi(), rev.getPreconditionsVi(), rev.getStepsVi(), rev.getExpectedVi(),
                rev.getTitleJp(), rev.getPreconditionsJp(), rev.getStepsJp(), rev.getExpectedJp(), rev.getSourceReference(),
                false, null, rev.getCreatedAt(), rev.getCreatedBy()
        );
    }

    public TestCaseDtos.RevisionDetail approveRevision(Long projectId, String userId, Long caseId, Long revisionId) {
        projectService.lockWritableProject(projectId, userId);
        TestCaseEntities.TestCaseRevision rev = revisionRepository.findByProjectIdAndTestCaseIdAndId(projectId, caseId, revisionId)
                .orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy phiên bản test case."));

        projectService.requireProjectPm(projectId, userId);
        var testCase = caseRepository.findByProjectIdAndId(projectId, caseId).orElseThrow();
        if (testCase.getArchivedAt()!=null) throw conflict("Test case đã được lưu trữ.");
        if (rev.getApprovedAt()==null) {
            rev.setApprovedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
            rev.setApprovedBy(getMemberId(projectId,userId));
            revisionRepository.save(rev);
            audit.record(projectId,userId,"TEST_CASE_REVISION",rev.getId(),"APPROVE");
        }

        return new TestCaseDtos.RevisionDetail(
                rev.getId(), rev.getRevisionNo(), rev.getTitleVi(), rev.getPreconditionsVi(), rev.getStepsVi(), rev.getExpectedVi(),
                rev.getTitleJp(), rev.getPreconditionsJp(), rev.getStepsJp(), rev.getExpectedJp(), rev.getSourceReference(),
                true, rev.getApprovedAt(), rev.getCreatedAt(), rev.getCreatedBy()
        );
    }

    public void archiveCase(Long projectId, String userId, Long caseId) {
        projectService.lockWritableProject(projectId, userId);
        TestCaseEntities.TestCase tc = caseRepository.findByProjectIdAndId(projectId, caseId)
                .orElseThrow(() -> new BusinessException(404, "NOT_FOUND", "Không tìm thấy test case."));
        tc.setArchivedAt(Instant.now());
        audit.record(projectId,userId,"TEST_CASE",caseId,"ARCHIVE");
        caseRepository.save(tc);
    }

    // Import is serialized per project with case/revision and membership writes.
    public byte[] importTemplate(Long projectId, String userId) {
        projectService.requirePmOrAdmin(projectId,userId);
        return workbook.customerTemplate();
    }

    public TestCaseDtos.ImportPreviewDetail createImportPreview(Long projectId, String userId, org.springframework.web.multipart.MultipartFile file) {
        projectService.lockWritableProject(projectId,userId);
        var parsed=workbook.parse(file);
        boolean customer=TestCaseWorkbook.CUSTOMER.equals(parsed.format());
        if (customer) {
            var committed=batchRepository.findFirstByProjectIdAndFileChecksumAndMappingVersionAndStatusOrderByIdDesc(projectId,parsed.checksum(),TestCaseWorkbook.CUSTOMER,"COMMITTED");
            if (committed.isPresent()) return getImportPreview(projectId,userId,committed.get().getId());
        }
        for (var previous:batchRepository.findByProjectIdAndFileChecksumAndImportedByOrderByIdDesc(projectId,parsed.checksum(),userId)) {
            if ("COMMITTED".equals(previous.getStatus()) || (previous.getErrorRows()==0 && Instant.now().isBefore(previous.getStagedExpiresAt())))
                return getImportPreview(projectId,userId,previous.getId());
        }
        var batch=new TestCaseEntities.ImportBatch();
        batch.setProjectId(projectId); batch.setFileName(parsed.fileName()); batch.setFileChecksum(parsed.checksum());
        batch.setMappingVersion(parsed.format()); batch.setSheetName(parsed.sheetName()); batch.setSourceWorkbook(parsed.sourceBytes());
        batch.setStatus("PREVIEW"); batch.setImportedBy(userId); batch.setStagedExpiresAt(Instant.now().plus(24,ChronoUnit.HOURS));
        batchRepository.save(batch);
        int errors=0; Set<String> seen=new HashSet<>();
        for (var input:parsed.rows()) {
            List<String> problems=new ArrayList<>();
            if (!customer && (input.caseNo().length()>32 || !input.caseNo().matches("[A-Za-z0-9][A-Za-z0-9_-]{0,31}"))) problems.add("Mã test case cần 1–32 ký tự chữ, số, gạch ngang/gạch dưới.");
            if (!seen.add(input.caseNo().toUpperCase(Locale.ROOT))) problems.add("Mã test case trùng trong tệp.");
            if (!customer) {
                if (caseRepository.existsByProjectIdAndCaseNo(projectId,input.caseNo())) problems.add("Mã test case đã tồn tại; hãy tạo phiên bản mới trong chi tiết.");
                var suite=suiteRepository.findByProjectIdAndCode(projectId,input.suiteCode()).filter(x->x.getArchivedAt()==null);
                if (suite.isEmpty()) problems.add("Mã nhóm không tồn tại hoặc đã lưu trữ.");
            }
            if (input.titleVi().isBlank() || input.titleVi().length()>255) problems.add("Tiêu đề tiếng Việt bắt buộc, tối đa 255 ký tự.");
            if (input.stepsVi().isBlank()) problems.add("Thiếu các bước thực hiện tiếng Việt.");
            if (input.expectedVi().isBlank()) problems.add("Thiếu kết quả mong đợi tiếng Việt.");
            if (input.titleJp().length()>255 || input.sourceReference().length()>255) problems.add("Tiêu đề gốc/tham chiếu tối đa 255 ký tự.");
            var row=new TestCaseEntities.ImportRow();
            row.setProjectId(projectId); row.setBatchId(batch.getId()); row.setRowNumber(input.rowNumber());
            row.setSourceCaseKey(abbreviate(input.caseNo(),64)); row.setSuiteCode(customer ? "XLSX-"+batch.getId() : abbreviate(input.suiteCode(),32));
            row.setRawDataJson(serialize(input)); row.setValid(problems.isEmpty());
            if (!problems.isEmpty()) { row.setErrorMessage(abbreviate(String.join(" ",problems),500)); errors++; }
            rowRepository.save(row);
        }
        batch.setTotalRows(parsed.rows().size()); batch.setErrorRows(errors); batch.setValidRows(parsed.rows().size()-errors);
        batchRepository.saveAndFlush(batch);
        audit.record(projectId,userId,"IMPORT_BATCH",batch.getId(),"PREVIEW");
        return getImportPreview(projectId,userId,batch.getId());
    }

    public TestCaseDtos.ImportPreviewDetail getImportPreview(Long projectId,String userId,Long batchId) {
        projectService.requirePmOrAdmin(projectId,userId);
        var batch=ownedBatch(projectId,userId,batchId);
        var rows=rowRepository.findByProjectIdAndBatchIdOrderByRowNumberAsc(projectId,batchId).stream().map(row -> {
            var input=deserialize(row.getRawDataJson());
            return new TestCaseDtos.ImportRowDetail(row.getId(),row.getRowNumber(),row.getSourceCaseKey(),row.getSuiteCode(),input.titleVi(),row.isValid(),row.getErrorMessage());
        }).toList();
        String status="PREVIEW".equals(batch.getStatus()) && Instant.now().isAfter(batch.getStagedExpiresAt()) ? "EXPIRED" : batch.getStatus();
        return new TestCaseDtos.ImportPreviewDetail(batch.getId(),projectId,batch.getFileName(),status,batch.getTotalRows(),batch.getValidRows(),batch.getErrorRows(),rows,
                TestCaseWorkbook.CUSTOMER.equals(batch.getMappingVersion()) ? TestCaseWorkbook.CUSTOMER : TestCaseWorkbook.INTERNAL,
                batch.getSheetName()==null ? "TestCases" : batch.getSheetName());
    }

    public TestCaseDtos.ImportBatchSummary commitImportPreview(Long projectId,String userId,Long batchId) {
        projectService.lockWritableProject(projectId,userId);
        var batch=ownedBatch(projectId,userId,batchId);
        if ("COMMITTED".equals(batch.getStatus())) return batchSummary(batch);
        if (!"PREVIEW".equals(batch.getStatus()) || Instant.now().isAfter(batch.getStagedExpiresAt()))
            throw new BusinessException(410,"EXPIRED","Bản xem trước đã hết hạn. Hãy tải tệp lên lại.");
        var rows=rowRepository.findByProjectIdAndBatchIdOrderByRowNumberAsc(projectId,batchId);
        if (rows.isEmpty() || batch.getErrorRows()>0 || rows.stream().anyMatch(row->!row.isValid()))
            throw new BusinessException(422,"IMPORT_HAS_ERRORS","Hãy sửa tất cả dòng lỗi rồi tải tệp lên lại. Chưa có dữ liệu nào được nhập.");
        boolean customer=TestCaseWorkbook.CUSTOMER.equals(batch.getMappingVersion());
        if (customer) {
            var duplicate=batchRepository.findFirstByProjectIdAndFileChecksumAndMappingVersionAndStatusOrderByIdDesc(projectId,batch.getFileChecksum(),TestCaseWorkbook.CUSTOMER,"COMMITTED");
            if (duplicate.isPresent()) return batchSummary(duplicate.get());
            createSuite(projectId,userId,new TestCaseDtos.CreateSuite("XLSX-"+batchId,abbreviate(batch.getFileName(),100),"Nhập từ tài liệu Excel",null,0));
        }
        for (var row:rows) {
            var input=deserialize(row.getRawDataJson());
            String caseNo=customer ? "XLSX-"+batchId+"-"+row.getRowNumber() : input.caseNo();
            var suite=suiteRepository.findByProjectIdAndCode(projectId,row.getSuiteCode()).filter(x->x.getArchivedAt()==null)
                    .orElseThrow(()->conflict("Nhóm đã thay đổi sau khi xem trước; hãy tải tệp lên lại."));
            if (caseRepository.existsByProjectIdAndCaseNo(projectId,caseNo))
                throw conflict("Mã " + caseNo + " đã được tạo sau khi xem trước. Chưa nhập dòng nào.");
            var detail=createCase(projectId,userId,new TestCaseDtos.CreateCase(caseNo,suite.getId(),input.titleVi(),input.preconditionsVi(),input.stepsVi(),input.expectedVi(),input.titleJp(),input.preconditionsJp(),input.stepsJp(),input.expectedJp(),input.sourceReference()));
            row.setTargetCaseId(detail.id()); rowRepository.save(row);
        }
        batch.setStatus("COMMITTED"); batch.setCommittedAt(Instant.now()); batchRepository.saveAndFlush(batch);
        audit.record(projectId,userId,"IMPORT_BATCH",batchId,"COMMIT");
        return batchSummary(batch);
    }

    private TestCaseEntities.ImportBatch ownedBatch(Long projectId,String userId,Long id) {
        return batchRepository.findByIdAndProjectId(id,projectId).filter(b->userId.equals(b.getImportedBy()) ||
                ("COMMITTED".equals(b.getStatus()) && TestCaseWorkbook.CUSTOMER.equals(b.getMappingVersion())))
                .orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy phiên nhập dữ liệu."));
    }
    private TestCaseDtos.ImportBatchSummary batchSummary(TestCaseEntities.ImportBatch b) {
        return new TestCaseDtos.ImportBatchSummary(b.getId(),b.getProjectId(),b.getFileName(),b.getFileChecksum(),b.getStatus(),b.getTotalRows(),b.getValidRows(),b.getErrorRows(),b.getStagedExpiresAt(),b.getCommittedAt(),b.getCreatedAt());
    }
    private String serialize(Object input) {
        try { return json.writeValueAsString(input); } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException("Cannot serialize import data",e); }
    }
    private TestCaseDtos.ImportRowInput deserialize(String input) {
        try { return json.readValue(input,TestCaseDtos.ImportRowInput.class); } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw conflict("Dữ liệu xem trước không còn hợp lệ. Hãy tải lại tệp."); }
    }
    private String abbreviate(String input,int max) { return input.length()>max?input.substring(0,max):input; }
    private BusinessException conflict(String message) { return new BusinessException(409,"CONFLICT",message); }
    private void validate(Object input) { if (!validator.validate(input).isEmpty()) throw new BusinessException(422,"VALIDATION_ERROR","Kiểm tra các trường bắt buộc và giới hạn độ dài."); }
    private TestCaseEntities.TestSuite activeSuite(Long projectId,Long id) {
        return suiteRepository.findByProjectIdAndId(projectId,id).filter(s->s.getArchivedAt()==null)
                .orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy nhóm đang hoạt động trong dự án."));
    }
    private void validateParent(Long projectId,Long suiteId,Long parentId) {
        Set<Long> visited=new HashSet<>(); Long cursor=parentId;
        while (cursor!=null) {
            if (cursor.equals(suiteId) || !visited.add(cursor)) throw new BusinessException(422,"CIRCULAR_PARENT","Nhóm cha không được tạo chu trình.");
            cursor=activeSuite(projectId,cursor).getParentId();
        }
    }
    public TestCaseDtos.RevisionDetail getRevision(Long projectId,String userId,Long caseId,Long revisionId) {
        projectService.requireReadAccess(projectId,userId);
        var r=revisionRepository.findByProjectIdAndTestCaseIdAndId(projectId,caseId,revisionId)
                .orElseThrow(()->new BusinessException(404,"NOT_FOUND","Không tìm thấy phiên bản test case."));
        return new TestCaseDtos.RevisionDetail(r.getId(),r.getRevisionNo(),r.getTitleVi(),r.getPreconditionsVi(),r.getStepsVi(),r.getExpectedVi(),r.getTitleJp(),r.getPreconditionsJp(),r.getStepsJp(),r.getExpectedJp(),r.getSourceReference(),r.getApprovedAt()!=null,r.getApprovedAt(),r.getCreatedAt(),r.getCreatedBy());
    }
}
