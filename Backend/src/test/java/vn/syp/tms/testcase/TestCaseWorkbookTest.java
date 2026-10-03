package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import java.io.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import vn.syp.tms.shared.web.BusinessException;

class TestCaseWorkbookTest {
    final TestCaseWorkbook parser=new TestCaseWorkbook();
    MockMultipartFile file(byte[] bytes) { return new MockMultipartFile("file","source.xlsx","application/octet-stream",bytes); }
    byte[] mutate(java.util.function.Consumer<XSSFWorkbook> change) throws Exception {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(parser.template("AUTH")));var out=new ByteArrayOutputStream()) {
            change.accept(book); book.write(out); return out.toByteArray();
        }
    }
    @Test void rejectsFormulaInsteadOfEvaluatingIt() throws Exception {
        byte[] bytes=mutate(b->b.getSheetAt(0).getRow(1).getCell(2).setCellFormula("1+1"));
        assertThatThrownBy(()->parser.parse(file(bytes))).isInstanceOf(BusinessException.class).hasMessageContaining("công thức");
    }
    @Test void rejectsMergedCells() throws Exception {
        byte[] bytes=mutate(b->b.getSheetAt(0).addMergedRegion(new CellRangeAddress(1,1,2,3)));
        assertThatThrownBy(()->parser.parse(file(bytes))).isInstanceOf(BusinessException.class).hasMessageContaining("gộp ô");
    }
    @Test void rejectsWrongHeaderAndTooManyRows() throws Exception {
        byte[] badHeader=mutate(b->b.getSheetAt(0).getRow(0).getCell(0).setCellValue("unknown"));
        byte[] tooMany=mutate(b->b.getSheetAt(0).createRow(501).createCell(0).setCellValue("TOO-MANY"));
        assertThatThrownBy(()->parser.parse(file(badHeader))).isInstanceOf(BusinessException.class).hasMessageContaining("cột");
        assertThatThrownBy(()->parser.parse(file(tooMany))).isInstanceOf(BusinessException.class).hasMessageContaining("500");
    }
    @Test void rejectsRenamedTextOversizedAndUnsupportedFiles() {
        assertThatThrownBy(()->parser.parse(file("not a workbook".getBytes()))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->parser.parse(file(new byte[TestCaseWorkbook.MAX_BYTES+1]))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->parser.parse(new MockMultipartFile("file","source.xlsm","application/octet-stream",parser.template("AUTH")))).isInstanceOf(BusinessException.class);
    }
    @Test void preservesBlankLinesPunctuationAndJapaneseText() throws Exception {
        byte[] bytes=mutate(b->b.getSheetAt(0).getRow(1).getCell(4).setCellValue("Bước 1, dấu phẩy\n\nBước 2\tNhật: 原文"));
        var result=parser.parse(file(bytes));
        assertThat(result.rows().getFirst().stepsVi()).isEqualTo("Bước 1, dấu phẩy\n\nBước 2\tNhật: 原文");
        assertThat(result.checksum()).hasSize(64);
    }
}
