package vn.syp.tms.identity;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.shared.web.BusinessException;

@Component
public class SystemAdminRegistry {
    private final JdbcTemplate jdbc;
    public SystemAdminRegistry(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public boolean contains(String userId){
        return !jdbc.queryForList("SELECT slot FROM system_admin_registry WHERE user_id=? FOR SHARE",userId).isEmpty();
    }
    @Transactional
    public void register(int slot,String userId){
        if(slot!=1&&slot!=2)throw new BusinessException(422,"INVALID_ADMIN_SLOT","Chỉ có hai vị trí Admin tổng.");
        jdbc.queryForObject("SELECT id FROM application_info WHERE id=1 FOR UPDATE",Integer.class);
        if(!Integer.valueOf(1).equals(jdbc.queryForObject("SELECT COUNT(*) FROM identity_users WHERE id=? AND role_code='ADMIN' AND enabled=TRUE",Integer.class,userId)))
            throw new BusinessException(422,"INVALID_SYSTEM_ADMIN","Cần tài khoản Admin tổng đang hoạt động.");
        jdbc.update("INSERT INTO system_admin_registry(slot,user_id) VALUES(?,?)",slot,userId);
    }
}
