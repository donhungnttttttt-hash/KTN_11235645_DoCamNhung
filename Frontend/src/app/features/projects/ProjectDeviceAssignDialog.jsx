import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AdminFormDialog} from '../admin/AdminFormDialog';
import {InitialDevicePicker} from '../admin/InitialDevicePicker';
import {useAdminRead,ReadState} from '../admin/shared';
import {isHandoverPm} from '../admin/handoverRecipient';

export function ProjectDeviceAssignDialog({projectId,api,onClose,onChanged}) {
 const [selected,setSelected]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [stockRevision,setStockRevision]=useState(0);
 const lock=useRef(false),feedback=useRef(null);
 useEffect(()=>{if(error)feedback.current?.focus();},[error]);
 const load=useCallback(signal=>api.members(projectId,{signal}),[api,projectId]);
 const members=useAdminRead(`device-recipients:${projectId}`,load);
 const eligible=(members.data||[]).filter(isHandoverPm);
 const changeSelected=next=>{setSelected(next);setError('');};
 async function save(e){
  e.preventDefault();if(lock.current||!selected.length)return;
  const missing=selected.filter(item=>!eligible.some(m=>String(m.userId)===String(item.recipientUserId)));
  if(missing.length||new Set(selected.map(item=>item.recipientUserId)).size!==1){setError('Chọn một PM đang hoạt động nhận tất cả máy đã chọn.');feedback.current?.focus();return;}
  lock.current=true;setBusy(true);setError('');setNotice('');let saved=0;
  try{
   for(const item of selected){
    try{await api.assignDevice({projectId:Number(projectId),assetId:item.assetId,recipientUserId:item.recipientUserId,expectedVersion:item.expectedVersion,expectedReturnOn:item.expectedReturnOn||null,handoverNote:item.handoverNote});}
    catch(err){throw new Error(`${item.assetCode}: ${err.message}`);}
    saved++;setSelected(old=>old.filter(a=>a.assetId!==item.assetId));setNotice(`Đã bàn giao ${saved} máy cho dự án.`);
   }
   onClose();
  }catch(err){setError(err.message);}finally{if(saved){setStockRevision(n=>n+1);onChanged(saved);}lock.current=false;setBusy(false);}
 }
 return <AdminFormDialog title="Bổ sung máy vào dự án" wide onClose={onClose} busy={busy}><form className="admin-card admin-form" noValidate onSubmit={save}>
  <p>Chọn máy sẵn sàng trong kho và một PM nhận máy của dự án này.</p><ReadState {...members}/>
  {!members.loading&&members.data&&!eligible.length&&<p>Bổ sung PM đang hoạt động vào dự án trước khi bàn giao. <a href={`#/admin/projects/${projectId}`} onClick={onClose}>Mở thành viên dự án</a></p>}
  <fieldset disabled={busy||members.loading||!!members.error}><InitialDevicePicker title="Máy sẵn sàng trong kho" refreshKey={stockRevision} api={api} members={eligible} value={selected} onChange={changeSelected}/>
   <div className="admin-actions"><div ref={feedback} tabIndex={-1} className="admin-action-feedback">
    {busy&&<p role="status">Đang bàn giao máy đã chọn… Vui lòng đợi kết quả.</p>}{!busy&&notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
    {!busy&&!error&&!selected.length&&<p>Chọn ít nhất một máy để bàn giao.</p>}
   </div><button type="submit" disabled={!selected.length}>{busy?'Đang bàn giao…':'Bàn giao máy đã chọn'}</button><button type="button" onClick={onClose}>Hủy</button><a href="#/admin/devices" aria-disabled={busy||undefined} onClick={e=>{if(busy)e.preventDefault();}}>Nhập máy mới vào kho</a></div>
  </fieldset>
 </form></AdminFormDialog>;
}
