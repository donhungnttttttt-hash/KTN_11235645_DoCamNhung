import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MessageCircle,Minus,Send,Copy,Plus,History,Settings2} from 'lucide-react';
import {useAuth} from '../auth/AuthProvider';
import {aiApi} from '../../services/api/ai';
import {projectsApi} from '../../services/api/projects';
import {AiSourceSelector,useAiProviders,providerReady} from './AiConnections';
import {aiError} from './aiErrors';
import {purposeLabel} from './aiLabels';
import {useChatLauncherHost} from './ChatLauncherSlot';
import './ai.css';

const providerLabels={OPENAI_API:'API của hệ thống',CHATGPT:'ChatGPT cá nhân',OLLAMA:'Ollama local'};
export function AiChat({api=aiApi,projectApi=projectsApi}){
 const auth=useAuth();
 return <OwnerChat key={auth?.user?.id??'anonymous'} api={api} projectApi={projectApi} active={!auth||auth.status==='authenticated'}/>;
}
function OwnerChat({api,projectApi,active}){
 const providers=useAiProviders();
 const {host:launcherHost,provided:hasLauncherProvider}=useChatLauncherHost();
 const [open,setOpen]=useState(false),[settings,setSettings]=useState(false),[showHistory,setShowHistory]=useState(false);
 const [projects,setProjects]=useState([]),[projectId,setProjectId]=useState(''),[metadata,setMetadata]=useState(null),[purpose,setPurpose]=useState(''),[targetId,setTargetId]=useState(''),[targets,setTargets]=useState(null),[query,setQuery]=useState('');
 const [thread,setThread]=useState(null),[turns,setTurns]=useState([]),[history,setHistory]=useState([]),[historyBefore,setHistoryBefore]=useState(null),[turnBefore,setTurnBefore]=useState(null);
 const [text,setText]=useState(''),[pending,setPending]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[denied,setDenied]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [scopeLoading,setScopeLoading]=useState(false),[detailLoading,setDetailLoading]=useState(false);
 const [targetRetry,retryTargets]=useState(0),[targetLoading,setTargetLoading]=useState(false);
 const lifetime=useRef(null),lock=useRef(false),currentActive=useRef(active),generation=useRef(0),previousActive=useRef(active),previousOpen=useRef(false),pendingRef=useRef(null),threadRef=useRef(null),composer=useRef(null),launcher=useRef(null),transcript=useRef(null),draftRef=useRef(text);
 const sessionGeneration=useRef(0),turnRevision=useRef(0),detailReadVersion=useRef(0);
 currentActive.current=active;draftRef.current=text;threadRef.current=thread;
 // Invalidate before effects run, including a response queued during a session change.
 if(previousActive.current!==active){generation.current++;sessionGeneration.current++;previousActive.current=active;}
 const valid=(signal,epoch)=>!signal.aborted&&currentActive.current&&generation.current===epoch;
 const validScopeRead=(signal,epoch)=>!signal.aborted&&currentActive.current&&sessionGeneration.current===epoch;
 function invalidate(){generation.current++;lifetime.current?.abort();lifetime.current=new AbortController();lock.current=false;setBusy(false);}
 useEffect(()=>{const abort=new AbortController();lifetime.current=abort;lock.current=false;setBusy(false);if(!active){setOpen(false);setTurns([]);setHistory([]);setProjects([]);setMetadata(null);setDenied(true);}else if(!threadRef.current)setDenied(false);return()=>abort.abort();},[active]);
 async function loadHistory(before=0,signal=lifetime.current.signal,epoch=generation.current,validate=valid){
  const data=await api.chatList(before,{signal});if(!validate(signal,epoch))return;
  setHistory(old=>before?[...old,...data.items.filter(item=>!old.some(x=>x.id===item.id))]:data.items);setHistoryBefore(data.nextBefore);
 }
 async function readThread(id,signal,epoch){
  const mutation=turnRevision.current;
  const read=++detailReadVersion.current;
  setDetailLoading(true);
  try{
   const data=await api.chatGet(id,0,{signal});
   if(!valid(signal,epoch)||read!==detailReadVersion.current||mutation!==turnRevision.current)return;
   setThread(data.thread);
   setTurns(data.turns);
   setTurnBefore(data.nextBefore);
   setDenied(false);
  }catch(e){
   if(!valid(signal,epoch)||read!==detailReadVersion.current||mutation!==turnRevision.current)return;
   throw e;
  }finally{
   if(valid(signal,epoch)&&read===detailReadVersion.current)setDetailLoading(false);
  }
 }
 useEffect(()=>{
  if(!active||!open)return;
  const abort=new AbortController();
  const scopeEpoch=sessionGeneration.current,threadEpoch=generation.current;
  setLoading(true);
  Promise.all([projectApi.list({signal:abort.signal}),loadHistory(0,abort.signal,scopeEpoch,validScopeRead)])
   .then(([rows])=>{if(validScopeRead(abort.signal,scopeEpoch))setProjects(rows);})
   .catch(e=>{if(validScopeRead(abort.signal,scopeEpoch))setError(aiError(e.code,threadRef.current?.provider,true));})
   .finally(()=>{if(validScopeRead(abort.signal,scopeEpoch))setLoading(false);});
  if(threadRef.current){
   const id=threadRef.current.id;
   readThread(id,abort.signal,threadEpoch).catch(e=>{
    if(!valid(abort.signal,threadEpoch))return;
    turnRevision.current++;
    setError([403,404].includes(e.status)?'Hội thoại hoặc nguồn không còn truy cập được. Chọn hội thoại mới.':aiError(e.code,threadRef.current?.provider,true));
    setDenied(true);
    setTurns([]);
   });
  }else setDetailLoading(false);
  return()=>abort.abort();
 },[api,projectApi,active,open]);
 useEffect(()=>{if(open&&active)composer.current?.focus();else if(previousOpen.current&&active)launcher.current?.focus();previousOpen.current=open;},[open,active]);
 useEffect(()=>{if(transcript.current)transcript.current.scrollTop=transcript.current.scrollHeight;},[turns,busy]);
 useEffect(()=>{
  setMetadata(null);setTargets(null);setPurpose('');setTargetId('');setQuery('');
  if(!projectId||!active){setScopeLoading(false);return;}
  const abort=new AbortController(),epoch=sessionGeneration.current;setScopeLoading(true);
  api.metadata(projectId,{signal:abort.signal}).then(meta=>{if(validScopeRead(abort.signal,epoch)){setMetadata(meta);setPurpose(meta.purposes[0]?.code||'');}}).catch(e=>{if(validScopeRead(abort.signal,epoch))setError(aiError(e.code,providers?.selection.provider,true));}).finally(()=>{if(validScopeRead(abort.signal,epoch))setScopeLoading(false);});
  return()=>abort.abort();
 },[api,projectId,active]);
 const selected=metadata?.purposes.find(item=>item.code===purpose);
 useEffect(()=>{
  setTargetId('');setTargets(null);
  if(!active||!projectId||!selected||selected.target==='NONE'){setTargetLoading(false);return;}
  const abort=new AbortController(),epoch=sessionGeneration.current;
  setTargetLoading(true);setError('');
  api.targets(projectId,purpose,query,{signal:abort.signal}).then(rows=>{if(validScopeRead(abort.signal,epoch))setTargets(rows);}).catch(e=>{if(validScopeRead(abort.signal,epoch))setError(aiError(e.code,providers?.selection.provider,true));}).finally(()=>{if(validScopeRead(abort.signal,epoch))setTargetLoading(false);});
  return()=>abort.abort();
 },[api,active,projectId,purpose,selected?.target,query,targetRetry]);
 function fresh(){invalidate();detailReadVersion.current++;setDetailLoading(false);setThread(null);setTurns([]);setPending(null);pendingRef.current=null;setTurnBefore(null);setDenied(false);setError('');setNotice('');setSettings(true);}
 function changeScope(value){fresh();setProjectId(value);}
 async function perform(fn){
  if(lock.current||!active)return;lock.current=true;setBusy(true);setError('');setNotice('');const signal=lifetime.current.signal,epoch=generation.current;
  try{
   await fn(signal,epoch);
  }catch(e){
   if(valid(signal,epoch)){
    setError([403,404].includes(e.status)?'Hội thoại hoặc nguồn không còn truy cập được. Chọn hội thoại mới.':aiError(e.code,threadRef.current?.provider||providers?.selection.provider,true));
    if([401,403,404].includes(e.status)||['ARCHIVED','PROJECT_ARCHIVED','AI_CONTEXT_CHANGED','CYCLE_CLOSED'].includes(e.code)){
     turnRevision.current++;
     setDenied(true);
     if([401,403,404].includes(e.status))setTurns([]);
    }
   }
  }
  finally{if(valid(signal,epoch)){lock.current=false;setBusy(false);}}
 }
 async function selectThread(id){fresh();setSettings(false);setShowHistory(false);await perform((signal,epoch)=>readThread(id,signal,epoch));}
 function updateTurn(turn){turnRevision.current++;setTurns(old=>[...old.filter(item=>item.id!==turn.id),turn].sort((a,b)=>a.id-b.id));}
 async function send(retry=false){
  if(!retry&&(!text.trim()||!canSend))return;
  await perform(async(signal,epoch)=>{
   let currentThread=threadRef.current;
   const body=retry?pendingRef.current?.body:{text,requestKey:`chat-${crypto.randomUUID()}`};if(!body)return;
   if(!currentThread){const selection={...providers.selection};currentThread=await api.chatCreate({...selection,projectId:projectId?Number(projectId):null,purpose:projectId?purpose:null,targetId:projectId&&selected.target!=='NONE'?Number(targetId):null},{signal});if(!valid(signal,epoch))return;setThread(currentThread);threadRef.current=currentThread;setHistory(old=>[currentThread,...old.filter(item=>item.id!==currentThread.id)]);setSettings(false);}
   const request={threadId:currentThread.id,body};pendingRef.current=request;setPending(request);
   try{const result=await api.chatSend(request.threadId,body,{signal});if(!valid(signal,epoch))return;updateTurn(result);if(result.state!=='GENERATING'){pendingRef.current=null;setPending(null);if(result.state==='READY'&&draftRef.current===body.text)setText('');}}
   catch(e){if(valid(signal,epoch)&&!['TIMEOUT','NETWORK_ERROR','AI_BUSY','AI_CREDENTIAL_STORE_FAILED'].includes(e.code)){pendingRef.current=null;setPending(null);}throw e;}
  });
 }
 async function inspect(){if(pendingRef.current){await send(true);return;}if(thread)await perform((signal,epoch)=>readThread(thread.id,signal,epoch));}
 function minimize(){setOpen(false);}
 const pinnedProvider=providers?.providers.find(item=>item.code===(thread?.provider||providers.selection.provider));
 const pinnedModel=thread?.model||providers?.selection.model;
 const catalog=providers?.catalogs?.[`${pinnedProvider?.code}:${pinnedProvider?.connection?.id||''}:${pinnedProvider?.connection?.version||0}`]|| (pinnedProvider?.code===providers?.selection.provider?providers?.catalog:null);
 const ready=thread?providerReady(pinnedProvider,pinnedModel,catalog):providers?.ready;
 const scopeReady=!projectId||metadata&&!metadata.archived&&selected&&(selected.target==='NONE'||targetId);
 const archived=thread?.projectId&&projects.find(item=>item.id===thread.projectId)?.archived;
 const reading=loading||scopeLoading||detailLoading;
 const canSend=active&&ready&&!busy&&!pending&&!reading&&!denied&&!archived&&(thread||scopeReady)&&!turns.some(item=>item.state==='GENERATING');
 const scopeLabel=thread?.projectId?`${projects.find(item=>item.id===thread.projectId)?.name||`Dự án #${thread.projectId}`} · ${purposeLabel(thread.purpose)}${thread.targetId?` · nguồn #${thread.targetId}`:''}`:thread?'Trao đổi chung':projectId?`${projects.find(item=>String(item.id)===projectId)?.name||`Dự án #${projectId}`} · ${selected?.label||'chưa chọn tác vụ'}${targetId?` · ${targets?.items.find(item=>String(item.id)===targetId)?.label||`nguồn #${targetId}`}`:''}`:'Trao đổi chung · không gửi dữ liệu dự án';
 if(!active)return null;
 const launcherButton=<button ref={launcher} type="button" className="ai-chat-launcher" aria-label="Mở chat AI" aria-expanded={open} onClick={()=>setOpen(true)} hidden={open}><MessageCircle size={23} aria-hidden="true"/><span>Chat AI</span></button>;
 return <div className={`ai-chat-root${open?' is-open':''}${hasLauncherProvider?' is-ported':''}`}>
  {launcherHost?createPortal(launcherButton,launcherHost):!hasLauncherProvider&&launcherButton}
  {open&&<section className="ai-chat ai-page" role="dialog" aria-modal="false" aria-label="Chat AI riêng" onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented&&e.target.tagName!=='SELECT'){e.stopPropagation();e.preventDefault();minimize();}}}>
   <header className="ai-chat-heading"><div><strong><MessageCircle size={18} aria-hidden="true"/>Chat AI riêng</strong><small>Lưu tạm 7 ngày · chỉ bạn xem</small></div><button className="ai-button" aria-label="Thu nhỏ chat" onClick={minimize}><Minus size={20} aria-hidden="true"/></button></header>
   <div className="ai-chat-provenance"><strong>{providerLabels[thread?.provider||providers?.selection.provider]} · {pinnedModel||'chưa chọn model'}</strong><span>{scopeLabel}</span>{thread&&<small>Hội thoại #{thread.id} · nguồn / model / phạm vi đã cố định</small>}</div>
   <nav className="ai-chat-toolbar" aria-label="Điều khiển hội thoại"><button className="ai-button" onClick={fresh} disabled={busy}><Plus size={16} aria-hidden="true"/>Mới</button><button className="ai-button" aria-expanded={showHistory} onClick={()=>{setShowHistory(v=>!v);setSettings(false);}}><History size={16} aria-hidden="true"/>Lịch sử</button><button className="ai-button" aria-expanded={settings} onClick={()=>{setSettings(v=>!v);setShowHistory(false);}}><Settings2 size={16} aria-hidden="true"/>Nguồn / phạm vi</button></nav>
   <div className="ai-chat-scroll" ref={transcript}>
    {settings&&<div className="ai-chat-settings"><AiSourceSelector disabled={busy||!!pending}/>{thread&&<p className="ai-notice">Lựa chọn nguồn áp dụng cho phân tích và hội thoại mới. Hội thoại hiện tại giữ nguyên nguồn đã tạo.</p>}
     <label className="ai-field">Phạm vi chat<select value={projectId} disabled={busy||!!pending} onChange={e=>changeScope(e.target.value)}><option value="">Trao đổi chung</option>{projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
     {projectId&&<><label className="ai-field">Tác vụ cho chat<select value={purpose} disabled={busy||!!pending||!metadata} onChange={e=>{fresh();setPurpose(e.target.value);setQuery('');}}><option value="">Chọn tác vụ</option>{metadata?.purposes.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>{selected&&selected.target!=='NONE'&&<><form className="ai-search" onSubmit={e=>{e.preventDefault();setQuery(new FormData(e.currentTarget).get('search').trim());retryTargets(value=>value+1);}}><label className="ai-field">Tìm nguồn chat<input name="search" maxLength={80} disabled={busy||!!pending}/></label><button className="ai-button" disabled={busy||!!pending||targetLoading}>{targetLoading?'Đang tìm…':'Tìm'}</button></form><label className="ai-field">Nguồn dự án cho chat<select value={targetId} disabled={busy||!!pending||!targets} onChange={e=>{fresh();setTargetId(e.target.value);}}><option value="">Chọn file hoặc ticket</option>{targets?.items.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{targets&&!targets.items.length&&<p>Chưa có nguồn được phép. Kiểm tra phân công hoặc tìm lại.</p>}{targets?.hasMore&&<p>Đang hiển thị 50 nguồn. Tìm để thu hẹp.</p>}</>}{metadata?.archived&&<p className="ai-notice">Dự án đã lưu trữ. Chỉ đọc hội thoại cũ.</p>}</>}
    </div>}
    {showHistory&&<section aria-label="Lịch sử chat"><h2>Hội thoại của bạn</h2>{history.map(item=><button key={item.id} className="ai-history-item" disabled={busy} onClick={()=>selectThread(item.id)}>#{item.id} · {providerLabels[item.provider]} · {item.model}<small>{item.projectId?`${projects.find(project=>project.id===item.projectId)?.name||`Dự án #${item.projectId}`} · ${purposeLabel(item.purpose)}`:'Trao đổi chung'}</small></button>)}{!history.length&&<p>Chưa có hội thoại ở trang này.</p>}{historyBefore!=null&&<button className="ai-button" disabled={busy} onClick={()=>perform((signal,epoch)=>loadHistory(historyBefore,signal,epoch))}>Xem hội thoại cũ hơn</button>}</section>}
    {reading&&<p role="status">Đang tải hội thoại và dự án được phép…</p>}
    {!settings&&!showHistory&&!turns.length&&!busy&&<p className="ai-chat-empty">Bạn muốn trao đổi điều gì?<br/>Chọn Nguồn / phạm vi để kết nối AI hoặc dùng dữ liệu dự án.</p>}
    {turnBefore!=null&&<button className="ai-button" disabled={busy} onClick={()=>perform(async(signal,epoch)=>{const data=await api.chatGet(thread.id,turnBefore,{signal});if(valid(signal,epoch)){setTurns(old=>[...data.turns.filter(item=>!old.some(x=>x.id===item.id)),...old]);setTurnBefore(data.nextBefore);}})}>Xem tin nhắn cũ hơn</button>}
    <div className="ai-chat-transcript" role="log" aria-label="Tin nhắn hội thoại" aria-live="polite">{turns.map(turn=><article key={turn.id} className="ai-chat-turn"><p className="ai-chat-question"><span>Bạn</span>{turn.text}</p>{turn.state==='READY'?<div className="ai-chat-answer"><span>AI · {providerLabels[turn.provider||thread.provider]} · {turn.model||thread.model}</span><p>{turn.content?.text}</p>{turn.contextTruncated&&<p className="ai-caption">Ngữ cảnh đã được rút gọn để phù hợp giới hạn model.</p>}{turn.content?.sources?.length>0&&<details><summary>Nguồn đối chiếu</summary><ul>{turn.content.sources.map(source=><li key={source.ref}>{source.label} · {source.ref}{source.version!=null?` · v${source.version}`:''}</li>)}</ul></details>}<button className="ai-button" onClick={async()=>{try{await navigator.clipboard.writeText(turn.content.text);setNotice('Đã sao chép câu trả lời.');}catch{setNotice('Chưa sao chép được. Chọn phần câu trả lời để sao chép bằng thiết bị.');}}}><Copy size={15} aria-hidden="true"/>Sao chép câu trả lời</button></div>:turn.state==='FAILED'?<p role="alert" className="ai-error">{aiError(turn.failureCode,turn.provider||thread.provider,true)}{(turn.provider||thread.provider)==='CHATGPT'&&turn.failureCode==='AI_QUOTA_EXHAUSTED'&&<> <a href="https://chatgpt.com/#settings" target="_blank" rel="noopener noreferrer">ChatGPT Usage</a></>}</p>:<p role="status">Đang xử lý yêu cầu đã lưu…</p>}</article>)}</div>
    {busy&&<p role="status">Đang xử lý… Bạn có thể tiếp tục soạn tin nhắn.</p>}
   </div>
   <footer className="ai-chat-composer">{error&&<p role="alert" className="ai-error">{error}</p>}{notice&&<p role="status" className="ai-caption">{notice}</p>}
    {(pending||turns.some(item=>item.state==='GENERATING'))&&<button className="ai-button" disabled={busy||denied} onClick={inspect}>Kiểm tra yêu cầu chat</button>}
    {!ready&&!reading&&<p className="ai-caption">Nguồn / model của {thread?'hội thoại':'tin nhắn'} chưa sẵn sàng. Mở Nguồn / phạm vi để kiểm tra kết nối.</p>}
    {denied&&<p className="ai-caption">Tạo hội thoại mới hoặc chọn lại lịch sử được phép trước khi gửi.</p>}
    <form onSubmit={e=>{e.preventDefault();send();}}><label className="ai-field">Tin nhắn AI<textarea ref={composer} value={text} rows={2} maxLength={2000} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send();}}}/></label><button type="submit" className="ai-button ai-primary" aria-label="Gửi tin nhắn" disabled={!canSend||!text.trim()}><Send size={20} aria-hidden="true"/></button></form><small>Enter gửi · Shift+Enter xuống dòng · {text.length}/2000</small>
   </footer>
  </section>}
 </div>;
}
