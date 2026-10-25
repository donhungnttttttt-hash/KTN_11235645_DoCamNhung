package vn.syp.tms.admin;

import java.util.*;

/** Public labels only: the same vocabulary is displayed and searched without exposing audit metadata. */
final class AdminAuditLabels {
    private AdminAuditLabels() {}
    private static final Map<String,String> LABELS=labels();
    private static Map<String,String> labels(){
        var labels=new LinkedHashMap<String,String>(Map.ofEntries(
        Map.entry("IDENTITY","Tài khoản"),Map.entry("PROJECT","Dự án"),Map.entry("MEMBERSHIP","Thành viên"),
        Map.entry("DEVICE_ASSET","Máy vật lý"),Map.entry("DEVICE_ALLOCATION","Bàn giao máy"),Map.entry("STATUS_REPORT","Báo cáo PM"),
        Map.entry("FEATURE","Feature"),Map.entry("TEST_DOCUMENT_ROW","Dòng test case"),Map.entry("TEST_CASE","Test case"),
        Map.entry("CREATE","Tạo mới"),Map.entry("UPDATE","Cập nhật"),Map.entry("ARCHIVE","Lưu trữ"),Map.entry("REOPEN","Mở lại"),
        Map.entry("ASSIGN","Bàn giao"),Map.entry("RETURN","Thu hồi"),Map.entry("SET_ROLE","Gán vai trò"),Map.entry("REMOVE","Gỡ thành viên"),
        Map.entry("USER_CREATED","Tạo tài khoản"),Map.entry("USER_UPDATED","Cập nhật tài khoản"),Map.entry("USER_ENABLED","Mở khóa tài khoản"),
        Map.entry("USER_PROFILE_UPDATED","Cập nhật thông tin tài khoản"),Map.entry("USER_PASSWORD_RESET","Đặt lại mật khẩu"),
        Map.entry("USER_DISABLED","Khóa tài khoản"),Map.entry("CREATE_USERS_GRANTED","Cấp quyền tạo Tester"),
        Map.entry("CREATE_USERS_REVOKED","Thu hồi quyền tạo Tester"),Map.entry("ADMIN_BOOTSTRAPPED","Khởi tạo quản trị viên"),
        Map.entry("LOGIN_SUCCEEDED","Đăng nhập"),Map.entry("LOGIN_FAILED","Đăng nhập thất bại"),Map.entry("LOGOUT","Đăng xuất")
    ));
        labels.put("MANAGEMENT_REPORT","Báo cáo quản trị");
        labels.put("PROJECT_NOTE","Note dự án");
        labels.put("WORK_ITEM","Issue");
        labels.put("STATUS","Đổi trạng thái");
        labels.put("COMMENT","Thêm ghi chú");
        // Only the five known case Status values are translated; unknown audit codes remain raw.
        var statuses=List.of("UNEXECUTED","OK","NG","P","NA");
        for(String from:statuses)for(String to:statuses)
            labels.put("RESULT_"+from+"_"+to,"Status: "+statusLabel(from)+" → "+statusLabel(to));
        return Map.copyOf(labels);
    }
    private static String statusLabel(String status){return "UNEXECUTED".equals(status)?"Unexecuted":status;}
    static String label(Object code){String value=Objects.toString(code,"");return LABELS.getOrDefault(value,value);}
    static String expression(String field){
        var sql=new StringBuilder("CASE ").append(field);
        LABELS.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(entry->sql.append(" WHEN '").append(entry.getKey()).append("' THEN _utf8mb4'").append(entry.getValue()).append("'"));
        return sql.append(" ELSE ").append(field).append(" END").toString();
    }
}
