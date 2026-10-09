package vn.syp.tms.ai;

import java.util.Arrays;
import java.util.List;
import vn.syp.tms.shared.web.BusinessException;

public enum AiPurpose {
    ADMIN_PROJECT_REVIEW("ADMIN", "Rà soát dự án", "NONE"),
    PM_PROGRESS_REPORT("PM", "Soạn báo cáo tiến độ", "NONE"),
    PM_ASSIGNMENT_SUGGESTION("PM", "Gợi ý phân công file", "FILE_GROUP"),
    TESTER_WORK_REPORT("TESTER", "Tổng hợp công việc của tôi", "NONE"),
    TESTER_BUG_DRAFT("TESTER", "Hoàn thiện mô tả bug", "TICKET"),
    DEV_TICKET_REVIEW("DEV", "Rà soát ticket được giao", "TICKET");

    private final String role;
    private final String label;
    private final String target;
    AiPurpose(String role, String label, String target) { this.role=role; this.label=label; this.target=target; }
    public String role() { return role; }
    public String label() { return label; }
    public String target() { return target; }
    public static List<AiPurpose> forRole(String role) { return Arrays.stream(values()).filter(p->p.role.equals(role)).toList(); }
    public static AiPurpose parse(String code) {
        try { return valueOf(code); }
        catch (IllegalArgumentException | NullPointerException e) {
            throw new BusinessException(422,"AI_INVALID_PURPOSE","Tác vụ AI không hợp lệ.");
        }
    }
}
