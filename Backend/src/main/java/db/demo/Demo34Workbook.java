package db.demo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Frozen V34 fixture format; do not couple an applied migration to mutable application services. */
final class Demo34Workbook {
    private Demo34Workbook() {}
    private static final List<String> HEADERS = List.of("caseNo", "suiteCode", "titleVi", "preconditionsVi",
        "stepsVi", "expectedVi", "titleJp", "preconditionsJp", "stepsJp", "expectedJp", "sourceReference");
    private static final List<String> CHECKS = List.of("Luồng hợp lệ", "Thiếu dữ liệu bắt buộc", "Dữ liệu không hợp lệ",
        "Kiểm tra quyền", "Tìm kiếm", "Bộ lọc", "Phân trang", "Lưu và tải lại", "Hủy thao tác", "Hiển thị trên màn hình nhỏ");
    record Document(byte[] bytes, List<Map<String, Object>> rows) {}

    static Document create(String prefix, String suite, String feature, boolean layout) throws IOException {
        var rows = new ArrayList<Map<String, Object>>();
        try (var book = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            var sheet = book.createSheet("TestCases");
            var heading = book.createCellStyle();
            var font = book.createFont(); font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex());
            heading.setFont(font); heading.setFillForegroundColor(IndexedColors.TEAL.getIndex());
            heading.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            var body = book.createCellStyle(); body.setWrapText(true); body.setVerticalAlignment(VerticalAlignment.TOP);
            body.setDataFormat(book.createDataFormat().getFormat("@")); body.setBorderBottom(BorderStyle.HAIR);
            var header = sheet.createRow(0);
            for (int col = 0; col < HEADERS.size(); col++) {
                var cell = header.createCell(col); cell.setCellValue(HEADERS.get(col)); cell.setCellStyle(heading);
                sheet.setColumnWidth(col, (col < 2 ? 22 : 42) * 256);
            }
            for (int index = 0; index < 10; index++) {
                String check = CHECKS.get(index);
                String[] values = {prefix + "-" + String.format(java.util.Locale.ROOT, "%02d", index + 1), suite,
                    feature + " — " + (layout ? "UI: " : "") + check,
                    "Dữ liệu DEMO34. Đăng nhập bằng tài khoản được phân công vào dự án mẫu.",
                    "1. Mở chức năng " + feature + ".\n2. Thực hiện tình huống: " + check + ".\n3. Kiểm tra phản hồi và tải lại màn hình.",
                    layout ? "Nội dung rõ ràng, không chồng lấn; nút thao tác và thông báo dễ nhận diện."
                        : "Hệ thống phản hồi đúng quyền và dữ liệu; thay đổi hợp lệ được lưu, dữ liệu không hợp lệ có thông báo.",
                    "", "", "", "", "DEMO34 tổng hợp — dữ liệu giả lập, không phải đặc tả khách hàng"};
                var record = new LinkedHashMap<String, Object>(); record.put("rowNumber", index + 2);
                var row = sheet.createRow(index + 1); row.setHeightInPoints(72);
                for (int col = 0; col < values.length; col++) {
                    var cell = row.createCell(col); cell.setCellValue(values[col]); cell.setCellStyle(body);
                    record.put(HEADERS.get(col), values[col]);
                }
                rows.add(record);
            }
            sheet.createFreezePane(2, 1); book.write(out);
            return new Document(out.toByteArray(), List.copyOf(rows));
        }
    }
}
