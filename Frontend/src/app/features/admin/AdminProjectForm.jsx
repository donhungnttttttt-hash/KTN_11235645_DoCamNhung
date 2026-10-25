import {MemberPicker} from '../projects/MemberPicker';
export {MemberPicker} from '../projects/MemberPicker';
import {AdminFormDialog,useAdminFormClose} from './AdminFormDialog';
import React,{useEffect,useRef,useState} from 'react';
import {InitialDevicePicker} from './InitialDevicePicker';
import {adminApi} from '../../services/api/admin';


export function AdminProjectForm({project,onSaved,onCancel,api=adminApi}) {
 const [draft,setDraft]=useState({code:project?.code||'',name:project?.name||'',description:project?.description||'',timezone:project?.timezone||'Asia/Ho_Chi_Minh'});
 const [devices,setDevices]=useState([]);
 const changeMembers=next=>{setMembers(next);setDevices(current=>current.map(a=>next.some(m=>m.userId===a.recipientUserId&&m.projectRole==='PM')?a:{...a,recipientUserId:''}));};
 const [version,setVersion]=useState(project?.version);const [members,setMembers]=useState([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [canReload,setCanReload]=useState(false),[notice,setNotice]=useState('');
 const noticeRef=useRef(null);useEffect(()=>{if(notice)noticeRef.current?.focus();},[notice]);
 const [initial]=useState(draft);
 const {close,confirmation}=useAdminFormClose(onCancel,busy,Object.keys(initial).some(key=>draft[key]!==initial[key])||members.length>0||devices.length>0);
 async function save(e){e.preventDefault();if(busy)return;setCanReload(false);setNotice('');if(!project&&!members.some(m=>m.projectRole==='PM')){setError('Chọn ít nhất một PM cho dự án.');return;}if(!project&&(devices.some(a=>!members.some(m=>m.userId===a.recipientUserId&&m.projectRole==='PM'))||new Set(devices.map(a=>a.recipientUserId)).size>1)){setError('Chọn người nhận cho tất cả máy đã chọn trước khi tạo dự án.');return;}setBusy(true);setError('');try{const result=project?await api.updateProject(project.id,{name:draft.name,description:draft.description,timezone:draft.timezone,expectedVersion:version}):await api.createProject({project:draft,...(devices.length?{devices:devices.map(({assetId,recipientUserId,expectedReturnOn,handoverNote,expectedVersion})=>({assetId,recipientUserId,expectedReturnOn:expectedReturnOn||null,handoverNote,expectedVersion}))}:{}),members:members.map(({userId,projectRole})=>({userId,projectRole}))});onSaved(result);}catch(e){setCanReload(!!project&&e.status===409&&e.code==='VERSION_CONFLICT');setError(e.message);}finally{setBusy(false);}}
 async function reloadVersion(){setBusy(true);setError('');setNotice('');try{const latest=await api.project(project.id);setVersion(latest.version);setCanReload(false);setNotice('Đã tải version hiện hành; bản nháp được giữ. Kiểm tra trước khi lưu lại.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AdminFormDialog title={project?'Sửa dự án':'Tạo dự án'} onClose={close} confirmation={confirmation} busy={busy} wide={!project}><form className="admin-card admin-form" onSubmit={save} onInvalid={()=>{setCanReload(false);setNotice('');setError('Kiểm tra các trường bắt buộc được đánh dấu trước khi lưu dự án.');}}>{error&&<p role="alert">{error}</p>}{notice&&<p ref={noticeRef} tabIndex={-1} role="status">{notice}</p>}<fieldset disabled={busy}>
 <section className="admin-form-section"><h3>Thông tin dự án</h3><div className="admin-form-grid">
 {!project&&<label>Mã dự án<input required title="2–32 ký tự: chữ, số, dấu gạch ngang hoặc gạch dưới" pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,31}" maxLength={32} value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})}/></label>}
 <label>Tên dự án<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
 <label className="admin-form-full">Mô tả<textarea maxLength={500} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
 <label>Múi giờ<input required maxLength={50} value={draft.timezone} onChange={e=>setDraft({...draft,timezone:e.target.value})}/></label>
 </div></section>
 {!project&&<div className="admin-project-resources"><section className="admin-form-section"><h3>Thành viên & người quản lý</h3><p>Chọn ít nhất một PM. Có thể bổ sung thành viên sau khi tạo.</p><MemberPicker value={members} onChange={changeMembers} api={api}/></section>{api.assets&&<section className="admin-form-section"><InitialDevicePicker value={devices} onChange={setDevices} members={members} api={api}/></section>}</div>}
 <div className="admin-actions"><button type="submit">{busy?'Đang xử lý…':project?'Lưu dự án':'Tạo dự án'}</button>{onCancel&&<button type="button" onClick={close}>Hủy</button>}{canReload&&<button type="button" onClick={reloadVersion}>Tải version hiện hành, giữ bản nháp</button>}
 </div></fieldset></form></AdminFormDialog>;
}
