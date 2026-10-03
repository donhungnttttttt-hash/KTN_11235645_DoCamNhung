package vn.syp.tms.testcase;

import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.ZipInputStream;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.shared.web.BusinessException;

@Component
public class TestCaseWorkbook {
    public static final int MAX_ROWS = 500;
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    public static final List<String> HEADERS = List.of("caseNo", "suiteCode", "titleVi", "preconditionsVi", "stepsVi", "expectedVi", "titleJp", "preconditionsJp", "stepsJp", "expectedJp", "sourceReference");
    public static final String INTERNAL = "INTERNAL_V1";
    public static final String CUSTOMER = "CUSTOMER_V1";
    public record Parsed(String fileName, String checksum, List<TestCaseDtos.ImportRowInput> rows,
            String format, String sheetName, byte[] sourceBytes) {}

    public Parsed parse(MultipartFile file) {
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        if (!name.toLowerCase(Locale.ROOT).endsWith(".xlsx") || name.length() > 255 || name.chars().anyMatch(Character::isISOControl) || file.isEmpty() || file.getSize() > MAX_BYTES)
            throw invalid("Chọn tệp .xlsx không quá 5 MiB.");
        try {
            byte[] bytes = file.getBytes();
            inspectZip(bytes);
            try (XSSFWorkbook book = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
                if (book.isMacroEnabled() || !book.getExternalLinksTables().isEmpty()) throw invalid("Không hỗ trợ macro hoặc liên kết ngoài.");
                if (book.getNumberOfSheets() != 1) throw invalid("Chọn workbook có một sheet dữ liệu theo mẫu đã hỗ trợ.");
                Sheet sheet = book.getSheetAt(0);
                for (Row row : sheet) for (Cell cell : row) CustomerWorkbook.checkLink(cell);
                if (sheet.getLastRowNum() > MAX_ROWS) throw invalid("Tệp vượt quá 500 dòng dữ liệu.");
                Row header = sheet.getRow(0);
                if (!"TestCases".equals(sheet.getSheetName()) || header == null ||
                        header.getCell(0) == null || !"caseNo".equals(text(header.getCell(0), 1))) {
                    var rows = CustomerWorkbook.read(sheet);
                    return new Parsed(name, sha256(bytes), rows, CUSTOMER, sheet.getSheetName(), bytes);
                }
                if (sheet.getNumMergedRegions() != 0) throw invalid("Mẫu TestCases nội bộ không hỗ trợ gộp ô: " + sheet.getMergedRegion(0).formatAsString() + ".");
                if (header == null || header.getLastCellNum() != HEADERS.size()) throw invalid("Thiếu hoặc thừa cột trong file mẫu.");
                for (int col=0; col<HEADERS.size(); col++) {
                    if (!HEADERS.get(col).equals(text(header.getCell(col),1))) throw invalid("Tên hoặc thứ tự cột không khớp file mẫu.");
                }
                List<TestCaseDtos.ImportRowInput> rows = new ArrayList<>();
                for (int i=1; i<=sheet.getLastRowNum(); i++) {
                    Row row=sheet.getRow(i);
                    if (row==null) continue;
                    if (row.getLastCellNum()>HEADERS.size()) throw invalid("Dòng " + (i+1) + " có cột ngoài mẫu.");
                    String[] v=new String[HEADERS.size()];
                    for (int c=0;c<v.length;c++) v[c]=text(row.getCell(c),i+1);
                    if (Arrays.stream(v).allMatch(value -> value.isBlank())) continue;
                    rows.add(new TestCaseDtos.ImportRowInput(i+1,v[0].trim(),v[1].trim(),v[2],v[3],v[4],v[5],v[6],v[7],v[8],v[9],v[10]));
                }
                if (rows.isEmpty()) throw invalid("Tệp không có dòng test case.");
                return new Parsed(name, sha256(bytes), rows, INTERNAL, sheet.getSheetName(), bytes);
            }
        } catch (BusinessException e) { throw e; }
        catch (Exception e) { throw invalid("Không đọc được tệp Excel. Hãy dùng file mẫu .xlsx không mã hóa."); }
    }

    // Bound expanded ZIP size before constructing the workbook's object model.
    private void inspectZip(byte[] bytes) throws IOException {
        long total=0; int entries=0; Set<String> names=new HashSet<>();
        try (ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {
            java.util.zip.ZipEntry entry; byte[] buffer=new byte[8192];
            while ((entry=zip.getNextEntry())!=null) {
                if (++entries>200 || !names.add(entry.getName()) || entry.getName().toLowerCase(Locale.ROOT).contains("vbaproject"))
                    throw invalid("Cấu trúc workbook không được hỗ trợ.");
                int count;
                while ((count=zip.read(buffer))!=-1) {
                    total+=count;
                    if (total>20*1024*1024) throw invalid("Nội dung workbook sau giải nén quá lớn.");
                }
            }
        }
        if (entries==0) throw invalid("Tệp không phải workbook .xlsx.");
    }

    private String text(Cell cell,int row) {
        if (cell==null || cell.getCellType()==CellType.BLANK) return "";
        if (cell.getCellType()!=CellType.STRING) throw invalid("Dòng " + row + ": dùng ô văn bản, không dùng số hoặc công thức.");
        String value=cell.getStringCellValue();
        if (value.length()>8000) throw invalid("Dòng " + row + ": mỗi ô tối đa 8.000 ký tự.");
        return value;
    }

    public byte[] template(String suiteCode) {
        try (XSSFWorkbook book=new XSSFWorkbook(); ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            Sheet sheet=book.createSheet("TestCases");
            Row header=sheet.createRow(0);
            CellStyle heading=book.createCellStyle();
            Font font=book.createFont(); font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex()); heading.setFont(font);
            heading.setFillForegroundColor(IndexedColors.TEAL.getIndex()); heading.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            CellStyle body=book.createCellStyle(); body.setWrapText(true); body.setVerticalAlignment(VerticalAlignment.TOP);
            body.setDataFormat(book.createDataFormat().getFormat("@"));
            for (int i=0;i<HEADERS.size();i++) { Cell cell=header.createCell(i); cell.setCellValue(HEADERS.get(i)); cell.setCellStyle(heading); sheet.setColumnWidth(i,(i<2?20:38)*256); sheet.setDefaultColumnStyle(i,body); }
            Row example=sheet.createRow(1); example.setHeightInPoints(60);
            String[] values={"TC-DEMO-001",suiteCode,"Kiểm tra đăng nhập hợp lệ","Có tài khoản nội bộ","1. Mở trang đăng nhập\n2. Nhập tài khoản hợp lệ","Hiển thị trang tổng quan","ログイン確認","","1. ログインする","ホームを表示","Mẫu nội bộ — thay bằng nguồn thực tế"};
            for (int i=0;i<values.length;i++) { Cell cell=example.createCell(i); cell.setCellValue(values[i]); cell.setCellStyle(body); }
            sheet.createFreezePane(2,1); book.write(out); return out.toByteArray();
        } catch (IOException e) { throw new IllegalStateException("Cannot generate workbook",e); }
    }

    public byte[] customerTemplate() {
        var headers=List.of("ID","No","Đối tượng test","Điều kiện tiền đề","Các bước test","Quan điểm test",
                "Mục xác nhận","Kết quả mong đợi","Ghi chú thiết kế","iPad*","Ghi chú thực thi&","ID redmine","Người test");
        var example=List.of("1","1","Đăng nhập","Có tài khoản nội bộ","1. Mở ứng dụng\n2. Đăng nhập bằng tài khoản hợp lệ",
                "Chức năng","Mở màn tổng quan","Hiển thị màn tổng quan","","","","","");
        return DocumentWorkbook.export(null,"タブレット",headers,List.of(new DocumentWorkbook.RowCells(2,example)));
    }

    public static String sha256(byte[] value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value)); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private BusinessException invalid(String message) { return new BusinessException(422,"INVALID_WORKBOOK",message); }
}
