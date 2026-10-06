package vn.syp.tms.testcase;

import static org.junit.jupiter.api.Assertions.*;
import java.io.*;
import java.util.*;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class FileWorkWorkbookTest {
    @Test void preservesSourceStyleUnicodeAndSupplementalColumnsWithPinnedContentAndSafeMetadata() throws Exception {
        byte[] source=CustomerWorkbookFixture.reorderedBytes();byte[] originalCopy=source.clone();
        var parsed=new TestCaseWorkbook().parse(new MockMultipartFile("file","a.xlsx","",source));var input=parsed.rows().getFirst();
        var layout=FileWorkWorkbook.layout(source,parsed.sheetName(),parsed.format());
        var cells=FileWorkWorkbook.pinnedCells(input,layout,Map.of("titleVi",input.titleVi(),"stepsVi","=Bước pin 日本語","expectedVi","Kết quả mới"),"NG","Đỗ Cẩm Nhung");
        byte[] export=FileWorkWorkbook.export(source,parsed.sheetName(),layout.headers(),List.of(new FileWorkWorkbook.RowCells(2,cells)),Map.of("sourceMode","EXECUTION","asOf","=literal"),List.of(Map.of("rowNumber",2,"scope","IN_SCOPE","resultCode","NG","provenance","FILE_SESSION","physicalAsset","IPAD-80")));
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(export));var original=new XSSFWorkbook(new ByteArrayInputStream(source))){var row=book.getSheetAt(0).getRow(1);var old=original.getSheetAt(0).getRow(1);
            assertEquals("=Bước pin 日本語",row.getCell(7).getStringCellValue());assertEquals(CellType.STRING,row.getCell(7).getCellType());
            assertEquals("Giữ cột riêng",row.getCell(15).getStringCellValue());assertEquals(old.getCell(7).getCellStyle().getIndex(),row.getCell(7).getCellStyle().getIndex());
            assertEquals(original.getSheetAt(0).getColumnWidth(7),book.getSheetAt(0).getColumnWidth(7));assertEquals(old.getHeightInPoints(),row.getHeightInPoints());
            var metadata=book.getSheet("TMS Execution");for(var entry:metadata)for(var cell:entry)assertEquals(CellType.STRING,cell.getCellType());
        }
        assertArrayEquals(originalCopy,source);
    }
    @Test void inheritedRawBlankTitleIsPreservedUntilPinnedRevisionActuallyChanges() {
        var input=new TestCaseDtos.ImportRowInput(2,"1","","Inherited title","","Steps","Expected","","","","","",List.of("1","","Steps","Expected"),Map.of("sourceId",0,"titleVi",1,"stepsVi",2,"expectedVi",3));
        var layout=new FileWorkWorkbook.Layout(List.of("ID","Đối tượng test","Các bước test","Kết quả mong đợi"),input.sourceColumns(),true);
        assertEquals("",FileWorkWorkbook.pinnedCells(input,layout,Map.of("titleVi","Inherited title"),"OK","Nhung").get(1));
        assertEquals("Pinned changed title",FileWorkWorkbook.pinnedCells(input,layout,Map.of("titleVi","Pinned changed title"),"OK","Nhung").get(1));
    }
    @Test void formulasAndUnsafeLinksAreRemovedAcrossAllSheetsWithoutEvaluatingThem() throws Exception {
        byte[] source;
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){var sheet=book.createSheet("Source");sheet.createRow(0).createCell(0).setCellValue("ID");sheet.createRow(1).createCell(0).setCellValue("1");
            var other=book.createSheet("Other").createRow(0);other.createCell(0).setCellFormula("1+1");var link=book.getCreationHelper().createHyperlink(HyperlinkType.URL);link.setAddress("file:///C:/private");other.createCell(1).setCellValue("link");other.getCell(1).setHyperlink(link);book.write(out);source=out.toByteArray();}
        byte[] exported=FileWorkWorkbook.export(source,"Source",List.of("ID"),List.of(new FileWorkWorkbook.RowCells(2,List.of("=literal"))),Map.of("asOf","2026-10-05T18:00:00Z"),List.of());
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(exported))){assertEquals(CellType.STRING,book.getSheet("Source").getRow(1).getCell(0).getCellType());assertEquals("=literal",book.getSheet("Source").getRow(1).getCell(0).getStringCellValue());assertEquals(CellType.STRING,book.getSheet("Other").getRow(0).getCell(0).getCellType());assertEquals("=1+1",book.getSheet("Other").getRow(0).getCell(0).getStringCellValue());assertNull(book.getSheet("Other").getRow(0).getCell(1).getHyperlink());}
    }
}
