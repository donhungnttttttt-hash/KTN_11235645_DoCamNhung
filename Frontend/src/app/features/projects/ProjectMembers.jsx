import {TableScroll} from '../../components/TableScroll';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { projectsApi } from '../../services/api/projects';
import {MemberPicker} from './MemberPicker';

const roles={PM:'Quản lý dự án (PM)',TESTER:'Kiểm thử viên',DEV:'Lập trình viên',MEMBER:'Thành viên'};
export function ProjectMembers({projectId,canEdit,canAdd=canEdit,onMembershipChange=()=>{}}) {
  const [members,setMembers]=useState(null);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  const [busy,setBusy]=useState(false);
  const [adding,setAdding]=useState(false);
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
    <div className="settings-heading"><h2>Thành viên dự án</h2>{canAdd && <button className="cat-btn primary" disabled={busy || adding || !members} onClick={()=>setAdding(true)}>Thêm thành viên</button>}</div>
    <p className="settings-hint">Thêm tài khoản nội bộ đã có vào dự án. Quyền dự án không cấp quyền tạo tài khoản mới.</p>
    {error && <p role="alert" className="text-danger">{error} <button className="cat-btn" disabled={busy} onClick={()=>setReload(x=>x+1)}>Thử lại</button></p>}
    {adding && <MemberEditor projectId={projectId} members={members || []} onClose={()=>setAdding(false)} onSaved={()=>{setAdding(false);setReload(x=>x+1);onMembershipChange();}}/>}
    {!members ? !error && <p>Đang tải thành viên…</p> : <TableScroll label="Thành viên dự án" className="settings-table-scroll"><table className="data-table"><thead><tr><th>Tên</th><th>Vai trò dự án</th>{canEdit && <th>Thao tác</th>}</tr></thead><tbody>
      {members.map(member=><tr key={member.userId}><td><strong>{member.displayName}</strong><div>@{member.username}</div></td><td>{member.systemRole==='ADMIN'&&member.projectRole==='PM'?'ADMIN · Làm PM':roles[member.projectRole]}</td>{canEdit && <td><div className="ui-actions"><button className="btn-icon text-danger" disabled={busy || adding} onClick={()=>remove(member)}>Gỡ {member.displayName}</button></div></td>}</tr>)}
      {!members.length && <tr><td colSpan={3}>Chưa có thành viên.</td></tr>}
    </tbody></table></TableScroll>}
  </section>;
}
function MemberEditor({projectId,members,onClose,onSaved}) {
  const [selected,setSelected]=useState([]);
  const [addedIds,setAddedIds]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');const saving=useRef(false);
  const pickerApi=useMemo(()=>({users:(filters,options)=>projectsApi.memberCandidates(projectId,filters,options)}),[projectId]);
  async function save(event){
    event.preventDefault();if(saving.current||!selected.length)return;saving.current=true;setBusy(true);setError('');setNotice('');
    let saved=0;
    try{
      for(const person of selected){
        try{
          const candidate=await projectsApi.memberCandidate(projectId,person.username);
          if(!['DEV','TESTER'].includes(candidate.projectRole))throw new Error('PM chỉ được thêm Dev hoặc Tester.');
          await projectsApi.addMember(projectId,person.userId,{projectRole:candidate.projectRole,expectedVersion:candidate.membershipVersion??null});
          saved++;setAddedIds(values=>[...values,person.userId]);setSelected(values=>values.filter(value=>value.userId!==person.userId));
        }catch(failure){throw new Error(`${person.displayName}: ${failure.message}`);}
      }
      onSaved();
    }catch(failure){setError(failure.message);if(saved)setNotice(`Đã thêm ${saved} thành viên. Chỉ những người chưa lưu còn được chọn.`);}
    finally{saving.current=false;setBusy(false);}
  }
  return <form className="settings-editor" onSubmit={save}>
    <h3>Thêm tài khoản đã có</h3>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <fieldset disabled={busy}>
      <p>PM được thêm Dev và Tester. Vai trò theo tài khoản, không thay đổi tại đây.</p>
      <MemberPicker projectId={projectId} existingUserIds={[...members.map(member=>member.userId),...addedIds]} api={pickerApi} allowedRoles={['DEV','TESTER']} value={selected} onChange={setSelected}/>
    </fieldset>
    <div className="settings-actions"><button className="cat-btn primary" disabled={busy || !selected.length}>{busy?'Đang thêm thành viên…':'Lưu thành viên'}</button><button className="cat-btn" type="button" disabled={busy} onClick={onClose}>Hủy</button></div>
  </form>;
}
