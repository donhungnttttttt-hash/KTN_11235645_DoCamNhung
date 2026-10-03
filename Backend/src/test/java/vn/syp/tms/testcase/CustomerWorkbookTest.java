package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import java.io.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class CustomerWorkbookTest {
    final TestCaseWorkbook parser = new TestCaseWorkbook();
    MockMultipartFile file(byte[] data) { return new MockMultipartFile("file", "仕様書_VI.xlsx", "application/octet-stream", data); }
    @Test void readsCustomerHeadersNumericIdAndMultilineContentWithoutRenamingSheet() throws Exception {
        var parsed = parser.parse(file(CustomerWorkbookFixture.bytes()));
        assertThat(parsed.fileName()).isEqualTo("仕様書_VI.xlsx");
        assertThat(parsed.rows()).hasSize(1);
        assertThat(parsed.rows().getFirst().caseNo()).isEqualTo("1");
        assertThat(parsed.rows().getFirst().titleVi()).isEqualTo("Đăng nhập");
        assertThat(parsed.rows().getFirst().stepsVi()).isEqualTo("Bước 1\n\nBước 2 原文");
        assertThat(parsed.rows().getFirst().expectedVi()).isEqualTo("Hiện trang chính");
    }
    @Test void identifiesMissingCustomerHeaderClearly() throws Exception {
        byte[] data;
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(CustomerWorkbookFixture.bytes())); var out = new ByteArrayOutputStream()) {
            book.getSheetAt(0).getRow(0).getCell(6).setCellValue("khác"); book.write(out); data = out.toByteArray();
        }
        assertThatThrownBy(() -> parser.parse(file(data))).hasMessageContaining("cột");
    }
    @Test void downloadableTemplateUsesCustomerHeadersAndCanBeReimported() throws Exception {
        var bytes=parser.customerTemplate();
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var header=book.getSheetAt(0).getRow(0);
            assertThat(header.getCell(2).getStringCellValue()).isEqualTo("Đối tượng test");
            assertThat(header.getCell(3).getStringCellValue()).isEqualTo("Điều kiện tiền đề");
        }
        assertThat(parser.parse(file(bytes)).rows().getFirst().titleVi()).isEqualTo("Đăng nhập");
    }
    @Test void rejectsDuplicateSourceIdsAndExcessiveColumns() throws Exception {
        assertThatThrownBy(() -> parser.parse(file(change(b -> {
            var row=b.getSheetAt(0).createRow(2); row.createCell(0).setCellValue("1");
        })))).hasMessageContaining("bị trùng");
        assertThatThrownBy(() -> parser.parse(file(change(b -> b.getSheetAt(0).getRow(1).createCell(64).setCellValue("lost data"))))).hasMessageContaining("64");
    }
    @Test void mapsAliasesAndReorderedColumnsAndKeepsUnknownSourceData() throws Exception {
        var parsed=parser.parse(file(CustomerWorkbookFixture.reorderedBytes()));
        var row=parsed.rows().getFirst();
        assertThat(row.caseNo()).isEqualTo("1");
        assertThat(row.titleVi()).isEqualTo("Đăng nhập");
        assertThat(row.preconditionsVi()).isEqualTo("Có tài khoản");
        assertThat(row.stepsVi()).isEqualTo("Bước 1\n\nBước 2 原文");
        assertThat(row.expectedVi()).isEqualTo("Hiện trang chính");
        assertThat(row.sourceReference()).isEqualTo("https://example.org/issues/1");
        assertThat(row.sourceCells()).contains("STT phụ", "Giữ cột riêng");
    }
    @Test void rejectsAmbiguousAliasesInsteadOfChoosingTheFirstColumn() throws Exception {
        assertThatThrownBy(() -> parser.parse(file(change(b -> b.getSheetAt(0).getRow(0).getCell(12).setCellValue("Điều kiện tiền đề")))))
                .hasMessageContaining("trùng").hasMessageContaining("Điều kiện");
    }
    @Test void inheritsOnlyBlankTitlesWithoutChangingSourceCells() throws Exception {
        var parsed=parser.parse(file(change(b->{
            var sheet=b.getSheetAt(0);var row=sheet.createRow(2);
            row.createCell(0).setCellValue(2);row.createCell(3).setCellValue("Bước kế tiếp");row.createCell(6).setCellValue("Kết quả kế tiếp");
        })));
        assertThat(parsed.rows().get(1).titleVi()).isEqualTo("Đăng nhập");
        assertThat(parsed.rows().get(1).sourceCells().get(1)).isEmpty();
        assertThat(parsed.rows().get(1).preconditionsVi()).isEmpty();
    }
    @Test void rejectsFormulaInUnmappedSourceColumns() throws Exception {
        assertThatThrownBy(() -> parser.parse(file(change(b -> b.getSheetAt(0).getRow(1).getCell(12).setCellFormula("1+1"))))).hasMessageContaining("công thức");
    }
    @Test void rejectsFileLinksForCustomerAndInternalSources() throws Exception {
        assertThatThrownBy(() -> parser.parse(file(change(b -> unsafeLink(b))))).hasMessageContaining("hyperlink");
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.template("AUTH")));var out=new ByteArrayOutputStream()) {
            unsafeLink(book);book.write(out);
            assertThatThrownBy(() -> parser.parse(file(out.toByteArray()))).hasMessageContaining("hyperlink");
        }
    }
    private void unsafeLink(XSSFWorkbook book) {
        var link=book.getCreationHelper().createHyperlink(org.apache.poi.common.usermodel.HyperlinkType.FILE);
        link.setAddress("file:///C:/private/data.txt");
        var cell=book.getSheetAt(0).getRow(1).getCell(10);cell.removeHyperlink();cell.setHyperlink(link);
    }
    private byte[] change(java.util.function.Consumer<XSSFWorkbook> edit) throws Exception {
        try(var b=new XSSFWorkbook(new ByteArrayInputStream(CustomerWorkbookFixture.bytes()));var out=new ByteArrayOutputStream()) {edit.accept(b);b.write(out);return out.toByteArray();}
    }
}
