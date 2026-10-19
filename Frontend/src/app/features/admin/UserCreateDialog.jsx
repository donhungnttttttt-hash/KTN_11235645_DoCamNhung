import React,{useEffect,useId,useRef,useState} from 'react';
import {AdminFormDialog,useAdminFormClose} from './AdminFormDialog';
import {adminApi} from '../../services/api/admin';
import './admin.css';

/** The delegated entry offers only TESTER; the server remains the permission boundary. */
export function UserCreateDialog({api=adminApi,onSaved,onCancel,testerOnly=false}) {
 const [draft,setDraft]=useState({username:'',displayName:'',password:'',role:'TESTER'});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [initial]=useState(draft);
 const {close,confirmation}=useAdminFormClose(onCancel,busy,Object.keys(initial).some(key=>draft[key]!==initial[key]));
 const lock=useRef(false),feedback=useRef(null),live=useRef(true),id=useId();
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 async function save(event){
  event.preventDefault();if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{await api.createUser({...draft,...(testerOnly?{role:'TESTER'}:{})});if(live.current)onSaved(draft.displayName);}
  catch(failure){if(live.current)setError(failure.message);}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 return <AdminFormDialog title={testerOnly?'Tạo tài khoản Tester':'Tạo tài khoản'} onClose={close} confirmation={confirmation} busy={busy}>
  <form className="admin-card admin-form admin-account-create" onSubmit={save} onInvalid={()=>setError('Kiểm tra các trường bắt buộc và hướng dẫn bên dưới trước khi lưu.')}>
   {testerOnly&&<p>Tạo tài khoản kiểm thử viên theo quyền được Admin cấp. Tài khoản mới chưa tự tham gia dự án.</p>}
   {error&&<p ref={feedback} tabIndex={-1} role="alert">{error}</p>}
   <fieldset disabled={busy}>
    <div className="admin-field-help"><label>Tên đăng nhập<input autoComplete="off" autoCapitalize="none" spellCheck="false" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" aria-describedby={`${id}-username`} value={draft.username} onChange={e=>setDraft({...draft,username:e.target.value})}/></label><small id={`${id}-username`}>3–64 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang; bắt đầu bằng chữ hoặc số.</small></div>
    <label>Tên hiển thị<input required maxLength={100} value={draft.displayName} onChange={e=>setDraft({...draft,displayName:e.target.value})}/></label>
    <div className="admin-field-help"><label>Mật khẩu<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby={`${id}-password`} value={draft.password} onChange={e=>setDraft({...draft,password:e.target.value})}/></label><small id={`${id}-password`}>Từ 12 đến 128 ký tự. Có thể dán hoặc dùng trình quản lý mật khẩu.</small></div>
    {!testerOnly&&<label>Vai trò tài khoản<select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}>{['TESTER','DEV','PM','ADMIN'].map(role=><option key={role}>{role}</option>)}</select></label>}
    <div className="admin-actions"><button type="submit">{busy?'Đang tạo…':'Lưu tài khoản'}</button><button type="button" onClick={close}>Hủy</button></div>
   </fieldset>
  </form>
 </AdminFormDialog>;
}
