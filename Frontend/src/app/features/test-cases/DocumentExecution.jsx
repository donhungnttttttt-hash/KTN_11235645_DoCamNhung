import React, { useEffect, useMemo, useState } from 'react';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { useAuth } from '../auth/AuthProvider';
import { AttemptDialog } from '../test-execution/AttemptDialog';
import { CycleDecisionDialog } from '../test-execution/CycleDecisionDialog';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import '../test-execution/execution.css';

// Only view preferences are kept locally. Outcomes always come from the execution API.
export function useDocumentExecution(project, documentId) {
  const key=`tms.document.execution.${project.id}.${documentId}`;
  const [choice,setChoice]=useState(()=>{try{return JSON.parse(sessionStorage.getItem(key)) || {cycleId:'',configurationId:''};}catch{return {cycleId:'',configurationId:''};}});
  const [open,setOpen]=useState(Boolean(choice.cycleId)),[cyclePage,setCyclePage]=useState(0),[cycles,setCycles]=useState(null);
  const [context,setContext]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [selected,setSelected]=useState(null),[pending,setPending]=useState(null),[notice,setNotice]=useState(''),[scope,setScope]=useState(null);
  const [requested,setRequested]=useState(null);
  useEffect(()=>{try{sessionStorage.setItem(key,JSON.stringify(choice));}catch{/* A blocked storage must not prevent execution. */}},[key,choice]);
  useEffect(()=>{
    if(!open)return;
    let live=true;setCycles(null);
    executionApi.cycles(project.id,cyclePage).then(value=>{if(live)setCycles(value);}).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[project.id,open,cyclePage,reload]);
  useEffect(()=>{
    let live=true;setContext(prev=>String(prev?.cycle.id)===String(choice.cycleId)?prev:null);setError('');
    if(!choice.cycleId){setLoading(false);return;}
    setLoading(true);
    async function load(){
      try{
        const [cycle,configs,builds,first]=await Promise.all([executionApi.cycle(project.id,choice.cycleId),executionApi.configurations(project.id,choice.cycleId),projectsApi.listCatalog(project.id,'builds'),executionApi.runs(project.id,choice.cycleId)]);
        const runs=[...first.items];
        // Existing cycle scope is bounded; never silently omit runs after page 1.
        for(let page=1;page<first.totalPages;page++){
          if(!live)return;
          const next=await executionApi.runs(project.id,choice.cycleId,{page});runs.push(...next.items);
        }
        if(live)setContext({cycle,configs,builds,runs});
      }catch(e){if(live){setError(e.message);setContext(null);}}finally{if(live)setLoading(false);}
    }
    load();return()=>{live=false;};
  },[project.id,choice.cycleId,reload]);
  const configurationId=choice.configurationId || (context?.configs.length===1?String(context.configs[0].id):'');
  const byCase=useMemo(()=>new Map((context?.runs || []).filter(r=>String(r.configurationId)===configurationId).map(r=>[String(r.testCaseId),r])),[context,configurationId]);
  useEffect(()=>{
    if(!pending || !context || String(context.cycle.id)!==String(choice.cycleId) || !configurationId || loading)return;
    const run=byCase.get(String(pending.caseId));
    if(run){setSelected(run);setNotice('');}
    else setNotice(`Case ${pending.sourceId} chưa thuộc cấu hình này. PM cần duyệt phiên bản và thêm case vào phạm vi đợt kiểm thử.`);
    setPending(null);
  },[pending,context,choice.cycleId,configurationId,loading,byCase]);
  function show(row){setOpen(true);setSelected(null);setRequested(row);setNotice('');setPending(row);}
  function choose(cycleId){setChoice({cycleId,configurationId:''});setSelected(null);setScope(null);setNotice('');setPending(requested);}
  function setConfiguration(id){setChoice(v=>({...v,configurationId:id}));setSelected(null);setNotice('');setPending(requested);}
  function close(){setSelected(null);setRequested(null);setPending(null);setNotice('');}
  function refresh(){setPending(selected?null:requested);setReload(v=>v+1);}
  return {open,setOpen,choice,choose,configurationId,setConfiguration,cyclePage,setCyclePage,cycles,context,loading,error,notice,pending,requested,close,byCase,show,selected,setSelected,scope,setScope,refresh};
}

function ResultContextDialog({execution:e,children}){
  const ref=useDialogFocus(e.close);
  return <div className="ex-modal"><section ref={ref} tabIndex={-1} className="ex-dialog td-result-context-dialog" role="dialog" aria-modal="true" aria-label={`Ghi kết quả test case ${e.requested.sourceId}`}>
    <div className="ex-heading"><h3>Ghi kết quả · Test case {e.requested.sourceId}</h3><button className="cat-btn" onClick={e.close}>Đóng</button></div>
    <p>Chọn đợt và cấu hình để ghi kết quả. Các giá trị OK/NG đang có trong Excel là kết quả nhập từ file, chưa phải lần chạy trong đợt kiểm thử.</p>
    {children}
    {e.cycles && !e.cycles.items.length && <p role="status">Dự án chưa có đợt kiểm thử ở trang này. PM cần tạo đợt, thêm case đã duyệt và phân công người thực hiện.</p>}
    {e.context && !e.context.configs.length && <p role="status">Đợt này chưa có cấu hình kiểm thử. PM cần thêm môi trường, thiết bị và build trong phần thiết lập đợt.</p>}
  </section></div>;
}

function FileWorkContextDialog({ execution:e, navigate, disabled }) {
  const ref=useDialogFocus(e.close);
  const groupId=e.selected.fileWorkGroupId;
  const valid=(typeof groupId === 'number' || typeof groupId === 'string') && /^[1-9]\d*$/.test(String(groupId)) && Number.isSafeInteger(Number(groupId));
  return <div className="ex-modal"><section ref={ref} tabIndex={-1} className="ex-dialog" role="dialog" aria-modal="true" aria-label={`Công việc theo file · ${e.selected.caseNo}`}>
    <div className="ex-heading"><h3>Công việc theo file · {e.selected.caseNo}</h3><button className="cat-btn" onClick={e.close}>Đóng</button></div>
    <p>Lượt kiểm thử này thuộc công việc theo file. Mở công việc để xem ngữ cảnh phiên và ghi kết quả.</p>
    {!valid && <p role="alert">Không mở được công việc theo file vì mã nhóm không hợp lệ. Tải lại kết quả để kiểm tra.</p>}
    <button className="cat-btn" disabled={disabled || !valid} onClick={()=>{navigate(`/tests/file-work/${groupId}`);e.close();}}>Công việc theo file</button>
  </section></div>;
}

export function DocumentExecutionControls({ execution:e, project, navigate, disabled=false }){
  const {user,hasRole}=useAuth();
  const dev=hasRole?.('DEV') || project?.projectRole==='DEV';
  const picker=Boolean(e.requested && (!e.selected || !e.context));
  const grouped=e.selected?.fileWorkGroupId != null && !e.requested?.historyOnly;
  const controls=<fieldset disabled={disabled} className="td-execution-controls" aria-label="Ngữ cảnh ghi kết quả">
      <label>Đợt kiểm thử <select aria-label="Đợt ghi kết quả" value={e.choice.cycleId} onChange={event=>e.choose(event.target.value)}>
        <option value="">Chọn đợt kiểm thử</option>
        {e.choice.cycleId && !e.cycles?.items.some(c=>String(c.id)===String(e.choice.cycleId)) && <option value={e.choice.cycleId}>{e.context?.cycle.name || `Đợt #${e.choice.cycleId}`}</option>}
        {e.cycles?.items.map(c=><option key={c.id} value={c.id}>{c.name} · {c.statusCode}</option>)}
      </select></label>
      {e.cycles?.totalPages>1 && <><button className="cat-btn" disabled={!e.cyclePage} onClick={()=>e.setCyclePage(v=>v-1)}>Đợt trước</button><button className="cat-btn" disabled={e.cyclePage+1>=e.cycles.totalPages} onClick={()=>e.setCyclePage(v=>v+1)}>Đợt tiếp</button></>}
      {e.context && <label>Cấu hình <select aria-label="Cấu hình ghi kết quả" value={e.configurationId} onChange={event=>e.setConfiguration(event.target.value)}><option value="">Chọn cấu hình</option>{e.context.configs.map(c=><option key={c.id} value={c.id}>{c.environmentName} / {c.deviceName} · {c.versionLabel} ({c.buildNumber || '—'})</option>)}</select></label>}
      <button className="cat-btn" onClick={e.refresh}>Tải lại kết quả</button><button className="cat-btn" onClick={()=>navigate(e.choice.cycleId?`/tests/cycles/${e.choice.cycleId}`:'/tests/cycles')}>Thiết lập đợt / phân công</button>
      {e.loading && <span role="status">Đang tải kết quả…</span>}
      {!picker && e.pending && !e.choice.cycleId && <p role="status">Chọn đợt và cấu hình để ghi kết quả cho case {e.pending.sourceId}. Kết quả Excel gốc được giữ nguyên.</p>}
      {e.notice && <p role="status">{e.notice}</p>}{e.error && <div className="td-error" role="alert">{e.error}</div>}
    </fieldset>;
  return <>
    {picker?<ResultContextDialog execution={e}>{controls}</ResultContextDialog>:e.open?controls:null}
    {e.selected && e.context && (grouped
      ? <FileWorkContextDialog execution={e} navigate={navigate} disabled={disabled}/>
      : <AttemptDialog key={e.selected.id} projectId={project.id} run={e.selected} builds={e.context.builds} active={e.context.cycle.statusCode==='ACTIVE' && !project.archived} readOnly={dev || e.requested?.historyOnly} currentUserId={user?.id} onClose={e.close} onSaved={e.refresh} timeZone={project.timezone}/>)}
    {e.scope && <CycleDecisionDialog projectId={project.id} run={e.scope} onClose={()=>e.setScope(null)} onSaved={()=>{e.setScope(null);e.refresh();}}/>}
  </>;
}
