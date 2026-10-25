import React,{useEffect,useId,useRef,useState} from 'react';
import {AdminFormDialog,useAdminFormClose} from './AdminFormDialog';
import {adminApi} from '../../services/api/admin';

export function UserPasswordResetDialog({account,self=false,api=adminApi,onSaved,onCancel}) {
 const [password,setPassword]=useState(''),[confirmationPassword,setConfirmationPassword]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(null);
 const lock=useRef(false),live=useRef(true),feedback=useRef(null),id=useId();
 const conflict=error?.code==='VERSION_CONFLICT';
 const {close,confirmation}=useAdminFormClose(onCancel,busy,!!password||!!confirmationPassword);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 async function save(event){
  event.preventDefault();if(lock.current||conflict)return;
  if(password.length<12||password.length>128||!password.trim()){setError({message:'Mật khẩu mới cần 12–128 ký tự và không chỉ gồm khoảng trắng.'});return;}
  if(password!==confirmationPassword){setError({message:'Mật khẩu nhập lại không khớp.'});return;}
  lock.current=true;setBusy(true);setError(null);
  try{const saved=await api.resetUserPassword(account.id,{newPassword:password,expectedVersion:account.version});if(live.current){setPassword('');setConfirmationPassword('');onSaved(saved);}}
  catch(failure){if(live.current){setPassword('');setConfirmationPassword('');setError(failure);}}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 return <AdminFormDialog title="Đặt lại mật khẩu" onClose={close} busy={busy} confirmation={confirmation}>
  <form className="admin-card admin-form" onSubmit={save} onInvalid={()=>setError({message:'Kiểm tra các trường mật khẩu trước khi lưu.'})}>
   <p><strong>{account.displayName}</strong> · @{account.username}</p>
   <p>{self?'Bạn sẽ cần đăng nhập lại bằng mật khẩu mới sau khi lưu.':'Các phiên đăng nhập của người dùng sẽ kết thúc sau khi lưu. Người dùng cần đăng nhập bằng mật khẩu mới.'}</p>
   {error&&<div ref={feedback} tabIndex={-1} role="alert"><p>{error.message}</p>{conflict&&<><p>Tài khoản đã thay đổi. Tải lại trước khi đặt mật khẩu mới.</p><button type="button" onClick={close}>Đóng và tải lại</button></>}</div>}
   <fieldset disabled={busy}>
    <div className="admin-field-help"><label>Mật khẩu mới<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby={`${id}-password`} value={password} onChange={event=>setPassword(event.target.value)}/></label><small id={`${id}-password`}>Từ 12 đến 128 ký tự. Có thể dán hoặc dùng trình quản lý mật khẩu.</small></div>
    <label>Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmationPassword} onChange={event=>setConfirmationPassword(event.target.value)}/></label>
    <div className="admin-actions"><button type="submit" disabled={conflict}>{busy?'Đang lưu…':'Lưu mật khẩu mới'}</button><button type="button" onClick={close}>Hủy</button></div>
   </fieldset>
  </form>
 </AdminFormDialog>;
}
