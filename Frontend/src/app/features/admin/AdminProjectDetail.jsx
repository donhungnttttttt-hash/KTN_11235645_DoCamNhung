import {Trash2} from 'lucide-react';
import {TableScroll} from '../../components/TableScroll';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {AdminProjectDetail as Summary} from './AdminProjects';
import {AdminProjectForm,MemberPicker} from './AdminProjectForm';
import {ProjectStatusReports} from './ProjectStatusReports';
import {ProjectDevices} from '../projects/ProjectDevices';
import {AdminProjectLifecycle} from './AdminProjectLifecycle';

export function AdminProjectDetail({id,api=adminApi}) {
 return <ProjectManagement key={id} id={id} api={api}/>;
}
function ProjectManagement({id,api}) {
 const [editing,setEditing]=useState(false);const [selected,setSelected]=useState([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 const [memberNotice,setMemberNotice]=useState('');const memberFeedback=useRef(null);
 const [lifecycleNotice,setLifecycleNotice]=useState('');
 const lifecycleNoticeRef=useRef(null);
 useEffect(()=>{if(lifecycleNotice)lifecycleNoticeRef.current?.focus();},[lifecycleNotice,revision]);
 const load=useCallback(signal=>Promise.all([api.project(id,{signal}),api.members(id,{signal})]).then(([project,members])=>({project,members})),[api,id]);
 const state=useAdminRead(`management:${id}:${revision}`,load);
 useEffect(()=>{if(!state.loading&&(error||memberNotice))memberFeedback.current?.focus();},[error,memberNotice,state.loading,state.data]);
 const pendingChanges=editing||busy||selected.length>0;
 async function mutate(action){if(busy)return;setBusy(true);setError('');setMemberNotice('');try{await action();}catch(e){setError(e.message);}finally{setRevision(n=>n+1);setBusy(false);}}
 async function saveSelected(){await mutate(async()=>{
  let saved=0;
  for(const m of selected){
   try{
    if(state.data.members.some(v=>String(v.userId)===String(m.userId)))throw new Error('Người này đã là thành viên của dự án. Hãy tải lại danh sách thành viên.');
    const candidate=await api.memberCandidate(id,m.username);
    await api.setMember(id,m.userId,{projectRole:candidate?.projectRole??m.projectRole,expectedVersion:candidate?.membershipVersion??null});
    saved++;setSelected(old=>old.filter(v=>v.userId!==m.userId));setMemberNotice(`Đã lưu ${saved} thành viên.`);
   }catch(e){throw new Error(`${m.displayName||m.username}: ${e.message}`);}
  }
 });}
 async function removeMember(member){await mutate(async()=>{
  await api.removeMember(id,member.userId,member.version);
  setMemberNotice(`Đã gỡ ${member.displayName} khỏi dự án.`);
 });}
 return <>{lifecycleNotice&&<p ref={lifecycleNoticeRef} tabIndex={-1} role="status">{lifecycleNotice}</p>}<Summary key={`${id}:${revision}`} id={id} api={api} onReload={()=>setRevision(n=>n+1)}>{api.archiveReadiness&&<AdminProjectLifecycle projectId={id} api={api} pendingChanges={pendingChanges} onSaved={result=>{setLifecycleNotice(result.archived?'Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.':'Dự án đang hoạt động. Có thể tiếp tục công việc theo quyền hiện hành.');setRevision(n=>n+1);}}/>}</Summary><ReadState {...state}/>{state.data&&<>
 {editing?<AdminProjectForm project={state.data.project} api={api} onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);setRevision(n=>n+1);}}/>:<div className="ui-actions"><button disabled={!!state.data.project.archivedAt} onClick={()=>setEditing(true)}>Sửa dự án</button></div>}
 <section className="admin-card"><h2>Thành viên dự án</h2><div ref={memberFeedback} tabIndex={-1}>{busy&&<p role="status">Đang lưu thành viên…</p>}{!busy&&memberNotice&&<p role="status">{memberNotice}</p>}{error&&<p role="alert">{error} <button onClick={state.retry}>Tải phiên bản hiện hành</button></p>}</div>
 <fieldset disabled={busy||!!state.data.project.archivedAt}><TableScroll label="Thành viên dự án" className="admin-table-scroll" tabIndex={0}><table><thead><tr><th>Người dùng</th><th>Vai trò dự án</th><th className="admin-member-action-cell">Thao tác</th></tr></thead><tbody>{state.data.members.map(m=><tr key={m.userId}><th>{m.displayName} · {m.username}</th><td><strong>{m.systemRole==='ADMIN'&&m.projectRole==='PM'?'ADMIN · Làm PM':m.projectRole}</strong></td><td className="admin-member-action-cell"><button type="button" className="admin-member-remove" aria-label={`Gỡ ${m.displayName}`} title={`Gỡ ${m.displayName} khỏi dự án`} onClick={()=>removeMember(m)}><Trash2 size={16} color="#991b1b" aria-hidden="true"/></button></td></tr>)}</tbody></table></TableScroll>
 <h3>Thêm thành viên</h3><MemberPicker projectId={id} value={selected} onChange={setSelected} api={api} existingUserIds={state.data.members.map(m=>m.userId)}/><button disabled={!selected.length} onClick={saveSelected}>{busy?'Đang lưu thành viên…':'+ Thêm'}</button>
 </fieldset></section>{api.statusReports&&<ProjectStatusReports projectId={id} api={api} admin/>}<p><a href={`#/admin/audit?projectId=${id}`}>Xem nhật ký dự án</a></p>{api.allocations&&<ProjectDevices key={id} projectId={id} api={api} admin archived={!!state.data.project.archivedAt}/>}</>}</>;
}
