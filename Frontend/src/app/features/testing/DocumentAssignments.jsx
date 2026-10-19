import React,{useEffect,useRef,useState} from 'react';
import {featuresApi} from '../../services/api/features';
import {projectsApi} from '../../services/api/projects';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {requestKey} from './testingState';

function ordinals(rows,owner){return rows.flatMap((row,index)=>String(row.assigneeMembershipId)===String(owner)?[index+1]:[]).join(', ');}
export function DocumentAssignments({projectId,documentId,data,onClose,onSaved}) {
  const [members,setMembers]=useState(null),[selected,setSelected]=useState(data.canManage?'':String(data.selfMembershipId||'')),[range,setRange]=useState(()=>data.canManage?'':ordinals(data.rows,data.selfMembershipId)),[changes,setChanges]=useState({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[version,setVersion]=useState(data.document.version),[conflict,setConflict]=useState(false);const lock=useRef(false),key=useRef(requestKey()),live=useRef(true),focus=useDialogFocus(onClose,busy);
  const [membersError,setMembersError]=useState(''),[membersReload,setMembersReload]=useState(0);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{let active=true;setMembers(null);setMembersError('');projectsApi.listMembers(projectId).then(list=>{if(active)setMembers(list.filter(m=>m.projectRole==='TESTER'&&m.active!==false&&m.enabled!==false&&m.systemRole!=='DEV'));}).catch(err=>{if(active)setMembersError(err.message||'Chưa tải được Tester.');});return()=>{active=false;};},[projectId,membersReload]);
  function parse(value){if(!value.trim())return [];const positions=new Set();for(const part of value.split(',')){const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!match)throw new Error('Nhập thứ tự case như 1-40, 45, 50-60.');const start=Number(match[1]),end=Number(match[2]||match[1]);if(start<1||end<start||end>data.rows.length)throw new Error('Phạm vi nằm ngoài số case của file.');for(let n=start;n<=end;n++)positions.add(n);}return [...positions].sort((a,b)=>a-b).map(n=>data.rows[n-1].rowId);}
  function choose(value){if(selected)setChanges(previous=>({...previous,[selected]:range}));setSelected(value);setRange(changes[value]??(!selected&&value&&range.trim()?range:ordinals(data.rows,value)));}
  async function save(event){event.preventDefault();if(lock.current)return;setError('');let scopes;
    try{if(!selected)throw new Error('Chọn Tester.');const staged=data.canManage?{...changes,[selected]:range}:{[data.selfMembershipId]:range};scopes=Object.entries(staged).filter(([member])=>member).map(([member,text])=>({assigneeMembershipId:Number(member),rowIds:parse(text)}));const seen=new Set();for(const scope of scopes)for(const row of scope.rowIds){if(seen.has(row))throw new Error('Các phạm vi vừa chọn bị chồng lấn.');seen.add(row);}}
    catch(err){setError(err.message);return;}
    lock.current=true;setBusy(true);
    try{await featuresApi.assign(projectId,documentId,{expectedVersion:version,requestKey:key.current,changes:scopes});if(live.current){await onSaved();onClose();}}
    catch(err){if(live.current){setError(err.message||'Chưa lưu được phân công. Lựa chọn được giữ lại.');setConflict(err.status===409);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  return <div className="ex-modal"><section ref={focus} role="dialog" aria-modal="true" aria-label="Phân công case" className="td-case-dialog testing-form" tabIndex={-1}><header><h2>Phân công case</h2><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></header><form className="testing-fields" onSubmit={save}>
    <p>Nhập thứ tự case trong file (1–{data.rows.length}), không phải số dòng Excel. Chỉ thay đổi người được chọn; để trống để nhả phần của người đó.</p>
    {data.canManage?<label>Tester<select value={selected} onChange={e=>choose(e.target.value)} disabled={busy||!members}><option value="">Chọn Tester</option>{members?.map(m=><option key={m.membershipId||m.id} value={m.membershipId||m.id}>{m.displayName}</option>)}</select></label>:<p>Bạn chỉ tự nhận hoặc sửa phạm vi của mình.</p>}
    {data.canManage&&!members&&!membersError&&<p role="status">Đang tải danh sách Tester…</p>}
    {membersError&&<p role="alert" className="td-error">{membersError} <button type="button" className="cat-btn" disabled={busy} onClick={()=>setMembersReload(value=>value+1)}>Tải lại danh sách Tester</button></p>}
    <label>Phạm vi case<input data-dialog-initial-focus value={range} onChange={e=>setRange(e.target.value)} disabled={busy} placeholder="1-40, 45, 50-60"/></label>
    {error&&<p role="alert" className="td-error">{error}</p>}{conflict&&<button type="button" className="cat-btn" disabled={busy} onClick={async()=>{setBusy(true);try{const latest=await featuresApi.assignments(projectId,documentId);if(live.current){setVersion(latest.version);key.current=requestKey();setConflict(false);setError('Đã tải phiên bản mới; giữ phạm vi bạn đang nhập. Kiểm tra lại trước khi lưu.');}}catch(err){if(live.current)setError(err.message||'Chưa tải được phiên bản mới.');}finally{if(live.current)setBusy(false);}}}>Tải phiên bản mới, giữ lựa chọn</button>}<button className="cat-btn cat-btn-mint" disabled={busy||!selected||conflict||data.canManage&&!members}>{busy?'Đang lưu…':'Lưu phân công'}</button>
  </form></section></div>;
}
