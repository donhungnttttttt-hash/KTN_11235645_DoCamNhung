import {Users} from 'lucide-react';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {featuresApi} from '../../services/api/features';
import {projectsApi} from '../../services/api/projects';
import {requestKey} from './testingState';
import './document-owners.css';

export function DocumentOwners({projectId,document:doc,canManage,onSaved,disabled=false}){
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),anchor=useRef(null);
 const names=doc.assignees?.map(member=>member.name).join(', ');
 function close(){setOpen(false);anchor.current?.focus();}
 if(!canManage)return <span>{names||'Chưa phân công'}</span>;
 return <><span className="testing-owner-names">{names||'Chưa phân công'}</span><button title="Chọn người phụ trách" ref={anchor} className="cat-btn testing-icon-action" disabled={disabled||saving} aria-label={`Chọn người phụ trách · ${doc.fileName}`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Users size={17} aria-hidden="true"/></button>
 {open&&<OwnerPicker projectId={projectId} documentId={doc.id} anchor={anchor} onClose={close} onSaved={onSaved} onBusyChange={setSaving}/>}</>;
}
function OwnerPicker({projectId,documentId,anchor,onClose,onSaved,onBusyChange}){
 const [search,setSearch]=useState('');
 const [members,setMembers]=useState(null),[selected,setSelected]=useState([]),[version,setVersion]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[retry,setRetry]=useState(0),[position,setPosition]=useState({top:0,left:0,width:300,maxHeight:360});
 const popup=useRef(null),live=useRef(true),lock=useRef(false),key=useRef(requestKey());
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false);},[busy,onBusyChange]);
 useEffect(()=>{
  let active=true;setError('');setMembers(null);
  Promise.all([projectsApi.listMembers(projectId),featuresApi.owners(projectId,documentId)]).then(([users,saved])=>{
   if(!active)return;
   const activeUsers=users.filter(m=>m.active!==false&&m.enabled!==false),activeIds=new Set(activeUsers.map(m=>Number(m.membershipId??m.id)));
   setMembers([...activeUsers,...saved.items.filter(m=>!activeIds.has(Number(m.membershipId))).map(m=>({membershipId:m.membershipId,displayName:m.name,unavailable:true}))]);
   setSelected(saved.items.map(m=>Number(m.membershipId)));setVersion(saved.version);
  }).catch(err=>{if(active)setError(err.message||'Chưa tải được thành viên.');});return()=>{active=false;};
 },[projectId,documentId,retry]);
 useLayoutEffect(()=>{
  function place(){const rect=anchor.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(320,window.innerWidth-24),height=Math.min(360,window.innerHeight-24),below=window.innerHeight-rect.bottom-12;const top=below>=Math.min(height,200)?rect.bottom+6:Math.max(12,rect.top-height-6);setPosition({width,left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top,maxHeight:Math.max(100,Math.min(height,window.innerHeight-top-12))});}
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[anchor]);
 useEffect(()=>{popup.current?.focus();},[]);
 useEffect(()=>{const outside=event=>{if(!lock.current&&!popup.current?.contains(event.target)&&!anchor.current?.contains(event.target))onClose();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[anchor,onClose]);
 async function save(){
  if(lock.current||!members||conflict)return;lock.current=true;setBusy(true);setError('');
  try{await featuresApi.setOwners(projectId,documentId,{expectedVersion:version,requestKey:key.current,membershipIds:selected});if(live.current){await onSaved();onClose();}}
  catch(err){if(live.current){setError(err.message||'Chưa lưu được người phụ trách.');setConflict(err.status===409);}}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 async function reloadVersion(){setBusy(true);try{const current=await featuresApi.owners(projectId,documentId);if(live.current){setVersion(current.version);key.current=requestKey();setConflict(false);setError('Đã tải phiên bản mới. Kiểm tra lựa chọn trước khi lưu.');}}catch(err){if(live.current)setError(err.message);}finally{if(live.current)setBusy(false);}}
 return createPortal(<section ref={popup} role="dialog" aria-label="Chọn người phụ trách file" aria-busy={busy} tabIndex={-1} className="testing-owner-picker" style={position} onKeyDown={event=>{if(event.key==='Escape'&&!busy){event.stopPropagation();onClose();}}}>
  <header><strong>Người phụ trách file</strong><button type="button" disabled={busy} onClick={onClose} aria-label="Đóng chọn người phụ trách">×</button></header>
  <input type="search" aria-label="Tìm người phụ trách" placeholder="Tìm thành viên…" value={search} onChange={e=>setSearch(e.target.value)} disabled={busy}/>
  {!members&&!error&&<p role="status">Đang tải thành viên…</p>}
  {members&&<div className="testing-owner-options">{members.filter(m=>`${m.displayName} ${m.username||''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(member=>{const id=Number(member.membershipId??member.id);return <label key={id}><input type="checkbox" disabled={busy||(member.unavailable&&!selected.includes(id))} checked={selected.includes(id)} onChange={e=>{setSelected(previous=>e.target.checked?[...previous,id]:previous.filter(value=>value!==id));key.current=requestKey();}}/><span>{member.displayName}{member.username&&<small>{member.username}</small>}{member.unavailable&&<small>Không còn hoạt động · bỏ chọn để gỡ</small>}</span></label>;})}{!members.length&&<p>Chưa có thành viên đang hoạt động.</p>}</div>}
  {error&&<p role="alert">{error}</p>}
  {!members&&error&&<button onClick={()=>setRetry(value=>value+1)}>Thử lại danh sách</button>}
  {conflict&&<button disabled={busy} onClick={reloadVersion}>Tải phiên bản mới</button>}
  <footer><button type="button" disabled={busy} onClick={onClose}>Hủy</button><button type="button" disabled={busy||!members||conflict} onClick={save}>{busy?'Đang lưu…':'Lưu người phụ trách'}</button></footer>
 </section>,document.body);
}
