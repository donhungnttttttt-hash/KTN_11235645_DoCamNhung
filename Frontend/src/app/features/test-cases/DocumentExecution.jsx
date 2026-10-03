import React, { useEffect, useMemo, useState } from 'react';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { useAuth } from '../auth/AuthProvider';
import { AttemptDialog } from '../test-execution/AttemptDialog';
import { CycleDecisionDialog } from '../test-execution/CycleDecisionDialog';
import '../test-execution/execution.css';

// Only view preferences are kept locally. Outcomes always come from the execution API.
export function useDocumentExecution(project, documentId) {
  const key=`tms.document.execution.${project.id}.${documentId}`;
  const [choice,setChoice]=useState(()=>{try{return JSON.parse(sessionStorage.getItem(key)) || {cycleId:'',configurationId:''};}catch{return {cycleId:'',configurationId:''};}});
  const [open,setOpen]=useState(Boolean(choice.cycleId)),[cyclePage,setCyclePage]=useState(0),[cycles,setCycles]=useState(null);
  const [context,setContext]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [selected,setSelected]=useState(null),[pending,setPending]=useState(null),[notice,setNotice]=useState(''),[scope,setScope]=useState(null);
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
    if(!pending || !context || !configurationId || loading)return;
    const run=byCase.get(String(pending.caseId));
    if(run){setSelected(run);setNotice('');}
    else setNotice(`Case ${pending.sourceId} chưa thuộc cấu hình này. PM cần duyệt phiên bản và thêm case vào phạm vi đợt kiểm thử.`);
    setPending(null);
  },[pending,context,configurationId,loading,byCase]);
  function show(row){setOpen(true);setNotice('');setPending(row);}
  function choose(cycleId){setChoice({cycleId,configurationId:''});setSelected(null);setScope(null);setNotice('');}
  return {open,setOpen,choice,choose,configurationId,setConfiguration:id=>setChoice(v=>({...v,configurationId:id})),cyclePage,setCyclePage,cycles,context,loading,error,notice,pending,byCase,show,selected,setSelected,scope,setScope,refresh:()=>setReload(v=>v+1)};
}

export function DocumentExecutionControls({ execution:e, project, navigate }){
  const {user}=useAuth();
  return <>
    {e.open && <section className="td-execution-controls" aria-label="Ngữ cảnh ghi kết quả">
      <label>Đợt kiểm thử <select aria-label="Đợt ghi kết quả" value={e.choice.cycleId} onChange={event=>e.choose(event.target.value)}>
        <option value="">Dữ liệu Excel nguồn</option>
        {e.choice.cycleId && !e.cycles?.items.some(c=>String(c.id)===String(e.choice.cycleId)) && <option value={e.choice.cycleId}>{e.context?.cycle.name || `Đợt #${e.choice.cycleId}`}</option>}
        {e.cycles?.items.map(c=><option key={c.id} value={c.id}>{c.name} · {c.statusCode}</option>)}
      </select></label>
      {e.cycles?.totalPages>1 && <><button className="cat-btn" disabled={!e.cyclePage} onClick={()=>e.setCyclePage(v=>v-1)}>Đợt trước</button><button className="cat-btn" disabled={e.cyclePage+1>=e.cycles.totalPages} onClick={()=>e.setCyclePage(v=>v+1)}>Đợt tiếp</button></>}
      {e.context && <label>Cấu hình <select aria-label="Cấu hình ghi kết quả" value={e.configurationId} onChange={event=>e.setConfiguration(event.target.value)}><option value="">Chọn cấu hình</option>{e.context.configs.map(c=><option key={c.id} value={c.id}>{c.environmentName} / {c.deviceName} · {c.versionLabel} ({c.buildNumber || '—'})</option>)}</select></label>}
      <button className="cat-btn" onClick={e.refresh}>Tải lại kết quả</button><button className="cat-btn" onClick={()=>navigate(e.choice.cycleId?`/tests/cycles/${e.choice.cycleId}`:'/tests/cycles')}>Thiết lập đợt / phân công</button>
      {e.loading && <span role="status">Đang tải kết quả…</span>}
      {e.pending && !e.choice.cycleId && <p role="status">Chọn đợt và cấu hình để ghi kết quả cho case {e.pending.sourceId}. Kết quả Excel gốc được giữ nguyên.</p>}
      {e.notice && <p role="status">{e.notice}</p>}{e.error && <div className="td-error" role="alert">{e.error}</div>}
    </section>}
    {e.selected && e.context && <AttemptDialog key={e.selected.id} projectId={project.id} run={e.selected} builds={e.context.builds} active={e.context.cycle.statusCode==='ACTIVE' && !project.archived} currentUserId={user?.id} onClose={()=>e.setSelected(null)} onSaved={e.refresh} timeZone={project.timezone}/>}
    {e.scope && <CycleDecisionDialog projectId={project.id} run={e.scope} onClose={()=>e.setScope(null)} onSaved={()=>{e.setScope(null);e.refresh();}}/>}
  </>;
}
