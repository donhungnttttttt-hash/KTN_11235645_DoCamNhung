package vn.syp.tms.project;

import java.time.DateTimeException;
import java.time.ZoneId;
import vn.syp.tms.shared.web.BusinessException;

/** Validate before persistence: reports use the same Java timezone database. */
public final class ProjectTimezone {
    private ProjectTimezone() {}
    public static void validate(String timezone) {
        try {
            if(timezone==null || timezone.isBlank() || timezone.length()>50) throw new DateTimeException("Invalid length");
            ZoneId.of(timezone);
        } catch(DateTimeException e) {
            throw new BusinessException(422,"INVALID_TIMEZONE","Chọn múi giờ hợp lệ, ví dụ Asia/Ho_Chi_Minh hoặc UTC.");
        }
    }
}
