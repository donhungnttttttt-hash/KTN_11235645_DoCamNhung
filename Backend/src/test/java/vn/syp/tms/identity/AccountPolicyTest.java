package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.shared.web.BusinessException;

class AccountPolicyTest {
    @Test void creationFlagsMapExactly(){
        assertThat(AccountPolicy.creationType(false,false)).isEqualTo(AccountType.USER);
        assertThat(AccountPolicy.creationType(true,false)).isEqualTo(AccountType.PM);
        assertThat(AccountPolicy.creationType(false,true)).isEqualTo(AccountType.GUEST);
    }
    @Test void rejectsConflictingFlags(){
        assertThatThrownBy(()->AccountPolicy.creationType(true,true)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(422));
    }
    @Test void membershipMappingDoesNotChangeGlobalAdminType(){
        assertThat(AccountPolicy.defaultMembershipRole(AccountType.ADMIN)).isEqualTo("PM");
        assertThat(AccountPolicy.defaultMembershipRole(AccountType.PM)).isEqualTo("PM");
        assertThat(AccountPolicy.defaultMembershipRole(AccountType.USER)).isEqualTo("USER");
        assertThat(AccountPolicy.defaultMembershipRole(AccountType.GUEST)).isEqualTo("GUEST");
        assertThatThrownBy(()->AccountType.fromCode("DEV")).isInstanceOf(IllegalArgumentException.class);
    }
}
