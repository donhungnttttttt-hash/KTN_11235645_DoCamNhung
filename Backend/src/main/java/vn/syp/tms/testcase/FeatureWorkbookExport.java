package vn.syp.tms.testcase;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** The current Feature table, independent of the original workbook's execution columns. */
final class FeatureWorkbookExport {
    static final List<String> HEADERS=List.of("ID","No","Đối tượng test","Điều kiện tiên quyết","Các bước test","Quan điểm test","Hạng mục xác nhận","Kết quả mong đợi","Ghi chú thiết kế","MT & Ver","Status","Ticket","Người test");
    private static final List<String> FIELDS=List.of("sourceId","sourceNo","titleVi","preconditionsVi","stepsVi","viewpoint","confirmation","expectedVi","designNote");
    private static final int[] WIDTHS={10,10,28,45,55,30,35,45,28,25,16,40,25};
    private FeatureWorkbookExport() {}

    static List<String> content(TestDocumentDtos.Detail detail,TestDocumentDtos.Row row){
        var cells=new ArrayList<String>();
        for(String key:FIELDS){
            if("sourceId".equals(key)){cells.add(row.sourceId());continue;}
            Integer mapped=detail.columns().get(key);int index=mapped==null?detail.headers().indexOf(key):mapped;
            cells.add(index>=0&&index<row.cells().size()?row.cells().get(index):"");
        }
        return cells;
    }

    static byte[] write(String sheetName,List<List<String>> rows){
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
            var sheet=book.createSheet(sheetName);var body=book.createCellStyle();body.setWrapText(true);body.setVerticalAlignment(VerticalAlignment.TOP);
            body.setBorderBottom(BorderStyle.THIN);body.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            var heading=book.createCellStyle();heading.cloneStyleFrom(body);heading.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());heading.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            var font=book.createFont();font.setBold(true);heading.setFont(font);
            var header=sheet.createRow(0);header.setHeightInPoints(30);
            for(int c=0;c<HEADERS.size();c++){var cell=header.createCell(c);cell.setCellValue(HEADERS.get(c));cell.setCellStyle(heading);sheet.setColumnWidth(c,WIDTHS[c]*256);}
            int index=1;
            for(var values:rows){
                if(values.size()!=HEADERS.size())throw new IllegalArgumentException("Đợt kiểm thử export requires exactly 13 values per row");
                var row=sheet.createRow(index++);int lines=1;
                for(int c=0;c<values.size();c++){
                    String text=Objects.toString(values.get(c),"");var cell=row.createCell(c,CellType.STRING);cell.setCellValue(text);cell.setCellStyle(body);
                    int wrapped=0;for(String line:text.split("\\R",-1))wrapped+=Math.max(1,(int)Math.ceil((double)line.codePointCount(0,line.length())/Math.max(1,WIDTHS[c]-3)));
                    lines=Math.max(lines,wrapped);
                }
                row.setHeightInPoints(Math.min(409,Math.max(30,lines*15+6)));
            }
            sheet.createFreezePane(2,1);sheet.setAutoFilter(new CellRangeAddress(0,rows.size(),0,HEADERS.size()-1));
            book.write(out);return out.toByteArray();
        }catch(IOException exception){throw new IllegalStateException("Cannot export Đợt kiểm thử table",exception);}
    }
}
