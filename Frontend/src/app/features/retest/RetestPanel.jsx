import React, { useCallback, useEffect, useRef, useState } from 'react';
import { retestApi } from '../../services/api/retest';
import { workItemsApi } from '../../services/api/workItems';
import { Button } from '../work-items/components';
import { WorkField, WorkSelect } from '../work-items/WorkItemForm';
import { CoverageEditor } from './CoverageEditor';
import { RetestResult } from './RetestResult';
import { CoverageTable, useRetestAction, RetestError, scopeLabel, requestLabels } from './shared';
import './retest.css';

export function RetestPanel({ projectId, bug, canManage, writable, onChanged }) {
  const [data,setData]=useState(null),[files,setFiles]=useState([]),[error,setError]=useState(''),[editor,setEditor]=useState(false),[active,setActive]=useState(null);
  const action=useRetestAction(),generation=useRef(0);
  const load=useCallback(async()=>{const current=++generation.current;
    const [result,attachments]=await Promise.all([retestApi.summary(projectId,bug.id),workItemsApi.attachments(projectId,bug.id)]);
    if(current!==generation.current)return;setData(result);setFiles(attachments);setError('');return result;
  },[projectId,bug.id,bug.version]);
  useEffect(()=>{let live=true;load().catch(e=>{if(live)setError(e.message);});return()=>{live=false;generation.current++;};},[load]);
  async function changed(){await load();await onChanged();}
  function save(kind,body){action.perform(()=>retestApi[kind](projectId,bug.id,{...body,expectedVersion:data.bugVersion}),async()=>{setEditor(false);await changed();});}
  const terminal=['closed','unreproducible','wontfix'].includes(data?.status),manage=canManage&&writable;
  return <section className="wi-section rt-panel"><div className="rt-heading"><h3>Kiểm thử lại & đóng lỗi</h3><Button disabled={action.busy} onClick={()=>action.perform(load)}>Tải lại retest</Button></div>
    <p className="wi-note">TMS quản lý trạng thái nội bộ. Xác minh riêng bug không đổi kết quả NG của toàn bộ case.</p>
    {error&&<p role="alert" className="ex-error">{error}</p>}<RetestError action={action} reload={load}/>
    {data&&<><div className="rt-progress"><strong>{data.passedCount} / {data.totalCount} mục đạt</strong><span>{terminal?'Lỗi đã kết thúc':data.canClose?'Đủ phạm vi, chờ PM đóng lỗi':data.coverage?'Cần hoàn tất các mục còn thiếu':'PM chưa xác nhận phạm vi cho bản sửa này'}</span></div>
      {data.items.length>0&&<CoverageTable items={data.items}/>}
      {data.otherOpenBugs.length>0&&<p className="rt-warning">Cùng lượt kiểm thử còn lỗi khác: {data.otherOpenBugs.map(b=>b.key).join(', ')}. Xác minh bug này không đóng các lỗi đó.</p>}
      {manage&&data.status==='resolved'&&<><Button disabled={action.busy} onClick={()=>setEditor(v=>!v)}>{editor?'Ẩn chọn phạm vi':'Chọn toàn bộ phạm vi retest'}</Button>
        {editor&&<CoverageEditor projectId={projectId} items={data.items} busy={action.busy||action.conflict} onSubmit={body=>save('coverage',body)}/>}
        {data.coverage&&<details className="wi-section"><summary>Phân công yêu cầu kiểm thử lại</summary><RequestForm key={data.coverage.id} data={data} busy={action.busy||action.conflict} onSubmit={body=>save('create',body)}/></details>}
      </>}
      <div className="rt-requests">{data.requests.map(request=><button type="button" className="rt-request" key={request.id} onClick={()=>setActive(request.id)}><strong>#{request.id} · {request.assigneeName}</strong><span>{scopeLabel(request.verificationScope)} · {request.environmentName} / {request.deviceName}</span><small>{requestLabels[request.status]}</small></button>)}{!data.requests.length&&<p className="wi-note">Chưa có yêu cầu kiểm thử lại.</p>}</div>
      {active&&<RetestResult key={active} projectId={projectId} requestId={active} writable={writable} onSaved={changed} onClose={()=>setActive(null)}/>}
      {manage&&<details className="wi-section"><summary>{terminal?'Mở lại lỗi':'Ghi nhận quyết định đóng lỗi'}</summary><ClosureForm key={terminal?'reopen':'close'} terminal={terminal} ready={data.canClose} files={files} busy={action.busy||action.conflict} onSubmit={body=>save(terminal?'reopen':'close',body)}/></details>}
      {data.decisions.map(d=><article className="wi-history-item" key={d.id}><strong>{d.actor} · {({FIXED:'Hoàn thành',UNREPRODUCIBLE:'Không tái hiện',WONTFIX:'Không xử lý',REOPEN:'Mở lại'})[d.kind]}</strong><p>{d.reason}</p>{d.sourceReference&&<small>Nguồn xác nhận: {d.sourceReference}</small>}</article>)}
    </>}
  </section>;
}

function RequestForm({data,busy,onSubmit}) {
  const groupKey=i=>`${i.environmentId}:${i.deviceId}:${i.assigneeMembershipId}`;
  const groups=[...new Map(data.items.map(i=>[groupKey(i),{id:groupKey(i),name:`${i.environmentName} / ${i.deviceName} · ${i.assigneeName}`}])).values()];
  const [group,setGroup]=useState(groups[0]?.id||''),[selected,setSelected]=useState([]),[scope,setScope]=useState('BUG_ONLY'),[reason,setReason]=useState('');
  const key=useRef(crypto.randomUUID());const reset=()=>{key.current=crypto.randomUUID();};
  const items=data.items.filter(i=>groupKey(i)===group);
  return <form className="wi-form" onSubmit={e=>{e.preventDefault();onSubmit({coverageRevisionId:data.coverage.id,coverageItemIds:selected,verificationScope:scope,assigneeMembershipId:items[0].assigneeMembershipId,reason,requestKey:key.current});}}><fieldset disabled={busy} className="rt-fieldset">
    <WorkSelect label="Cấu hình và người thực hiện" required items={groups} value={group} onChange={v=>{reset();setGroup(v);setSelected([]);}}/>
    <CoverageTable items={items} selected={selected} onSelect={id=>{reset();setSelected(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);}}/>
    <WorkSelect label="Phạm vi thực hiện" required items={[{id:'BUG_ONLY',name:'Chỉ xác minh bug'},{id:'FULL_CASE',name:'Chạy lại toàn bộ case'}]} value={scope} onChange={v=>{reset();setScope(v);}}/>
    <WorkField label="Hướng dẫn retest"><textarea required maxLength={1000} value={reason} onChange={e=>{reset();setReason(e.target.value);}}/></WorkField>
    <Button primary type="submit" disabled={busy||!selected.length||!selected.every(id=>items.some(item=>item.id===id))}>Tạo yêu cầu retest</Button></fieldset>
  </form>;
}
function ClosureForm({terminal,ready,files,busy,onSubmit}) {
  const [kind,setKind]=useState('FIXED'),[reason,setReason]=useState(''),[evidence,setEvidence]=useState(''),[source,setSource]=useState('');
  return <form className="wi-form" onSubmit={e=>{e.preventDefault();onSubmit(terminal?{reason}:{kind,reason,evidenceAttachmentId:evidence||null,sourceReference:source});}}><fieldset disabled={busy} className="rt-fieldset">
    {!terminal&&<WorkSelect label="Lý do kết thúc" required items={[{id:'FIXED',name:'Đã sửa và xác minh đủ'},{id:'UNREPRODUCIBLE',name:'Không tái hiện'},{id:'WONTFIX',name:'Không xử lý'}]} value={kind} onChange={setKind}/>}
    <WorkField label={terminal?'Lý do mở lại':'Nội dung quyết định'}><textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></WorkField>
    {!terminal&&kind!=='FIXED'&&<><WorkSelect label="Chứng cứ quyết định" required items={files} value={evidence} onChange={setEvidence}/><WorkField label="Nguồn xác nhận quyết định"><input required maxLength={1000} value={source} onChange={e=>setSource(e.target.value)}/></WorkField><p className="wi-note">Tải chứng cứ lên ở mục Chứng cứ, sau đó bấm Tải lại retest để chọn.</p></>}
    {!terminal&&kind==='FIXED'&&!ready&&<p className="rt-warning">Chưa đủ kết quả đạt trên toàn phạm vi hiện hành.</p>}
    <Button primary type="submit" disabled={busy||(!terminal&&kind==='FIXED'&&!ready)}>{terminal?'Mở lại lỗi':'Xác nhận đóng lỗi'}</Button></fieldset>
  </form>;
}
