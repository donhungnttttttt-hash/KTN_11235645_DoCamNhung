package vn.syp.tms.identity;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.syp.tms.shared.web.BusinessException;

@Service
public class SelfProfileService {
 private final JdbcTemplate db;
 private final IdentityService identities;
 private final IdentityAudit audit;
 private final CurrentSessionIdentity sessions;
 public SelfProfileService(JdbcTemplate db,IdentityService identities,IdentityAudit audit,CurrentSessionIdentity sessions){this.db=db;this.identities=identities;this.audit=audit;this.sessions=sessions;}
 @Transactional(readOnly=true)
 public SelfProfileDtos.Profile get(String id){identities.current(id);return view(id);}
 private SelfProfileDtos.Profile view(String id){
  return db.queryForObject("""
   SELECT u.id,u.username,u.display_name,u.role_code,u.created_at,u.lock_version,
          p.email,p.phone,p.job_title,p.department,p.avatar IS NOT NULL AS has_avatar,COALESCE(p.profile_version,0) AS profile_version
   FROM identity_users u LEFT JOIN identity_profiles p ON p.user_id=u.id WHERE u.id=?
   """,(rs,row)->new SelfProfileDtos.Profile(rs.getString("id"),rs.getString("username"),rs.getString("display_name"),rs.getString("role_code"),rs.getTimestamp("created_at").toInstant(),rs.getString("email"),rs.getString("phone"),rs.getString("job_title"),rs.getString("department"),rs.getBoolean("has_avatar"),rs.getLong("profile_version"),rs.getLong("lock_version")),id);
 }
 private void lock(SessionPrincipal principal,long expectedVersion,long expectedAccountVersion){
  Long current=db.queryForObject("SELECT lock_version FROM identity_users WHERE id=? FOR UPDATE",Long.class,principal.id());
  identities.lockCurrent(principal.id());
  if(current==null||current!=principal.version())throw new BusinessException(401,"UNAUTHENTICATED","Phiên đăng nhập đã thay đổi.");
  if(expectedVersion<0||expectedAccountVersion<0)throw new BusinessException(422,"VALIDATION_ERROR","Phiên bản hồ sơ không hợp lệ.");
  var profile=view(principal.id());
  if(profile.version()!=expectedVersion||current!=expectedAccountVersion)throw new BusinessException(409,"VERSION_CONFLICT","Hồ sơ đã được cập nhật ở nơi khác. Đóng và mở lại hồ sơ trước khi lưu tiếp.");
  db.update("INSERT INTO identity_profiles(user_id,updated_at) SELECT ?,UTC_TIMESTAMP(6) WHERE NOT EXISTS(SELECT 1 FROM identity_profiles WHERE user_id=?)",principal.id(),principal.id());
 }
 @Transactional
 public SelfProfileDtos.Profile update(SessionPrincipal principal,SelfProfileDtos.Update input,String requestId,String sessionId){
  lock(principal,input.expectedVersion(),input.expectedAccountVersion());
  // Keep optimistic locking shared with Admin account edits; controller refreshes this session.
  String name=input.displayName().strip();
  if(!view(principal.id()).displayName().equals(name))db.update("UPDATE identity_users SET display_name=?,lock_version=lock_version+1 WHERE id=?",name,principal.id());
  db.update("UPDATE identity_profiles SET email=?,phone=?,job_title=?,department=?,profile_version=profile_version+1,updated_at=UTC_TIMESTAMP(6) WHERE user_id=?",optional(input.email()),optional(input.phone()),optional(input.jobTitle()),optional(input.department()),principal.id());
  var saved=view(principal.id());
  if(saved.accountVersion()!=principal.version())sessions.renew(sessionId,principal,saved.accountVersion());
  audit.record(principal.id(),principal.id(),"SELF_PROFILE_UPDATED",requestId);return saved;
 }
 @Transactional(readOnly=true)
 public byte[] avatar(String id){
  identities.current(id);var result=db.query("SELECT avatar FROM identity_profiles WHERE user_id=?",(rs,row)->rs.getBytes(1),id);
  if(result.isEmpty()||result.getFirst()==null)throw new BusinessException(404,"AVATAR_NOT_FOUND","Chưa có ảnh đại diện.");
  return result.getFirst();
 }
 @Transactional
 public SelfProfileDtos.Profile setAvatar(SessionPrincipal principal,long expectedVersion,long expectedAccountVersion,byte[] bytes,String requestId){
  lock(principal,expectedVersion,expectedAccountVersion);
  db.update("UPDATE identity_profiles SET avatar=?,profile_version=profile_version+1,updated_at=UTC_TIMESTAMP(6) WHERE user_id=?",bytes,principal.id());
  audit.record(principal.id(),principal.id(),bytes==null?"SELF_AVATAR_REMOVED":"SELF_AVATAR_UPDATED",requestId);return view(principal.id());
 }
 private static String optional(String value){return value==null||value.isBlank()?null:value.strip();}
}
