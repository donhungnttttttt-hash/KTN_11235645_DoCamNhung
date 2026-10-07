import React, { useEffect, useId, useRef, useState } from 'react';
import { useProject } from '../projects/ProjectProvider';
import { fileWorkApi } from '../../services/api/fileWork';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { testCasesApi } from '../../services/api/testCases';
import { documentDate } from '../test-cases/documentDownload';
import './file-work.css';
import { FilePreparation } from './FilePreparation';

export const fileStateLabels = {READY:'Sẵn sàng',DOING:'Đang thực hiện',PAUSED:'Tạm dừng',COMPLETED:'Đã hoàn thành',CANCELLED:'Đã hủy'};
export const requestKey = () => `fw_${globalThis.crypto.randomUUID().replace(/-/g,'')}`;
export const testerMembers = members => members.filter(m => m.active && m.projectRole === 'TESTER' && m.systemRole !== 'DEV');
const fieldNames={'Kết quả thực tế':'actualResult','Lý do kết quả':'reason','Lý do thao tác':'reason','Tham chiếu bằng chứng':'evidenceReference','Tester mới':'assigneeMembershipId','Tester nhận file':'assigneeMembershipId','Tài liệu đã nhập':'documentId','Đợt bản nháp':'cycleId','Cấu hình':'configurationId'};
export function Field({label,children,errors=[]}) {
  const id=useId(),name=fieldNames[label],error=errors.find(e=>e.field===name)?.message;
  return <div className="fw-field"><label htmlFor={id}>{label}</label>{React.cloneElement(children,{id,...(name?{name}:{}),...(error?{'aria-invalid':true,'aria-describedby':`${id}-error`}:{})})}{error && <small id={`${id}-error`} className="fw-field-error">{error}</small>}</div>;
}
export function WorkError({error,retry}) {
  const ref=useRef(null);
  useEffect(()=>{if(error)ref.current?.focus();},[error]);
  return error ? <div ref={ref} tabIndex={-1} role="alert" className="fw-error">{error.message || error}{error.fieldErrors?.length>0 && <ul>{error.fieldErrors.map((e,i)=><li key={i}><button type="button" onClick={()=>Array.from(ref.current.parentElement.querySelectorAll('input,textarea,select')).find(input=>input.name===e.field)?.focus()}>{e.field}: {e.message}</button></li>)}</ul>}{error.status===403 && <p>Quyền hiện hành không cho phép thao tác này.</p>}{error.status===409 && <p>Dữ liệu đã thay đổi; bản nhập được giữ. Kiểm tra dữ liệu mới trước khi gửi lệnh mới.</p>}{retry && <button type="button" onClick={retry}>Thử lại</button>}</div> : null;
}
export function Pager({data,onChange,label='công việc'}) { return data ? <div className="fw-pager"><span>{data.totalItems} {label} · Trang {data.page+1}/{Math.max(1,data.totalPages)}</span><button type="button" aria-label={`Trang trước ${label}`} disabled={data.page===0} onClick={()=>onChange(data.page-1)}>Trước</button><button type="button" aria-label={`Trang sau ${label}`} disabled={data.page+1>=data.totalPages} onClick={()=>onChange(data.page+1)}>Sau</button></div> : null; }
export function useResource(load,deps) {
  const [state,set]=useState({data:null,error:null,loading:true});
  useEffect(()=>{let current=true;const controller=new AbortController();set({data:null,error:null,loading:true});Promise.resolve().then(()=>load({signal:controller.signal})).then(data=>{if(current)set({data,error:null,loading:false});}).catch(error=>{if(current)set({data:null,error,loading:false});});return()=>{current=false;controller.abort();};},deps); // Each caller supplies the resource identity and refresh generation.
  return state;
}
export function FileWorkPage({navigate,documentId}) {
  const {currentProject}=useProject() || {};
  if(!currentProject)return <div className="fw-page"><h2>Công việc theo file</h2><p>Chọn dự án để xem công việc.</p></div>;
  return <FileList key={currentProject.id} project={currentProject} navigate={navigate} documentId={documentId}/>;
}
function FileList({project,navigate,documentId}) {
  const [reload,refresh]=useState(0),[keyword,setKeyword]=useState(''),[state,setState]=useState(''),[pagination,setPagination]=useState({documentId,page:0}),[mine,setMine]=useState(null),[create,setCreate]=useState(false);
  const [assignee,setAssignee]=useState(null),[cycle,setCycle]=useState(null),[build,setBuild]=useState(null),[cyclePage,setCyclePage]=useState(0);
  const page=pagination.documentId===documentId?pagination.page:0;
  const setPage=page=>setPagination({documentId,page});
  const meta=useResource(options=>fileWorkApi.metadata(project.id,options),[project.id,reload]);
  const effectiveMine=mine===null?!!meta.data?.canViewMine:mine;
  const canFilter=meta.data?.canReadAll===true;
  const searchRef=useRef(null);
  const hasFilters=!!(keyword.trim() || state || (canFilter && ((!effectiveMine && assignee) || cycle || build)));
  function clearFilters(){setKeyword('');setState('');setAssignee(null);setCycle(null);setBuild(null);setCyclePage(0);setPage(0);searchRef.current?.focus();}
  const members=useResource(()=>canFilter?projectsApi.listMembers(project.id):[],[project.id,canFilter,reload]);
  const cycles=useResource(()=>canFilter?executionApi.cycles(project.id,cyclePage):null,[project.id,canFilter,cyclePage,reload]);
  const builds=useResource(()=>canFilter?projectsApi.listCatalog(project.id,'builds'):[],[project.id,canFilter,reload]);
  const list=useResource(options=>meta.data ? fileWorkApi.list(project.id,{page,size:20,keyword,state,mine:effectiveMine,documentId,assigneeMembershipId:canFilter && !effectiveMine?assignee?.id:undefined,cycleId:canFilter?cycle?.id:undefined,buildId:canFilter?build?.id:undefined},options) : null,[project.id,page,keyword,state,effectiveMine,meta.data,documentId,assignee,cycle,build,canFilter]);
  return <div className="fw-page"><header className="fw-heading"><div><h2>Công việc theo file · {project.name}</h2><p>Theo dõi file được giao, người thực hiện, thiết bị và kết quả theo build.</p></div>{meta.data?.canCreate && <button onClick={()=>setCreate(v=>!v)}>Giao file</button>}<button onClick={()=>refresh(v=>v+1)}>Làm mới</button></header>
    <WorkError error={meta.error || list.error} retry={()=>refresh(v=>v+1)}/>
    <WorkError error={members.error || cycles.error || builds.error} retry={()=>refresh(v=>v+1)}/>
    {meta.data?.canCreate && <FilePreparation project={project} navigate={navigate} reload={reload}/>}
    <div className="fw-actions"><Field label="Tìm tên file"><input ref={searchRef} maxLength={255} value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></Field><Field label="Trạng thái"><select value={state} onChange={e=>{setState(e.target.value);setPage(0);}}><option value="">Tất cả</option>{['READY','DOING','PAUSED','COMPLETED','CANCELLED'].map(s=><option key={s} value={s}>{fileStateLabels[s]}</option>)}</select></Field>{meta.data?.canViewMine && <label><input type="checkbox" checked={effectiveMine} onChange={e=>{setMine(e.target.checked);setPage(0);}}/>Được giao cho tôi</label>}</div>
    {canFilter && <div className="fw-actions fw-filter-controls">
      <MonitorSelect label="Tester theo dõi" selected={assignee} options={(members.data || []).filter(m=>m.projectRole==='TESTER').map(m=>({id:m.membershipId,label:m.displayName}))} onChange={value=>{setAssignee(value);setPage(0);}} disabled={effectiveMine}/>
      <div><MonitorSelect label="Đợt theo dõi" selected={cycle} options={(cycles.data?.items || []).map(c=>({id:c.id,label:c.name}))} onChange={value=>{setCycle(value);setPage(0);}}/><Pager data={cycles.data} onChange={setCyclePage} label="đợt lọc"/></div>
      <MonitorSelect label="Build theo dõi" selected={build} options={(builds.data || []).map(b=>({id:b.id,label:b.versionLabel+(b.archived?' · lưu trữ':'')}))} onChange={value=>{setBuild(value);setPage(0);}}/>
    </div>}
    {hasFilters && <div className="fw-actions"><button type="button" onClick={clearFilters}>Xóa bộ lọc</button></div>}
    {(meta.loading || list.loading) && <p role="status">Đang tải…</p>}
    {create && <CreateFile projectId={project.id} documentId={documentId} authorized={!!meta.data?.canCreate} navigate={navigate} onCancel={()=>setCreate(false)} onSaved={()=>{setCreate(false);refresh(v=>v+1);}}/>}
    {list.data && <><div className="fw-table-scroll" tabIndex={0} role="region" aria-label="Công việc theo file"><table><thead><tr>{['File','Đợt / cấu hình','Người thực hiện','Trạng thái / máy','Kết quả chính thức'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{list.data.items.map(g=><tr key={g.id}><td><button className="fw-link" onClick={()=>navigate(`/tests/file-work/${g.id}`)}>{g.fileName}</button><small>Nhóm #{g.id}</small></td><td>{g.cycleName}<small>{g.environmentName || 'Môi trường chưa có tên'} · {g.deviceName || 'Thiết bị chưa có tên'} · Build {g.selectedBuildLabel || g.selectedBuildId}</small><MilestoneContext group={g}/></td><td>{g.assignmentState==='MIXED'?'Phân công không đồng nhất':g.assigneeName}</td><td>{fileStateLabels[g.state] || g.state}<small>{g.assetCode || 'Chưa chọn máy'}</small></td><td>{g.counts && Object.entries(g.counts).filter(([k])=>['notRun','ok','ng','p','na'].includes(k)).map(([k,v])=>`${({notRun:'Chưa chạy',ok:'OK',ng:'NG',p:'P',na:'NA'})[k]}: ${v}`).join(' · ')}<small>Thực thi: {rateLabel(g.counts?.executionRate)} · Đạt: {rateLabel(g.counts?.passRate)}</small><small>Bắt đầu phiên: {documentDate(g.startedAt,project.timezone)}</small><small>Cập nhật nhóm: {documentDate(g.updatedAt,project.timezone)}</small><small>Hoạt động đã lưu: {documentDate(g.latestActivityAt,project.timezone)}</small><small>BUG mở: {g.openBugCount || 0} · Retest chờ: {g.pendingRetestCount || 0}</small></td></tr>)}</tbody></table></div>{!list.data.items.length && <p>{hasFilters ? 'Không có file khớp với bộ lọc hiện tại.' : meta.data?.canCreate ? 'Chưa có công việc theo file trong phạm vi này. Chọn Giao file để phân công các test case đã duyệt.' : 'Chưa có công việc theo file. Kiểm tra bộ lọc hoặc liên hệ PM để nhận phân công.'}</p>}<Pager data={list.data} onChange={setPage}/></>}
  </div>;
}
function MonitorSelect({label,selected,options,onChange,disabled=false}) {
  const choices=selected && !options.some(o=>o.id===selected.id)?[selected,...options]:options;
  return <Field label={label}><select value={selected?.id || ''} disabled={disabled} onChange={e=>onChange(choices.find(o=>String(o.id)===e.target.value) || null)}><option value="">Tất cả</option>{choices.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>;
}
const rateLabel=value=>value==null?'Không có mẫu số':`${value}%`;
function MilestoneContext({group}) {
  if(!group.milestoneId)return <small>Chưa có mốc kế hoạch</small>;
  const due=group.milestoneDueOn;
  // A SQL DATE is a calendar date, never an instant to convert through UTC.
  const date=due && /^\d{4}-\d{2}-\d{2}$/.test(due)?due.split('-').reverse().join('/'):null;
  return <small>Mốc: {group.milestoneName || `#${group.milestoneId}`} · {date?`Hạn: ${date}`:'Chưa có hạn'}</small>;
}
function CreateFile({projectId,documentId,authorized,navigate,onSaved,onCancel}) {
  const [docPage,setDocPage]=useState(0),[keyword,setKeyword]=useState(''),[docId,setDocId]=useState(documentId?String(documentId):''),[cyclePage,setCyclePage]=useState(0),[cycleId,setCycleId]=useState(''),[configId,setConfigId]=useState(''),[memberId,setMemberId]=useState(''),[revisions,setRevisions]=useState([]),[preview,setPreview]=useState(null),[error,setError]=useState(null),[busy,setBusy]=useState(false),[reload,refresh]=useState(0);
  const pending=useRef(null),lock=useRef(false),live=useRef(true);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const docs=useResource(()=>testCasesApi.listDocuments(projectId,{page:docPage,keyword}),[projectId,docPage,keyword,reload]);
  const document=useResource(()=>docId?testCasesApi.getDocument(projectId,Number(docId)):null,[projectId,docId,reload]);
  const cycles=useResource(()=>executionApi.cycles(projectId,cyclePage),[projectId,cyclePage,reload]);
  const cycle=useResource(()=>cycleId?executionApi.cycle(projectId,Number(cycleId)):null,[projectId,cycleId,reload]);
  const configs=useResource(()=>cycleId?executionApi.configurations(projectId,Number(cycleId)):[],[projectId,cycleId,reload]);
  const members=useResource(()=>projectsApi.listMembers(projectId),[projectId,reload]);
  const invalidate=()=>{setPreview(null);pending.current=null;};
  const scope={documentId:Number(docId),cycleId:Number(cycleId),configurationId:Number(configId),assigneeMembershipId:Number(memberId),revisionIds:revisions,expectedCycleVersion:cycle.data?.version};
  const fingerprint=JSON.stringify(scope);
  const ready=authorized && document.data && cycle.data?.statusCode==='DRAFT' && configs.data?.some(c=>c.id===Number(configId)) && testerMembers(members.data || []).some(m=>m.membershipId===Number(memberId)) && revisions.length>0 && revisions.length<=500 && !document.loading && !configs.loading && !members.loading;
  const errors=[docs.error,document.error,cycles.error,cycle.error,configs.error,members.error].find(Boolean);
  async function submit(mode) {
    if(lock.current || !ready)return;lock.current=true;setBusy(true);setError(null);
    try {if(mode==='preview'){pending.current=null;const result=await fileWorkApi.preview(projectId,scope);if(live.current)setPreview({result,fingerprint});}else{if(mode!=='retry' && (!preview?.result.valid || preview.fingerprint!==fingerprint))return;pending.current ||= {...scope,expectedCycleVersion:preview.result.cycleVersion,requestKey:requestKey()};const result=await fileWorkApi.create(projectId,pending.current);if(live.current){onSaved();navigate(`/tests/file-work/${result.group.id}`);}}}
    catch(e){if(live.current){setError(e);if(e.status===409){setPreview(null);refresh(v=>v+1);}}}finally{lock.current=false;if(live.current)setBusy(false);}
  }
  return <section className="fw-panel" aria-label="Giao file"><h3>Giao file · chọn phiên bản đã duyệt</h3><WorkError error={error || errors} retry={()=>refresh(v=>v+1)}/><fieldset disabled={busy}><div className="fw-fields">
    <Field label="Tìm tài liệu nguồn"><input maxLength={255} value={keyword} onChange={e=>{setKeyword(e.target.value);setDocPage(0);}}/></Field>
    <Field label="Tài liệu đã nhập"><select value={docId} onChange={e=>{setDocId(e.target.value);setRevisions([]);invalidate();}}><option value="">Chọn tài liệu</option>{document.data && !docs.data?.items.some(d=>String(d.id)===docId) && <option value={docId}>{document.data.document.fileName}</option>}{docs.data?.items.map(d=><option key={d.id} value={d.id}>{d.fileName}</option>)}</select></Field>
    <Field label="Đợt bản nháp"><select value={cycleId} onChange={e=>{setCycleId(e.target.value);setConfigId('');invalidate();}}><option value="">Chọn đợt</option>{cycles.data?.items.filter(c=>c.statusCode==='DRAFT').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field label="Cấu hình"><select value={configId} onChange={e=>{setConfigId(e.target.value);invalidate();}}><option value="">Chọn cấu hình</option>{configs.data?.map(c=><option key={c.id} value={c.id}>{c.environmentName || `Môi trường #${c.environmentId}`} · {c.deviceName || `Thiết bị #${c.deviceId}`} · {c.versionLabel || `Build #${c.defaultBuildId}`}</option>)}</select></Field>
    <Field label="Tester nhận file"><select value={memberId} onChange={e=>{setMemberId(e.target.value);invalidate();}}><option value="">Chọn Tester</option>{testerMembers(members.data || []).map(m=><option key={m.membershipId} value={m.membershipId}>{m.displayName}</option>)}</select></Field>
    </div><Pager data={docs.data} label="tài liệu" onChange={setDocPage}/><Pager data={cycles.data} label="đợt" onChange={setCyclePage}/>
    {document.data && <div className="fw-revisions">{document.data.rows.map(r=><label key={r.rowId}><input type="checkbox" aria-label={`Chọn ${r.caseNo} revision ${r.revisionId}`} disabled={!r.approved || r.archived || !r.revisionId} checked={revisions.includes(r.revisionId)} onChange={e=>{setRevisions(v=>e.target.checked?[...v,r.revisionId]:v.filter(id=>id!==r.revisionId));invalidate();}}/>{r.caseNo} · Revision #{r.revisionId} · {r.archived?'Đã lưu trữ':r.approved?'Đã duyệt':'Chưa duyệt · không được chọn'}</label>)}</div>}
    <p>Đã chọn {revisions.length}/500 phiên bản case. Bấm kiểm tra để xác nhận phạm vi và người nhận trước khi giao.</p>
    <div className="fw-actions"><button type="button" disabled={!ready} onClick={()=>submit('preview')}>Kiểm tra trước khi giao</button><button type="button" disabled={!ready || !preview?.result.valid || preview.fingerprint!==fingerprint} onClick={()=>submit('create')}>Tạo nhóm file</button>{pending.current && error && <button type="button" disabled={!ready} onClick={()=>submit('retry')}>Thử lại nguyên lệnh tạo</button>}<button type="button" onClick={onCancel}>Hủy giao file</button></div></fieldset>
    {preview && <div role="status"><p>{preview.result.valid?'Phạm vi hợp lệ':'Không thể giao phạm vi'} · {preview.result.selectedCount} case</p>{preview.result.errors?.map((e,i)=><p key={i}>{e.code}: {e.message}</p>)}</div>}
    <p>Nhóm được tạo trong đợt bản nháp. Chuẩn bị và kích hoạt đợt trước khi Tester bắt đầu phiên.</p>{cycleId && <button type="button" onClick={()=>navigate(`/tests/cycles/${cycleId}`)}>Chuẩn bị / kích hoạt đợt</button>}
  </section>;
}
