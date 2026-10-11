import React,{useRef,useState} from 'react';
import {SelectionTable} from '../../components/SelectionTable';
import {testCasesApi} from '../../services/api/testCases';
import {selectCaseRange} from './caseRange';

export function CaseRangePicker({projectId,document,selected,onChange,onApproved,onReload,busy=false,onBusy=()=>{}}){
 const [range,setRange]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const lock=useRef(false);
 const rows=document.rows,chosen=rows.filter(r=>selected.includes(r.revisionId));
 const drafts=chosen.filter(r=>!r.approved),archived=chosen.some(r=>r.archived);
 function apply(){setError('');setNotice('');try{const matches=selectCaseRange(rows,range);if(matches.some(r=>r.archived||!r.revisionId))throw new Error('Khoảng có case đã lưu trữ hoặc thiếu phiên bản. Kiểm tra lại trước khi chọn.');onChange(matches.map(r=>r.revisionId));setNotice(`Đã chọn ${matches.length} case trong file.`);}catch(e){setError(e.message);onChange([]);}}
 async function approve(){if(lock.current||saving||busy||!drafts.length)return;lock.current=true;setSaving(true);onBusy(true);setError('');try{
  await testCasesApi.approveDocumentRows(projectId,document.document.id,{rows:drafts.map(r=>({rowId:r.rowId,expectedRevisionId:r.revisionId}))});
  onApproved(drafts.map(r=>r.revisionId));setNotice(`Đã duyệt ${drafts.length} case đã chọn.`);
 }catch(e){setError(e.message);}finally{lock.current=false;setSaving(false);onBusy(false);}}
 return <section className="fw-range-picker" aria-label="Chọn phạm vi theo file">
  <strong className="fw-source-name">{document.document.fileName}</strong>
  <div className="fw-range-controls"><label>Khoảng ID case<input aria-label="Khoảng ID case" placeholder="Ví dụ: 1-35" value={range} disabled={saving||busy} onChange={e=>{setRange(e.target.value);setError('');onChange([]);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply();}}}/></label><button type="button" disabled={saving||busy||!range.trim()} onClick={apply}>Chọn khoảng case</button><span>{selected.length} case đã chọn</span></div>
  <p className="fw-range-help">Dùng ID trong file, ví dụ 1-35 hoặc 1-10, 15, 20-35. Không phải số dòng Excel.</p>
  {error&&<p role="alert" className="fw-error">{error} {onReload&&<button type="button" disabled={busy||saving} onClick={()=>{setError('');setNotice('');onReload();}}>Tải lại case trong file</button>}</p>}{notice&&<p role="status">{notice}</p>}
  {!!drafts.length&&<div className="fw-approval-notice"><span>{drafts.length} case đã chọn chưa duyệt. Admin/PM có thể duyệt cùng lúc trước khi giao.</span><button type="button" disabled={busy||saving||archived} onClick={approve}>{saving?'Đang duyệt…':`Duyệt ${drafts.length} case đã chọn`}</button></div>}
  <details><summary>Xem / chọn case thủ công ({rows.length})</summary><fieldset disabled={busy||saving}>
   <SelectionTable label="Case trong file" selected={selected} rows={rows.map(r=>({id:r.revisionId||('row-'+r.rowId),name:`${r.sourceId||r.caseNo} · ${r.caseNo}`,selectLabel:'Chọn '+r.caseNo+' revision '+r.revisionId,description:r.archived?'Đã lưu trữ':r.approved?'Đã duyệt':'Chưa duyệt',disabled:r.archived||!r.revisionId}))} onChange={ids=>{setRange('');onChange(ids);setNotice('');}}/>
  </fieldset></details>
 </section>;
}
