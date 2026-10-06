package vn.syp.tms.testcase;

import java.io.*;
import java.net.URI;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Pure bridge for the file execution projection; existing source/annotation exports remain separate. */
public final class FileWorkWorkbook {
    private FileWorkWorkbook() {}
    public record Layout(List<String> headers,Map<String,Integer> columns,boolean customer) {}
    public record RowCells(int rowNumber,List<String> cells) {}
    public static Layout layout(byte[] source,String sheetName,String format) {
        boolean customer=TestCaseWorkbook.CUSTOMER.equals(format);
        List<String> headers=customer?CustomerWorkbook.HEADERS:TestCaseWorkbook.HEADERS;
        if(source!=null)try(var book=new XSSFWorkbook(new ByteArrayInputStream(source))) {
            var sheet=book.getSheet(sheetName);
            if(sheet==null || sheet.getRow(0)==null)throw new IllegalStateException("Stored document sheet is missing");
            if(customer)headers=CustomerWorkbook.headers(sheet);
            else {var values=new ArrayList<String>();for(int i=0;i<TestCaseWorkbook.HEADERS.size();i++)values.add(CustomerWorkbook.value(sheet.getRow(0).getCell(i),1));headers=List.copyOf(values);}
        }catch(IOException e){throw new IllegalStateException("Cannot read document layout",e);}
        var columns=new LinkedHashMap<String,Integer>();
        if(customer)columns.putAll(CustomerWorkbook.columns(headers));
        else {for(int i=0;i<TestCaseWorkbook.HEADERS.size();i++)columns.put(TestCaseWorkbook.HEADERS.get(i),i);columns.put("sourceId",0);}
        return new Layout(headers,Map.copyOf(columns),customer);
    }
    public static List<String> sourceCells(TestCaseDtos.ImportRowInput input,Layout layout) {
        if(layout.customer())return List.copyOf(Objects.requireNonNull(input.sourceCells()));
        return java.util.stream.Stream.of(input.caseNo(),input.suiteCode(),input.titleVi(),input.preconditionsVi(),input.stepsVi(),input.expectedVi(),input.titleJp(),input.preconditionsJp(),input.stepsJp(),input.expectedJp(),input.sourceReference()).map(v->v==null?"":v).toList();
    }
    public static List<String> pinnedCells(TestCaseDtos.ImportRowInput input,Layout layout,Map<String,String> content,String result,String executor) {
        var cells=layout.customer()?CustomerWorkbook.currentCells(input,layout.columns(),content):new ArrayList<>(sourceCells(input,layout));
        if(!layout.customer())content.forEach((field,value)->{Integer col=layout.columns().get(field);if(col!=null)cells.set(col,value);});
        overlay(cells,layout,"result",result);overlay(cells,layout,"tester",executor==null?"":executor);
        return List.copyOf(cells);
    }
    private static void overlay(List<String> cells,Layout layout,String field,String value){Integer col=layout.columns().get(field);if(col!=null)cells.set(col,value);}
    public static byte[] export(byte[] source,String sheetName,List<String> headers,List<RowCells> rows,Map<String,Object> metadata,List<Map<String,Object>> rowMetadata) {
        byte[] safeSource=source==null?null:sanitize(source);
        byte[] document=DocumentWorkbook.export(safeSource,sheetName,headers,rows.stream().map(r->new DocumentWorkbook.RowCells(r.rowNumber(),r.cells())).toList());
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(document));var out=new ByteArrayOutputStream()) {
            String name="TMS Execution";for(int suffix=2;book.getSheet(name)!=null;suffix++)name="TMS Execution "+suffix;
            var sheet=book.createSheet(name);int row=0;
            for(var entry:metadata.entrySet()){var line=sheet.createRow(row++);line.createCell(0).setCellValue(entry.getKey());line.createCell(1).setCellValue(string(entry.getValue()));}
            row++;
            var fields=List.of("rowNumber","scope","runItemId","revisionId","resultCode","latestAttemptId","attemptVersion","executorMembershipId","executorName","executedAt","buildId","fileWorkSessionId","physicalAsset","provenance");
            var header=sheet.createRow(row++);for(int c=0;c<fields.size();c++)header.createCell(c).setCellValue(fields.get(c));
            for(var value:rowMetadata){var line=sheet.createRow(row++);for(int c=0;c<fields.size();c++)line.createCell(c).setCellValue(string(value.get(fields.get(c))));}
            sheet.setColumnWidth(0,24*256);sheet.setColumnWidth(1,40*256);book.write(out);return out.toByteArray();
        }catch(IOException e){throw new IllegalStateException("Cannot export file execution",e);}
    }
    private static String string(Object value){return value==null?"":value.toString();}
    private static byte[] sanitize(byte[] source) {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(source));var out=new ByteArrayOutputStream()) {
            for(var sheet:book)for(var row:sheet)for(var cell:row){
                if(cell.getCellType()==CellType.FORMULA){String value="="+cell.getCellFormula();cell.removeFormula();cell.setCellValue(value);}
                if(cell.getHyperlink()!=null){boolean safe=false;try{String scheme=URI.create(cell.getHyperlink().getAddress()).getScheme();safe=scheme!=null && Set.of("https","http","mailto").contains(scheme.toLowerCase(Locale.ROOT));}catch(RuntimeException ignored){}if(!safe)cell.removeHyperlink();}
            }
            book.write(out);return out.toByteArray();
        }catch(IOException e){throw new IllegalStateException("Cannot sanitize execution workbook",e);}
    }
}
