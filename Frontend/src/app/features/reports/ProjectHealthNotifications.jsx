import React,{useEffect,useState} from 'react';
import {HeartPulse} from 'lucide-react';
import {apiRequest} from '../../services/api/client';
import {Modal} from '../work-items/components';
const healthApi={list:options=>apiRequest('/me/project-health-notifications',options),read:async(id,options)=>{const csrf=await apiRequest('/auth/csrf',options);return apiRequest(`/me/project-health-notifications/${id}/read`,{...options,method:'PUT',headers:{[csrf.headerName]:csrf.token}});}};
export function ProjectHealthNotifications({api=healthApi}){
 const [open,setOpen]=useState(false),[data,setData]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0),[busy,setBusy]=useState(false);
 useEffect(()=>{const c=new AbortController();setError('');api.list({signal:c.signal}).then(x=>{if(!c.signal.aborted)setData(x);}).catch(e=>{if(!c.signal.aborted){setData(null);setError(e.message);}});return()=>c.abort();},[api,reload]);
 useEffect(()=>{const id=setInterval(()=>setReload(x=>x+1),60000);return()=>clearInterval(id);},[]);
 async function read(id){if(busy)return;setBusy(true);try{await api.read(id);setReload(x=>x+1);}catch(e){setError(e.message);setData(null);}finally{setBusy(false);}}
 return <><button className="ticket-notification-bell" title="Sức khỏe dự án" aria-label={`Thông báo sức khỏe dự án (${data?.unreadCount||0} chưa đọc)`} onClick={()=>{setOpen(true);setReload(x=>x+1);}}><HeartPulse size={19}/>{data?.unreadCount>0&&<span>{data.unreadCount}</span>}</button>{open&&<Modal title="Thông báo sức khỏe dự án" busy={busy} onClose={()=>setOpen(false)}>{error&&<p role="alert">{error}</p>}<p>Cảnh báo từ số liệu dự án · 50 thông báo gần nhất</p>{data?.items.map(n=><article className="ticket-notification-item" key={n.id}><h3>{n.projectName}</h3><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString('vi-VN')}</small>{!n.readAt&&<button className="cat-btn" disabled={busy} onClick={()=>read(n.id)}>Đánh dấu đã đọc</button>}</article>)}{data?.items.length===0&&<p>Chưa có cảnh báo sức khỏe dự án.</p>}</Modal>}</>;
}
