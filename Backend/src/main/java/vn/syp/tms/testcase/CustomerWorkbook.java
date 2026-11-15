package vn.syp.tms.testcase;

import java.math.BigDecimal;
import java.net.URI;
import java.text.Normalizer;
import java.util.*;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.ss.usermodel.*;
import vn.syp.tms.shared.web.BusinessException;

/** Adapter for the inspected Vietnamese customer specification; it never evaluates formulas. */
final class CustomerWorkbook {
    static final List<String> HEADERS = List.of("ID", "Đối tượng test", "Điều kiện tiên quyết", "Các bước test", "Quan điểm test", "Hạng mục xác nhận", "Kết quả mong đợi", "Ghi chú thiết kế", "iPad*", "Ghi chú thực thi&", "ID redmine", "Người test", "", "");
    private CustomerWorkbook() {}

    static final int MAX_COLUMNS = 64;
    static final Set<String> FEATURE_FIELDS=Set.of("sourceId","sourceNo","titleVi","preconditionsVi","stepsVi","viewpoint","confirmation","expectedVi","designNote");
    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFKD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replace('đ','d').replaceAll("[^\\p{L}\\p{N}]", "");
    }
    static Map<String,Integer> columns(List<String> headers) {
        return columns(headers,false);
    }
    static Map<String,Integer> columns(List<String> headers,boolean featureOnly) {
        Map<String,Integer> columns=new LinkedHashMap<>();
        for(int i=0;i<headers.size();i++) {
            String key=switch(normalize(headers.get(i))) {
                case "id" -> "sourceId";
                case "no" -> "sourceNo";
                case "doituongtest" -> "titleVi";
                case "dieukientienquyet", "dieukientiende" -> "preconditionsVi";
                case "cacbuoctest" -> "stepsVi";
                case "quandiemtest" -> "viewpoint";
                case "hangmucxacnhan", "mucxacnhan" -> "confirmation";
                case "ketquamongdoi" -> "expectedVi";
                case "ghichuthietke" -> "designNote";
                case "ipad", "status" -> "result";
                case "ghichuthucthi" -> "executionNote";
                case "idredmine" -> "sourceReference";
                case "nguoitest", "nguoitestdautien" -> "tester";
                case "nguoitestlaigannhat" -> "latestTester";
                default -> "";
            };
            if(!key.isEmpty() && (!featureOnly||FEATURE_FIELDS.contains(key)) && columns.putIfAbsent(key,i)!=null)
                throw invalid("Tiêu đề cột trùng nghĩa: " + headers.get(i) + ". Chỉ giữ một cột cho mỗi trường.");
        }
        for(String key:List.of("sourceId","titleVi","stepsVi","expectedVi")) {
            if(!columns.containsKey(key)) throw invalid("Thiếu cột bắt buộc: " + switch(key) {
                case "sourceId" -> "ID"; case "titleVi" -> "Đối tượng test";
                case "stepsVi" -> "Các bước test"; default -> "Kết quả mong đợi";
            } + ". Có thể đổi thứ tự cột nhưng cần giữ tên tiêu đề được hỗ trợ.");
        }
        return Map.copyOf(columns);
    }
    static List<String> headers(Sheet sheet) {
        return headers(sheet,false);
    }
    static List<String> headers(Sheet sheet,boolean featureOnly) {
        var header=sheet.getRow(0);
        if(header==null) throw invalid("Thiếu hàng tiêu đề cột trong sheet.");
        int width=14; // Retain the original M/N slots for legacy document compatibility.
        for(Row row:sheet) for(Cell cell:row) {
            // Ignored columns determine source coordinates, never imported values.
            String text=featureOnly?(cell.getCellType()==CellType.BLANK||cell.getCellType()==CellType.STRING&&cell.getStringCellValue().isBlank()?"":"present"):value(cell,row.getRowNum()+1);
            checkLink(cell);
            if(!text.isBlank()) width=Math.max(width,cell.getColumnIndex()+1);
        }
        if(width>MAX_COLUMNS) throw invalid("Tệp vượt quá 64 cột dữ liệu.");
        List<String> result=new ArrayList<>();
        for(int c=0;c<width;c++) result.add(value(header.getCell(c),1));
        return List.copyOf(result);
    }
    static String cell(List<String> cells,Map<String,Integer> columns,String field) {
        Integer col=columns.get(field);
        return col==null?"":cells.get(col);
    }
    static List<String> currentCells(TestCaseDtos.ImportRowInput input,Map<String,Integer> columns,Map<String,String> current) {
        var cells=new ArrayList<>(Objects.requireNonNull(input.sourceCells()));
        var imported=Map.of("titleVi",input.titleVi(),"preconditionsVi",input.preconditionsVi(),"stepsVi",input.stepsVi(),
                "expectedVi",input.expectedVi(),"sourceReference",input.sourceReference());
        current.forEach((field,value)->{
            Integer col=columns.get(field);
            // Inherited titles remain blank in source/export until a revision actually changes their value.
            if(col!=null && !Objects.equals(value,imported.get(field))) cells.set(col,value);
        });
        return cells;
    }

    static List<TestCaseDtos.ImportRowInput> read(Sheet sheet) {
        return read(sheet,false);
    }
    static List<TestCaseDtos.ImportRowInput> read(Sheet sheet,boolean featureOnly) {
        var headers=headers(sheet,featureOnly);
        var columns=columns(headers,featureOnly);
        validatePresentationMerges(sheet,headers,columns,featureOnly);
        List<TestCaseDtos.ImportRowInput> rows = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        String previousTitle="";
        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue;
            String[] cells = new String[headers.size()];
            for (int col = 0; col < cells.length; col++) cells[col] = !featureOnly||columns.containsValue(col)?value(row.getCell(col), row.getRowNum()+1):"";
            if (Arrays.stream(cells).allMatch(cell -> cell.isBlank())) continue;
            if(rows.size()>=TestCaseWorkbook.MAX_ROWS)throw invalid("Tệp vượt quá 500 test case có dữ liệu; không tính dòng trống hoặc số dòng trong một ô.");
            var source=List.of(cells);
            String id = cell(source,columns,"sourceId").trim();
            if (id.isEmpty() || id.length() > 64) throw invalid("Dòng " + (row.getRowNum()+1) + ": ID nguồn bắt buộc, tối đa 64 ký tự.");
            if (!ids.add(id.toUpperCase(Locale.ROOT))) throw invalid("Dòng " + (row.getRowNum()+1) + ": ID nguồn bị trùng trong file.");
            String title=cell(source,columns,"titleVi");
            if(title.isBlank()) title=previousTitle;
            else previousTitle=title;
            rows.add(new TestCaseDtos.ImportRowInput(row.getRowNum()+1, id, "", title,
                    cell(source,columns,"preconditionsVi"),cell(source,columns,"stepsVi"),cell(source,columns,"expectedVi"),
                    "", "", "", "",cell(source,columns,"sourceReference"),source,columns));
        }
        if (rows.isEmpty()) throw invalid("Tệp không có dòng test case.");
        return List.copyOf(rows);
    }

    // Only presentation cells that cannot change case identity/revision content may span blank columns.
    private static void validatePresentationMerges(Sheet sheet,List<String> headers,Map<String,Integer> columns,boolean featureOnly) {
        var caseColumns=java.util.stream.Stream.of("sourceId","titleVi","preconditionsVi","stepsVi","expectedVi","sourceReference")
                .map(columns::get).filter(Objects::nonNull).toList();
        for(var range:sheet.getMergedRegions()) {
            if(featureOnly&&columns.values().stream().noneMatch(c->c>=range.getFirstColumn()&&c<=range.getLastColumn()))continue;
            boolean safe=range.getFirstRow()>0 && range.getFirstRow()==range.getLastRow()
                    && range.getLastColumn()<headers.size()
                    && caseColumns.stream().noneMatch(c->c>=range.getFirstColumn() && c<=range.getLastColumn());
            if(safe) for(int c=range.getFirstColumn()+1;c<=range.getLastColumn();c++) {
                var row=sheet.getRow(range.getFirstRow());
                if(!headers.get(c).isBlank() || !value(row==null?null:row.getCell(c),range.getFirstRow()+1).isBlank()) { safe=false;break; }
            }
            if(!safe) throw invalid("Vùng ô gộp " + range.formatAsString()
                    + " chưa được hỗ trợ: chỉ nhận ô gộp ngang ở cột trình bày, sang cột không có tiêu đề và dữ liệu; không gộp ID hoặc nội dung test case.");
        }
    }

    static String value(Cell cell, int row) {
        if (cell == null) return "";
        String value = switch (cell.getCellType()) {
            case BLANK -> "";
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
            case BOOLEAN -> Boolean.toString(cell.getBooleanCellValue());
            default -> throw invalid("Dòng " + row + ": không hỗ trợ công thức hoặc ô lỗi.");
        };
        return value;
    }

    static void checkLink(Cell cell) {
        var link = cell.getHyperlink();
        if (link == null || link.getType() == HyperlinkType.DOCUMENT) return;
        try {
            String scheme = URI.create(link.getAddress()).getScheme();
            if (scheme != null && Set.of("https", "http", "mailto").contains(scheme.toLowerCase(Locale.ROOT))) return;
        } catch (IllegalArgumentException ignored) { /* Reject malformed links without including their payload. */ }
        throw invalid("Workbook chứa hyperlink không được hỗ trợ; chỉ nhận HTTP, HTTPS, mailto hoặc liên kết trong sheet.");
    }
    private static BusinessException invalid(String message) { return new BusinessException(422, "INVALID_WORKBOOK", message); }
}
