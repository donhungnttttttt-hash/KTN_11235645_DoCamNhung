import React,{useCallback,useEffect,useRef,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {AdminProjectDetail as Summary} from './AdminProjects';
import {AdminProjectForm,MemberPicker} from './AdminProjectForm';
import {ProjectStatusReports} from './ProjectStatusReports';
import {ProjectDevices} from '../projects/ProjectDevices';
import {AdminProjectLifecycle} from './AdminProjectLifecycle';
import {ProjectRoleSelect} from './ProjectRoleSelect';

export function AdminProjectDetail({id,api=adminApi}) {
 return <ProjectManagement key={id} id={id} api={api}/>;
}
function ProjectManagement({id,api}) {
 const [editing,setEditing]=useState(false);const [selected,setSelected]=useState([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 const [roleDrafts,setRoleDrafts]=useState({});
 const [lifecycleNotice,setLifecycleNotice]=useState('');
 const lifecycleNoticeRef=useRef(null);
 useEffect(()=>{if(lifecycleNotice)lifecycleNoticeRef.current?.focus();},[lifecycleNotice,revision]);
 const load=useCallback(signal=>Promise.all([api.project(id,{signal}),api.members(id,{signal})]).then(([project,members])=>({project,members})),[api,id]);
 const state=useAdminRead(`management:${id}:${revision}`,load);
 const pendingChanges=editing||busy||selected.length>0||Object.entries(roleDrafts).some(([userId,role])=>role!==state.data?.members.find(member=>String(member.userId)===userId)?.projectRole);
 async function mutate(action){if(busy)return;setBusy(true);setError('');try{await action();setRevision(n=>n+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <>{lifecycleNotice&&<p ref={lifecycleNoticeRef} tabIndex={-1} role="status">{lifecycleNotice}</p>}<Summary key={`${id}:${revision}`} id={id} api={api}>{api.archiveReadiness&&<AdminProjectLifecycle projectId={id} api={api} pendingChanges={pendingChanges} onSaved={result=>{setLifecycleNotice(result.archived?'Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.':'Dự án đang hoạt động. Có thể tiếp tục công việc theo quyền hiện hành.');setRevision(n=>n+1);}}/>}</Summary><ReadState {...state}/>{state.data&&<>
 {editing?<AdminProjectForm project={state.data.project} api={api} onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);setRevision(n=>n+1);}}/>:<div className="ui-actions"><button disabled={!!state.data.project.archivedAt} onClick={()=>setEditing(true)}>Sửa dự án</button></div>}
 <section className="admin-card"><h2>Thành viên dự án</h2>{error&&<p role="alert">{error} <button onClick={state.retry}>Tải phiên bản hiện hành</button></p>}
 <fieldset disabled={busy||!!state.data.project.archivedAt}><div className="admin-table-scroll" tabIndex={0}><table><thead><tr><th>Người dùng</th><th>Vai trò dự án</th><th>Thao tác</th></tr></thead><tbody>{state.data.members.map(m=><tr key={m.userId}><th>{m.displayName} · {m.username}</th><td><ProjectRoleSelect systemRole={m.systemRole} includeMember label={`Vai trò ${m.displayName}`} value={roleDrafts[m.userId]??m.projectRole} onChange={e=>setRoleDrafts({...roleDrafts,[m.userId]:e.target.value})}/></td><td><div className="admin-actions"><button disabled={!roleDrafts[m.userId]} onClick={()=>mutate(async()=>{await api.setMember(id,m.userId,{projectRole:roleDrafts[m.userId],expectedVersion:m.version});setRoleDrafts(old=>{const next={...old};delete next[m.userId];return next;});})}>Lưu vai trò {m.displayName}</button><button onClick={()=>mutate(()=>api.removeMember(id,m.userId,m.version))}>Gỡ {m.displayName}</button></div></td></tr>)}</tbody></table></div>
 <h3>Thêm thành viên</h3><MemberPicker value={selected} onChange={setSelected} api={api}/><button disabled={!selected.length} onClick={()=>mutate(async()=>{for(const m of selected){const existing=state.data.members.find(v=>v.userId===m.userId);const candidate=existing?null:await api.memberCandidate(id,m.username);await api.setMember(id,m.userId,{projectRole:m.projectRole,expectedVersion:existing?.version??candidate?.membershipVersion??null});setSelected(old=>old.filter(v=>v.userId!==m.userId));}})}>Lưu thành viên đã chọn</button>
 </fieldset></section>{api.statusReports&&<ProjectStatusReports projectId={id} api={api} admin/>}<p><a href={`#/admin/audit?projectId=${id}`}>Xem nhật ký dự án</a></p>{api.allocations&&<ProjectDevices key={id} projectId={id} api={api} admin/>}</>}</>;
}
