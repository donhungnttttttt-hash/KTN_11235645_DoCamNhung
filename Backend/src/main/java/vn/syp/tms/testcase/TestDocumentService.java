package vn.syp.tms.testcase;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.project.ProjectService;
import vn.syp.tms.shared.web.BusinessException;

/** Member-visible documents are COMMITTED imports, never private or expired previews. */
@Service
@Transactional(readOnly=true)
public class TestDocumentService {
    private final JdbcTemplate jdbc;
    private final ProjectService projects;
    private final ObjectMapper json;
    public TestDocumentService(JdbcTemplate jdbc, ProjectService projects, ObjectMapper json) {
        this.jdbc=jdbc; this.projects=projects; this.json=json;
    }
    // Projection deliberately excludes the source BLOB from file listings.
    private static final String SUMMARY = """
        SELECT b.id,b.project_id,b.file_name,COALESCE(b.sheet_name,'TestCases') sheet_name,
            b.mapping_version,b.total_rows,b.created_at,
            COALESCE((SELECT MAX(r.created_at) FROM import_rows ir JOIN test_cases c ON c.project_id=ir.project_id AND c.id=ir.target_case_id
                JOIN test_case_revisions r ON r.project_id=c.project_id AND r.id=c.current_revision_id
                WHERE ir.project_id=b.project_id AND ir.batch_id=b.id AND r.created_at>b.committed_at),b.committed_at,b.created_at) updated_at,
            COALESCE((SELECT u.display_name FROM import_rows ir JOIN test_cases c ON c.project_id=ir.project_id AND c.id=ir.target_case_id
                JOIN test_case_revisions r ON r.project_id=c.project_id AND r.id=c.current_revision_id
                JOIN project_memberships m ON m.project_id=r.project_id AND m.id=r.created_by JOIN identity_users u ON u.id=m.user_id
                WHERE ir.project_id=b.project_id AND ir.batch_id=b.id AND r.created_at>b.committed_at ORDER BY r.created_at DESC,r.id DESC LIMIT 1),actor.display_name) updated_by,
            (b.source_workbook IS NOT NULL) has_source_file,
            (SELECT COUNT(*) FROM import_rows ir WHERE ir.project_id=b.project_id AND ir.batch_id=b.id AND ir.target_case_id IS NOT NULL) case_count
        FROM import_batches b JOIN identity_users actor ON actor.id=b.imported_by
        WHERE b.project_id=? AND b.status='COMMITTED'
        """;

    public TestDocumentDtos.Page list(Long projectId, String actor, int page, int size, String keyword) {
        projects.requireMembership(projectId,actor);
        if (page<0 || page>100000 || size<1 || size>100 || keyword.length()>255) throw invalidSearch();
        String term="%"+keyword.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        String filter=" AND LOWER(b.file_name) LIKE ? ESCAPE '!'";
        long count=Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(*) FROM import_batches b WHERE b.project_id=? AND b.status='COMMITTED'"+filter,Long.class,projectId,term));
        var items=jdbc.query(SUMMARY+filter+" ORDER BY b.id DESC LIMIT ? OFFSET ?",this::summary,projectId,term,size,(long)page*size);
        return new TestDocumentDtos.Page(withCounts(projectId,items),count,page,size,(int)((count+size-1)/size));
    }

    public TestDocumentDtos.Detail get(Long projectId, String actor, Long id) {
        projects.requireMembership(projectId,actor);
        var summary=summary(projectId,id);
        return detail(summary);
    }

    public TestDocumentDtos.Download export(Long projectId, String actor, Long id, boolean original) {
        projects.requireMembership(projectId,actor);
        var summary=summary(projectId,id);
        byte[] source=source(projectId,id);
        if (original) {
            if (source==null) throw new BusinessException(404,"SOURCE_FILE_UNAVAILABLE","Tài liệu cũ không lưu tệp gốc; hãy dùng Xuất Excel.");
            return new TestDocumentDtos.Download(summary.fileName(),source);
        }
        var detail=detail(summary,source);
        byte[] result=DocumentWorkbook.export(source,summary.sheetName(),detail.headers(),detail.rows().stream()
                .map(row->new DocumentWorkbook.RowCells(row.rowNumber(),row.cells())).toList());
        return new TestDocumentDtos.Download(summary.fileName(),result);
    }

    private TestDocumentDtos.Summary summary(Long projectId,Long id) {
        var items=jdbc.query(SUMMARY+" AND b.id=?",this::summary,projectId,id);
        if(items.isEmpty()) throw new BusinessException(404,"NOT_FOUND","Không tìm thấy tài liệu test trong dự án.");
        return withCounts(projectId,items).getFirst();
    }
    private TestDocumentDtos.Summary summary(ResultSet rs,int index) throws SQLException {
        return new TestDocumentDtos.Summary(rs.getLong("id"),rs.getLong("project_id"),rs.getString("file_name"),rs.getString("sheet_name"),
                TestCaseWorkbook.CUSTOMER.equals(rs.getString("mapping_version"))?TestCaseWorkbook.CUSTOMER:TestCaseWorkbook.INTERNAL,
                rs.getInt("total_rows"),rs.getInt("case_count"),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),
                rs.getString("updated_by"),rs.getBoolean("has_source_file"),Map.of());
    }
    private List<TestDocumentDtos.Summary> withCounts(Long projectId,List<TestDocumentDtos.Summary> items) {
        if(items.isEmpty()) return items;
        Map<Long,Map<String,Long>> counts=new HashMap<>();
        List<Object> args=new ArrayList<>(); args.add(projectId); items.forEach(s->args.add(s.id()));
        String placeholders=String.join(",",Collections.nCopies(items.size(),"?"));
        jdbc.query("SELECT batch_id,raw_data_json FROM import_rows WHERE project_id=? AND batch_id IN ("+placeholders+")",(org.springframework.jdbc.core.RowCallbackHandler)rs->{
            var data=readRow(rs.getString("raw_data_json"));
            if(data.sourceCells()!=null) {
                var columns=data.sourceColumns()==null?CustomerWorkbook.columns(CustomerWorkbook.HEADERS):data.sourceColumns();
                if(columns.containsKey("result"))
                    counts.computeIfAbsent(rs.getLong("batch_id"),key->new LinkedHashMap<>()).merge(outcome(CustomerWorkbook.cell(data.sourceCells(),columns,"result")),1L,(a,b)->a+b);
            }
        },args.toArray());
        return items.stream().map(s->new TestDocumentDtos.Summary(s.id(),s.projectId(),s.fileName(),s.sheetName(),s.format(),s.totalRows(),s.caseCount(),s.createdAt(),s.updatedAt(),s.updatedBy(),s.hasSourceFile(),counts.getOrDefault(s.id(),Map.of()))).toList();
    }
    static String outcome(String value) {
        return switch (value.trim().toUpperCase(Locale.ROOT)) {
            case "OK" -> "OK";
            case "FIXED", "FIX" -> "Fixed";
            case "NG" -> "NG";
            case "PENDING", "P" -> "Pending";
            case "NA" -> "NA";
            case "", "-" -> "-";
            default -> "OTHER";
        };
    }
    private TestDocumentDtos.Detail detail(TestDocumentDtos.Summary summary) { return detail(summary,source(summary.projectId(),summary.id())); }
    private TestDocumentDtos.Detail detail(TestDocumentDtos.Summary summary,byte[] source) {
        boolean customer=TestCaseWorkbook.CUSTOMER.equals(summary.format());
        List<String> headers=headers(source,summary.sheetName(),customer);
        var columns=customer?CustomerWorkbook.columns(headers):Map.of("sourceId",0);
        var rows=jdbc.query("""
            SELECT ir.source_row_number,ir.source_case_key,ir.suite_code,ir.raw_data_json,c.id case_id,c.case_no,c.current_revision_id,
                c.archived_at,r.approved_at,r.title_vi,r.preconditions_vi,r.steps_vi,r.expected_vi,
                r.title_jp,r.preconditions_jp,r.steps_jp,r.expected_jp,r.source_reference
            FROM import_rows ir JOIN test_cases c ON c.project_id=ir.project_id AND c.id=ir.target_case_id
            JOIN test_case_revisions r ON r.project_id=c.project_id AND r.id=c.current_revision_id
            WHERE ir.project_id=? AND ir.batch_id=? ORDER BY ir.source_row_number,ir.id
            """,(rs,n)->{
            var input=readRow(rs.getString("raw_data_json"));
            List<String> original=customer ? input.sourceCells() : internalCells(input);
            if(original==null || original.size()!=headers.size()) throw corrupt();
            List<String> cells=new ArrayList<>(original);
            if(customer) {
                cells=CustomerWorkbook.currentCells(input,columns,Map.of("titleVi",text(rs,"title_vi"),"preconditionsVi",text(rs,"preconditions_vi"),
                        "stepsVi",text(rs,"steps_vi"),"expectedVi",text(rs,"expected_vi"),"sourceReference",text(rs,"source_reference")));
            } else {
                cells.set(0,text(rs,"case_no")); cells.set(1,text(rs,"suite_code"));
                String[] fields={"title_vi","preconditions_vi","steps_vi","expected_vi","title_jp","preconditions_jp","steps_jp","expected_jp","source_reference"};
                for(int i=0;i<fields.length;i++) cells.set(i+2,text(rs,fields[i]));
            }
            return new TestDocumentDtos.Row(rs.getInt("source_row_number"),rs.getString("source_case_key"),rs.getLong("case_id"),rs.getString("case_no"),rs.getLong("current_revision_id"),
                    rs.getTimestamp("approved_at")!=null,rs.getTimestamp("archived_at")!=null,List.copyOf(cells),List.copyOf(original));
        },summary.projectId(),summary.id());
        return new TestDocumentDtos.Detail(summary,headers,rows,columns);
    }
    private byte[] source(Long projectId,Long id) {
        var values=jdbc.query("SELECT source_workbook FROM import_batches WHERE project_id=? AND id=? AND status='COMMITTED'",(rs,n)->rs.getBytes(1),projectId,id);
        return values.isEmpty()?null:values.getFirst();
    }
    private List<String> headers(byte[] source,String sheetName,boolean customer) {
        if(source==null) return customer?CustomerWorkbook.HEADERS:TestCaseWorkbook.HEADERS;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(source))) {
            var sheet=book.getSheet(sheetName); if(sheet==null || sheet.getRow(0)==null) throw corrupt();
            if(customer) {
                return CustomerWorkbook.headers(sheet);
            }
            List<String> result=new ArrayList<>();
            for(int c=0;c<(customer?14:11);c++) result.add(CustomerWorkbook.value(sheet.getRow(0).getCell(c),1));
            return List.copyOf(result);
        } catch(IOException e) { throw corrupt(); }
    }
    private TestCaseDtos.ImportRowInput readRow(String data) {
        try { return json.readValue(data,TestCaseDtos.ImportRowInput.class); }
        catch(com.fasterxml.jackson.core.JsonProcessingException e) { throw corrupt(); }
    }
    private static List<String> internalCells(TestCaseDtos.ImportRowInput r) {
        return java.util.stream.Stream.of(r.caseNo(),r.suiteCode(),r.titleVi(),r.preconditionsVi(),r.stepsVi(),r.expectedVi(),r.titleJp(),r.preconditionsJp(),r.stepsJp(),r.expectedJp(),r.sourceReference()).map(v->v==null?"":v).toList();
    }
    private static String text(ResultSet rs,String column) throws SQLException { String value=rs.getString(column); return value==null?"":value; }
    private BusinessException corrupt() { return new BusinessException(409,"DOCUMENT_DATA_INVALID","Dữ liệu tài liệu không còn hợp lệ; liên hệ PM để kiểm tra bản nhập."); }
    private BusinessException invalidSearch() { return new BusinessException(422,"INVALID_SEARCH","Tham số tìm kiếm tài liệu không hợp lệ."); }
}
