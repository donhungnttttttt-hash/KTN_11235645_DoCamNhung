package vn.syp.tms.reporting;

import java.io.*;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class ReportWorkbook {
    private static final Map<String,String> LABELS=Map.ofEntries(
        Map.entry("total","Tổng lượt"),Map.entry("applicable","Phạm vi áp dụng"),Map.entry("na","NA · Ngoài phạm vi"),
        Map.entry("ok","OK · Đạt"),Map.entry("ng","NG · Không đạt"),Map.entry("pending","P · Tạm hoãn"),Map.entry("notRun","Chưa chạy"),
        Map.entry("executionPercent","Tiến độ thực thi (%)"),Map.entry("passPercent","Tỷ lệ đạt (%)"),Map.entry("bugs","Lỗi duy nhất"),
        Map.entry("openBugs","Lỗi chưa đóng"),Map.entry("awaitingVerification","Lỗi chờ xác minh"),Map.entry("id","Mã dữ liệu"),
        Map.entry("caseNo","Mã test case"),Map.entry("titleVi","Nội dung kiểm thử"),Map.entry("revisionId","Mã phiên bản case"),
        Map.entry("cycleId","Mã đợt"),Map.entry("cycleName","Tên đợt"),Map.entry("environmentName","Môi trường"),Map.entry("deviceName","Thiết bị"),
        Map.entry("assigneeName","Người phụ trách"),Map.entry("excluded","Loại khỏi phạm vi (NA)"),Map.entry("scopeReason","Lý do phạm vi"),
        Map.entry("resultCode","Kết quả gần nhất"),Map.entry("attemptId","Mã lần chạy"),Map.entry("buildId","Mã build"),Map.entry("buildLabel","Build thực thi"),
        Map.entry("executedAt","Thực thi lúc (UTC)"),Map.entry("key","Mã lỗi"),Map.entry("title","Tiêu đề"),Map.entry("statusLabel","Trạng thái"),
        Map.entry("priorityLabel","Ưu tiên"),Map.entry("name","Tên"),Map.entry("date","Ngày theo múi giờ dự án"),Map.entry("membershipId","Mã thành viên"),Map.entry("attempts","Số lần thực thi"));
    public byte[] create(Map<String,Object> report) {
        try(var book=new XSSFWorkbook();var output=new ByteArrayOutputStream()) {
            CellStyle heading=book.createCellStyle();var font=book.createFont();font.setBold(true);font.setColor(IndexedColors.WHITE.getIndex());heading.setFont(font);
            heading.setFillForegroundColor(IndexedColors.TEAL.getIndex());heading.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            var summary=book.createSheet("Tổng hợp");line(summary,0,heading,"Thông tin","Giá trị");
            int row=1;
            @SuppressWarnings("unchecked") var project=(Map<String,Object>)report.get("project");
            @SuppressWarnings("unchecked") var filters=(Map<String,Object>)report.get("filters");
            line(summary,row++,null,"Dự án",project.get("name"));line(summary,row++,null,"Mã dự án",project.get("code"));
            line(summary,row++,null,"Phiên bản công thức",report.get("metricDefinitionVersion"));line(summary,row++,null,"Thời điểm số liệu (UTC)",report.get("asOf"));
            line(summary,row++,null,"Múi giờ dự án",report.get("timeZone"));line(summary,row++,null,"Lọc mã đợt",filters.get("cycleId")==null?"Tất cả đợt đã bắt đầu":filters.get("cycleId"));
            line(summary,row++,null,"Lọc mã build",filters.get("buildId")==null?"Mới nhất trên mọi build":filters.get("buildId"));
            @SuppressWarnings("unchecked") var metrics=(Map<String,Object>)report.get("metrics");
            for(var entry:metrics.entrySet()) line(summary,row++,null,LABELS.get(entry.getKey()),entry.getValue()==null?"Chưa có phạm vi áp dụng":entry.getValue());
            line(summary,row++,null,"Tiến độ thực thi","(OK + NG) / (Tổng − NA) × 100");
            line(summary,row++,null,"Tỷ lệ đạt","OK / (Tổng − NA) × 100; mẫu số 0: chưa có phạm vi áp dụng");
            line(summary,row,null,"Phạm vi bug","Lỗi liên quan các run, mọi build; đếm ID duy nhất. Chờ retest không tự tính OK.");
            table(book,heading,"Nguồn thực thi",report,"rows",new String[]{"id","caseNo","titleVi","revisionId","cycleId","cycleName","environmentName","deviceName","assigneeName","excluded","scopeReason","resultCode","attemptId","buildId","buildLabel","executedAt"});
            table(book,heading,"Lỗi liên quan",report,"bugs",new String[]{"id","key","title","statusLabel","priorityLabel"});
            table(book,heading,"Tiến độ theo đợt",report,"byCycle",new String[]{"id","name","total","applicable","na","ok","ng","pending","notRun","executionPercent","passPercent"});
            table(book,heading,"Thực thi theo ngày",report,"daily",new String[]{"date","membershipId","name","attempts","ok","ng","pending"});
            for(Sheet sheet:book){sheet.createFreezePane(1,1);for(int col=0;col<sheet.getRow(0).getLastCellNum();col++)sheet.setColumnWidth(col,(col==2?50:25)*256);sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0,sheet.getLastRowNum(),0,sheet.getRow(0).getLastCellNum()-1));}
            book.write(output);return output.toByteArray();
        } catch(IOException e) { throw new IllegalStateException("Cannot create internal report workbook",e); }
    }
    @SuppressWarnings("unchecked")
    private void table(XSSFWorkbook book,CellStyle heading,String name,Map<String,Object> report,String key,String[] fields) {
        var sheet=book.createSheet(name);line(sheet,0,heading,Arrays.stream(fields).map(LABELS::get).toArray());
        int index=1;for(var row:(List<Map<String,Object>>)report.get(key))line(sheet,index++,null,Arrays.stream(fields).map(row::get).toArray());
    }
    private void line(Sheet sheet,int index,CellStyle style,Object...values) {
        Row row=sheet.createRow(index);
        for(int i=0;i<values.length;i++) {
            Cell cell=row.createCell(i);Object value=values[i];
            if(value instanceof Number number)cell.setCellValue(number.doubleValue());
            else if(value instanceof Boolean flag)cell.setCellValue(flag);
            else if(value!=null)cell.setCellValue(value.toString()); // Explicit STRING; never interpret user text as a formula.
            if(style!=null)cell.setCellStyle(style);
        }
    }
}
