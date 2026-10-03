package vn.syp.tms.testcase;

import java.io.*;
import java.util.List;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

final class DocumentWorkbook {
    private DocumentWorkbook() {}
    record RowCells(int rowNumber, List<String> cells) {}

    static byte[] export(byte[] source, String sheetName, List<String> headers, List<RowCells> rows) {
        try (var book = source == null ? new XSSFWorkbook() : new XSSFWorkbook(new ByteArrayInputStream(source));
             var out = new ByteArrayOutputStream()) {
            Sheet sheet;
            if (source == null) {
                sheet = book.createSheet(sheetName);
                var header = sheet.createRow(0);
                var heading = book.createCellStyle(); var font = book.createFont(); font.setBold(true); heading.setFont(font);
                var body = book.createCellStyle(); body.setWrapText(true); body.setVerticalAlignment(VerticalAlignment.TOP);
                for (int c = 0; c < headers.size(); c++) {
                    header.createCell(c).setCellValue(headers.get(c)); header.getCell(c).setCellStyle(heading);
                    sheet.setColumnWidth(c, (c < 2 ? 20 : 38)*256); sheet.setDefaultColumnStyle(c, body);
                }
                sheet.createFreezePane(2, 1);
            } else {
                sheet = book.getSheet(sheetName);
                if (sheet == null) throw new IllegalStateException("Stored document sheet is missing");
            }
            for (var data : rows) {
                var row = sheet.getRow(data.rowNumber()-1);
                if (row == null) row = sheet.createRow(data.rowNumber()-1);
                for (int c = 0; c < data.cells().size(); c++) {
                    var cell = row.getCell(c); String value = data.cells().get(c);
                    if (source != null && cell == null && value.isEmpty()) continue;
                    if (cell != null && CustomerWorkbook.value(cell, data.rowNumber()).equals(value)) continue;
                    if (cell == null) cell = row.createCell(c);
                    cell.removeHyperlink();
                    cell.setCellValue(value); // A leading '=' remains a string, never a formula.
                }
            }
            book.write(out); return out.toByteArray();
        } catch (IOException e) { throw new IllegalStateException("Cannot export test document", e); }
    }
}
