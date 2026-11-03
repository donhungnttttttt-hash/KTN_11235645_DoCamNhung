import React,{useEffect,useRef,useState} from 'react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {useModalActivity} from './components';
const duties=[['SPEC_REVIEWER','Xác nhận spec'],['BUG_COORDINATOR','Điều phối Bug']];
export function TicketResponsibilities({projectId,api=featureIssuesApi}) {
 const [data,setData]=useState(null),[drafts,setDrafts]=useState({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[reload,setReload]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lifetime=useRef(null),lock=useRef(false);
 useModalActivity(busy,Object.keys(drafts).length>0);
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;setData(null);setDrafts({});return()=>controller.abort();},[projectId,api]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  api.responsibilities(projectId,{signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[projectId,api,reload]);
 function toggle(member,duty){setDrafts(previous=>{const selected=previous[member.membershipId]||member.duties,next=duties.map(([value])=>value).filter(value=>value===duty?!selected.includes(value):selected.includes(value));return {...previous,[member.membershipId]:next};});setNotice('');}
 async function save(member){
  if(lock.current||loading||!data.canManage)return;lock.current=true;setBusy(true);setError('');setNotice('');const signal=lifetime.current.signal;
  try{const fresh=await api.updateResponsibilities(projectId,member.membershipId,{duties:drafts[member.membershipId],expectedVersion:member.version},{signal});if(signal.aborted)return;setData(old=>({...old,members:old.members.map(value=>value.membershipId===member.membershipId?fresh:value)}));setDrafts(previous=>{const next={...previous};delete next[member.membershipId];return next;});setNotice(`Đã lưu trách nhiệm ${member.displayName}.`);}
  catch(e){if(!signal.aborted)setError(e.message+' Bản nháp giữ nguyên. Tải lại trách nhiệm để đối chiếu quyền và version trước khi lưu lại.');}
  finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
 }
 const unavailable=Object.keys(drafts).filter(id=>data&&!data.members.some(member=>String(member.membershipId)===id));
 return <section className="ticket-responsibilities" aria-label="Trách nhiệm Ticket của dự án" aria-busy={loading||busy}><p>Phân công đầu mối xác nhận spec (BA/BrSE) và điều phối Bug (PM Dev). Trách nhiệm không thay đổi vai trò tài khoản hay thành viên dự án.</p><button className="cat-btn" disabled={loading||busy} onClick={()=>setReload(value=>value+1)}>Tải lại trách nhiệm</button>
  {loading&&<p role="status">Đang tải trách nhiệm…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {data&&!data.canManage&&<p role="status">Bạn đang xem trách nhiệm. Quyền chỉnh sửa do máy chủ quyết định.</p>}
  {data?.members.map(member=><section key={member.membershipId} className="ticket-duty-member"><h4>{member.displayName}</h4><p>{member.systemRole} · Thành viên {member.projectRole} · Version {member.version}</p>
   {data.canManage?<fieldset disabled={busy||loading}><legend>Trách nhiệm {member.displayName}</legend>{duties.map(([value,label])=><label className="ticket-checkbox" key={value}><input type="checkbox" aria-label={`${member.displayName} · ${label}`} checked={(drafts[member.membershipId]||member.duties).includes(value)} onChange={()=>toggle(member,value)}/>{label}</label>)}<button className="cat-btn" disabled={!drafts[member.membershipId]} onClick={()=>save(member)}>Lưu trách nhiệm {member.displayName}</button>{drafts[member.membershipId]&&<p className="wi-note">Máy chủ hiện tại: {member.duties.map(d=>duties.find(([value])=>value===d)?.[1]).join(', ')||'Chưa phân công'} · Bản nháp đang được giữ.</p>}</fieldset>:<p>{member.duties.map(d=>duties.find(([value])=>value===d)?.[1]).join(', ')||'Chưa phân công'}</p>}
  </section>)}{data?.members.length===0&&!loading&&<p>Chưa có thành viên đủ điều kiện.</p>}{unavailable.length>0&&<p role="alert">{unavailable.length} bản nháp thuộc thành viên không còn đủ điều kiện. Không thể gửi; đóng và bỏ bản nháp khi đã đối chiếu.</p>}
 </section>;
}
