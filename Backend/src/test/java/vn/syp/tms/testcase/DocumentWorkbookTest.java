package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import java.io.*;
import java.util.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.CellType;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class DocumentWorkbookTest {
    @Test void reopensInlineStringUpdatesIncludingHeadersAndExecutionFields() throws Exception {
        byte[] original;
        try(var input=getClass().getResourceAsStream("/workbooks/arena-inline-strings.xlsx")){original=Objects.requireNonNull(input).readAllBytes();}
        byte[] untouched=original.clone();
        var parsed=new TestCaseWorkbook().parse(new MockMultipartFile("file","arena.xlsx","",original));
        List<String> headers;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(original))){headers=new ArrayList<>(CustomerWorkbook.headers(book.getSheetAt(0)));}
        headers.set(9,"Status");headers.set(10,"Version test");
        var cells=new ArrayList<>(parsed.rows().getFirst().sourceCells());
        cells.set(2,"=Edited literal title");cells.set(9,"NG");cells.set(10,"Arena version 1");cells.set(12,"Owned USER");
        byte[] exported=DocumentWorkbook.export(original,parsed.sheetName(),headers,List.of(new DocumentWorkbook.RowCells(2,cells)));
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(exported));var source=new XSSFWorkbook(new ByteArrayInputStream(original))) {
            var sheet=book.getSheetAt(0);var row=sheet.getRow(1);
            assertThat(sheet.getRow(0).getCell(9).getStringCellValue()).isEqualTo("Status");
            assertThat(sheet.getRow(0).getCell(10).getStringCellValue()).isEqualTo("Version test");
            assertThat(row.getCell(2).getStringCellValue()).isEqualTo("=Edited literal title");
            assertThat(row.getCell(2).getCellType()).isEqualTo(CellType.STRING);
            assertThat(row.getCell(9).getStringCellValue()).isEqualTo("NG");
            assertThat(row.getCell(10).getStringCellValue()).isEqualTo("Arena version 1");
            assertThat(row.getCell(12).getStringCellValue()).isEqualTo("Owned USER");
            assertThat(row.getCell(15).getStringCellValue()).isEqualTo(source.getSheetAt(0).getRow(1).getCell(15).getStringCellValue());
            assertThat(row.getHeight()).isEqualTo(source.getSheetAt(0).getRow(1).getHeight());
            assertThat(row.getCell(2).getCellStyle().getIndex()).isEqualTo(source.getSheetAt(0).getRow(1).getCell(2).getCellStyle().getIndex());
            assertThat(sheet.getLastRowNum()).isEqualTo(24);
        }
        assertThat(original).isEqualTo(untouched);
    }
    @Test void updatesReorderedFieldsAndPreservesSupplementalColumns() throws Exception {
        var bytes=CustomerWorkbookFixture.reorderedBytes();
        var parsed=new TestCaseWorkbook().parse(new MockMultipartFile("file","reordered.xlsx","",bytes));
        var input=parsed.rows().getFirst();
        var cells=CustomerWorkbook.currentCells(input,input.sourceColumns(),Map.of("stepsVi","Bước sửa","expectedVi","Kết quả sửa","sourceReference","Link sửa"));
        var out=DocumentWorkbook.export(bytes,parsed.sheetName(),List.of(),List.of(new DocumentWorkbook.RowCells(2,cells)));
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(out))) {
            var row=book.getSheetAt(0).getRow(1);
            assertThat(row.getCell(7).getStringCellValue()).isEqualTo("Bước sửa");
            assertThat(row.getCell(4).getStringCellValue()).isEqualTo("Kết quả sửa");
            assertThat(row.getCell(11).getStringCellValue()).isEqualTo("Link sửa");
            assertThat(row.getCell(11).getHyperlink()).isNull();
            assertThat(row.getCell(1).getStringCellValue()).isEqualTo("STT phụ");
            assertThat(row.getCell(15).getStringCellValue()).isEqualTo("Giữ cột riêng");
        }
    }
    @Test void doesNotFillSourceTitleWhenOnlyTheImportedTitleWasInherited() throws Exception {
        var input=new TestCaseDtos.ImportRowInput(2,"2","","Tên kế thừa","","Bước","Kết quả","","","","","",List.of("2","","Bước","Kết quả"),Map.of("sourceId",0,"titleVi",1,"stepsVi",2,"expectedVi",3));
        assertThat(CustomerWorkbook.currentCells(input,input.sourceColumns(),Map.of("titleVi","Tên kế thừa"))).containsExactly("2","","Bước","Kết quả");
        assertThat(CustomerWorkbook.currentCells(input,input.sourceColumns(),Map.of("titleVi","Tên đã sửa"))).containsExactly("2","Tên đã sửa","Bước","Kết quả");
    }
    @Test void preservesAbsentSourceCellsInsteadOfCreatingEmptyTextCells() throws Exception {
        byte[] original;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(CustomerWorkbookFixture.bytes()));var out=new ByteArrayOutputStream()) {
            var row=book.getSheetAt(0).getRow(1);
            row.removeCell(row.getCell(12));
            book.write(out);original=out.toByteArray();
        }
        var parsed=new TestCaseWorkbook().parse(new MockMultipartFile("file","source.xlsx","",original));
        byte[] out=DocumentWorkbook.export(original,parsed.sheetName(),CustomerWorkbook.HEADERS,
                List.of(new DocumentWorkbook.RowCells(2,parsed.rows().getFirst().sourceCells())));
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(out))) {
            assertThat(book.getSheetAt(0).getRow(1).getCell(12)).isNull();
        }
    }
    @Test void exportsEditedContentWithoutLosingNumericIdStylesLinksOrExtraSourceColumns() throws Exception {
        byte[] original = CustomerWorkbookFixture.bytes();
        var parsed = new TestCaseWorkbook().parse(new MockMultipartFile("file", "source.xlsx", "", original));
        var cells = new ArrayList<>(parsed.rows().getFirst().sourceCells());
        cells.set(3, "=Nội dung mới\nDòng 2");
        byte[] exported = DocumentWorkbook.export(original, parsed.sheetName(), CustomerWorkbook.HEADERS,
                List.of(new DocumentWorkbook.RowCells(2, cells)));
        try (var book = new XSSFWorkbook(new ByteArrayInputStream(exported))) {
            var sheet = book.getSheet("タブレット"); var row = sheet.getRow(1);
            assertThat(row.getCell(0).getCellType()).isEqualTo(CellType.NUMERIC);
            assertThat(row.getCell(3).getCellType()).isEqualTo(CellType.STRING);
            assertThat(row.getCell(3).getStringCellValue()).isEqualTo("=Nội dung mới\nDòng 2");
            assertThat(row.getCell(3).getCellStyle().getWrapText()).isTrue();
            assertThat(row.getHeightInPoints()).isEqualTo(105f);
            assertThat(sheet.getColumnWidth(3)).isEqualTo(39*256);
            assertThat(row.getCell(10).getHyperlink().getAddress()).isEqualTo("https://example.org/issues/1");
            assertThat(row.getCell(12).getStringCellValue()).isEqualTo("NG");
            assertThat(row.getCell(13).getStringCellValue()).isEqualTo("Người kiểm tra khác");
            assertThat(sheet.getRow(0).getCell(12).getStringCellValue()).isEmpty();
        }
    }
    @Test void reconstructsLegacyInternalDocumentAndNeverTurnsTextIntoFormula() throws Exception {
        var cells = List.of("TC-1", "AUTH", "=literal", "", "Bước 1\nBước 2", "Kết quả", "原文", "", "", "", "");
        byte[] exported = DocumentWorkbook.export(null, "TestCases", TestCaseWorkbook.HEADERS,
                List.of(new DocumentWorkbook.RowCells(2, cells)));
        var parsed = new TestCaseWorkbook().parse(new MockMultipartFile("file", "legacy.xlsx", "", exported));
        assertThat(parsed.rows().getFirst().titleVi()).isEqualTo("=literal");
        assertThat(parsed.rows().getFirst().stepsVi()).contains("\n");
    }
    @Test void removesStaleHyperlinkWhenMappedValueChanges() throws Exception {
        var cells = new ArrayList<>(new TestCaseWorkbook().parse(new MockMultipartFile("file", "a.xlsx", "", CustomerWorkbookFixture.bytes())).rows().getFirst().sourceCells());
        cells.set(10, "Tham chiếu khác");
        byte[] out = DocumentWorkbook.export(CustomerWorkbookFixture.bytes(), "タブレット", CustomerWorkbook.HEADERS, List.of(new DocumentWorkbook.RowCells(2, cells)));
        try(var book = new XSSFWorkbook(new ByteArrayInputStream(out))) {
            assertThat(book.getSheetAt(0).getRow(1).getCell(10).getHyperlink()).isNull();
        }
    }
}
