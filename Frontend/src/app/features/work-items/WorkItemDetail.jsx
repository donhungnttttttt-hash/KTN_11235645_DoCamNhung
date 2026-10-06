import React, { useCallback, useEffect, useRef, useState } from 'react';
import { workItemsApi } from '../../services/api/workItems';
import { Button, StatusBadge, TypeBadge } from './components';
import { WorkField, WorkSelect, WorkError } from './WorkItemForm';
import { EvidencePanel } from './EvidencePanel';
import { TransitionDialog } from './TransitionDialog';
import { typeLabels, priorityLabels, presentItem } from './ProjectData';
import { RetestPanel } from '../retest/RetestPanel';
import { RedminePanel } from '../integrations/RedminePanel';
import { QaPanel } from '../qa/QaPanel';

const time = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
export function WorkItemDetail({ projectId, id, catalogs, canTriage, writable, membershipId, onChanged }) {
  const [record, setItem] = useState(null), [loadedScope, setLoadedScope] = useState(null), [loading, setLoading] = useState(true), [comments, setComments] = useState([]), [history, setHistory] = useState([]), [error, setError] = useState('');
  const [body, setBody] = useState(''), [busy, setBusy] = useState(false), [target, setTarget] = useState(''), [move, setMove] = useState(false);
  const [qaRead, setQaRead] = useState(null);
  const request = useRef(0), commentKey = useRef(crypto.randomUUID()), live = useRef(true);
  const scope = `${projectId}/${id}`, currentScope = useRef(scope); currentScope.current = scope;
  const item = loadedScope === scope ? record : null;
  useEffect(() => { live.current = true; return () => { live.current = false; request.current++; }; }, []);
  const load = useCallback(async () => {
    const generation = ++request.current, targetScope = `${projectId}/${id}`; setLoading(true);
    try { const [latest, notes, events] = await Promise.all([workItemsApi.get(projectId, id), workItemsApi.comments(projectId, id), workItemsApi.history(projectId, id)]);
      if (generation !== request.current || !live.current || currentScope.current !== targetScope) return;
      if (latest.id !== id || (latest.projectId != null && latest.projectId !== projectId)) throw new Error('Chi tiết công việc không khớp ngữ cảnh hiện tại.');
      setItem(latest); setLoadedScope(targetScope); setComments(notes); setHistory(events); setError(''); return latest;
    } catch (e) { if (generation === request.current && live.current && currentScope.current === targetScope) setError(e.message); }
    finally { if (generation === request.current && live.current && currentScope.current === targetScope) setLoading(false); }
  }, [projectId, id]);
  useEffect(() => { load(); return () => { request.current++; }; }, [load]);
  async function comment(e) {
    e.preventDefault();if (!canComment || busy) return; const targetScope = scope; setBusy(true);setError('');
    try { await workItemsApi.comment(projectId,id,{body,visibility:'INTERNAL',requestKey:commentKey.current}); if (!live.current || currentScope.current !== targetScope) return;
      setBody('');commentKey.current=crypto.randomUUID();await load();if(live.current&&currentScope.current===targetScope)onChanged(); }
    catch(e){if(live.current && currentScope.current === targetScope)setError(e.message);}finally{if(live.current && currentScope.current === targetScope)setBusy(false);}
  }
  async function more(kind) {
    const rows = kind === 'comments' ? comments : history, targetScope = scope;
    try { const extra = await workItemsApi[kind](projectId, id, rows.at(-1).id); if (!live.current || currentScope.current !== targetScope) return;
      (kind === 'comments' ? setComments : setHistory)(previous => [...previous, ...extra.filter(row => !previous.some(old => old.id === row.id))]); }
    catch(e){if(live.current && currentScope.current === targetScope)setError(e.message);}
  }
  if(!item) return <><WorkError error={error} retry={load}/>{!error&&<p>Đang tải công việc…</p>}</>;
  let snapshot={};try{snapshot=typeof item.contextSnapshot==='string'?JSON.parse(item.contextSnapshot):(item.contextSnapshot||{});}catch{/* Retain readable fields if legacy metadata is absent. */}
  const fixedBuild=catalogs.builds?.find(build=>build.id===item.fixedBuildId);
  const isQa=item.type==='QA';
  const typedItem=qaRead?.detail?.item;
  const typedCurrent=qaRead?.scope===scope&&qaRead.loading===false&&!qaRead.error&&typedItem?.projectId===projectId&&typedItem.id===id&&typedItem.type==='QA'
    &&Number.isSafeInteger(typedItem.version)&&Number.isSafeInteger(item.version)&&typedItem.version>=item.version&&typedItem.version>=qaRead.highestVersion;
  const qaWritable=writable&&!loading&&!error&&typedCurrent;
  const canComment=isQa?qaWritable&&item.canComment===true&&item.capabilities?.canComment===true&&typedItem.capabilities?.canComment===true:writable&&item.canComment!==false;
  const canAttach=isQa?qaWritable&&item.canAttach===true&&item.capabilities?.canUploadEvidence===true&&typedItem.capabilities?.canUploadEvidence===true:writable&&item.canAttach!==false;
  const qaReadState = next => {
    if(!live.current||currentScope.current!==scope||next?.projectId!==projectId||next.id!==id)return;
    setQaRead(old=>{
      const previous=old?.scope===scope?old.highestVersion:-1;
      const candidate=next.detail?.item;
      const version=candidate?.projectId===projectId&&candidate.id===id&&candidate.type==='QA'&&Number.isSafeInteger(candidate.version)?candidate.version:-1;
      // Preserve the observed version watermark through loading/errors. A stale
      // allow cannot replace a newer typed denial, even if generic GET is behind.
      return {...next,scope,highestVersion:Math.max(previous,version)};
    });
  };
  const changed = async () => { const targetScope=scope; await load(); if(live.current&&currentScope.current===targetScope)onChanged(); };
  const qaChanged = fresh => {
    if(currentScope.current!==scope||fresh?.item?.id!==id||fresh.item.projectId!==projectId||fresh.item.type!=='QA')return;
    changed();
  };
  return <div className="wi-detail"><WorkError error={error} retry={load}/>
    <div className="wi-actions"><TypeBadge type={typeLabels[item.type]}/><strong className="d-issue-key">{item.key}</strong>{isQa?<span className="d-status-badge">{item.statusLabel||catalogs.statusesByType?.QA?.find(s=>s.id===item.status)?.label||item.status}</span>:<StatusBadge id={item.status}/>}<Button onClick={load}>Tải lại chi tiết</Button></div>
    <h2>{item.title}</h2>
    {isQa?<QaPanel projectId={projectId} id={id} catalogs={catalogs} onChanged={qaChanged} onReadState={qaReadState}/>:<div className="wi-detail-body"><section>
      {item.description&&<><h3>Mô tả</h3><p>{item.description}</p></>}
      {item.type==='BUG'&&<><h3>Các bước tái hiện</h3><p>{item.steps}</p><h3>Kết quả mong đợi</h3><p>{item.expectedResult}</p><h3>Kết quả thực tế</h3><p>{item.actualResult}</p></>}
      {item.links.map(link=><p key={link.attemptId}><strong className="d-issue-key">{link.caseNo}</strong> · Lần #{link.attemptNo} · NG #{link.attemptId}</p>)}
      {item.standaloneReason&&<p><strong>Lý do chưa có test case:</strong> {item.standaloneReason}</p>}
    </section><dl className="wi-properties">
      {Object.entries({'Người phụ trách':item.assignee||'Chưa phân công','Độ ưu tiên':priorityLabels[item.priority],'Danh mục':item.category||'—','Mốc phát hành':item.milestone||'—','Build phát sinh':snapshot.build?.versionLabel||item.buildLabel||'—','Build đã sửa':fixedBuild?`${fixedBuild.platform} ${fixedBuild.versionLabel} (${fixedBuild.buildNumber||'—'})`:item.fixedBuildId?`Build #${item.fixedBuildId}`:'Chưa ghi nhận','Môi trường':snapshot.environment?.name||item.environmentName||'—','Thiết bị':snapshot.device?.name||item.deviceName||'—','Người tạo':item.creator,'Ngày tạo':time(item.createdAt),'Cập nhật':time(item.updatedAt)}).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      {item.type==='BUG'&&<div><dt>Quy tắc bổ sung khi tạo</dt><dd>{item.ruleVersionId?`Mã phiên bản #${item.ruleVersionId} (nội bộ)`:'Không áp dụng'}</dd></div>}
    </dl></div>}
    {!isQa && writable && item.allowedTransitions?.length>0 && <div className="wi-actions"><WorkSelect label="Chuyển trạng thái" items={item.allowedTransitions} describe={s=>s.label} value={target} onChange={setTarget}/><Button disabled={!target} onClick={()=>setMove(true)}>Chuyển trạng thái</Button></div>}
    {!isQa && canTriage&&!['closed','unreproducible','wontfix'].includes(item.status)&&<>
      <details className="wi-section"><summary>Sửa thông tin và phân công</summary><WorkItemEdit item={item} catalogs={catalogs} projectId={projectId} reload={load} onSaved={changed}/></details>
      <details className="wi-section"><summary>Tham chiếu tracker và nội dung làm rõ</summary><ReferenceForms item={item} projectId={projectId} onSaved={changed}/></details></>}
    {!isQa && item.externalReferences.map(reference=><p key={reference.id}><a href={reference.url} target="_blank" rel="noreferrer">{reference.provider} #{reference.externalId}</a> · Nhập thủ công, chưa đối soát</p>)}
    {!isQa && item.clarifications.map(clarification=><article className="wi-history-item" key={clarification.id}><strong>{clarification.sourceKind} · {clarification.confirmedBy}</strong><p>{clarification.conclusion}</p><small>Nguồn: {clarification.sourceReference} · Xác nhận: {time(clarification.confirmedAt)} · Ghi nhận: {time(clarification.recordedAt)}</small></article>)}
    {item.type==='BUG'&&<RedminePanel projectId={projectId} bug={item} writable={writable}/>}
    {isQa&&(!typedCurrent||typedItem.version!==item.version)&&<p role="status">Quyền QA dùng chung chưa được đối chiếu với dữ liệu hiện tại. Tải lại QA hoặc chi tiết để đồng bộ; bản nháp được giữ.</p>}
    <EvidencePanel key={scope} projectId={projectId} workId={id} writable={canAttach} canTriage={canTriage} membershipId={membershipId}/>
    {item.type==='BUG'&&<RetestPanel projectId={projectId} bug={item} canManage={canTriage} writable={writable} onChanged={changed}/>}
    <section className="wi-section"><h3>Bình luận nội bộ</h3>
      {canComment && <form onSubmit={comment} className="wi-form"><WorkField label="Nội dung bình luận"><textarea required maxLength={20000} value={body} disabled={busy} onChange={e=>{setBody(e.target.value);commentKey.current=crypto.randomUUID();}}/></WorkField><Button primary type="submit" disabled={busy}>Đăng bình luận</Button></form>}
      {comments.map(note=><article className="wi-history-item" key={note.id}><strong>{note.author}</strong> <small>{time(note.createdAt)}</small><p>{note.body}</p></article>)}
      {comments.length>0&&comments.length%50===0&&<Button onClick={()=>more('comments')}>Bình luận cũ hơn</Button>}
    </section>
    <section className="wi-section"><h3>Lịch sử thay đổi</h3>{history.map(event=><article className="wi-history-item" key={event.id}><strong>{event.actor}</strong> <small>{time(event.occurredAt)}</small><p>{event.reason}</p>{event.toStatus&&(isQa?<span>{catalogs.statusesByType?.QA?.find(s=>s.id===event.toStatus)?.label||event.toStatus}</span>:<StatusBadge id={event.toStatus}/>)}</article>)}
      {history.length>0&&history.length%50===0&&<Button onClick={()=>more('history')}>Lịch sử cũ hơn</Button>}
    </section>
    {!isQa&&move&&<TransitionDialog projectId={projectId} items={[presentItem(item)]} status={target} catalogs={catalogs} onClose={()=>setMove(false)} onSaved={()=>{setMove(false);changed();}}/>}
  </div>;
}

function WorkItemEdit({item,catalogs,projectId,reload,onSaved}) {
  const [form,setForm]=useState({...item,reason:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false);
  const update=(key,value)=>setForm(old=>({...old,[key]:value}));
  async function submit(e){e.preventDefault();setBusy(true);setError('');
    const payload={...form,expectedVersion:item.version};for(const key of ['categoryId','milestoneId','assigneeMembershipId'])payload[key]=form[key]?Number(form[key]):null;
    try{await workItemsApi.update(projectId,item.id,payload);await onSaved();setForm(old=>({...old,reason:''}));}
    catch(e){setError(e.message);setConflict(e.status===409);}finally{setBusy(false);}
  }
  return <form className="wi-form" onSubmit={submit}><WorkError error={error}/>{conflict&&<Button onClick={async()=>{if(await reload()){setConflict(false);setError('');}}}>Tải bản hiện hành, giữ bản nháp</Button>}
    <WorkField label="Sửa tiêu đề"><input required maxLength={300} value={form.title} onChange={e=>update('title',e.target.value)}/></WorkField>
    <WorkField label="Sửa mô tả"><textarea maxLength={20000} value={form.description} onChange={e=>update('description',e.target.value)}/></WorkField>
    <div className="wi-fields"><WorkSelect label="Người phụ trách" items={catalogs.members} id={m=>m.membershipId} describe={m=>`${m.displayName} (${m.username})`} value={form.assigneeMembershipId} onChange={v=>update('assigneeMembershipId',v)}/>
      <WorkSelect label="Độ ưu tiên" required items={Object.entries(priorityLabels).map(([id,name])=>({id,name}))} value={form.priority} onChange={v=>update('priority',v)}/>
      <WorkSelect label="Danh mục" items={catalogs.categories} value={form.categoryId} onChange={v=>update('categoryId',v)}/><WorkSelect label="Mốc phát hành" items={catalogs.milestones} value={form.milestoneId} onChange={v=>update('milestoneId',v)}/></div>
    {item.type==='BUG'&&[['steps','Sửa bước tái hiện'],['expectedResult','Sửa kết quả mong đợi'],['actualResult','Sửa kết quả thực tế']].map(([key,label])=><WorkField key={key} label={label}><textarea required maxLength={20000} value={form[key]} onChange={e=>update(key,e.target.value)}/></WorkField>)}
    <WorkField label="Lý do sửa"><textarea required maxLength={1000} value={form.reason} onChange={e=>update('reason',e.target.value)}/></WorkField><Button primary type="submit" disabled={busy||conflict}>Lưu thông tin</Button>
  </form>;
}
function ReferenceForms({item,projectId,onSaved}) {
  const [external,setExternal]=useState({provider:'REDMINE',externalId:'',url:''});
  const [clarification,setClarification]=useState({sourceKind:'INTERNAL',sourceReference:'',confirmedBy:'',confirmedAt:'',conclusion:''});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function save(e,kind){e.preventDefault();setBusy(true);setError('');
    try{await workItemsApi[kind](projectId,item.id,{...(kind==='external'?external:{...clarification,confirmedAt:new Date(clarification.confirmedAt).toISOString()}),expectedVersion:item.version});await onSaved();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <><WorkError error={error}/><form className="wi-form" onSubmit={e=>save(e,'external')}>
    <p className="wi-note">Nhập thủ công; chưa đồng bộ hoặc đối soát với hệ thống ngoài.</p>
    {[['provider','Hệ thống tracker',32],['externalId','Mã bên ngoài',100],['url','URL bên ngoài',2048]].map(([key,label,max])=><WorkField key={key} label={label}><input required maxLength={max} type={key==='url'?'url':'text'} value={external[key]} onChange={e=>setExternal(old=>({...old,[key]:e.target.value}))}/></WorkField>)}
    <Button type="submit" disabled={busy}>Lưu tham chiếu</Button></form>
    <form className="wi-form wi-section" onSubmit={e=>save(e,'clarify')}>
      <WorkSelect label="Nguồn xác nhận" required items={['INTERNAL','BRSE','SHIFT','CUSTOMER'].map(id=>({id,name:({INTERNAL:'Nội bộ',BRSE:'BrSE',SHIFT:'SHIFT',CUSTOMER:'Khách hàng'})[id]}))} value={clarification.sourceKind} onChange={v=>setClarification(old=>({...old,sourceKind:v}))}/>
      {[['sourceReference','Tham chiếu xác nhận',1000],['confirmedBy','Người xác nhận',100],['confirmedAt','Thời điểm xác nhận',null],['conclusion','Nội dung kết luận',20000]].map(([key,label,max])=><WorkField key={key} label={label}><input required maxLength={max||undefined} type={key==='confirmedAt'?'datetime-local':'text'} value={clarification[key]} onChange={e=>setClarification(old=>({...old,[key]:e.target.value}))}/></WorkField>)}
      <Button type="submit" disabled={busy}>Lưu nội dung làm rõ</Button></form></>;
}
