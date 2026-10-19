import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MessageCircle,Minus,Send,Copy,Plus,History,Settings2} from 'lucide-react';
import {useAuth} from '../auth/AuthProvider';
import {aiApi} from '../../services/api/ai';
import {useAiProviders,providerReady,AiSourceSelector} from './AiConnections';
import {aiError} from './aiErrors';
import {purposeLabel} from './aiLabels';
import {useChatLauncherHost} from './ChatLauncherSlot';
import {MY_PROJECTS_SCOPE,PROJECT_CHAT_SCOPE,projectPrompts,singleProjectPrompts,memberProjectPrompts,memberSingleProjectPrompts} from './aiProjectPrompts';
import './ai.css';

const providerLabels={OPENAI_API:'API của hệ thống',CHATGPT:'ChatGPT cá nhân',OLLAMA:'Ollama local'};
export function AiChat({api=aiApi,projectApi}){
 const auth=useAuth();
 const roles=auth?.user?.roles||[];
 return <OwnerChat key={auth?.user?.id??'anonymous'} api={api} projectApi={projectApi} active={!auth||auth.status==='authenticated'} isAdmin={roles.includes('ADMIN')} isManager={roles.includes('ADMIN')||roles.includes('PM')}/>;
}
function OwnerChat({api,projectApi,active,isAdmin,isManager}){
 const providers=useAiProviders();
 const {host:launcherHost,provided:hasLauncherProvider}=useChatLauncherHost();
 const [open,setOpen]=useState(false),[settings,setSettings]=useState(false),[showHistory,setShowHistory]=useState(false),[configuration,setConfiguration]=useState(false);
 const [projects,setProjects]=useState([]),[projectId,setProjectId]=useState(MY_PROJECTS_SCOPE);
 const [featureId,setFeatureId]=useState(''),[featureRead,setFeatureRead]=useState(null),[featureRetry,setFeatureRetry]=useState(0);
 const [thread,setThread]=useState(null),[turns,setTurns]=useState([]),[history,setHistory]=useState([]),[historyBefore,setHistoryBefore]=useState(null),[turnBefore,setTurnBefore]=useState(null);
 const [text,setText]=useState(''),[pending,setPending]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[denied,setDenied]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [outgoing,setOutgoing]=useState(null);
 const [detailLoading,setDetailLoading]=useState(false);
 const [detailFailed,setDetailFailed]=useState(false);
 const [scopeError,setScopeError]=useState(''),[scopeRevision,setScopeRevision]=useState(0);
 const lifetime=useRef(null),lock=useRef(false),currentActive=useRef(active),generation=useRef(0),previousActive=useRef(active),previousOpen=useRef(false),pendingRef=useRef(null),threadRef=useRef(null),composer=useRef(null),launcher=useRef(null),transcript=useRef(null),draftRef=useRef(text);
 const sessionGeneration=useRef(0),turnRevision=useRef(0),detailReadVersion=useRef(0);
 const scrollAnchor=useRef(null),followLatest=useRef(true);
 currentActive.current=active;draftRef.current=text;threadRef.current=thread;
 // Invalidate before effects run, including a response queued during a session change.
 if(previousActive.current!==active){generation.current++;sessionGeneration.current++;previousActive.current=active;}
 const valid=(signal,epoch)=>!signal.aborted&&currentActive.current&&generation.current===epoch;
 const validScopeRead=(signal,epoch)=>!signal.aborted&&currentActive.current&&sessionGeneration.current===epoch;
 function invalidate(){generation.current++;lifetime.current?.abort();lifetime.current=new AbortController();lock.current=false;setBusy(false);}
 useEffect(()=>{const abort=new AbortController();lifetime.current=abort;lock.current=false;setBusy(false);if(!active){setOpen(false);setTurns([]);setHistory([]);setProjects([]);setDenied(true);}else if(!threadRef.current)setDenied(false);return()=>abort.abort();},[active]);
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
   if(data.thread.purpose===PROJECT_CHAT_SCOPE){setProjectId(String(data.thread.projectId));setFeatureId(data.thread.targetId==null?'':String(data.thread.targetId));}
   else if(data.thread.purpose===MY_PROJECTS_SCOPE){setProjectId(MY_PROJECTS_SCOPE);setFeatureId('');}
   setTurns(data.turns);
   setTurnBefore(data.nextBefore);
   setDenied(false);
   setDetailFailed(false);
   setError('');
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
  setLoading(true);setScopeError('');
  Promise.all([projectApi?.list?projectApi.list({signal:abort.signal}):api.chatProjects({signal:abort.signal}),loadHistory(0,abort.signal,scopeEpoch,validScopeRead)])
   .then(([rows])=>{if(validScopeRead(abort.signal,scopeEpoch))setProjects(rows);})
   .catch(e=>{if(validScopeRead(abort.signal,scopeEpoch))setScopeError(aiError(e.code,threadRef.current?.provider,true));})
   .finally(()=>{if(validScopeRead(abort.signal,scopeEpoch))setLoading(false);});
  if(threadRef.current){
   const id=threadRef.current.id;
   readThread(id,abort.signal,threadEpoch).catch(e=>{
    if(!valid(abort.signal,threadEpoch))return;
    turnRevision.current++;
    setError([403,404].includes(e.status)?'Hội thoại hoặc nguồn không còn truy cập được. Chọn hội thoại mới.':aiError(e.code,threadRef.current?.provider,true));
    if([401,403,404].includes(e.status)){setDenied(true);setTurns([]);setDetailFailed(false);}
    else setDetailFailed(true);
   });
  }else setDetailLoading(false);
  return()=>abort.abort();
 },[api,projectApi,active,open,scopeRevision]);
 useEffect(()=>{
  if(!active||!open||projectId===MY_PROJECTS_SCOPE){setFeatureRead(null);return;}
  const abort=new AbortController(),scope=projectId,epoch=sessionGeneration.current;
  setFeatureRead({projectId:scope,loading:true,items:[]});
  // Custom project adapters used by older embedders may expose only a project list.
  // The production aiApi always provides the Feature endpoint; API failures are never hidden.
  const reader=projectApi?.features||api.chatFeatures;
  Promise.resolve(reader?reader(Number(scope),{signal:abort.signal}):[])
   .then(items=>{if(validScopeRead(abort.signal,epoch))setFeatureRead({projectId:scope,items,loading:false});})
   .catch(e=>{if(validScopeRead(abort.signal,epoch))setFeatureRead({projectId:scope,items:[],loading:false,error:aiError(e.code,threadRef.current?.provider,true)});});
  return()=>abort.abort();
 },[api,projectApi,active,open,projectId,featureRetry]);
 useEffect(()=>{if(open&&active)composer.current?.focus();else if(previousOpen.current&&active)launcher.current?.focus();previousOpen.current=open;},[open,active]);
 useLayoutEffect(()=>{
  const node=transcript.current;if(!node)return;
  if(scrollAnchor.current){const {top,height}=scrollAnchor.current;node.scrollTop=top+node.scrollHeight-height;scrollAnchor.current=null;}
  else if(followLatest.current)node.scrollTop=node.scrollHeight;
 },[turns,outgoing]);
 function fresh(){invalidate();detailReadVersion.current++;setDetailLoading(false);setDetailFailed(false);followLatest.current=true;scrollAnchor.current=null;setThread(null);setTurns([]);setPending(null);setOutgoing(null);pendingRef.current=null;setTurnBefore(null);setDenied(false);setError('');setNotice('');setSettings(true);setShowHistory(false);setConfiguration(false);}
 function changeScope(value){if(busy||pending||loading||detailLoading||turns.some(item=>item.state==='GENERATING'))return;fresh();setProjectId(value);setFeatureId('');}
 function changeFeature(value){if(busy||pending||reading||turns.some(item=>item.state==='GENERATING'))return;fresh();setFeatureId(value);}
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
 async function send(retry=false,resendText){
  if(!retry&&(!(resendText??text).trim()||!canSend))return;
  await perform(async(signal,epoch)=>{
   let currentThread=threadRef.current;
   const body=retry?pendingRef.current?.body:{text:resendText??text,requestKey:`chat-${crypto.randomUUID()}`};if(!body)return;
   if(!retry){
    followLatest.current=true;
    turnRevision.current++;
    setOutgoing({body,state:'SENDING'});
    if(resendText===undefined)setText('');
   }else setOutgoing(old=>old?{...old,state:'SENDING'}:old);
   try{
    if(!currentThread){const selection={...providers.selection},specific=projectId!==MY_PROJECTS_SCOPE;currentThread=await api.chatCreate({...selection,projectId:specific?Number(projectId):null,purpose:specific?PROJECT_CHAT_SCOPE:MY_PROJECTS_SCOPE,targetId:specific&&featureId?Number(featureId):null},{signal});if(!valid(signal,epoch))return;setThread(currentThread);threadRef.current=currentThread;setHistory(old=>[currentThread,...old.filter(item=>item.id!==currentThread.id)]);setSettings(false);}
    const request={threadId:currentThread.id,body};pendingRef.current=request;setPending(request);
    const result=await api.chatSend(request.threadId,body,{signal});if(!valid(signal,epoch))return;
    updateTurn(result);setOutgoing(null);
    if(result.state!=='GENERATING'){pendingRef.current=null;setPending(null);}
   }catch(e){
    if(valid(signal,epoch)){
     const uncertain=!!pendingRef.current&&(['TIMEOUT','NETWORK_ERROR','AI_BUSY','AI_CREDENTIAL_STORE_FAILED'].includes(e.code)||e.status>=500);
     if(uncertain)setOutgoing(old=>old?{...old,state:'UNKNOWN'}:old);
     else{
      pendingRef.current=null;setPending(null);
      if(!draftRef.current){setText(body.text);setOutgoing(null);}
      else setOutgoing({body,state:'FAILED'});
     }
    }
    throw e;
   }
  });
 }
 async function inspect(){if(pendingRef.current){await send(true);return;}if(thread)await perform((signal,epoch)=>readThread(thread.id,signal,epoch));}
 function minimize(){setOpen(false);}
 const pinnedProvider=providers?.providers.find(item=>item.code===(thread?.provider||providers.selection.provider));
 const pinnedModel=thread?.model||providers?.selection.model;
 const catalog=providers?.catalogs?.[`${pinnedProvider?.code}:${pinnedProvider?.connection?.id||''}:${pinnedProvider?.connection?.version||0}`]|| (pinnedProvider?.code===providers?.selection.provider?providers?.catalog:null);
 const ready=thread?providerReady(pinnedProvider,pinnedModel,catalog):providers?.ready;
 const featureState=featureRead?.projectId===projectId?featureRead:null;
 const features=featureState?.items||[];
 const featureLoading=projectId!==MY_PROJECTS_SCOPE&&(!featureState||featureState.loading);
 const featureReady=!featureState?.error&&(!featureId||features.some(item=>String(item.id)===featureId&&!item.archived));
 const scopeReady=projectId===MY_PROJECTS_SCOPE||projects.some(item=>String(item.id)===projectId)&&featureReady;
 const selectedProject=projects.find(item=>String(item.id)===String(thread?thread.projectId:projectId));
 const archived=Boolean(selectedProject?.archived);
 const reading=loading||detailLoading||(!thread&&featureLoading);
 const requestActive=busy||!!pending||turns.some(item=>item.state==='GENERATING');
 const scopeLocked=requestActive||loading||detailLoading;
 const canSend=active&&ready&&!busy&&!pending&&!reading&&!scopeError&&!detailFailed&&!denied&&!archived&&(thread||scopeReady)&&!turns.some(item=>item.state==='GENERATING');
 const portfolioLabel=isAdmin?'Tất cả dự án · Admin tổng':isManager?'Tất cả dự án · PM':'Các dự án của tôi';
 const portfolioMode=thread?thread.purpose===MY_PROJECTS_SCOPE:projectId===MY_PROJECTS_SCOPE;
 const projectMode=thread?thread.purpose===PROJECT_CHAT_SCOPE:projectId!==MY_PROJECTS_SCOPE;
 const targetFeature=thread?thread.targetId:featureId;
 const featureLabel=targetFeature?(features.find(item=>String(item.id)===String(targetFeature))?.name||`Feature #${targetFeature}`):'';
 const scopeLabel=portfolioMode?portfolioLabel:projectMode?`${selectedProject?.name||`Dự án #${thread?.projectId||projectId}`}${featureLabel?' · '+featureLabel:''}`:thread?.projectId?`${selectedProject?.name||`Dự án #${thread.projectId}`} · ${purposeLabel(thread.purpose)}${thread.targetId?` · nguồn #${thread.targetId}`:''}`:'Trao đổi chung · hội thoại cũ';
 const prompts=isManager?(projectMode?singleProjectPrompts:projectPrompts):(projectMode?memberSingleProjectPrompts:memberProjectPrompts);
 if(!active)return null;
 const launcherButton=<button ref={launcher} type="button" className="ai-chat-launcher" aria-label="Mở chat AI" aria-expanded={open} onClick={()=>setOpen(true)} hidden={open}><MessageCircle size={23} aria-hidden="true"/><span>Chat AI</span></button>;
 return <div className={`ai-chat-root${open?' is-open':''}${hasLauncherProvider?' is-ported':''}`}>
  {launcherHost?createPortal(launcherButton,launcherHost):!hasLauncherProvider&&launcherButton}
  {open&&<section className="ai-chat ai-page" role="dialog" aria-modal="false" aria-label="Chat AI riêng" onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented&&e.target.tagName!=='SELECT'){e.stopPropagation();e.preventDefault();minimize();}}}>
   <header className="ai-chat-heading"><div><strong><MessageCircle size={18} aria-hidden="true"/>Chat AI riêng</strong><small>Lưu tạm 7 ngày · chỉ bạn xem</small></div><button className="ai-button" aria-label="Thu nhỏ chat" onClick={minimize}><Minus size={20} aria-hidden="true"/></button></header>
   <div className="ai-chat-provenance"><strong>{providerLabels[thread?.provider||providers?.selection.provider]} · {pinnedModel||'chưa chọn model'}</strong><span>{scopeLabel}</span>{thread&&<small>Hội thoại #{thread.id} · nguồn / model / phạm vi đã cố định</small>}</div>
   <nav className="ai-chat-toolbar" aria-label="Điều khiển hội thoại"><button className="ai-button" onClick={fresh} disabled={requestActive}><Plus size={16} aria-hidden="true"/>Mới</button><button className="ai-button" aria-expanded={showHistory} onClick={()=>{setShowHistory(v=>!v);setSettings(false);setConfiguration(false);}}><History size={16} aria-hidden="true"/>Lịch sử</button><button className="ai-button" aria-expanded={settings} onClick={()=>{setSettings(v=>!v);setShowHistory(false);setConfiguration(false);}}><Settings2 size={16} aria-hidden="true"/>Phạm vi chat</button><button className="ai-button" aria-expanded={configuration} aria-controls="chat-ai-configuration" onClick={()=>{setConfiguration(v=>!v);setSettings(false);setShowHistory(false);}}><Settings2 size={16} aria-hidden="true"/>Cấu hình AI</button></nav>
   <div className="ai-chat-scroll" ref={transcript} onScroll={event=>{const node=event.currentTarget;followLatest.current=node.scrollHeight-node.scrollTop-node.clientHeight<64;}}>
    {configuration&&<section id="chat-ai-configuration" aria-label="Cấu hình AI"><h2>Cấu hình AI</h2><p className="ai-caption">Nguồn và model áp dụng cho hội thoại mới. Hội thoại hiện tại giữ nguyên cấu hình đã tạo.</p><AiSourceSelector disabled={scopeLocked}/></section>}
    {settings&&<div className="ai-chat-settings">
     <label className="ai-field">Phạm vi chat<select value={projectId} disabled={scopeLocked} onChange={e=>changeScope(e.target.value)}><option value={MY_PROJECTS_SCOPE}>Toàn bộ dự án được phép</option>{projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
     {projectId!==MY_PROJECTS_SCOPE&&<><label className="ai-field">Feature cho chat<select value={featureId} disabled={scopeLocked||featureLoading||!!featureState?.error} onChange={e=>changeFeature(e.target.value)}><option value="">Tất cả Feature của dự án</option>{featureId&&!features.some(item=>String(item.id)===featureId)&&<option value={featureId}>Feature #{featureId} · chưa xác nhận</option>}{features.map(item=><option key={item.id} value={item.id} disabled={item.archived}>{item.name}{item.archived?' · đã lưu trữ':''}</option>)}</select></label>{featureLoading&&<p role="status">Đang tải Feature cho chat…</p>}{featureState?.error&&<p className="ai-error" role="alert">{featureState.error} <button type="button" className="ai-button" disabled={scopeLocked} onClick={()=>setFeatureRetry(value=>value+1)}>Tải lại Feature cho chat</button></p>}</>}
     <p className="ai-caption">Chọn dự án và tùy chọn Feature để xác định đối tượng trao đổi. {isManager?'AI có thể đối chiếu dữ liệu liên dự án theo quyền của bạn.':'Chi tiết được giới hạn trong quyền của bạn; ngoài quyền chỉ dùng kinh nghiệm đã tổng hợp.'}</p>
     {thread&&<p className="ai-caption">Đổi phạm vi sẽ bắt đầu hội thoại mới và giữ lại bản đang soạn.</p>}
    </div>}
    {showHistory&&<section aria-label="Lịch sử chat"><h2>Hội thoại của bạn</h2>{history.map(item=><button key={item.id} className="ai-history-item" aria-current={item.id===thread?.id?'true':undefined} disabled={requestActive||detailLoading} onClick={()=>selectThread(item.id)}>#{item.id} · {providerLabels[item.provider]} · {item.model}<small>{item.projectId?`${projects.find(project=>project.id===item.projectId)?.name||`Dự án #${item.projectId}`} · ${purposeLabel(item.purpose)}`:item.purpose===MY_PROJECTS_SCOPE?portfolioLabel:'Trao đổi chung'}</small></button>)}{!history.length&&!loading&&!scopeError&&<p>Chưa có hội thoại ở trang này.</p>}{historyBefore!=null&&<button className="ai-button" disabled={busy} onClick={()=>perform((signal,epoch)=>loadHistory(historyBefore,signal,epoch))}>Xem hội thoại cũ hơn</button>}</section>}
    {reading&&<p role="status">Đang tải hội thoại và dự án được phép…</p>}
    {!settings&&!showHistory&&!configuration&&!turns.length&&!outgoing&&!busy&&!reading&&!scopeError&&!detailFailed&&<p className="ai-chat-empty">Bạn muốn trao đổi điều gì?<br/>{portfolioMode?'AI hỗ trợ các dự án theo quyền của bạn.':projectMode?'AI hỗ trợ dự án và Feature đang chọn theo quyền của bạn.':'Hội thoại cũ giữ nguyên phạm vi đã tạo.'}</p>}
    {archived&&<p className="ai-caption">Dự án đã lưu trữ. Chỉ đọc hội thoại cũ.</p>}
    {(portfolioMode||projectMode)&&!settings&&!showHistory&&!configuration&&<details className="ai-project-prompts" open={!turns.length&&!outgoing}><summary>Câu hỏi về dự án</summary><p className="ai-caption">Bấm câu hỏi để gửi ngay. Dữ liệu được lọc theo quyền hiện tại.</p><div>{prompts.map(prompt=><button key={prompt.id} type="button" className="ai-button" disabled={!canSend} onClick={()=>send(false,prompt.text)}>{prompt.label}</button>)}</div>{!!text.trim()&&<p className="ai-caption">Nội dung bạn đang soạn được giữ lại khi gửi câu hỏi có sẵn.</p>}</details>}
    {turnBefore!=null&&<button className="ai-button" disabled={busy||detailLoading||detailFailed||denied} onClick={()=>perform(async(signal,epoch)=>{const data=await api.chatGet(thread.id,turnBefore,{signal});if(valid(signal,epoch)){const node=transcript.current;if(node)scrollAnchor.current={top:node.scrollTop,height:node.scrollHeight};setTurns(old=>[...data.turns.filter(item=>!old.some(x=>x.id===item.id)),...old]);setTurnBefore(data.nextBefore);}})}>Xem tin nhắn cũ hơn</button>}
    <div className="ai-chat-transcript" role="log" aria-label="Tin nhắn hội thoại" aria-live="polite">{turns.map(turn=><article key={turn.id} className="ai-chat-turn"><p className="ai-chat-question"><span>Bạn</span>{turn.text}</p>{turn.state==='READY'?<div className="ai-chat-answer"><span>AI · {providerLabels[turn.provider||thread.provider]} · {turn.model||thread.model}</span><p>{turn.content?.text}</p>{turn.contextTruncated&&<p className="ai-caption">Ngữ cảnh đã được rút gọn để phù hợp giới hạn model.</p>}{turn.content?.sources?.length>0&&<details><summary>Nguồn đối chiếu</summary><ul>{turn.content.sources.map(source=><li key={source.ref}>{source.label} · {source.ref}{source.version!=null?` · v${source.version}`:''}</li>)}</ul></details>}<button className="ai-button" onClick={async()=>{try{await navigator.clipboard.writeText(turn.content.text);setNotice('Đã sao chép câu trả lời.');}catch{setNotice('Chưa sao chép được. Chọn phần câu trả lời để sao chép bằng thiết bị.');}}}><Copy size={15} aria-hidden="true"/>Sao chép câu trả lời</button></div>:turn.state==='FAILED'?<p role="alert" className="ai-error">{aiError(turn.failureCode,turn.provider||thread.provider,true)}{(turn.provider||thread.provider)==='CHATGPT'&&turn.failureCode==='AI_QUOTA_EXHAUSTED'&&<> <a href="https://chatgpt.com/#settings" target="_blank" rel="noopener noreferrer">ChatGPT Usage</a></>}</p>:<p role="status">AI đang trả lời…</p>}{turn.state==='FAILED'&&<button className="ai-button" disabled={!canSend} onClick={()=>send(false,turn.text)}>Gửi lại tin nhắn</button>}</article>)}{outgoing&&<article className="ai-chat-turn" aria-label="Tin nhắn đang gửi"><p className="ai-chat-question"><span>Bạn</span>{outgoing.body.text}</p><div className="ai-chat-answer"><p role="status">{outgoing.state==='SENDING'?'AI đang trả lời…':outgoing.state==='UNKNOWN'?'Chưa xác nhận được kết quả. Kiểm tra yêu cầu chat để tiếp tục.':'Tin nhắn chưa gửi được. Nội dung vẫn được giữ ở đây.'}</p>{outgoing.state==='FAILED'&&<button className="ai-button" disabled={!canSend} onClick={()=>send(false,outgoing.body.text)}>Gửi lại tin nhắn</button>}</div></article>}</div>
    {busy&&!outgoing&&!turns.some(item=>item.state==='GENERATING')&&<p role="status">Đang xử lý… Bạn có thể tiếp tục soạn tin nhắn.</p>}
   </div>
   <footer className="ai-chat-composer">{error&&<p role="alert" className="ai-error">{error}</p>}{notice&&<p role="status" className="ai-caption">{notice}</p>}
    {scopeError&&<div className="ai-chat-recovery"><p role="alert" className="ai-error">{scopeError}</p><button type="button" className="ai-button" disabled={loading||busy} onClick={()=>setScopeRevision(value=>value+1)}>Tải lại dự án và lịch sử</button></div>}
    {detailFailed&&!denied&&<div className="ai-chat-recovery"><p className="ai-caption">Chưa tải lại được hội thoại. Tin nhắn và bản đang soạn được giữ lại; tải lại trước khi gửi tiếp.</p><button type="button" className="ai-button" disabled={busy||detailLoading} onClick={()=>perform((signal,epoch)=>readThread(thread.id,signal,epoch))}>Tải lại hội thoại</button></div>}
    {!thread&&!settings&&featureState?.error&&<p className="ai-caption">Chưa tải được Feature của dự án. <button type="button" className="ai-button" onClick={()=>{setSettings(true);setConfiguration(false);setShowHistory(false);}}>Mở phạm vi chat</button> để tải lại.</p>}
    {(pending||turns.some(item=>item.state==='GENERATING'))&&<button className="ai-button" disabled={busy||denied} onClick={inspect}>Kiểm tra yêu cầu chat</button>}
    {!ready&&!reading&&<p className="ai-caption">Nguồn / model của {thread?'hội thoại':'tin nhắn'} chưa sẵn sàng. <button type="button" className="ai-button" onClick={()=>{setConfiguration(true);setSettings(false);setShowHistory(false);}}>Mở cấu hình AI</button> để kiểm tra kết nối.</p>}
    {denied&&<p className="ai-caption">Tạo hội thoại mới hoặc chọn lại lịch sử được phép trước khi gửi.</p>}
    <form onSubmit={e=>{e.preventDefault();send();}}><label className="ai-field">Tin nhắn AI<textarea ref={composer} value={text} rows={2} maxLength={2000} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send();}}}/></label><button type="submit" className="ai-button ai-primary" aria-label="Gửi tin nhắn" disabled={!canSend||!text.trim()}><Send size={20} aria-hidden="true"/></button></form><small>Enter gửi · Shift+Enter xuống dòng · {text.length}/2000</small>
   </footer>
  </section>}
 </div>;
}
