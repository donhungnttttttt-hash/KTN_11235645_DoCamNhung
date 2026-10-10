package vn.syp.tms.project;

import vn.syp.tms.shared.web.BusinessException;

public final class SettingsVersion {
    private SettingsVersion() {}
    public static void require(long actual, Long expected) {
        if (expected == null || expected < 0) throw new BusinessException(422,"VERSION_REQUIRED","Thiếu phiên bản dữ liệu. Vui lòng tải lại.");
        if (actual != expected) throw new BusinessException(409,"VERSION_CONFLICT","Dữ liệu đã thay đổi. Tải lại để đối chiếu trước khi lưu.");
    }
}
