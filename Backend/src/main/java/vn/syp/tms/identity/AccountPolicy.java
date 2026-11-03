package vn.syp.tms.identity;

import vn.syp.tms.shared.web.BusinessException;

public final class AccountPolicy {
    private AccountPolicy() {}
    public static AccountType creationType(boolean isProjectAdmin, boolean isGuest) {
        if(isProjectAdmin && isGuest)
            throw new BusinessException(422,"CONFLICTING_ACCOUNT_FLAGS","Không thể chọn đồng thời Admin và Khách.");
        return isProjectAdmin?AccountType.PM:isGuest?AccountType.GUEST:AccountType.USER;
    }
    public static String defaultMembershipRole(AccountType type) {
        return type==AccountType.ADMIN?"PM":type.name();
    }
}
