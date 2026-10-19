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
    @Test void selfExportDoesNotAllowUnknownOrAdditionalMetadataColumns()throws Exception{
        for(boolean extra:java.util.List.of(false,true)){
            byte[] bytes=mutate(book->{var header=book.getSheetAt(0).getRow(0);header.createCell(11).setCellValue("Status");header.createCell(12).setCellValue("Người test đầu tiên");header.createCell(13).setCellValue(extra?"Người test lại gần nhất":"Unknown");if(extra)header.createCell(14).setCellValue("Unknown");});
            assertThatThrownBy(()->parser.parse(file(bytes))).isInstanceOf(BusinessException.class);
        }
    }
    @Test void selfExportMetadataIsIgnoredForCanonicalDataButNeverEvaluatesFormula()throws Exception{
        byte[] bytes=mutate(book->{var sheet=book.getSheetAt(0);var headers=java.util.List.of("Status","Người test đầu tiên","Người test lại gần nhất");for(int i=0;i<3;i++){sheet.getRow(0).createCell(11+i).setCellValue(headers.get(i));sheet.getRow(1).createCell(11+i).setCellValue("Imported metadata");}sheet.getRow(1).getCell(13).setCellFormula("1+1");});
        assertThatThrownBy(()->parser.parse(file(bytes))).isInstanceOf(BusinessException.class).hasMessageContaining("công thức");
    }
}
