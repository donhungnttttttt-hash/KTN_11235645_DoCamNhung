import React,{useEffect,useRef,useState} from 'react';
import {useProject} from '../projects/ProjectProvider';
import {useAuth} from '../auth/AuthProvider';
import {useAiProviders} from '../ai/AiConnections';
import {aiError} from '../ai/aiErrors';
import {managementReportsApi} from '../../services/api/managementReports';
import {TableScroll} from '../../components/TableScroll';
import {SafeMarkdown} from './SafeMarkdown';
import {useReportDrafts} from './ReportDraftProvider';
import {statuses as issueStatuses} from '../work-items/data';
import './management-analysis.css';

const statuses=[['ok','OK'],['ng','NG'],['pending','P'],['na','NA'],['notRun','Unexecuted']];
const time=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
const percent=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):0;
const displayPercent=value=>Math.round(percent(value)*100)/100;
const issueStatusLabel=value=>issueStatuses.find(status=>status.id===String(value).toLowerCase())?.label||value;
const providerLabels={OPENAI_API:'API của hệ thống',CHATGPT:'ChatGPT cá nhân',OLLAMA:'Ollama local'};
const reportAiError=(code,provider)=>code==='AI_INPUT_TOO_LARGE'
  ?'Phạm vi báo cáo quá lớn. Chọn một Feature trong Phạm vi Feature rồi tạo lại gợi ý. Bản đang soạn được giữ nguyên.'
  :code==='AI_INVALID_RESPONSE'
  ?'AI chưa trả về nội dung báo cáo hợp lệ. Bản đang soạn được giữ nguyên; bạn có thể thử tạo lại hoặc tự nhập nội dung rồi lưu báo cáo.'
  :aiError(code,provider);

export function ManagementAnalysisPage({project:providedProject,api=managementReportsApi}){
  const context=useProject(),auth=useAuth();const project=providedProject===undefined?context?.currentProject:providedProject;
  const hasRole=role=>auth?.hasRole?.(role)||auth?.user?.roles?.includes(role);
  if(providedProject===undefined&&context?.loading)return <p role="status">Đang tải dự án…</p>;
  if(!project)return <section className="page-container"><h1>Tổng hợp & Phân tích</h1><p>Chọn dự án để xem phân tích.</p></section>;
  if(!hasRole('ADMIN')&&(hasRole('DEV')||project.projectRole!=='PM'))return <section className="page-container"><h1>Không có quyền truy cập</h1><p>Tổng hợp & Phân tích dành cho PM của dự án và ADMIN.</p></section>;
  return <DraftWorkspaceGate key={project.id} project={project} api={api}/>;
}

function DraftWorkspaceGate({project,api}){
  const drafts=useReportDrafts();
  const [admitted,setAdmitted]=useState(drafts?.active!==false);
  useEffect(()=>{if(drafts?.active!==false)setAdmitted(true);},[drafts?.active]);
  // Keep an admitted editor mounted during same-owner reauthentication. A route
  // newly mounted while locked must wait to read its private draft on activation.
  if(!admitted)return <p role="status">Đăng nhập lại để tiếp tục bản nháp báo cáo.</p>;
  return <ManagementWorkspace project={project} api={api}/>;
}

function ManagementWorkspace({project,api}){
  const providers=useAiProviders();const writable=!project.archived;
  const drafts=useReportDrafts();
  const auth=useAuth(),authenticated=drafts?drafts.active:!auth?.status||auth.status==='authenticated';
  const [restored]=useState(()=>drafts?.read(project.id));
  const [restoreNotice,setRestoreNotice]=useState(!!restored);
  const initial={title:`Báo cáo ${project.name}`,markdown:''};
  const [featureId,setFeatureId]=useState(restored?.featureId||''),[catalog,setCatalog]=useState([]),[summary,setSummary]=useState(null),[summaryError,setSummaryError]=useState(''),[summaryRevision,setSummaryRevision]=useState(0);
  const [page,setPage]=useState(0),[reports,setReports]=useState(null),[listError,setListError]=useState(''),[listRevision,setListRevision]=useState(0);
  const [saved,setSaved]=useState(restored?.saved||null),[editor,setEditor]=useState(restored?.editor||initial),[baseline,setBaseline]=useState(restored?.baseline||initial),[busy,setBusy]=useState(false),[operation,setOperation]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [restoringSaved,setRestoringSaved]=useState(!!restored?.saved),[restoreRead,setRestoreRead]=useState({loading:!!restored?.saved}),[restoreRevision,setRestoreRevision]=useState(0);
  const [proposal,setProposal]=useState(null),[previewBusy,setPreviewBusy]=useState(false),[previewPending,setPreviewPending]=useState(null),[previewError,setPreviewError]=useState(''),[previewNotice,setPreviewNotice]=useState('');
  const [accessDenied,setAccessDenied]=useState('');
  const [reauthRetry,setReauthRetry]=useState(0),[reauthBusy,setReauthBusy]=useState(false),[reauthError,setReauthError]=useState('');
  const reauthGate=useRef({locked:false,retry:0});
  const lifetime=useRef(null),actionLock=useRef(false),previewLock=useRef(false),previewBody=useRef(null);
  const editorCurrent=useRef(editor),editorRevision=useRef(0),previewEditorRevision=useRef(0);
  editorCurrent.current=editor;
  function readError(failure,setMessage){if(failure.status===403)setAccessDenied('forbidden');else if(failure.status===401)setAccessDenied(current=>current==='forbidden'?current:'auth');else setMessage(failure.message);}
  useEffect(()=>{const abort=new AbortController();lifetime.current=abort;return()=>abort.abort();},[]);
  useEffect(()=>{
    const abort=new AbortController();setSummary(null);setSummaryError('');
    api.summary(project.id,{featureId:featureId?Number(featureId):null},{signal:abort.signal}).then(value=>{if(!abort.signal.aborted){setSummary(value);setCatalog(value.features||[]);}}).catch(failure=>{if(!abort.signal.aborted)readError(failure,setSummaryError);});
    return()=>abort.abort();
  },[project.id,api,featureId,summaryRevision]);
  useEffect(()=>{
    const abort=new AbortController();setReports(null);setListError('');
    api.list(project.id,{page,size:20},{signal:abort.signal}).then(value=>{if(!abort.signal.aborted)setReports(value);}).catch(failure=>{if(!abort.signal.aborted)readError(failure,setListError);});
    return()=>abort.abort();
  },[project.id,api,page,listRevision]);
  const dirty=editor.title!==baseline.title||editor.markdown!==baseline.markdown;
  const entryId=saved?`report:${saved.id}`:`new:${featureId}`;
  const bufferedEntry=useRef(entryId);
  useEffect(()=>{
    if(bufferedEntry.current&&bufferedEntry.current!==entryId)drafts?.remove(project.id,bufferedEntry.current);
    if(dirty){drafts?.write(project.id,entryId,{featureId,editor,baseline,saved});if(drafts?.active!==false)bufferedEntry.current=entryId;}
    else {if(bufferedEntry.current)drafts?.remove(project.id,bufferedEntry.current);drafts?.remove(project.id,entryId);if(drafts?.active!==false)bufferedEntry.current=null;}
  },[drafts,project.id,entryId,dirty,featureId,editor,baseline,saved]);
  useEffect(()=>{
    if(!restoringSaved||!saved)return;
    const abort=new AbortController();setRestoreRead({loading:true});
    api.get(project.id,saved.id,{signal:abort.signal}).then(value=>{
      if(abort.signal.aborted)return;
      setRestoreRead({loading:false,conflict:value.version!==saved.version});
    }).catch(failure=>{if(!abort.signal.aborted){if([401,403].includes(failure.status))readError(failure,()=>{});else setRestoreRead({loading:false,error:failure.message});}});
    return()=>abort.abort();
  },[api,project.id,restoringSaved,saved?.id,saved?.version,restoreRevision]);
  const restoreBlocked=restoringSaved&&(restoreRead.loading||restoreRead.conflict||!!restoreRead.error);
  useEffect(()=>{
    const gate=reauthGate.current;
    if(!authenticated){gate.locked=true;return;}
    if(accessDenied!=='auth'||!gate.locked&&gate.retry===reauthRetry)return;
    gate.locked=false;gate.retry=reauthRetry;
    const abort=new AbortController();setReauthBusy(true);setReauthError('');
    // A read proves current project rights. Never replay saves or paid previews.
    api.summary(project.id,{featureId:featureId?Number(featureId):null},{signal:abort.signal}).then(value=>{
      if(abort.signal.aborted)return;
      setSummary(value);setCatalog(value.features||[]);setSummaryError('');setError('');
      setAccessDenied(current=>current==='forbidden'?current:'');setListRevision(revision=>revision+1);
      if(saved){setRestoringSaved(true);setRestoreRevision(revision=>revision+1);}
    }).catch(failure=>{if(!abort.signal.aborted){if([401,403].includes(failure.status))readError(failure,()=>{});else setReauthError(failure.message);}})
      .finally(()=>{if(!abort.signal.aborted)setReauthBusy(false);});
    return()=>abort.abort();
  },[authenticated,accessDenied,reauthRetry,api,project.id,featureId,saved?.id]);
  const locked=busy||previewBusy||!!previewPending;
  const selectedProvider=previewPending?.provider||providers?.selection?.provider;
  const aiUnavailable=!previewPending&&!providers?.ready;
  function permitDiscard(){return !dirty||window.confirm('Bản sửa chưa lưu. Bỏ bản sửa để chuyển nội dung?');}
  function changeEditor(value){editorRevision.current++;editorCurrent.current=value;setEditor(value);}
  function resetEditor(value=initial,document=null){drafts?.remove(project.id,entryId);setRestoreNotice(false);setRestoringSaved(false);setRestoreRead({});setSaved(document);changeEditor({title:value.title,markdown:value.markdown});setBaseline({title:value.title,markdown:value.markdown});setProposal(null);setPreviewError('');setPreviewNotice('');setNotice('');setError('');}
  function chooseFeature(value){if(locked||!permitDiscard())return;setFeatureId(value);resetEditor();}
  async function perform(action,message){
    if(actionLock.current)return;actionLock.current=true;setBusy(true);setOperation(message);setError('');setNotice('');const signal=lifetime.current.signal;
    try{await action(signal);}catch(failure){if(!signal.aborted)readError(failure,setError);}finally{if(!signal.aborted){actionLock.current=false;setBusy(false);setOperation('');}}
  }
  function openReport(id){if(locked||!permitDiscard())return;perform(async signal=>{const value=await api.get(project.id,id,{signal});if(signal.aborted)return;resetEditor(value,value);setFeatureId(value.featureId==null?'':String(value.featureId));},'Đang mở báo cáo…');}
  function save(event){
    event.preventDefault();if(!writable||locked||restoreBlocked||!editor.title.trim()||!editor.markdown.trim())return;
    perform(async signal=>{
      const value=saved?await api.update(project.id,saved.id,{...editor,expectedVersion:saved.version},{signal}):await api.create(project.id,{featureId:featureId?Number(featureId):null,...editor},{signal});
      if(signal.aborted)return;resetEditor(value,value);setNotice('Đã lưu báo cáo.');setPage(0);setListRevision(revision=>revision+1);
    },'Đang lưu báo cáo…');
  }
  async function preview(){
    if(previewLock.current||busy||!writable||!previewBody.current&&!providers?.ready)return;
    previewLock.current=true;setPreviewBusy(true);setPreviewError('');setPreviewNotice('');const signal=lifetime.current.signal;
    if(!previewBody.current){previewEditorRevision.current=editorRevision.current;setProposal(null);}
    const body=previewBody.current||{featureId:featureId?Number(featureId):null,...providers.selection,requestKey:`report-${crypto.randomUUID()}`};previewBody.current=body;setPreviewPending(body);
    try{
      const value=await api.preview(project.id,body,{signal});if(signal.aborted)return;
      if(value?.state==='GENERATING')return;
      if(value?.state==='READY'){
        setPreviewPending(null);previewBody.current=null;
        if(typeof value.markdown!=='string'||!value.markdown.trim())setPreviewError('AI trả về bản gợi ý không có nội dung. Bản đang soạn được giữ nguyên; bạn có thể tạo lại gợi ý.');
        else if(editorCurrent.current.markdown===''&&editorRevision.current===previewEditorRevision.current){
          changeEditor({...editorCurrent.current,markdown:value.markdown});setProposal(null);setPreviewNotice('Đã tạo nội dung AI vào bản soạn, chưa lưu. Kiểm tra và chỉnh sửa trước khi lưu báo cáo.');
        }else{setProposal(value.markdown);setPreviewNotice('Đã tạo gợi ý AI bên dưới. Nội dung bạn đang soạn được giữ nguyên; chỉ thay khi bạn bấm Đưa vào bản soạn.');}
      }
      else if(value?.state==='FAILED'){setPreviewPending(null);previewBody.current=null;setPreviewError(reportAiError(value.failureCode,body.provider));}
      else setPreviewError('Chưa xác nhận được bản gợi ý. Kiểm tra lại cùng yêu cầu.');
    }catch(failure){if(!signal.aborted){readError(failure,message=>setPreviewError(failure.code?.startsWith('AI_')?reportAiError(failure.code,body.provider):message));const uncertain=['TIMEOUT','NETWORK_ERROR','INVALID_RESPONSE','AI_BUSY','AI_CREDENTIAL_STORE_FAILED'].includes(failure.code)||failure.status>=500;if(!uncertain){setPreviewPending(null);previewBody.current=null;}}}
    finally{if(!signal.aborted){previewLock.current=false;setPreviewBusy(false);}}
  }
  function download(){if(!saved||busy)return;perform(async signal=>{const response=await api.download(project.id,saved.id,{signal});const blob=await response.blob();if(signal.aborted)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`bao-cao-${saved.id}.md`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Đã tải bản báo cáo đã lưu.');},'Đang tải bản báo cáo đã lưu…');}
  if(accessDenied==='forbidden')return <section className="page-container"><h1>Không có quyền truy cập</h1><p>Quyền xem Tổng hợp & Phân tích không còn khả dụng. Chọn lại dự án hoặc tải lại quyền truy cập.</p></section>;
  if(accessDenied==='auth')return <section className="page-container"><h1>Cần xác nhận lại quyền truy cập</h1><p>Bản đang soạn vẫn được giữ. Sau khi đăng nhập lại cùng tài khoản, hệ thống kiểm tra quyền xem báo cáo trước khi mở lại.</p>{reauthBusy&&<p role="status">Đang kiểm tra lại quyền xem báo cáo…</p>}{reauthError&&<><p role="alert">{reauthError}</p><button type="button" className="cat-btn" disabled={!authenticated||reauthBusy} onClick={()=>setReauthRetry(value=>value+1)}>Kiểm tra lại quyền báo cáo</button></>}</section>;
  return <section className="page-container management-analysis">
    <header className="management-heading"><div><h1>Tổng hợp & Phân tích</h1><p>{project.name}</p></div><button type="button" className="cat-btn" onClick={()=>setSummaryRevision(value=>value+1)}>Tải lại số liệu</button></header>
    {!writable&&<p className="management-mode-notice" role="status" aria-label="Chế độ báo cáo">Dự án đã lưu trữ. Bạn có thể xem và tải bản báo cáo đã lưu.</p>}
    <label className="management-scope">Phạm vi Feature<select className="cat-select" value={featureId} disabled={locked} onChange={event=>chooseFeature(event.target.value)}><option value="">Toàn bộ dự án</option>{featureId&&!catalog.some(feature=>String(feature.id)===featureId)&&<option value={featureId}>Feature #{featureId}</option>}{catalog.map(feature=><option key={feature.id} value={feature.id}>{feature.name}</option>)}</select></label>
    {summaryError&&<p role="alert">{summaryError}</p>}{!summary&&!summaryError&&<p role="status">Đang tải phân tích…</p>}{summary&&<ManagementSummary data={summary}/>}
    <section className="management-report-workspace"><div className="management-heading"><h2>Báo cáo Markdown</h2>{writable&&<button type="button" className="cat-btn" disabled={locked} onClick={()=>{if(permitDiscard())resetEditor();}}>Báo cáo mới</button>}</div>
      {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{busy&&<p role="status" aria-label="Thao tác báo cáo">{operation}</p>}
      <div className="management-report-columns"><section className="management-report-list" aria-label="Báo cáo đã lưu"><h3>Báo cáo đã lưu của dự án</h3>{listError&&<p role="alert">{listError} <button type="button" className="cat-btn" onClick={()=>setListRevision(value=>value+1)}>Tải lại báo cáo</button></p>}{!reports&&!listError&&<p role="status">Đang tải báo cáo…</p>}
        {reports&&<>{!reports.items.length&&<p>Chưa có báo cáo đã lưu.</p>}<ul>{reports.items.map(item=><li key={item.id}><button type="button" className="cat-btn" disabled={locked} aria-current={saved?.id===item.id?'page':undefined} aria-label={`Mở báo cáo ${item.title}`} onClick={()=>openReport(item.id)}>{item.title}</button><small>{item.featureId?`Feature #${item.featureId}`:'Toàn bộ dự án'} · {time(item.updatedAt)}</small></li>)}</ul><nav className="management-pager" aria-label="Phân trang báo cáo"><button type="button" className="cat-btn" disabled={!page||locked} onClick={()=>setPage(value=>value-1)}>Báo cáo trước</button><span>{page+1}/{Math.max(1,reports.totalPages)}</span><button type="button" className="cat-btn" disabled={page+1>=reports.totalPages||locked} onClick={()=>setPage(value=>value+1)}>Báo cáo sau</button></nav></>}
      </section>
      <section className="management-report-editor" aria-label="Soạn báo cáo"><h3>{saved?`Báo cáo #${saved.id} · v${saved.version}`:'Bản soạn mới'}</h3><p>Báo cáo là văn bản. Chỉnh sửa không thay đổi Status case hoặc số liệu issue.</p>
        {restoreNotice&&dirty&&<p className="management-mode-notice">Đã khôi phục bản sửa trong phiên đăng nhập này. Chưa lưu lên máy chủ.</p>}
        {restoringSaved&&restoreRead.loading&&<p role="status">Đang đối chiếu phiên bản báo cáo đã lưu…</p>}
        {restoringSaved&&restoreRead.conflict&&<p role="alert">Bản đã lưu đã thay đổi. Bản sửa của bạn vẫn được giữ. Mở lại báo cáo trong danh sách để xem bản mới; hãy sao chép phần cần giữ trước khi bỏ bản sửa.</p>}
        {restoringSaved&&restoreRead.error&&<div className="management-mode-notice"><p role="alert">{restoreRead.error} Bản sửa vẫn được giữ. Cần đối chiếu phiên bản trước khi lưu.</p><button type="button" className="cat-btn" onClick={()=>setRestoreRevision(value=>value+1)}>Đối chiếu lại bản đã lưu</button></div>}
        {writable&&<div className="management-ai-preview"><p>Nguồn AI: {providerLabels[selectedProvider]||'chưa chọn'} · {previewPending?.model||providers?.selection?.model||'chưa chọn model'}. Cấu hình nguồn trong chat AI.</p><button type="button" className="cat-btn" disabled={previewBusy||busy||aiUnavailable} aria-describedby={aiUnavailable?'management-ai-unavailable':undefined} onClick={preview}>{previewBusy?'Đang tạo gợi ý…':previewPending?'Kiểm tra gợi ý AI':'Tạo gợi ý AI'}</button>{aiUnavailable&&<p id="management-ai-unavailable" role="status">Nguồn AI chưa sẵn sàng. {providers?.loading?'Đang tải cấu hình AI.':providers?.error||aiError(providers?.provider?.reason||'AI_NOT_CONFIGURED',selectedProvider)} Mở chat AI → Cấu hình AI để kiểm tra. Bạn vẫn có thể soạn và lưu báo cáo thủ công.</p>}{previewError&&<p role="alert">{previewError}</p>}{previewPending&&!previewBusy&&<p role="status">Yêu cầu chưa kết thúc. Kiểm tra lại sẽ dùng cùng mã yêu cầu và nguồn AI.</p>}</div>}
        {previewNotice&&<p role="status" aria-label="Kết quả tạo gợi ý AI">{previewNotice}</p>}
        {proposal!==null&&<section className="management-ai-proposal"><h3>Bản gợi ý AI chưa lưu</h3><SafeMarkdown markdown={proposal}/><button type="button" className="cat-btn" disabled={locked} onClick={()=>{changeEditor({...editorCurrent.current,markdown:proposal});setProposal(null);setPreviewNotice('Đã đưa gợi ý vào bản soạn, chưa lưu. Kiểm tra và chỉnh sửa trước khi lưu báo cáo.');}}>Đưa vào bản soạn</button></section>}
        <form onSubmit={save}><fieldset disabled={busy||!writable}><label>Tiêu đề báo cáo<input required maxLength={200} value={editor.title} onChange={event=>changeEditor({...editor,title:event.target.value})}/></label><label>Nội dung Markdown<textarea required rows={14} value={editor.markdown} onChange={event=>changeEditor({...editor,markdown:event.target.value})}/></label></fieldset><div className="management-actions">{writable&&<button className="cat-btn cat-btn-mint" disabled={locked||restoreBlocked||!editor.title.trim()||!editor.markdown.trim()}>{operation==='Đang lưu báo cáo…'?'Đang lưu…':'Lưu báo cáo'}</button>}{saved&&<button type="button" className="cat-btn" disabled={busy} onClick={download}>Tải bản đã lưu</button>}</div></form>
        {saved&&dirty&&<p>Bạn có thay đổi chưa lưu. File tải xuống là bản đã lưu trên máy chủ.</p>}<section className="management-markdown-preview" aria-label="Xem trước bản soạn"><h3>Xem trước bản soạn</h3><SafeMarkdown markdown={editor.markdown}/></section>
      </section></div>
    </section>
  </section>;
}

function ManagementSummary({data}){
  const metrics=data.metrics,total=Number(metrics.total)||0;
  return <section className="management-summary"><h2>Tiến độ kiểm thử</h2><p className="management-summary-scope">Phạm vi số liệu: {data.feature?.name||'Toàn bộ dự án'}</p><p className="management-progress-text">{total?`${metrics.tested} / ${total} case đã test · ${displayPercent(metrics.executionPercent)}%`:'Chưa có case trong phạm vi này.'}</p><p>Đã test gồm OK, NG, P và NA; tiến độ không thay cho xác nhận nghiệm thu.</p>
    <div className="management-status-bar" role="img" aria-label={statuses.map(([key,label])=>`${label}: ${metrics[key]??0}`).join(' · ')}>{statuses.map(([key,label])=><span key={key} className={`management-status-${key}`} title={`${label}: ${metrics[key]??0}`} style={{width:`${total?(Number(metrics[key])||0)*100/total:0}%`}}/>)}</div>
    <ul className="management-status-legend">{statuses.map(([key,label])=><li key={key}><span className={`management-status-${key}`} aria-hidden="true"/>{label}: {metrics[key]??0}</li>)}</ul><p className="management-as-of">Cập nhật {time(data.asOf)} · giờ Việt Nam</p>
    <h3>Đối chiếu tiến độ toàn dự án</h3><p>Bảng so sánh các Feature đang sử dụng của toàn dự án.</p><TableScroll label="Tiến độ theo Feature"><table className="management-feature-table"><thead><tr><th>Feature</th><th>Môi trường</th><th>Đã test / Tổng case</th><th>Tiến độ</th></tr></thead><tbody>{data.features.map(feature=><tr key={feature.id}><td>{feature.name}</td><td>{feature.environment||'—'}</td><td>{feature.testedCaseCount} / {feature.caseCount}</td><td><div className="management-feature-progress" role="progressbar" aria-label={`Tiến độ ${feature.name}`} aria-valuenow={percent(feature.progressPercent)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${percent(feature.progressPercent)}%`}}/></div>{feature.caseCount?`${displayPercent(feature.progressPercent)}%`:'Chưa có case'}</td></tr>)}{!data.features.length&&<tr><td colSpan={4}>Chưa có Feature.</td></tr>}</tbody></table></TableScroll>
    <h3>Bug/QA trong phạm vi</h3><TableScroll label="Số lượng Bug và QA"><table><thead><tr><th>Loại</th><th>Trạng thái</th><th>Số lượng</th></tr></thead><tbody>{data.issues.map((issue,index)=><tr key={`${issue.type}/${issue.status}/${index}`}><td>{issue.type==='BUG'?'Bug':issue.type}</td><td>{issueStatusLabel(issue.status)}</td><td>{issue.total}</td></tr>)}{!data.issues.length&&<tr><td colSpan={3}>Chưa có Bug/QA.</td></tr>}</tbody></table></TableScroll>
  </section>;
}
