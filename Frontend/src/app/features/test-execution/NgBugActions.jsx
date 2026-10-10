import React, { useEffect, useState } from 'react';
import { workItemsApi } from '../../services/api/workItems';
import { Modal, Button } from '../work-items/components';
import { WorkField, WorkError } from '../work-items/WorkItemForm';

export function NgBugActions({ projectId, attempt, onLinked }) {
  const [open, setOpen] = useState(false);
  return <div className="wi-actions work-items">
    <Button onClick={() => { window.location.hash = `/board/new?attempt=${attempt.id}`; }}>Tạo bug từ lần #{attempt.attemptNo}</Button>
    <Button onClick={() => setOpen(true)}>Gắn bug đã có · lần #{attempt.attemptNo}</Button>
    {open && <ExistingBugLink projectId={projectId} attemptId={attempt.id} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onLinked(); }} />}
  </div>;
}
export function ExistingBugLink({ projectId, attemptId, onClose, onSaved }) {
  const [keyword,setKeyword]=useState(''),[rows,setRows]=useState(null),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[conflict,setConflict]=useState(false);
  useEffect(()=>{
    let current=true;setRows(null);setSelected('');setError('');
    workItemsApi.list(projectId,{type:'BUG',keyword,size:50,page:0}).then(data=>{if(current)setRows(data);}).catch(e=>{if(current)setError(e.message);});
    return()=>{current=false;};
  },[projectId,keyword,revision]);
  async function link(e){e.preventDefault();const item=rows?.items.find(item=>String(item.id)===selected);if(!item)return;setBusy(true);setError('');
    try{await workItemsApi.link(projectId,item.id,{attemptId,expectedVersion:item.version});onSaved();}
    catch(e){setError(e.message);setConflict(e.status===409);}finally{setBusy(false);}
  }
  return <Modal title="Liên kết NG với bug đã có" onClose={busy?()=>{}:onClose}><form className="wi-form" onSubmit={link}>
    <p className="wi-note">Một bug có thể được theo dõi qua nhiều lần kiểm thử. Liên kết không thay đổi kết quả NG.</p>
    <WorkError error={error} retry={()=>{setConflict(false);setRevision(v=>v+1);}}/>
    <WorkField label="Tìm bug đã có"><input value={keyword} maxLength={200} disabled={busy} onChange={e=>setKeyword(e.target.value)}/></WorkField>
    <WorkField label="Bug cần liên kết"><select value={selected} required disabled={busy||!rows} onChange={e=>setSelected(e.target.value)}><option value="">Chọn bug</option>{rows?.items.map(item=><option key={item.id} value={item.id}>{item.key} · {item.title}</option>)}</select></WorkField>
    {rows&&<p className="wi-note">{rows.items.length}/{rows.totalItems} bug. Nhập từ khóa để thu hẹp kết quả.</p>}
    <Button primary type="submit" disabled={busy||!selected||conflict}>Liên kết bug</Button>
  </form></Modal>;
}
