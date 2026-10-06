import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../projects/ProjectProvider';
import { fileWorkApi, executionDownload } from '../../services/api/fileWork';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { workItemsApi } from '../../services/api/workItems';
import { downloadWorkbook, documentDate } from '../test-cases/documentDownload';
import { ExistingBugLink } from '../test-execution/NgBugActions';
import { Field, Pager, WorkError, requestKey, testerMembers, useResource } from './FileWorkPage';
import './file-work.css';

const positive = id => Number.isSafeInteger(Number(id)) && Number(id)>0;
const draftPin = session => session ? {sessionId:session.id,buildId:session.buildId,assetId:session.assetId,allocationId:session.allocationId,assetCode:session.assetCode} : null;
function matchesDraftPin(pin,session) {
  return !!(pin && session && pin.sessionId===session.id && pin.buildId===session.buildId && pin.assetId===session.assetId && pin.allocationId===session.allocationId);
}
function attemptContext(attempt) {
  try{return (typeof attempt.contextSnapshot==='string'?JSON.parse(attempt.contextSnapshot):attempt.contextSnapshot) || {};}catch{return {};}
}
export function qaContextUrl(documentId,groupId,runItemId,revisionId) {
  if(![documentId,groupId,runItemId,revisionId].every(positive))return null;
  return `/board/list?${new URLSearchParams({create:'QA',documentId,groupId,runItemId,revisionId})}`;
}
export function FileWorkDetail({groupId,navigate}) {
  const {currentProject}=useProject() || {};
  if(!currentProject || !positive(groupId))return <div className="fw-page"><h2>Thực thi theo file</h2><p>Chọn dự án và nhóm file hợp lệ.</p></div>;
  return <Detail key={`${currentProject.id}/${groupId}`} project={currentProject} groupId={Number(groupId)} navigate={navigate}/>;
}
function Detail({project,groupId,navigate}) {
  const [reload,refresh]=useState(0),[selectedBuild,setSelectedBuild]=useState(''),[allocation,setAllocation]=useState(''),[startBuild,setStartBuild]=useState(''),[reason,setReason]=useState(''),[assignee,setAssignee]=useState(''),[form,setForm]=useState(null),[commandError,setCommandError]=useState(null),[commandBusy,setBusy]=useState(false),[attemptBusy,setAttemptBusy]=useState(false),[notice,setNotice]=useState(''),[attempt,setAttempt]=useState(null),[showHistory,setShowHistory]=useState(false),[linkAttempt,setLinkAttempt]=useState(null),[raw,setRaw]=useState(false);
  const busy=commandBusy || attemptBusy;
  const lock=useRef(false),pending=useRef(null),live=useRef(true),noticeRef=useRef(null);
  const readScope=JSON.stringify([project.id,groupId,selectedBuild,reload]);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const resource=useResource(async options=>({scope:readScope,detail:await fileWorkApi.detail(project.id,groupId,options)}),[project.id,groupId,selectedBuild,reload]);
  const projection=useResource(async options=>({scope:readScope,view:await fileWorkApi.execution(project.id,groupId,selectedBuild?Number(selectedBuild):undefined,options)}),[project.id,groupId,selectedBuild,reload]);
  const catalogs=useResource(()=>projectsApi.listCatalog(project.id,'builds'),[project.id,reload]);
  const allocations=useResource(options=>resource.data?.scope===readScope && resource.data.detail.group.capabilities?.canStart?fileWorkApi.eligibleAllocations(project.id,groupId,options):[],[resource.data,readScope]);
  const members=useResource(()=>resource.data?.scope===readScope && resource.data.detail.group.capabilities?.canAssign?projectsApi.listMembers(project.id):[],[resource.data,readScope]);
  const bugAuthority=useResource(async options=>{
    const [work,currentProject]=await Promise.all([workItemsApi.metadata(project.id),fileWorkApi.metadata(project.id,options)]);
    return {scope:readScope,work,currentProject};
  },[project.id,groupId,selectedBuild,reload]);
  const data=resource.data?.scope===readScope?{...resource.data,builds:catalogs.data || [],allocations:allocations.data || [],members:members.data || []}:null;
  const g=data?.detail.group,v=projection.data?.scope===readScope?projection.data.view:null;
  const displayBuild=selectedBuild || String(v?.buildId ?? g?.selectedBuildId ?? '');
  const startBuildId=startBuild || (data?.builds.some(b=>!b.archived && String(b.id)===displayBuild)?displayBuild:'');
  const session=data?.detail.sessions.find(s=>s.id===g.currentSessionId);
  const caps=g?.capabilities || {},scaps=session?.capabilities || {};
  const canRecord=!!(!resource.loading && v?.group.capabilities?.canRecord && session?.state==='DOING' && Number(v.buildId)===Number(session.buildId) && (!selectedBuild || Number(selectedBuild)===Number(session.buildId)));
  const canManageBug=!!(!raw && !resource.loading && !bugAuthority.loading && bugAuthority.data?.work.canCreate===true && bugAuthority.data.currentProject.archived===false);
  const canCreateQa=!!(!raw && !resource.loading && !resource.error && data?.scope===readScope && !bugAuthority.loading && !bugAuthority.error && bugAuthority.data?.scope===readScope && bugAuthority.data.work.canCreateQa===true && bugAuthority.data.currentProject.archived===false);
  useEffect(()=>{if(notice)noticeRef.current?.focus();},[notice]);
  const clearCommand=()=>{pending.current=null;setCommandError(null);};
  async function send(command) {
    if(lock.current)return;lock.current=true;setBusy(true);setCommandError(null);setNotice('');
    try {await fileWorkApi[command.action](...command.args);if(live.current){pending.current=null;setForm(null);setReason('');setNotice('Đã lưu trên server; đang tải kết quả hiện hành.');refresh(x=>x+1);}}
    catch(error){if(live.current){pending.current=command;setCommandError(error);if(error.status===409 || error.status===403)refresh(x=>x+1);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  function start() {
    if(!caps.canStart || !data.allocations.some(a=>a.allocationId===Number(allocation)) || !data.builds.some(b=>!b.archived && String(b.id)===startBuildId))return;
    send({action:'start',args:[project.id,groupId,{allocationId:Number(allocation),buildId:Number(startBuildId),expectedVersion:g.version,requestKey:requestKey()}]});
  }
  function lifecycle(action) {
    if(!session || !scaps[{pause:'canPause',resume:'canResume',complete:'canComplete',cancel:'canCancel'}[action]])return;
    if((action==='pause' || action==='cancel') && !reason.trim()){setCommandError(new Error('Lý do không được trống.'));return;}
    send({action,args:[project.id,session.id,{expectedVersion:session.version,expectedGroupVersion:g.version,...(reason.trim()?{reason:reason.trim()}:{}),requestKey:requestKey()}]});
  }
  function assign() {
    if(!caps.canAssign || !assignee || !reason.trim()){setCommandError(new Error('Chọn Tester và nhập lý do giao lại.'));return;}
    send({action:'assign',args:[project.id,groupId,{assigneeMembershipId:Number(assignee),reason:reason.trim(),expectedVersion:g.version,runVersions:data.detail.items.map(r=>({runItemId:r.runItemId,expectedVersion:r.runVersion})),requestKey:requestKey()}]});
  }
  async function download() {
    if(!caps.canExport || !v || lock.current)return;lock.current=true;setBusy(true);setCommandError(null);
    try{const result=await executionDownload(await fileWorkApi.export(project.id,groupId,v.buildId));if(live.current)downloadWorkbook(result.blob,result.fileName);}catch(error){if(live.current)setCommandError(error);}finally{lock.current=false;if(live.current)setBusy(false);}
  }
  function newAttempt(row,result) {setAttempt({row,result,pin:draftPin(session)});}
  return <div className="fw-page"><header className="fw-heading"><h2>{g?.fileName || 'Thực thi theo file'}</h2><button onClick={()=>navigate('/tests/file-work')}>Danh sách công việc</button><button disabled={busy} onClick={()=>refresh(x=>x+1)}>Làm mới</button></header>
    <WorkError error={projection.error || catalogs.error || allocations.error || members.error} retry={()=>refresh(x=>x+1)}/><WorkError error={resource.error} retry={()=>refresh(x=>x+1)}/><WorkError error={bugAuthority.error} retry={()=>refresh(x=>x+1)}/><WorkError error={commandError}/>{pending.current && commandError && <button disabled={busy || resource.loading} onClick={()=>send(pending.current)}>Thử lại nguyên lệnh</button>}
    {(resource.loading || projection.loading) && <p role="status">Đang tải…</p>}{notice && <p tabIndex={-1} ref={noticeRef} role="status">{notice}</p>}
    {data && <fieldset disabled={busy}><section className="fw-panel"><p>Nhóm #{g.id} · {g.cycleName} · cấu hình #{g.configurationId} · môi trường #{g.environmentId} · thiết bị logic #{g.deviceId}</p><p>{g.assignmentState==='MIXED'?'Phân công MIXED · PM cần giao lại toàn nhóm':`Tester: ${g.assigneeName || '—'}`} · {g.state} · group version {g.version}</p>
      <button onClick={()=>navigate(`/tests/documents/${g.documentId}`)}>Tài liệu nguồn / annotation</button><button onClick={()=>navigate(`/tests/cycles/${g.cycleId}`)}>Chuẩn bị / kích hoạt đợt · quyết định phạm vi NA</button>
      <p>Kết quả dưới đây là thực thi chính thức. NA chỉ có từ quyết định phạm vi của PM.</p>
      <div className="fw-actions"><Field label="Build hiển thị"><select value={displayBuild} disabled={busy} onChange={e=>setSelectedBuild(e.target.value)}>
        {displayBuild && !data.builds.some(b=>String(b.id)===displayBuild) && <option value={displayBuild}>Build #{displayBuild} · chỉ đọc</option>}
        {data.builds.map(b=><option key={b.id} value={b.id}>{b.versionLabel} · #{b.id}{b.archived ? ' · lưu trữ, chỉ đọc' : ''}</option>)}
      </select></Field><button disabled={busy || !caps.canExport || !v} onClick={download}>Tải kết quả thực thi XLSX</button><label><input type="checkbox" checked={raw} onChange={e=>setRaw(e.target.checked)}/>Xem raw source (chỉ đọc)</label></div><p>Snapshot: {documentDate(v?.asOf,project.timezone)} · Build #{displayBuild}</p>
      {session && <p>Phiên #{session.id} · {session.state} · {session.executorName} · máy {session.assetCode} · cấp phát #{session.allocationId} · build pin #{session.buildId} · session version {session.version}<br/>Bắt đầu: {documentDate(session.startedAt,project.timezone)} · chuyển trạng thái: {documentDate(session.lastTransitionAt,project.timezone)}. Máy và build cố định suốt phiên.</p>}
      {session?.contextSnapshot && <details><summary>Ngữ cảnh đã pin</summary><pre>{JSON.stringify(session.contextSnapshot,null,2)}</pre></details>}
      {caps.canStart && <div className="fw-fields"><Field label="Máy được cấp"><select value={allocation} disabled={busy} onChange={e=>{setAllocation(e.target.value);clearCommand();}}><option value="">Chọn máy vật lý</option>{data.allocations.map(a=><option key={a.allocationId} value={a.allocationId}>{a.assetCode} · {a.type} · {a.model} · {a.osName} {a.osVersion}</option>)}</select></Field><Field label="Build bắt đầu phiên"><select value={startBuildId} disabled={busy} onChange={e=>{setStartBuild(e.target.value);clearCommand();}}><option value="">Chọn build hoạt động</option>{data.builds.filter(b=>!b.archived).map(b=><option key={b.id} value={b.id}>{b.versionLabel} · #{b.id}</option>)}</select></Field><button disabled={busy || !allocation || !startBuildId} onClick={start}>Bắt đầu phiên</button>{!allocations.loading && !allocations.error && !data.allocations.length && <p>Không có máy được cấp tương thích. Liên hệ PM để kiểm tra cấp phát/cấu hình.</p>}</div>}
      <div className="fw-actions">{scaps.canPause && <button disabled={busy} onClick={()=>{clearCommand();setForm('pause');}}>Tạm dừng phiên</button>}{scaps.canResume && <button disabled={busy} onClick={()=>lifecycle('resume')}>Tiếp tục phiên</button>}{scaps.canComplete && <button disabled={busy} onClick={()=>{clearCommand();setForm('complete');}}>Hoàn thành phiên</button>}{scaps.canCancel && <button disabled={busy} onClick={()=>{clearCommand();setForm('cancel');}}>Hủy phiên</button>}{caps.canAssign && <button disabled={busy} onClick={()=>{clearCommand();setForm('assign');}}>Giao lại toàn nhóm</button>}</div>
      {form && <form className="fw-panel" onSubmit={e=>{e.preventDefault();form==='assign'?assign():lifecycle(form);}}><fieldset disabled={busy}><h3>{form==='assign'?'Giao lại toàn nhóm':form==='cancel'?'Hủy phiên':form==='pause'?'Tạm dừng phiên':'Hoàn thành phiên'}</h3>{form==='complete' && <p>Server kiểm kết quả trên build pin: không còn NOT_RUN/P; mỗi NG cần BUG liên kết đúng lần chạy. Hoàn thành phiên không đóng đợt hoặc BUG.</p>}{form==='assign' && <Field label="Tester mới"><select value={assignee} required onChange={e=>{setAssignee(e.target.value);clearCommand();}}><option value="">Chọn Tester</option>{testerMembers(data.members).map(m=><option key={m.membershipId} value={m.membershipId}>{m.displayName}</option>)}</select></Field>}<Field label="Lý do thao tác"><textarea maxLength={form==='assign'?500:1000} required={form!=='complete'} value={reason} onChange={e=>{setReason(e.target.value);clearCommand();}}/></Field><button type="submit">Xác nhận thao tác</button><button type="button" onClick={()=>{setForm(null);clearCommand();}}>Đóng</button></fieldset></form>}
    </section>
    {v && <div className="fw-table-scroll" tabIndex={0} role="region" aria-label="Case thực thi chính thức"><table><thead><tr>{v.headers.map((h,i)=><th key={i} scope="col">{h}</th>)}<th>Kết quả / ngữ cảnh</th><th>Thao tác</th></tr></thead><tbody>{v.rows.map(r=><tr key={r.runItemId}>{(raw?r.sourceCells:r.cells).map((cell,i)=><td key={i}>{cell}</td>)}<td><strong>{r.resultCode}</strong><small>{r.caseNo} · revision #{r.revisionId} (v{r.revisionNo})</small><small>{r.executorName || '—'} · {documentDate(r.executedAt,project.timezone)}</small><small>{r.physicalAsset?.assetCode || 'Không có máy vật lý trong kết quả'} · {r.provenance}</small>{r.excluded && <small>NA · {r.scopeReason}</small>}{r.pendingBugLink && <small>NG chờ BUG</small>}</td><td><div className="fw-case-actions">{['OK','NG','P'].map(code=><button key={code} aria-label={`${code} · ${r.caseNo}`} disabled={busy || !canRecord || r.excluded || raw} onClick={()=>newAttempt(r,code)}>{code}</button>)}<button onClick={()=>setAttempt({row:r,historyOnly:true})}>Lịch sử · {r.caseNo}</button>{canCreateQa && qaContextUrl(g.documentId,g.id,r.runItemId,r.revisionId) && <button onClick={()=>navigate(qaContextUrl(g.documentId,g.id,r.runItemId,r.revisionId))}>Tạo QA · {r.caseNo}</button>}{canManageBug && r.resultCode==='NG' && positive(r.latestAttemptId) && <><button onClick={()=>navigate(`/board/new?${new URLSearchParams({attempt:r.latestAttemptId,documentId:g.documentId,groupId:g.id,runItemId:r.runItemId,revisionId:r.revisionId})}`)}>Tạo BUG · {r.caseNo}</button><button onClick={()=>setLinkAttempt(r.latestAttemptId)}>Gắn BUG · {r.caseNo}</button></>}</div></td></tr>)}</tbody></table></div>}
    {v && !v.rows.length && <p>Nhóm chưa có case.</p>}<button onClick={()=>setShowHistory(s=>!s)}>Lịch sử nhóm / phiên</button>{showHistory && <GroupHistory projectId={project.id} groupId={groupId} reload={reload} timeZone={project.timezone}/>}</fieldset>}
    {attempt && <AttemptForm key={`${attempt.row.runItemId}/${attempt.result || 'history'}`} projectId={project.id} groupId={groupId} selected={attempt} currentRow={v?.rows.find(r=>r.runItemId===attempt.row.runItemId)} session={session} canRecord={canRecord && !raw} onBusy={setAttemptBusy} onClose={()=>setAttempt(null)} onConflict={()=>refresh(x=>x+1)} onSaved={()=>{setAttempt(null);setNotice('Đã lưu trên server; đang tải kết quả hiện hành.');refresh(x=>x+1);}}/>}
    {linkAttempt && canManageBug && v?.rows.some(r=>r.resultCode==='NG' && r.latestAttemptId===linkAttempt) && <ExistingBugLink projectId={project.id} attemptId={linkAttempt} onClose={()=>setLinkAttempt(null)} onSaved={()=>{setLinkAttempt(null);refresh(x=>x+1);}}/>}
  </div>;
}
function AttemptForm({projectId,groupId,selected,currentRow,session,canRecord,onBusy,onClose,onConflict,onSaved}) {
  const [actual,setActual]=useState(''),[reason,setReason]=useState(''),[evidence,setEvidence]=useState(''),[error,setError]=useState(null),[busy,setBusy]=useState(false),[historyPage,setHistoryPage]=useState(0),[historyReload,reloadHistory]=useState(0),[pin,setPin]=useState(selected.pin);
  const pending=useRef(null),lock=useRef(false),live=useRef(true),focus=useRef(null),previous=useRef(null);
  useEffect(()=>{live.current=true;previous.current=document.activeElement;focus.current?.focus();return()=>{live.current=false;previous.current?.focus();};},[]);
  const history=useResource(()=>executionApi.attempts(projectId,selected.row.runItemId,historyPage),[projectId,selected.row.runItemId,historyPage,historyReload]);
  const change=(setter,value)=>{setter(value);pending.current=null;setError(null);};
  const pinMatches=matchesDraftPin(pin,session);
  const writableDraft=canRecord && pinMatches && !!currentRow && !currentRow.excluded;
  function confirmContext() {
    if(busy || !canRecord || !currentRow || currentRow.excluded || !session)return;
    setPin(draftPin(session));pending.current=null;setError(null);
  }
  async function save(exact=false) {
    if(lock.current || !writableDraft)return;
    if(selected.result==='NG' && !actual.trim()){setError(new Error('NG cần kết quả thực tế.'));return;}
    if(selected.result==='P' && !reason.trim()){setError(new Error('P cần lý do.'));return;}
    const body=exact?pending.current:{sessionId:pin.sessionId,expectedSessionVersion:session.version,buildId:pin.buildId,resultCode:selected.result,actualResult:actual.trim(),reason:reason.trim(),evidenceReference:evidence.trim(),expectedVersion:currentRow.runVersion,requestKey:requestKey()};
    if(!body)return;pending.current=body;lock.current=true;setBusy(true);onBusy(true);setError(null);
    try{await fileWorkApi.record(projectId,groupId,selected.row.runItemId,body);if(live.current)onSaved();}catch(e){if(live.current){setError(e);if(e.status===409 || e.status===403)onConflict();}}finally{lock.current=false;if(live.current){setBusy(false);onBusy(false);}}
  }
  useEffect(()=>{if(selected.result==='OK')save();},[]);
  return <section className="fw-panel fw-attempt" aria-label={`Case ${selected.row.caseNo}`} ref={focus} tabIndex={-1}><h3>{selected.row.caseNo} · {selected.result || 'Lịch sử'}</h3><p>{selected.row.titleVi} · revision #{selected.row.revisionId}</p><WorkError error={error}/>
    {!selected.historyOnly && <form onSubmit={e=>{e.preventDefault();save();}}><fieldset disabled={busy}><Field label="Kết quả thực tế" errors={error?.fieldErrors}><textarea autoFocus={selected.result==='NG'} maxLength={8000} value={actual} onChange={e=>change(setActual,e.target.value)}/></Field><Field label="Lý do kết quả" errors={error?.fieldErrors}><textarea maxLength={1000} value={reason} onChange={e=>change(setReason,e.target.value)}/></Field><Field label="Tham chiếu bằng chứng" errors={error?.fieldErrors}><input maxLength={1000} value={evidence} onChange={e=>change(setEvidence,e.target.value)}/></Field><p>Bản nháp: phiên #{pin?.sessionId || '—'} · máy {pin?.assetCode || '—'} · build pin #{pin?.buildId || '—'}</p>{session && !pinMatches && <div role="status"><p>Phiên / máy / build hiện hành đã thay đổi. Bản nháp vẫn thuộc ngữ cảnh cũ. Xác nhận chuyển bản nhập sang phiên #{session.id} · máy {session.assetCode} · build #{session.buildId}, hoặc đóng case và mở bản nhập mới.</p><button type="button" disabled={!canRecord || !currentRow || currentRow.excluded} onClick={confirmContext}>Xác nhận dùng phiên hiện hành cho bản nháp</button></div>}<button type="submit" disabled={!writableDraft}>Lưu kết quả</button>{error && pending.current && <button type="button" disabled={!writableDraft} onClick={()=>save(true)}>Thử lại nguyên lệnh</button>}</fieldset></form>}
    <button disabled={busy} onClick={onClose}>Đóng case</button><WorkError error={history.error} retry={()=>reloadHistory(x=>x+1)}/>{history.loading && <p role="status">Đang tải lịch sử…</p>}{history.data && <><ul>{history.data.items.map(a=>{const context=attemptContext(a);return <li key={a.id}>Lần #{a.attemptNo} · {a.resultCode} · build #{a.buildId} · {a.actualResult || a.reason || '—'} · {context.executor?.displayName || a.executorName || '—'} · {a.executedAt} · phiên #{a.fileWorkSessionId || '—'}<small>{a.evidenceReference || '—'} · {context.physicalAsset?.assetCode || 'Không có snapshot máy vật lý'} · {context.provenance || '—'}</small><details><summary>Ngữ cảnh lần chạy</summary><pre>{JSON.stringify(context,null,2)}</pre></details></li>;})}</ul><Pager data={history.data} onChange={setHistoryPage} label="lần chạy"/></>}
  </section>;
}
function GroupHistory({projectId,groupId,reload,timeZone}) {
  const [before,setBefore]=useState(0),[sessionPage,setSessionPage]=useState(0),[retry,refresh]=useState(0);
  const events=useResource(()=>fileWorkApi.history(projectId,groupId,before),[projectId,groupId,before,reload,retry]);
  const sessions=useResource(()=>fileWorkApi.sessions(projectId,groupId,sessionPage),[projectId,groupId,sessionPage,reload,retry]);
  return <section className="fw-panel"><h3>Lịch sử nhóm / phiên</h3><WorkError error={events.error || sessions.error} retry={()=>refresh(x=>x+1)}/>{events.data?.items.map(e=><p key={e.id}>{e.action} · {e.actorName} · {e.reason} · {documentDate(e.occurredAt,timeZone)}</p>)}{events.data?.nextBefore && <button onClick={()=>setBefore(events.data.nextBefore)}>Sự kiện cũ hơn</button>}{before>0 && <button onClick={()=>setBefore(0)}>Sự kiện mới nhất</button>}{sessions.data?.items.map(s=><p key={s.id}>Phiên #{s.id} · {s.state} · {s.executorName} · {s.assetCode} · build #{s.buildId} · {documentDate(s.startedAt,timeZone)}</p>)}<Pager data={sessions.data} onChange={setSessionPage} label="phiên"/></section>;
}
