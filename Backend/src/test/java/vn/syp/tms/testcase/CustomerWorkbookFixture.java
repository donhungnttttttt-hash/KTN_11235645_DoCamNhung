package vn.syp.tms.testcase;

import java.io.ByteArrayOutputStream;
import java.util.List;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

public final class CustomerWorkbookFixture {
    private CustomerWorkbookFixture() {}
    public static byte[] reorderedBytes() throws Exception {
        try(var book=new XSSFWorkbook(new java.io.ByteArrayInputStream(bytes()));var out=new ByteArrayOutputStream()) {
            var sheet=book.getSheetAt(0);
            sheet.shiftColumns(1,13,1); // Extra No column in the customer's second workbook.
            sheet.getRow(0).createCell(1).setCellValue("No");
            sheet.getRow(1).createCell(1).setCellValue("STT phụ");
            sheet.getRow(0).getCell(3).setCellValue(" Điều kiện\nTIỀN ĐỀ ");
            sheet.getRow(0).getCell(6).setCellValue("Mục xác nhận");
            sheet.getRow(0).getCell(12).setCellValue("Người test ");
            sheet.getRow(0).createCell(15).setCellValue("Cột riêng");
            sheet.getRow(1).createCell(15).setCellValue("Giữ cột riêng");
            // Move expected result ahead of steps, beyond simply inserting No.
            for(int r=0;r<2;r++) {
                var row=sheet.getRow(r);String a=row.getCell(4).getStringCellValue();
                row.getCell(4).setCellValue(row.getCell(7).getStringCellValue());row.getCell(7).setCellValue(a);
            }
            book.write(out);return out.toByteArray();
        }
    }
    public static final List<String> HEADERS = List.of("ID", "Đối tượng test", "Điều kiện tiên quyết", "Các bước test", "Quan điểm test", "Hạng mục xác nhận", "Kết quả mong đợi", "Ghi chú thiết kế", "iPad*", "Ghi chú thực thi&", "ID redmine", "Người test", "", "");
    public static byte[] bytes() throws Exception {
        try (var book = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            var sheet = book.createSheet("タブレット");
            var header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.size(); i++) header.createCell(i).setCellValue(HEADERS.get(i));
            var row = sheet.createRow(1);
            String[] values = {"1", "Đăng nhập", "Có tài khoản", "Bước 1\n\nBước 2 原文", "Chức năng", "Mở trang chính", "Hiện trang chính", "Ghi chú mẫu", "Fixed", "Build mẫu", "https://example.org/issues/1", "Tester nguồn", "NG", "Người kiểm tra khác"};
            for (int i = 0; i < values.length; i++) row.createCell(i).setCellValue(values[i]);
            row.getCell(0).setCellValue(1);
            var style = book.createCellStyle(); style.setWrapText(true); style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex()); style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            row.getCell(3).setCellStyle(style); row.setHeightInPoints(105); sheet.setColumnWidth(3, 39*256);
            var link = book.getCreationHelper().createHyperlink(HyperlinkType.URL); link.setAddress("https://example.org/issues/1"); row.getCell(10).setHyperlink(link);
            sheet.createFreezePane(0, 1); book.write(out); return out.toByteArray();
        }
    }
}
