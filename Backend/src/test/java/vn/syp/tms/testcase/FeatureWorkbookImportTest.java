package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import java.io.ByteArrayInputStream;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class FeatureWorkbookImportTest {
    private final TestCaseWorkbook parser = new TestCaseWorkbook();

    @Test void ignoresFormattedAndExcludedRowsBeyondFiveHundredAndKeepsSourceCoordinates() throws Exception {
        byte[] bytes;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.customerTemplate()));var out=new java.io.ByteArrayOutputStream()){
            var sheet=book.getSheetAt(0);sheet.createRow(642).createCell(0).setCellStyle(book.createCellStyle());
            sheet.createRow(900).createCell(12).setCellValue("Ignored execution data");
            var second=sheet.createRow(1000);second.createCell(0).setCellValue("2");second.createCell(2).setCellValue("Second case");
            book.write(out);bytes=out.toByteArray();
        }
        var parsed=parser.parseFeature(file(bytes));assertThat(parsed.rows()).hasSize(2);
        assertThat(parsed.rows().get(1).rowNumber()).isEqualTo(1001);
        assertThat(parsed.sourceBytes()).isEqualTo(bytes);
    }

    @Test void acceptsFiveHundredRealCasesButRejectsTheFiveHundredAndFirst() throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.customerTemplate()));var out=new java.io.ByteArrayOutputStream()){
            var sheet=book.getSheetAt(0);
            for(int i=2;i<=500;i++)sheet.createRow(i).createCell(0).setCellValue(String.valueOf(i));
            sheet.createRow(800).createCell(0).setCellStyle(book.createCellStyle());book.write(out);
            assertThat(parser.parseFeature(file(out.toByteArray())).rows()).hasSize(500);
            sheet.getRow(800).getCell(0).setCellValue("501");out.reset();book.write(out);
            assertThatThrownBy(()->parser.parseFeature(file(out.toByteArray()))).hasMessageContaining("500");
        }
    }

    @Test void preservesLongUnicodeContentAndMoreThanFiveHundredLineBreaksInOneCell() throws Exception {
        String content="日本語\n".repeat(7000);
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.customerTemplate()));var out=new java.io.ByteArrayOutputStream()){
            for(int c=2;c<=8;c++)book.getSheetAt(0).getRow(1).getCell(c).setCellValue(content);
            book.write(out);var parsed=parser.parseFeature(file(out.toByteArray()));assertThat(parsed.rows()).hasSize(1);
            for(int c=2;c<=8;c++)assertThat(parsed.rows().getFirst().sourceCells().get(c)).isEqualTo(content);
        }
    }

    @Test void ignoresDuplicateExecutionHeadersFormulasAndRowsOutsideTheNineFields() throws Exception {
        byte[] bytes;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.customerTemplate()));var out=new java.io.ByteArrayOutputStream()){
            var sheet=book.getSheetAt(0);sheet.getRow(0).createCell(9).setCellValue("iPad*");sheet.getRow(0).createCell(10).setCellValue("Status");
            sheet.getRow(1).createCell(9).setCellFormula("1+1");sheet.getRow(1).createCell(10).setCellValue("NG");
            sheet.createRow(2).createCell(9).setCellFormula("2+2");
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3,4,9,10));
            book.write(out);bytes=out.toByteArray();
        }
        var parsed=parser.parseFeature(file(bytes));assertThat(parsed.rows()).hasSize(1);
        assertThat(parsed.rows().getFirst().sourceColumns()).hasSize(9).doesNotContainKeys("result","tester","sourceReference");
        assertThat(parsed.rows().getFirst().sourceCells().subList(9,14)).containsOnly("");
        assertThat(parsed.sourceBytes()).isEqualTo(bytes);
        assertThatThrownBy(()->parser.parse(file(bytes))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
    }

    @Test void stillRejectsDuplicateSelectedHeadersAndFormulasInSelectedCells() throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.customerTemplate()));var out=new java.io.ByteArrayOutputStream()){
            book.getSheetAt(0).getRow(1).getCell(4).setCellFormula("1+1");book.write(out);
            assertThatThrownBy(()->parser.parseFeature(file(out.toByteArray()))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
        }
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.customerTemplate()));var out=new java.io.ByteArrayOutputStream()){
            book.getSheetAt(0).getRow(0).createCell(9).setCellValue("Các bước test");book.write(out);
            assertThatThrownBy(()->parser.parseFeature(file(out.toByteArray()))).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class).hasMessageContaining("trùng nghĩa");
        }
    }

    @Test void importsOnlyNineFieldsWithoutReindexingCellsOrChangingOriginalDownload() throws Exception {
        byte[] bytes = CustomerWorkbookFixture.reorderedBytes();
        var parsed = parser.parseFeature(file(bytes));
        var row = parsed.rows().getFirst();
        assertThat(row.sourceColumns()).containsOnlyKeys("sourceId", "sourceNo", "titleVi", "preconditionsVi",
                "stepsVi", "viewpoint", "confirmation", "expectedVi", "designNote");
        assertThat(row.sourceColumns()).containsEntry("sourceNo", 1).containsEntry("stepsVi", 7).containsEntry("expectedVi", 4);
        assertThat(row.sourceCells()).hasSize(16).contains("STT phụ", "Bước 1\n\nBước 2 原文", "Ghi chú mẫu");
        for (int index : new int[]{9, 10, 11, 12, 13, 14, 15}) assertThat(row.sourceCells().get(index)).isEmpty();
        assertThat(row.sourceReference()).isEmpty();
        assertThat(row.stepsVi()).isEqualTo("Bước 1\n\nBước 2 原文");
        assertThat(row.expectedVi()).isEqualTo("Hiện trang chính");
        assertThat(parsed.sourceBytes()).isEqualTo(bytes);
        // Historical document readers still understand their original, full source format.
        assertThat(parser.parse(file(bytes)).rows().getFirst().sourceCells()).contains("Giữ cột riêng");
    }

    @Test void internalInputDoesNotImportTranslationsOrExternalReferencesIntoFeatureCases() {
        var row = parser.parseFeature(file(parser.template("AUTH"))).rows().getFirst();
        assertThat(row.titleVi()).isEqualTo("Kiểm tra đăng nhập hợp lệ");
        assertThat(row.titleJp()).isEmpty();
        assertThat(row.stepsJp()).isEmpty();
        assertThat(row.sourceReference()).isEmpty();
    }

    @Test void downloadableFeatureTemplateContainsExactlyTheNineApprovedColumns() throws Exception {
        var bytes = parser.customerTemplate();
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var header = book.getSheetAt(0).getRow(0);
            assertThat(header.getLastCellNum()).isEqualTo((short) 9);
            String[] labels = {"ID", "No", "Đối tượng test", "Điều kiện tiên quyết", "Các bước test",
                    "Quan điểm test", "Hạng mục xác nhận", "Kết quả mong đợi", "Ghi chú thiết kế"};
            for (int i = 0; i < labels.length; i++) assertThat(header.getCell(i).getStringCellValue()).isEqualTo(labels[i]);
        }
        assertThat(parser.parseFeature(file(bytes)).rows()).hasSize(1);
    }

    private MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("file", "Cases.xlsx", "application/octet-stream", bytes);
    }
}
