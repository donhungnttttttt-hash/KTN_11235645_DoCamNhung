import React,{useEffect,useId,useRef,useState} from 'react';
import {AdminFormDialog,useAdminFormClose} from './AdminFormDialog';
import {adminApi} from '../../services/api/admin';

export function UserEditDialog({account,self=false,api=adminApi,onSaved,onCancel}) {
 const [username,setUsername]=useState(account.username),[displayName,setDisplayName]=useState(account.displayName);
 const [busy,setBusy]=useState(false),[error,setError]=useState(null);
 const lock=useRef(false),live=useRef(true),feedback=useRef(null),id=useId();
 const changes={...(username.toLowerCase()!==account.username?{username:username.toLowerCase()}:{}),...(displayName.trim()!==account.displayName?{displayName:displayName.trim()}:{})};
 const dirty=username!==account.username||displayName!==account.displayName;
 const conflict=error?.code==='VERSION_CONFLICT';
 const {close,confirmation}=useAdminFormClose(onCancel,busy,dirty);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 async function save(event){
  event.preventDefault();if(lock.current||conflict)return;
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(username)){setError({message:'Tên đăng nhập cần 3–64 ký tự chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.'});return;}
  if(!displayName.trim()||displayName.length>100){setError({message:'Tên hiển thị không được để trống và tối đa 100 ký tự.'});return;}
  if(!Object.keys(changes).length)return;
  lock.current=true;setBusy(true);setError(null);
  try{const saved=await api.updateUser(account.id,{...changes,expectedVersion:account.version});if(live.current)onSaved(saved);}
  catch(failure){if(live.current)setError(failure);}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 return <AdminFormDialog title="Sửa thông tin tài khoản" onClose={close} busy={busy} confirmation={confirmation}>
  <form className="admin-card admin-form" onSubmit={save} onInvalid={()=>setError({message:'Kiểm tra các trường bắt buộc và hướng dẫn bên dưới trước khi lưu.'})}>
   <p>Vai trò hệ thống: <strong>{account.role}</strong></p>
   <p id={`${id}-session`}>{self?'Bạn sẽ cần đăng nhập lại sau khi lưu thay đổi thông tin của mình.':'Người dùng sẽ cần đăng nhập lại sau khi thông tin được thay đổi.'}</p>
   {error&&<div ref={feedback} tabIndex={-1} role="alert"><p>{error.message}</p>{conflict&&<><p>Tài khoản đã được cập nhật ở nơi khác. Đóng bản nháp và tải lại trước khi sửa tiếp.</p><button type="button" onClick={close}>Đóng và tải lại</button></>}</div>}
   <fieldset disabled={busy}>
    <div className="admin-field-help"><label>Tên đăng nhập<input autoComplete="off" autoCapitalize="none" spellCheck="false" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" aria-describedby={`${id}-username ${id}-session`} value={username} onChange={event=>setUsername(event.target.value)}/></label><small id={`${id}-username`}>3–64 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang; bắt đầu bằng chữ hoặc số. Tên được lưu bằng chữ thường.</small></div>
    <label>Tên hiển thị<input required maxLength={100} value={displayName} onChange={event=>setDisplayName(event.target.value)}/></label>
    <div className="admin-actions"><button type="submit" disabled={conflict||!Object.keys(changes).length}>{busy?'Đang lưu…':'Lưu thông tin'}</button><button type="button" onClick={close}>Hủy</button></div>
   </fieldset>
  </form>
 </AdminFormDialog>;
}
