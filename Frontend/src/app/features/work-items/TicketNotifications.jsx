import React,{useEffect,useRef,useState} from 'react';
import {Bell} from 'lucide-react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {Modal} from './components';
import './feature-issues.css';

export function TicketNotifications({api=featureIssuesApi,navigate=path=>{window.location.hash=path;}}) {
 const [open,setOpen]=useState(false),[data,setData]=useState(null),[page,setPage]=useState(0),[reload,setReload]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lifetime=useRef(null),lock=useRef(false),generation=useRef(0),size=20;
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;return()=>controller.abort();},[api]);
 useEffect(()=>{
  const controller=new AbortController(),request=++generation.current;setLoading(true);setError('');
  api.notifications({page,size},{signal:controller.signal}).then(value=>{if(!controller.signal.aborted&&request===generation.current)setData(value);}).catch(e=>{if(!controller.signal.aborted&&request===generation.current){if([401,403,404].includes(e.status))setData(null);setError(e.message);}}).finally(()=>{if(!controller.signal.aborted&&request===generation.current)setLoading(false);});
  return()=>controller.abort();
 },[api,page,reload]);
 async function read(item,follow){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');const signal=lifetime.current.signal;generation.current++;
  try{
   // Revalidate current access even for an already read notice before following a private link.
   const result=await api.readNotification(item.id,{signal});if(signal.aborted)return;
   setData(old=>old?{...old,unreadCount:Math.max(0,old.unreadCount-(item.readAt?0:1)),items:old.items.map(value=>value.id===item.id?{...value,readAt:result.readAt}:value)}:old);setNotice('Đã đánh dấu đã đọc.');
   if(follow){setOpen(false);navigate(`/board/issue/${item.ticketId}?projectId=${item.projectId}&workspace=1`);}
  }catch(e){if(!signal.aborted){if([401,403,404].includes(e.status)){setData(old=>old?{...old,items:old.items.filter(value=>value.id!==item.id),unreadCount:Math.max(0,old.unreadCount-(item.readAt?0:1)),totalItems:Math.max(0,old.totalItems-1)}:old);setError('Thông báo không còn truy cập được.');}else setError(e.message);}}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);setLoading(false);}}
 }
 const unread=data?.unreadCount;
 return <><button type="button" className="ticket-notification-bell" aria-label={unread==null?'Thông báo Ticket':`Thông báo Ticket (${unread} chưa đọc)`} title="Thông báo Ticket" onClick={()=>{setOpen(true);setReload(value=>value+1);}}><Bell size={19} aria-hidden="true"/>{unread>0&&<span aria-hidden="true">{unread>99?'99+':unread}</span>}{error&&!open&&<span className="ticket-notification-error" aria-hidden="true">!</span>}</button>
  {open&&<Modal title="Thông báo Ticket" busy={busy} onClose={()=>setOpen(false)}><section aria-busy={loading||busy}><button type="button" className="cat-btn" disabled={loading||busy} onClick={()=>setReload(value=>value+1)}>Tải lại thông báo</button>{loading&&<p role="status">Đang tải thông báo…</p>}{busy&&<p role="status">Đang xác nhận đã đọc…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
   <p>{data?.unreadCount??'—'} chưa đọc</p>{data?.items.map(item=><article className="ticket-notification-item" key={item.id}><p><strong>{item.readAt?'Đã đọc':'Chưa đọc'}</strong> · {item.actorName}</p><button type="button" className="td-file-link" disabled={busy||loading} aria-label={`Mở ${item.ticketKey} · ${item.title}`} onClick={()=>read(item,true)}>{item.ticketKey} · {item.title}</button><p>{item.message}</p><time>{item.createdAt}</time>{!item.readAt&&<button className="cat-btn" disabled={busy||loading} onClick={()=>read(item,false)}>Đánh dấu đã đọc {item.ticketKey}</button>}</article>)}{!loading&&data?.items.length===0&&<p>Chưa có thông báo Ticket.</p>}
   <div className="td-pagination"><span>Trang {page+1} · {data?.totalItems??0} thông báo</span><button className="cat-btn" disabled={busy||loading||page===0} onClick={()=>setPage(value=>value-1)}>Thông báo trước</button><button className="cat-btn" disabled={busy||loading||(page+1)*size>=(data?.totalItems??0)} onClick={()=>setPage(value=>value+1)}>Thông báo tiếp</button></div>
  </section></Modal>}
 </>;
}
