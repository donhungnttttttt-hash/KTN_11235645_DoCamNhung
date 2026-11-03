import React,{useContext,useEffect,useRef,useState} from 'react';
import {AdminFormDialog,useAdminFormClose} from '../admin/AdminFormDialog';
import {DialogVisibilityContext} from './DialogVisibilityContext';
import {initials,roleLabels} from './AuthProvider';
import {avatarUrl,selfProfileApi} from '../../services/api/selfProfile';
import '../admin/admin.css';
import './self-profile.css';

const fields=['displayName','email','phone','jobTitle','department'];
const values=profile=>Object.fromEntries(fields.map(key=>[key,profile?.[key]||'']));
export function SelfProfileDialog({api=selfProfileApi,onSaved,onCancel}){
 const [profile,setProfile]=useState(null),[draft,setDraft]=useState(values(null));
 const [loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(null),[notice,setNotice]=useState('');
 const visible=useContext(DialogVisibilityContext),live=useRef(true),lock=useRef(false),feedback=useRef(null);
 const dirty=!!profile&&fields.some(key=>draft[key]!==values(profile)[key]),conflict=error?.status===409;
 const {close,confirmation}=useAdminFormClose(onCancel,busy,dirty);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError(null);
  api.get({signal:controller.signal}).then(value=>{if(!controller.signal.aborted){setProfile(value);setDraft(values(value));}})
   .catch(failure=>{if(!controller.signal.aborted)setError(failure);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[api,revision]);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 async function perform(action,message,replaceDraft=false){
  if(lock.current||conflict||!visible)return;lock.current=true;setBusy(true);setError(null);setNotice('');
  try{const saved=await action();if(live.current){setProfile(saved);if(replaceDraft)setDraft(values(saved));setNotice(message);onSaved?.(saved);}}
  catch(failure){if(live.current)setError(failure);}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 function save(event){event.preventDefault();if(!dirty||!draft.displayName.trim())return;
  perform(()=>api.update({...draft,displayName:draft.displayName.trim(),expectedVersion:profile.version,expectedAccountVersion:profile.accountVersion}),'Đã lưu thông tin cá nhân.',true);
 }
 function upload(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(!['image/png','image/jpeg'].includes(file.type)||file.size>2*1024*1024||!file.size){setError(new Error('Chọn ảnh PNG hoặc JPEG có dung lượng tối đa 2 MiB.'));return;}
  perform(()=>api.upload(file,profile),'Đã cập nhật ảnh đại diện.');
 }
 return <div hidden={!visible} inert={!visible?'':undefined}><AdminFormDialog title="Thông tin cá nhân" onClose={close} busy={busy} confirmation={confirmation}>
  <div className="self-profile">
   {loading&&<p role="status">Đang tải hồ sơ…</p>}
   {error&&<div className="self-profile-feedback" role="alert" tabIndex={-1} ref={feedback}><p>{error.message}</p>{!profile&&<button type="button" onClick={()=>setRevision(value=>value+1)}>Thử lại</button>}{conflict&&<p>Nháp vẫn được giữ. Đóng rồi mở lại hồ sơ để lấy dữ liệu mới trước khi sửa tiếp.</p>}</div>}
   {notice&&<p role="status" className="self-profile-success">{notice}</p>}
   {profile&&<>
    <section className="self-profile-avatar-editor" aria-label="Ảnh đại diện">
     <span className="self-profile-avatar">{profile.hasAvatar?<img src={avatarUrl(profile)} alt="Ảnh đại diện của bạn"/>:initials(profile.displayName)}</span>
     <div><label className="self-profile-upload">Chọn ảnh đại diện<input type="file" accept="image/png,image/jpeg" onChange={upload} disabled={busy||conflict}/></label><small>PNG/JPEG · tối đa 2 MiB · tối đa 4096 × 4096 pixel. Ảnh được lưu ngay khi chọn.</small>{profile.hasAvatar&&<button type="button" disabled={busy||conflict} onClick={()=>perform(()=>api.removeAvatar(profile),'Đã xóa ảnh đại diện.')}>Xóa ảnh đại diện</button>}</div>
    </section>
    <form onSubmit={save} onInvalid={()=>setError(new Error('Kiểm tra tên, email và số điện thoại trước khi lưu.'))}>
     <fieldset disabled={busy||loading} className="self-profile-fields">
      <label>ID đăng nhập<input value={profile.username} readOnly autoComplete="username"/></label>
      <label>Loại tài khoản<input value={roleLabels[profile.role]||profile.role} readOnly/></label>
      <label className="self-profile-wide">Tên<input required maxLength={100} autoComplete="name" value={draft.displayName} onChange={e=>setDraft({...draft,displayName:e.target.value})}/></label>
      <label>Email<input type="email" maxLength={254} autoComplete="email" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>
      <label>Số điện thoại<input type="tel" maxLength={30} pattern="[+0-9\(\) .\-]*" autoComplete="tel" value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})}/></label>
      <label>Chức danh<input maxLength={100} autoComplete="organization-title" value={draft.jobTitle} onChange={e=>setDraft({...draft,jobTitle:e.target.value})}/></label>
      <label>Phòng ban<input maxLength={100} value={draft.department} onChange={e=>setDraft({...draft,department:e.target.value})}/></label>
      <p className="self-profile-wide self-profile-help">Chỉ tên là bắt buộc. Thông tin liên hệ chỉ bạn xem trong hồ sơ này. Tạo tài khoản: {new Date(profile.createdAt).toLocaleDateString('vi-VN')}.</p>
      <div className="self-profile-wide self-profile-actions"><button type="submit" className="self-profile-save" disabled={busy||conflict||!dirty||!draft.displayName.trim()}>{busy?'Đang lưu…':'Lưu thông tin'}</button><button type="button" onClick={close}>Đóng</button></div>
     </fieldset>
    </form>
   </>}
  </div>
 </AdminFormDialog></div>;
}
