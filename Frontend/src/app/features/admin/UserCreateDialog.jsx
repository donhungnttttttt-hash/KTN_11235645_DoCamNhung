import React,{useEffect,useId,useRef,useState} from 'react';
import {AdminFormDialog,useAdminFormClose} from './AdminFormDialog';
import {adminApi} from '../../services/api/admin';
import './admin.css';

/** Delegated project administrators create ordinary users; the server enforces the same boundary. */
export function UserCreateDialog({api=adminApi,onSaved,onCancel,ordinaryOnly=false}) {
 const [draft,setDraft]=useState({username:'',displayName:'',password:'',isProjectAdmin:false,isGuest:false});
 const [conflict,setConflict]=useState(false),warningReturnFocus=useRef(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [initial]=useState(draft);
 const {close,confirmation}=useAdminFormClose(onCancel,busy,Object.keys(initial).some(key=>draft[key]!==initial[key]));
 const lock=useRef(false),feedback=useRef(null),live=useRef(true),id=useId();
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 async function save(event){
  event.preventDefault();if(lock.current)return;
  if(!ordinaryOnly&&draft.isProjectAdmin&&draft.isGuest){warningReturnFocus.current=document.activeElement;setConflict(true);return;}
  lock.current=true;setBusy(true);setError('');
  try{await api.createUser({...draft,...(ordinaryOnly?{isProjectAdmin:false,isGuest:false}:{})});if(live.current)onSaved(draft.displayName);}
  catch(failure){if(live.current)setError(failure.message);}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 return <><div inert={conflict?'':undefined} aria-hidden={conflict?'true':undefined}><AdminFormDialog title="Tạo tài khoản" onClose={close} confirmation={confirmation} busy={busy}>
  <form className="admin-card admin-form admin-account-create" onSubmit={save} onInvalid={()=>setError('Kiểm tra các trường bắt buộc và hướng dẫn bên dưới trước khi lưu.')}>
   {ordinaryOnly&&<p>Tạo User thường theo quyền được Admin tổng cấp. Tài khoản mới chưa tự tham gia dự án.</p>}
   {error&&<p ref={feedback} tabIndex={-1} role="alert">{error}</p>}
   <fieldset disabled={busy}>
    <div className="admin-field-help"><label>ID đăng nhập<input autoComplete="off" autoCapitalize="none" spellCheck="false" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,63}" aria-describedby={`${id}-username`} value={draft.username} onChange={e=>setDraft({...draft,username:e.target.value})}/></label><small id={`${id}-username`}>3–64 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang; bắt đầu bằng chữ hoặc số.</small></div>
    <label>Tên<input required maxLength={100} value={draft.displayName} onChange={e=>setDraft({...draft,displayName:e.target.value})}/></label>
    <div className="admin-field-help"><label>Mật khẩu<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby={`${id}-password`} value={draft.password} onChange={e=>setDraft({...draft,password:e.target.value})}/></label><small id={`${id}-password`}>Từ 12 đến 128 ký tự. Có thể dán hoặc dùng trình quản lý mật khẩu.</small></div>
    {!ordinaryOnly&&<div className="account-type-options">
     <p>Không chọn: User thường, thực hiện công việc kiểm thử và xử lý lỗi.</p>
     <label><input type="checkbox" aria-describedby={`${id}-admin`} checked={draft.isProjectAdmin} onChange={e=>setDraft({...draft,isProjectAdmin:e.target.checked})}/>Admin</label>
     <small id={`${id}-admin`}>Quản lý dự án, quyền tương đương PM; không phải Admin tổng.</small>
     <label><input type="checkbox" aria-describedby={`${id}-guest`} checked={draft.isGuest} onChange={e=>setDraft({...draft,isGuest:e.target.checked})}/>Khách</label>
     <small id={`${id}-guest`}>Chỉ xem tiến độ, biểu đồ và báo cáo của dự án được thêm vào.</small>
    </div>}
    <div className="admin-actions"><button type="submit">{busy?'Đang tạo…':'Lưu tài khoản'}</button><button type="button" onClick={close}>Hủy</button></div>
   </fieldset>
  </form>
 </AdminFormDialog></div>{conflict&&<AdminFormDialog title="Không thể chọn đồng thời Admin và Khách" onClose={()=>setConflict(false)} returnFocusRef={warningReturnFocus} focusTitle={false}>
  <p>Chỉ chọn một loại tài khoản, hoặc bỏ cả hai để tạo User thường. Nội dung đã nhập được giữ nguyên.</p>
  <button type="button" data-dialog-initial-focus onClick={()=>setConflict(false)}>Chọn lại</button>
 </AdminFormDialog>}</>;
}
