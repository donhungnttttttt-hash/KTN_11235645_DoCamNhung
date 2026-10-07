import React, { useEffect, useState } from 'react';
import { projectsApi } from '../../services/api/projects';

const roles={PM:'Quản lý dự án (PM)',TESTER:'Kiểm thử viên',DEV:'Lập trình viên',MEMBER:'Thành viên'};
export function ProjectMembers({projectId,canEdit,onMembershipChange=()=>{}}) {
  const [members,setMembers]=useState(null);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  const [busy,setBusy]=useState(false);
  const [editor,setEditor]=useState(null);
  useEffect(()=>{
    let live=true;setMembers(null);setError('');
    projectsApi.listMembers(projectId).then(data=>{if(live)setMembers(data);}).catch(failure=>{if(live)setError(failure.message);});
    return()=>{live=false;};
  },[projectId,reload]);
  async function remove(member) {
    if(!window.confirm(`Gỡ ${member.displayName} khỏi dự án? Lịch sử kiểm thử vẫn được giữ.`))return;
    setBusy(true);setError('');
    try {await projectsApi.removeMember(projectId,member.userId,member.version);setReload(x=>x+1);await onMembershipChange();}
    catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  return <section>
    <div className="settings-heading"><h2>Thành viên dự án</h2>{canEdit && <button className="cat-btn primary" disabled={busy || !!editor} onClick={()=>setEditor({member:null})}>Thêm thành viên</button>}</div>
    <p className="settings-hint">Thêm tài khoản nội bộ đã có vào dự án. Quyền dự án không cấp quyền tạo tài khoản mới.</p>
    {error && <p role="alert" className="text-danger">{error} <button className="cat-btn" disabled={busy} onClick={()=>setReload(x=>x+1)}>Thử lại</button></p>}
    {editor && <MemberEditor projectId={projectId} member={editor.member} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setReload(x=>x+1);onMembershipChange();}}/>}
    {!members ? !error && <p>Đang tải thành viên…</p> : <div className="settings-table-scroll"><table className="data-table"><thead><tr><th>Tên</th><th>Vai trò dự án</th>{canEdit && <th>Thao tác</th>}</tr></thead><tbody>
      {members.map(member=><tr key={member.userId}><td><strong>{member.displayName}</strong><div>@{member.username}</div></td><td>{roles[member.projectRole]}</td>{canEdit && <td><div className="ui-actions"><button className="btn-icon" disabled={busy || !!editor} onClick={()=>setEditor({member})}>Sửa vai trò {member.displayName}</button><button className="btn-icon text-danger" disabled={busy || !!editor} onClick={()=>remove(member)}>Gỡ {member.displayName}</button></div></td>}</tr>)}
      {!members.length && <tr><td colSpan={3}>Chưa có thành viên.</td></tr>}
    </tbody></table></div>}
  </section>;
}
function MemberEditor({projectId,member,onClose,onSaved}) {
  const [username,setUsername]=useState('');
  const [candidate,setCandidate]=useState(member);
  const [role,setRole]=useState(member?.projectRole || 'TESTER');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function lookup(){setBusy(true);setError('');setCandidate(null);try{setCandidate(await projectsApi.memberCandidate(projectId,username.trim()));}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  async function save(event){event.preventDefault();if(!candidate)return;setBusy(true);setError('');try{await projectsApi.addMember(projectId,candidate.userId,{projectRole:role,expectedVersion:member?.version ?? candidate.membershipVersion ?? null});onSaved();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  return <form className="settings-editor" onSubmit={save}>
    <h3>{member?'Sửa vai trò dự án':'Thêm tài khoản đã có'}</h3>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <fieldset disabled={busy}>
      {!member && <div className="form-group"><label>Tên đăng nhập<input autoFocus required maxLength={64} value={username} onChange={e=>{setUsername(e.target.value);setCandidate(null);}}/></label><button type="button" className="cat-btn" disabled={!username.trim()} onClick={lookup}>Tìm tài khoản</button></div>}
      {candidate && <p>{candidate.displayName} · @{candidate.username}</p>}
      <label className="form-group">Vai trò dự án<select value={role} onChange={e=>setRole(e.target.value)}>{Object.entries(roles).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    </fieldset>
    <div className="settings-actions"><button className="cat-btn primary" disabled={busy || !candidate}>Lưu thành viên</button><button className="cat-btn" type="button" disabled={busy} onClick={onClose}>Hủy</button></div>
  </form>;
}
