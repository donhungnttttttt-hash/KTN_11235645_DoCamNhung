package vn.syp.tms.project;

import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.identity.IdentityService;
import vn.syp.tms.shared.web.BusinessException;

/** Resolves the real actor for legacy membership-based audit foreign keys. */
@Service
@Transactional
public class ProjectActorService {
    private final JdbcTemplate db;
    private final IdentityService identity;
    public ProjectActorService(JdbcTemplate db, IdentityService identity) { this.db=db;this.identity=identity; }

    public long forWrite(long project, String user) {
        boolean admin="ADMIN".equals(identity.lockCurrent(user).getRole());
        var projects=db.queryForList("SELECT id FROM projects WHERE id=? FOR UPDATE",project);
        if(projects.isEmpty())throw new BusinessException(404,"NOT_FOUND","Không tìm thấy dự án.");
        var members=db.queryForList("SELECT id,active FROM project_memberships WHERE project_id=? AND user_id=? FOR UPDATE",project,user);
        if(!members.isEmpty()) {
            var member=members.getFirst();
            if(admin || Boolean.TRUE.equals(member.get("active")) || member.get("active") instanceof Number n && n.intValue()==1)
                return ((Number)member.get("id")).longValue();
        }
        if(!admin)throw new BusinessException(404,"NOT_FOUND","Bạn không có quyền truy cập dự án.");
        // Inactive MEMBER records provide attribution, never PM/Tester privileges or a roster entry.
        // Account demotion/revocation therefore removes global authority immediately.
        db.update("INSERT INTO project_memberships(project_id,user_id,project_role,active,created_at,updated_at) VALUES(?,?,'MEMBER',FALSE,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",project,user);
        long id=Objects.requireNonNull(db.queryForObject("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,project,user));
        db.update("INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) VALUES(?,?,'MEMBERSHIP',?,'ADMIN_ACTOR_LINK',UTC_TIMESTAMP(6))",project,user,id);
        return id;
    }

    @Transactional(readOnly=true)
    public long existing(long project,String user) {
        var ids=db.queryForList("SELECT id FROM project_memberships WHERE project_id=? AND user_id=?",Long.class,project,user);
        return ids.isEmpty()?0:ids.getFirst();
    }
}
