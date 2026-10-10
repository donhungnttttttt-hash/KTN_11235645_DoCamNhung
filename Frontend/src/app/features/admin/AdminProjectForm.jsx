import React,{useCallback,useState} from 'react';
import {InitialDevicePicker} from './InitialDevicePicker';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {ProjectRoleSelect} from './ProjectRoleSelect';

export function MemberPicker({value,onChange,api=adminApi}) {
 const [keyword,setKeyword]=useState('');const [page,setPage]=useState(0);
 const load=useCallback(signal=>api.users({keyword,enabled:true,page,size:20},{signal}),[api,keyword,page]);
 const state=useAdminRead(`people:${keyword}:${page}`,load);
 return <section className="admin-member-picker"><label className="ui-field">Tìm tài khoản đang hoạt động<input type="search" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label><ReadState {...state}/>
 <p>Đã chọn {value.length} người · {value.filter(m=>m.projectRole==='PM').length} PM</p>
 {state.data?.items.map(u=>{const selected=value.find(m=>m.userId===u.id);return <div className="admin-member-option" key={u.id}><label><input type="checkbox" aria-label={`Chọn ${u.displayName}`} checked={!!selected} onChange={e=>onChange(e.target.checked?[...value,{userId:u.id,projectRole:u.role==='PM'?'PM':u.role==='DEV'?'DEV':'TESTER',displayName:u.displayName,username:u.username}]:value.filter(m=>m.userId!==u.id))}/>{u.displayName} · {u.username} ({u.role})</label>{selected && <ProjectRoleSelect systemRole={u.role} label={`Vai trò ${u.displayName}`} value={selected.projectRole} onChange={e=>onChange(value.map(m=>m.userId===u.id?{...m,projectRole:e.target.value}:m))}/>}</div>;})}
 {state.data && <div className="admin-pagination"><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Người trước</button><button type="button" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Người sau</button></div>}
 {value.length>0 && <ul className="admin-selected-members">{value.map(m=><li key={m.userId}><span>{m.displayName || m.userId} · {m.projectRole}</span> <button type="button" onClick={()=>onChange(value.filter(v=>v.userId!==m.userId))}>Bỏ chọn</button></li>)}</ul>}
 </section>;
}
export function AdminProjectForm({project,onSaved,onCancel,api=adminApi}) {
 const [draft,setDraft]=useState({code:project?.code||'',name:project?.name||'',description:project?.description||'',timezone:project?.timezone||'Asia/Ho_Chi_Minh'});
 const [devices,setDevices]=useState([]);
 const changeMembers=next=>{setMembers(next);setDevices(current=>current.map(a=>next.some(m=>m.userId===a.recipientUserId)?a:{...a,recipientUserId:''}));};
 const [version,setVersion]=useState(project?.version);const [members,setMembers]=useState([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function save(e){e.preventDefault();if(busy)return;if(!project&&!members.some(m=>m.projectRole==='PM')){setError('Chọn ít nhất một PM cho dự án.');return;}setBusy(true);setError('');try{const result=project?await api.updateProject(project.id,{name:draft.name,description:draft.description,timezone:draft.timezone,expectedVersion:version}):await api.createProject({project:draft,...(devices.length?{devices:devices.map(({assetId,recipientUserId,expectedReturnOn,handoverNote,expectedVersion})=>({assetId,recipientUserId,expectedReturnOn:expectedReturnOn||null,handoverNote,expectedVersion}))}:{}),members:members.map(({userId,projectRole})=>({userId,projectRole}))});onSaved(result);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function reloadVersion(){setBusy(true);try{const latest=await api.project(project.id);setVersion(latest.version);setError('Đã tải version hiện hành; bản nháp được giữ. Kiểm tra trước khi lưu lại.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <form className="admin-card admin-form" onSubmit={save}><h2>{project?'Sửa dự án':'Tạo dự án'}</h2>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>
 {!project&&<label>Mã dự án<input required pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,31}" maxLength={32} value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})}/></label>}
 <label>Tên dự án<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
 <label>Mô tả<textarea maxLength={500} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
 <label>Múi giờ<input required maxLength={50} value={draft.timezone} onChange={e=>setDraft({...draft,timezone:e.target.value})}/></label>
 {!project&&<><MemberPicker value={members} onChange={changeMembers} api={api}/>{api.assets&&<InitialDevicePicker value={devices} onChange={setDevices} members={members} api={api}/>}</>}
 <div className="admin-actions"><button type="submit">{busy?'Đang lưu…':project?'Lưu dự án':'Tạo dự án'}</button>{onCancel&&<button type="button" onClick={onCancel}>Hủy</button>}{project&&error&&<button type="button" onClick={reloadVersion}>Tải version hiện hành, giữ bản nháp</button>}
 </div></fieldset></form>;
}
