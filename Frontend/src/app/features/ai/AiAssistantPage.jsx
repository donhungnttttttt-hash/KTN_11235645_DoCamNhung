import React,{useEffect,useRef,useState} from 'react';
import {Sparkles,FileText,RefreshCw,Copy,Save,ArrowRight} from 'lucide-react';
import {aiApi} from '../../services/api/ai';
import {adminApi} from '../../services/api/admin';
import {useProject} from '../projects/ProjectProvider';
import {AdminUserProjectFilter} from '../admin/AdminUserProjectFilter';
import {useAiEditBuffer} from './AiEditBuffer';
import './ai.css';

const errors={
 AI_QUOTA_EXHAUSTED:'Dịch vụ AI đã hết số dư API. Liên hệ quản trị viên để bổ sung trước khi tạo lại.',
 AI_RATE_LIMITED:'Dịch vụ AI đang giới hạn tốc độ. Vui lòng tạo yêu cầu mới sau ít phút.',
 AI_DAILY_LIMIT:'Dự án đã đạt giới hạn yêu cầu AI hôm nay. Bạn vẫn có thể đọc các bản đã lưu.',
 AI_DISABLED:'AI chưa được bật cho hệ thống.',
 AI_AUTH_FAILED:'Cấu hình kết nối AI chưa hợp lệ. Liên hệ quản trị viên.',
 AI_UNAVAILABLE:'Dịch vụ AI chưa phản hồi. Yêu cầu này không có nội dung được tạo thành công.',
 AI_INCOMPLETE_RESPONSE:'AI trả về nội dung chưa hoàn chỉnh. Hệ thống chưa lưu nội dung này.',
 AI_REFUSED:'AI không thể xử lý nội dung này. Kiểm tra lại thông tin nguồn.',
 AI_INVALID_RESPONSE:'Kết quả AI không đáp ứng cấu trúc hoặc nguồn đối chiếu. Hệ thống đã từ chối nội dung này.',
 AI_REQUEST_LIMIT:'Đã đạt giới hạn kết nối AI trong phút này. Bạn có thể tạo yêu cầu mới sau một phút hoặc đọc bản nháp đã lưu.',
 AI_INTERRUPTED:'Yêu cầu AI đã bị gián đoạn. Chưa có nội dung hoàn chỉnh được lưu; bạn có thể tạo yêu cầu mới.',
};
const descriptions={
 ADMIN_PROJECT_REVIEW:'Nhìn lại tiến độ, nguồn lực và các mốc cần chú ý của dự án.',
 PM_PROGRESS_REPORT:'Soạn báo cáo từ kết quả thực thi, công việc và mốc dự án hiện có.',
 PM_ASSIGNMENT_SUGGESTION:'Đề xuất Tester dựa trên khối lượng công việc và máy được giao. PM quyết định phân công.',
 TESTER_WORK_REPORT:'Tổng hợp lượt test, ticket và phiên làm việc của bạn trong 14 ngày gần nhất.',
 TESTER_BUG_DRAFT:'Rà soát bug bạn tạo hoặc được giao; chỉ ra thông tin thiếu và gợi ý mô tả rõ hơn.',
 DEV_TICKET_REVIEW:'Rà soát BUG/QA được giao, tìm ticket có từ khóa liên quan trong dự án và soạn câu hỏi cần làm rõ.',
};
const roleNames={ADMIN:'Admin',PM:'PM',TESTER:'Tester',DEV:'Dev'};
const stateNames={READY:'Đã lưu',GENERATING:'Đang xử lý',FAILED:'Chưa tạo được'};
const date=value=>value?new Date(value).toLocaleString('vi-VN'):'';
function draftText(draft) {
 if(draft.editedText!=null)return draft.editedText;
 const answer=draft.content?.answer;if(!answer)return '';
 return [answer.title,answer.summary,...['observations','suggestedActions'].flatMap(key=>(answer[key]||[]).map(x=>`• ${x.text} [${x.sourceRefs.join(', ')}]`)),
  ...(answer.missingInformation?.length?['Cần bổ sung:',...answer.missingInformation.map(x=>`• ${x}`)]:[])].join('\n\n');
}
export function AiAssistantPage() {
 const {currentProject,loading,error}=useProject()||{};
 if(loading)return <p role="status">Đang tải dự án…</p>;
 if(error)return <p role="alert">{error}</p>;
 return <AiWorkspace projectId={currentProject?.id} projectName={currentProject?.name}/>;
}
export function AdminAiPage() {
 const [projectId,setProjectId]=useState('');
 return <div><section className="admin-project-filter"><AdminUserProjectFilter api={adminApi} value={projectId} onChange={setProjectId} label="Dự án cần hỗ trợ" emptyLabel="Chọn dự án"/></section>
  <AiWorkspace projectId={projectId}/></div>;
}
export function AiWorkspace({projectId,projectName,api=aiApi}) {
 const localEdits=useRef(new Map());
 const sharedEdits=useAiEditBuffer();
 const edits=sharedEdits||localEdits.current;
 useEffect(()=>{
  if(sharedEdits)return;
  const warn=event=>{if(edits.size){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[edits,sharedEdits]);
 if(!projectId)return <section className="ai-page ai-empty"><Sparkles aria-hidden="true"/><h1>Trợ lý AI</h1><p>Chọn một dự án để xem các tác vụ AI phù hợp với vai trò của bạn.</p></section>;
 return <Workspace key={projectId} projectId={projectId} projectName={projectName} api={api} edits={edits}/>;
}
function Workspace({projectId,projectName,api,edits}) {
 const [metadata,setMetadata]=useState(null),[history,setHistory]=useState([]),[purpose,setPurpose]=useState('');
 const [targets,setTargets]=useState(null),[target,setTarget]=useState(''),[search,setSearch]=useState(''),[query,setQuery]=useState('');
 const [draft,setDraft]=useState(null),[text,setText]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[targetLoading,setTargetLoading]=useState(false),[revision,setRevision]=useState(0);
 const [pending,setPending]=useState(null),[more,setMore]=useState(false);
 const lifetime=useRef(null),request=useRef(null),actionBusy=useRef(false),editor=useRef(null);
 useEffect(()=>{const abort=new AbortController();lifetime.current=abort;return()=>abort.abort();},[]);
 useEffect(()=>{
  const abort=new AbortController();setLoading(true);setError('');
  Promise.all([api.metadata(projectId,{signal:abort.signal}),api.list(projectId,0,{signal:abort.signal})])
   .then(([meta,rows])=>{if(abort.signal.aborted)return;setMetadata(meta);setPurpose(old=>meta.purposes.some(p=>p.code===old)?old:meta.purposes[0]?.code||'');setHistory(rows);setMore(rows.length===50);})
   .catch(e=>{if(abort.signal.aborted)return;setError(e.message);if([401,403,404].includes(e.status)){setDraft(null);setText('');setHistory([]);setMetadata(null);}})
   .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[api,projectId,revision]);
 const selected=metadata?.purposes.find(p=>p.code===purpose);
 useEffect(()=>{
  setTarget('');setTargets(null);setPending(null);request.current=null;
  if(!selected||selected.target==='NONE'){setTargetLoading(false);return;}
  const abort=new AbortController();setTargetLoading(true);
  api.targets(projectId,purpose,query,{signal:abort.signal}).then(rows=>{if(!abort.signal.aborted)setTargets(rows);})
   .catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setTargetLoading(false);});
  return()=>abort.abort();
 },[api,projectId,purpose,selected?.target,query]);
 const editKey=id=>`${projectId}:${id}`;
 function show(value,saved=false){
  if(saved)edits.delete(editKey(value.id));
  setDraft(value);setText(edits.get(editKey(value.id))?.text??draftText(value));
  setHistory(rows=>[value,...rows.filter(x=>x.id!==value.id)]);
 }
 function changeText(value) {
  setText(value);
  if(value===draftText(draft))edits.delete(editKey(draft.id));
  else edits.set(editKey(draft.id),{text:value,version:edits.get(editKey(draft.id))?.version??draft.version});
 }
 async function perform(fn) {
  if(actionBusy.current)return;
  actionBusy.current=true;setBusy(true);setError('');setNotice('');
  const signal=lifetime.current.signal;
  try{await fn(signal);}catch(e){if(!signal.aborted){setError(errors[e.code]||e.message);if([401,403,404].includes(e.status)){setDraft(null);setText('');setHistory([]);setPending(null);}}}
  finally{if(!signal.aborted){actionBusy.current=false;setBusy(false);}}
 }
 async function generate(retry=false) {
  await perform(async signal=>{
   const body=retry?request.current:{purpose,targetId:selected.target==='NONE'?null:Number(target),requestKey:crypto.randomUUID()};
   if(!body)return;request.current=body;setPending(body);
   try{const result=await api.generate(projectId,body,{signal});if(signal.aborted)return;show(result);if(result.state!=='GENERATING'){setPending(null);request.current=null;}}
   catch(e){if(!['TIMEOUT','NETWORK_ERROR'].includes(e.code)){setPending(null);request.current=null;}throw e;}
  });
 }
 async function open(id) {await perform(async signal=>{const value=await api.get(projectId,id,{signal});if(!signal.aborted)show(value);});}
 const changed=draft?.state==='READY'&&text!==draftText(draft);
 const canGenerate=metadata?.enabled&&!metadata.archived&&selected&&!targetLoading&&(selected.target==='NONE'||target)&&!busy&&!loading&&!pending;
 return <section className="ai-page">
  <header className="ai-heading"><div><div className="ai-eyebrow"><Sparkles size={17} aria-hidden="true"/>TRỢ LÝ CÔNG VIỆC</div><h1>Trợ lý AI {metadata&&<span>{roleNames[metadata.role]||metadata.role}</span>}</h1><p>{projectName||'Theo dự án đã chọn'} · Bản nháp để bạn kiểm tra và sử dụng.</p></div>
   <button type="button" className="ai-button" disabled={busy||loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16} aria-hidden="true"/>Cập nhật danh sách</button></header>
  {error&&<div className="ai-error" role="alert">{error} <button className="ai-button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>Tải lại danh sách</button></div>}
  {loading&&<p role="status">Đang tải trợ lý AI…</p>}
  {metadata&&<>
   {!metadata.enabled&&<p className="ai-notice">AI chưa được bật cho hệ thống. Bạn vẫn có thể xem và chỉnh sửa các bản nháp đã lưu.</p>}
   {metadata.archived&&<p className="ai-notice">Dự án đã lưu trữ. Chỉ xem các bản nháp còn hạn.</p>}
   <div className="ai-layout"><div className="ai-main">
    <section className="ai-card"><h2>Bạn cần hỗ trợ việc gì?</h2>
     <label className="ai-field">Tác vụ AI<select value={purpose} disabled={busy||!!pending} onChange={e=>{setPurpose(e.target.value);setQuery('');setSearch('');}}>{metadata.purposes.map(p=><option key={p.code} value={p.code}>{p.label}</option>)}</select></label>
     <p className="ai-description">{descriptions[purpose]}</p>
     {selected?.target!=='NONE'&&selected&&<div className="ai-target">
      <div className="ai-search"><label className="ai-field">Tìm file hoặc ticket<input value={search} maxLength={80} disabled={busy||!!pending} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setQuery(search.trim());}}}/></label><button className="ai-button" disabled={busy||!!pending} onClick={()=>setQuery(search.trim())}>Tìm</button></div>
      <label className="ai-field">File hoặc ticket<select value={target} disabled={busy||targetLoading||!!pending} onChange={e=>setTarget(e.target.value)}><option value="">Chọn một mục</option>{targets?.items.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      {target&&<p className="ai-selected">{targets?.items.find(t=>String(t.id)===target)?.label}</p>}
      {targetLoading&&<p role="status">Đang tải các mục được phép…</p>}
      {targets&&!targets.items.length&&<p>Chưa có file hoặc ticket phù hợp. Kiểm tra phân công hoặc đổi từ khóa tìm kiếm.</p>}
      {targets?.hasMore&&<p>Đang hiển thị 50 mục. Tìm theo tên để thu hẹp danh sách.</p>}
     </div>}
     <p className="ai-privacy">OpenAI sẽ nhận phần dữ liệu cần thiết của tác vụ. Bản nháp lưu {metadata.retentionDays} ngày, chỉ bạn được xem. Hãy đối chiếu nguồn trước khi dùng.</p>
     <div className="ai-actions"><button className="ai-button ai-primary" disabled={!canGenerate} onClick={()=>generate()}><Sparkles size={16} aria-hidden="true"/>{busy?'Đang xử lý…':'Phân tích'}</button>
      {pending&&<button className="ai-button" disabled={busy} onClick={()=>generate(true)}>Kiểm tra lại yêu cầu</button>}</div>
     {pending&&!busy&&<p role="status">Yêu cầu có thể đang được xử lý. Kiểm tra lại sẽ dùng cùng mã yêu cầu.</p>}
    </section>
    {draft&&<section className="ai-card ai-output" aria-label="Bản nháp AI">
     <div className="ai-output-heading"><h2>{draft.content?.answer?.title||'Yêu cầu AI'}</h2><span className={`ai-state ai-state-${draft.state.toLowerCase()}`}>{stateNames[draft.state]}</span></div>
     <p className="ai-caption">Tạo {date(draft.createdAt)} · Hết hạn {date(draft.expiresAt)}</p>
     {draft.state==='FAILED'&&<p role="alert" className="ai-error">{errors[draft.failureCode]||'Chưa tạo được bản nháp AI. Bạn có thể thử tạo yêu cầu mới.'}</p>}
     {draft.state==='GENERATING'&&<><p role="status">Chưa có kết quả đã lưu. Vui lòng kiểm tra lại sau.</p><button className="ai-button" disabled={busy} onClick={()=>open(draft.id)}>Kiểm tra bản nháp</button></>}
     {draft.state==='READY'&&<>
      <label className="ai-field">Nội dung để sử dụng<textarea ref={editor} value={text} maxLength={12000} rows={15} disabled={busy||metadata.archived} onChange={e=>changeText(e.target.value)}/></label>
      <div className="ai-actions"><button className="ai-button ai-primary" disabled={!changed||busy||metadata.archived} onClick={()=>perform(async signal=>{const value=await api.edit(projectId,draft.id,{text,expectedVersion:edits.get(editKey(draft.id))?.version??draft.version},{signal});if(!signal.aborted){show(value,true);setNotice('Đã lưu chỉnh sửa.');}})}><Save size={16} aria-hidden="true"/>Lưu chỉnh sửa</button>
       {changed&&<button className="ai-button" disabled={busy} onClick={()=>{edits.delete(editKey(draft.id));setText(draftText(draft));}}>Dùng bản đã lưu</button>}
       <button className="ai-button" disabled={busy} onClick={async()=>{try{await navigator.clipboard.writeText(text);setNotice('Đã sao chép nội dung.');}catch{editor.current?.focus();editor.current?.select();setNotice('Đã chọn nội dung. Nhấn Ctrl+C hoặc dùng chức năng sao chép của thiết bị.');}}}><Copy size={16} aria-hidden="true"/>Sao chép</button></div>
      {changed&&<p className="ai-caption">Có chỉnh sửa chưa lưu.</p>}
      <details><summary>Nội dung AI ban đầu</summary><pre className="ai-original">{draftText({...draft,editedText:null})}</pre></details>
      <h3>Nguồn đối chiếu</h3><ul className="ai-sources">{draft.content.sources.map(source=><li key={source.ref}><a href={`#${source.path}`}><ArrowRight size={14} aria-hidden="true"/>{source.label}</a><small>{source.ref}{source.version!=null?` · phiên bản ${source.version}`:''}</small></li>)}</ul>
      <p className="ai-caption">Nguồn có thể đã thay đổi sau khi tạo bản nháp. Việc lưu ở đây không cập nhật ticket, kết quả test hoặc phân công.</p>
     </>}
    </section>}
    {notice&&<p role="status" className="ai-notice">{notice}</p>}
   </div><aside className="ai-card ai-history" aria-label="Lịch sử bản nháp"><h2><FileText size={18} aria-hidden="true"/>Bản nháp của bạn</h2><p>Các yêu cầu còn trong thời hạn lưu.</p>
    {!history.length&&<div className="ai-empty"><FileText size={28} aria-hidden="true"/><p>Chưa có bản nháp. Chọn tác vụ để bắt đầu.</p></div>}
    <ul>{history.map(item=><li key={item.id}><button className="ai-history-item" disabled={busy} aria-label={`Mở bản nháp ${item.content?.answer?.title||'#'+item.id}`} aria-current={item.id===draft?.id?'true':undefined} onClick={()=>open(item.id)}><strong>{item.content?.answer?.title||metadata.purposes.find(p=>p.code===item.purpose)?.label||'Yêu cầu AI'}</strong><span>{date(item.createdAt)}</span><small>{edits.has(editKey(item.id))?'Có chỉnh sửa chưa lưu':stateNames[item.state]}</small></button></li>)}</ul>
    {more&&<button className="ai-button" disabled={busy} onClick={()=>perform(async signal=>{const rows=await api.list(projectId,history.at(-1).id,{signal});if(!signal.aborted){setHistory(old=>[...old,...rows.filter(x=>!old.some(y=>y.id===x.id))]);setMore(rows.length===50);}})}>Xem bản cũ hơn</button>}
   </aside></div>
  </>}
 </section>;
}
