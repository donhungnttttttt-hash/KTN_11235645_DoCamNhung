import React,{useEffect,useRef,useState} from 'react';
import {featuresApi} from '../../services/api/features';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {requestKey} from './testingState';

export function DocumentAssignments({projectId,documentId,data,onClose,onSaved}) {
  const [range,setRange]=useState(()=>data.rows.flatMap((row,index)=>row.assigneeUserId&&row.assigneeUserId===data.selfUserId?[index+1]:[]).join(', '));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[version,setVersion]=useState(data.document.version),[conflict,setConflict]=useState(false);
  const lock=useRef(false),key=useRef(requestKey()),live=useRef(true),focus=useDialogFocus(onClose,busy);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  function parse(value){
    if(!value.trim())return [];
    const positions=new Set();
    for(const part of value.split(',')){
      const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if(!match)throw new Error('Nhập thứ tự case như 1-40, 45, 50-60.');
      const start=Number(match[1]),end=Number(match[2]||match[1]);
      if(start<1||end<start||end>data.rows.length)throw new Error('Phạm vi nằm ngoài số case của file.');
      for(let n=start;n<=end;n++)positions.add(n);
    }
    return [...positions].sort((a,b)=>a-b).map(n=>data.rows[n-1].rowId);
  }
  async function save(event){
    event.preventDefault();if(lock.current||conflict)return;setError('');let rowIds;
    try{rowIds=parse(range);}catch(err){setError(err.message);return;}
    lock.current=true;setBusy(true);
    try{await featuresApi.claim(projectId,documentId,{expectedVersion:version,requestKey:key.current,rowIds});if(live.current){await onSaved();onClose();}}
    catch(err){if(live.current){setError(err.message||'Chưa lưu được phân công. Phạm vi được giữ lại.');setConflict(err.status===409);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  async function reload(){
    setBusy(true);
    try{const latest=await featuresApi.assignments(projectId,documentId);if(live.current){setVersion(latest.version);key.current=requestKey();setConflict(false);setError('Đã tải phiên bản mới; giữ phạm vi bạn đang nhập. Kiểm tra lại trước khi lưu.');}}
    catch(err){if(live.current)setError(err.message||'Chưa tải được phiên bản mới.');}
    finally{if(live.current)setBusy(false);}
  }
  return <div className="ex-modal"><section ref={focus} role="dialog" aria-modal="true" aria-label="Phân công test case" className="td-case-dialog testing-form" tabIndex={-1}>
    <header><h2>Phân công test case</h2><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></header>
    <form className="testing-fields" onSubmit={save}>
      <p>Nhận case bằng tài khoản đang đăng nhập. Nhập thứ tự case trong file (1–{data.rows.length}), không phải ID hoặc số dòng Excel. Để trống để nhả phạm vi của bạn.</p>
      <label>Phạm vi case<input data-dialog-initial-focus value={range} onChange={e=>setRange(e.target.value)} disabled={busy} placeholder="1-40, 45, 50-60"/></label>
      {error&&<p role="alert" className="td-error">{error}</p>}
      {conflict&&<button type="button" className="cat-btn" disabled={busy} onClick={reload}>Tải phiên bản mới, giữ lựa chọn</button>}
      <button className="cat-btn cat-btn-mint" disabled={busy||conflict}>{busy?'Đang lưu…':'Lưu phân công'}</button>
    </form>
  </section></div>;
}
