import {SelectionTable} from '../../components/SelectionTable';
import {AdminFormDialog} from './AdminFormDialog';
import React,{useCallback,useState} from 'react';
import {InitialDevicePicker} from './InitialDevicePicker';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {ProjectRoleSelect} from './ProjectRoleSelect';

export function MemberPicker({value,onChange,api=adminApi,existingUserIds=[]}) {
 const [keyword,setKeyword]=useState('');const [role,setRole]=useState('');const [page,setPage]=useState(0);
 const load=useCallback(signal=>api.users({keyword,...(role?{role}:{}),enabled:true,page,size:20},{signal}),[api,keyword,role,page]);
 const state=useAdminRead(`people:${keyword}:${role}:${page}`,load);
 return <section className="admin-member-picker"><ReadState {...state}/>
 <SelectionTable label="Thành viên" searchable={false} pageScope loading={state.loading} selected={value.map(m=>m.userId)} extraTitle="Vai trò"
 filters={<><label className="ui-field ui-filter-search">Tìm<input aria-label="Tìm tài khoản đang hoạt động" placeholder="Tên hoặc tài khoản…" type="search" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label><label className="ui-field ui-filter-role">Vai trò<select aria-label="Lọc vai trò tài khoản" value={role} onChange={e=>{setRole(e.target.value);setPage(0);}}><option value="">Tất cả</option>{['PM','TESTER','DEV','ADMIN'].map(r=><option key={r}>{r}</option>)}</select></label></>}
 rows={(state.data?.items||[]).map(u=>{const selected=value.find(m=>m.userId===u.id),existing=existingUserIds.some(id=>String(id)===String(u.id));return {id:u.id,name:u.displayName,disabled:existing,description:(u.username||'')+' · '+u.role+(existing?' · Đã là thành viên':''),extra:selected?<ProjectRoleSelect systemRole={u.role} label={'Vai trò '+u.displayName} value={selected.projectRole} onChange={e=>onChange(value.map(m=>m.userId===u.id?{...m,projectRole:e.target.value}:m))}/>:u.role};})}
 onChange={ids=>onChange(ids.map(id=>value.find(m=>m.userId===id)||(()=>{const u=state.data.items.find(u=>u.id===id);return {userId:u.id,projectRole:u.role==='PM'?'PM':u.role==='DEV'?'DEV':'TESTER',displayName:u.displayName,username:u.username};})()))}/>
 <p>Đã chọn {value.length} người · {value.filter(m=>m.projectRole==='PM').length} PM</p>
 {state.data && <div className="admin-pagination"><span>Trang {page+1} / {Math.max(1,Math.ceil(state.data.totalElements/20))} · {state.data.totalElements} người</span><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Người trước</button><button type="button" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Người sau</button></div>}
 {value.length>0 && <ul className="admin-selected-members">{value.map(m=><li key={m.userId}><span>{m.displayName || m.userId} · {m.projectRole}</span> <button type="button" aria-label={`Bỏ chọn ${m.displayName || m.userId}`} onClick={()=>onChange(value.filter(v=>v.userId!==m.userId))}>Bỏ chọn</button></li>)}</ul>}
 </section>;
}
export function AdminProjectForm({project,onSaved,onCancel,api=adminApi}) {
 const [draft,setDraft]=useState({code:project?.code||'',name:project?.name||'',description:project?.description||'',timezone:project?.timezone||'Asia/Ho_Chi_Minh'});
 const [devices,setDevices]=useState([]);
 const changeMembers=next=>{setMembers(next);setDevices(current=>current.map(a=>next.some(m=>m.userId===a.recipientUserId)?a:{...a,recipientUserId:''}));};
 const [version,setVersion]=useState(project?.version);const [members,setMembers]=useState([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function save(e){e.preventDefault();if(busy)return;if(!project&&!members.some(m=>m.projectRole==='PM')){setError('Chọn ít nhất một PM cho dự án.');return;}if(!project&&devices.some(a=>!a.recipientUserId)){setError('Chọn người nhận cho tất cả máy đã chọn trước khi tạo dự án.');return;}setBusy(true);setError('');try{const result=project?await api.updateProject(project.id,{name:draft.name,description:draft.description,timezone:draft.timezone,expectedVersion:version}):await api.createProject({project:draft,...(devices.length?{devices:devices.map(({assetId,recipientUserId,expectedReturnOn,handoverNote,expectedVersion})=>({assetId,recipientUserId,expectedReturnOn:expectedReturnOn||null,handoverNote,expectedVersion}))}:{}),members:members.map(({userId,projectRole})=>({userId,projectRole}))});onSaved(result);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function reloadVersion(){setBusy(true);try{const latest=await api.project(project.id);setVersion(latest.version);setError('Đã tải version hiện hành; bản nháp được giữ. Kiểm tra trước khi lưu lại.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AdminFormDialog title={project?'Sửa dự án':'Tạo dự án'} onClose={onCancel} busy={busy} wide={!project}><form className="admin-card admin-form" onSubmit={save} onInvalid={()=>setError('Kiểm tra các trường bắt buộc được đánh dấu; với máy đã chọn, hãy chọn người nhận.')}>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>
 <section className="admin-form-section"><h3>Thông tin dự án</h3><div className="admin-form-grid">
 {!project&&<label>Mã dự án<input required title="2–32 ký tự: chữ, số, dấu gạch ngang hoặc gạch dưới" pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,31}" maxLength={32} value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})}/></label>}
 <label>Tên dự án<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
 <label className="admin-form-full">Mô tả<textarea maxLength={500} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
 <label>Múi giờ<input required maxLength={50} value={draft.timezone} onChange={e=>setDraft({...draft,timezone:e.target.value})}/></label>
 </div></section>
 {!project&&<div className="admin-project-resources"><section className="admin-form-section"><h3>Thành viên & người quản lý</h3><p>Chọn ít nhất một PM. Có thể bổ sung thành viên sau khi tạo.</p><MemberPicker value={members} onChange={changeMembers} api={api}/></section>{api.assets&&<section className="admin-form-section"><InitialDevicePicker value={devices} onChange={setDevices} members={members} api={api}/></section>}</div>}
 <div className="admin-actions"><button type="submit">{busy?'Đang lưu…':project?'Lưu dự án':'Tạo dự án'}</button>{onCancel&&<button type="button" onClick={onCancel}>Hủy</button>}{project&&error&&<button type="button" onClick={reloadVersion}>Tải version hiện hành, giữ bản nháp</button>}
 </div></fieldset></form></AdminFormDialog>;
}
