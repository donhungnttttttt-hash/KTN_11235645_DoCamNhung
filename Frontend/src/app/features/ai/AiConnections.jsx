import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Link2,RefreshCw} from 'lucide-react';
import {useAuth} from '../auth/AuthProvider';
import {aiApi} from '../../services/api/ai';
import {aiError} from './aiErrors';
import './ai.css';

const ProviderContext=createContext(null);
export const useAiProviders=()=>useContext(ProviderContext);
const labels={OPENAI_API:'API của hệ thống',CHATGPT:'ChatGPT cá nhân',OLLAMA:'Ollama local'};
const descriptions={OPENAI_API:'Sử dụng API do hệ thống cấu hình; thanh toán API riêng với gói ChatGPT. Cấu hình chưa chứng minh kết nối live.',CHATGPT:'Dùng quyền gói ChatGPT cá nhân trên máy local. Chỉ sẵn sàng sau khi cấp quyền và kiểm tra đúng model.',OLLAMA:'Xử lý trên Ollama local. Cài Ollama và model bằng công cụ chính thức; TMS không tự tải model.'};
export function providerReady(provider,model,catalog){
 if(!provider?.available||!model)return false;
 if(provider.code==='CHATGPT')return catalog?.ready&&catalog.items.some(item=>item.id===model)&&provider.connection?.state==='VERIFIED'&&provider.connection.planPermission&&provider.connection.verifiedModel===model;
 if(provider.code==='OLLAMA')return catalog?.ready&&catalog.items.some(item=>item.id===model);
 return provider.models?.some(item=>item.id===model);
}
export function AiProviderProvider({children,api=aiApi}){
 const auth=useAuth();
 return <OwnerProviders key={auth?.user?.id??'anonymous'} api={api} active={!auth||auth.status==='authenticated'}>{children}</OwnerProviders>;
}
function OwnerProviders({children,api,active}){
 const [providers,setProviders]=useState([]),[selection,setSelection]=useState({provider:'OPENAI_API',model:''});
 const [preferences,setPreferences]=useState({}),[catalogs,setCatalogs]=useState({}),[revision,setRevision]=useState(0);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [attempt,setAttempt]=useState(null),[authorizationUrl,setAuthorizationUrl]=useState(''),[probeRequest,setProbeRequest]=useState(null);
 const lifetime=useRef(null),current=useRef(active),actionLock=useRef(false),probeRef=useRef(null);
 current.current=active;
 useEffect(()=>{const abort=new AbortController();lifetime.current=abort;actionLock.current=false;setBusy(false);if(!active){setProviders([]);setCatalogs({});setAttempt(null);setAuthorizationUrl('');}return()=>abort.abort();},[active]);
 useEffect(()=>{
  if(!active)return;
  const abort=new AbortController();setLoading(true);setCatalogs({});
  api.providers({signal:abort.signal}).then(data=>{if(abort.signal.aborted||!current.current)return;setError('');setProviders(data.providers);setSelection(old=>({...old,model:old.model||data.providers.find(p=>p.code===old.provider)?.models?.[0]?.id||''}));})
   .catch(e=>{if(!abort.signal.aborted&&current.current){setError(aiError(e.code));setProviders([]);}}).finally(()=>{if(!abort.signal.aborted&&current.current)setLoading(false);});
  return()=>abort.abort();
 },[api,active,revision]);
 const provider=providers.find(p=>p.code===selection.provider);
 const connection=provider?.connection;
 const catalogKey=`${provider?.code}:${connection?.id||''}:${connection?.version||0}`;
 const catalog=catalogs[catalogKey];
 useEffect(()=>{const first=provider?.code==='OPENAI_API'?provider.models?.[0]?.id:catalog?.items?.[0]?.id;if(first)setSelection(old=>old.model||old.provider!==provider.code?old:{...old,model:first});},[provider?.code,provider?.models,catalog]);
 useEffect(()=>{
  if(!active)return;
  const abort=new AbortController();
  for(const item of providers){
   const conn=item.connection;
   if(item.code==='OPENAI_API'||!item.enabled||item.code==='CHATGPT'&&(!conn||['DISCONNECTED','RECONNECT_REQUIRED','MISSING_PERMISSION'].includes(conn.state)))continue;
   const key=`${item.code}:${conn?.id||''}:${conn?.version||0}`;
   setCatalogs(old=>({...old,[key]:{ready:false,items:[]}}));
   api.models(item.code,conn?.id,{signal:abort.signal}).then(items=>{if(abort.signal.aborted||!current.current)return;setCatalogs(old=>({...old,[key]:{ready:true,items}}));setSelection(old=>old.provider===item.code&&!old.model?{...old,model:items[0]?.id||''}:old);})
    .catch(e=>{if(!abort.signal.aborted&&current.current)setCatalogs(old=>({...old,[key]:{ready:false,items:[],error:aiError(e.code,item.code)}}));});
  }
  return()=>abort.abort();
 },[api,active,providers,revision]);
 useEffect(()=>{
  if(!attempt||!active)return;
  const abort=new AbortController();let timer;
  async function poll(){try{const value=await api.authorization(attempt.attemptId,{signal:abort.signal});if(abort.signal.aborted||!current.current)return;if(['PENDING','PROCESSING'].includes(value.state)){timer=setTimeout(poll,1500);return;}setAttempt(null);setAuthorizationUrl('');if(value.state==='AUTHORIZED'){setNotice('Đã cấp quyền. Chọn model và kiểm tra kết nối trước khi dùng.');setRevision(v=>v+1);}else setError(aiError(value.failureCode,'CHATGPT'));}catch(e){if(!abort.signal.aborted&&current.current){setError(aiError(e.code,'CHATGPT'));timer=setTimeout(poll,3000);}}}
  timer=setTimeout(poll,1500);return()=>{clearTimeout(timer);abort.abort();};
 },[api,attempt,active]);
 const refresh=()=>{setError('');setRevision(v=>v+1);};
 function chooseProvider(code){const item=providers.find(p=>p.code===code),conn=item?.connection,key=`${code}:${conn?.id||''}:${conn?.version||0}`;setPreferences(old=>({...old,[selection.provider]:selection.model}));setSelection({provider:code,model:preferences[code]||item?.models?.[0]?.id||catalogs[key]?.items[0]?.id||''});setError('');setNotice('');}
 async function action(fn){if(actionLock.current||!active)return;const signal=lifetime.current.signal;actionLock.current=true;setBusy(true);setError('');setNotice('');try{await fn(signal);}catch(e){if(!signal.aborted&&current.current)setError(aiError(e.code,selection.provider));}finally{if(!signal.aborted&&current.current){actionLock.current=false;setBusy(false);}}}
 function authorize(enablePlanPermission=false,newAccount=false){
  if(actionLock.current||!active)return;
  const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
  action(async signal=>{try{const value=await api.authorize({newAccount,enablePlanPermission},{signal});if(signal.aborted||!current.current){popup?.close();return;}const url=new URL(value.authorizationUrl);if(url.protocol!=='https:'||url.hostname!=='auth.openai.com')throw new Error('Invalid authorization URL');setAttempt(value);setAuthorizationUrl(url.href);if(popup&&!popup.closed)popup.location.href=url.href;else setNotice('Cửa sổ bị chặn. Mở liên kết đăng nhập ChatGPT bên dưới.');}catch(e){popup?.close();throw e;}});
 }
 async function probe(){
  const saved=probeRef.current;
  const body=saved&&saved.id===connection.id&&saved.version===connection.version&&saved.body.model===selection.model?saved.body:{model:selection.model,requestKey:`probe-${crypto.randomUUID()}`};
  probeRef.current={id:connection.id,version:connection.version,body};setProbeRequest(probeRef.current);
  await action(async signal=>{const result=await api.probe(connection.id,body,{signal});if(signal.aborted||!current.current)return;if(result.state==='GENERATING'){setNotice('Đang kiểm tra. Kiểm tra lại sẽ dùng cùng mã yêu cầu.');return;}probeRef.current=null;setProbeRequest(null);refresh();if(result.state==='READY')setNotice('Đã kiểm chứng model và phiên bản kết nối này.');else setError(aiError(result.failureCode,'CHATGPT'));});
 }
 const value={api,active,providers,provider,selection,setModel:model=>setSelection(old=>({...old,model})),chooseProvider,models:provider?.code==='OPENAI_API'?provider.models||[]:catalog?.items||[],ready:active&&!loading&&providerReady(provider,selection.model,catalog),loading,error,busy,notice,attempt,authorizationUrl,probeRequest,refresh,authorize,probe,catalog,catalogs,
  cancel:()=>action(async signal=>{await api.cancelAuthorization(attempt.attemptId,{signal});if(!signal.aborted&&current.current){setAttempt(null);setAuthorizationUrl('');setNotice('Đã hủy đăng nhập.');}}),
  disconnect:()=>action(async signal=>{const result=await api.disconnect(connection.id,connection.version,{signal});if(!signal.aborted&&current.current){setNotice(result.remoteRevoked?'Đã ngắt kết nối ChatGPT.':'Đã xóa kết nối local. Mở ChatGPT Settings để thu hồi quyền từ xa.');probeRef.current=null;setProbeRequest(null);refresh();}})};
 return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}
export function AiSourceSelector({disabled=false,connectionsOnly=false}){
 const store=useAiProviders();if(!store||!store.active)return null;
 const {provider,selection,models}=store,connection=provider?.connection;
 const blocked=disabled||store.loading||store.busy||!!store.attempt;
 return <section className="ai-connection" aria-label="Nguồn và kết nối AI">
  <div className="ai-source-fields"><label className="ai-field">Nguồn AI<select value={selection.provider} disabled={blocked} onChange={e=>store.chooseProvider(e.target.value)}>{Object.entries(labels).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
   <label className="ai-field">Model AI<select value={selection.model} disabled={blocked||!models.length} onChange={e=>store.setModel(e.target.value)}><option value="">Chọn model</option>{selection.model&&!models.some(m=>m.id===selection.model)&&<option value={selection.model}>{selection.model} · chưa sẵn sàng</option>}{models.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label></div>
  <p className="ai-caption">{descriptions[selection.provider]}</p>
  {store.loading?<p role="status">Đang tải nguồn AI…</p>:<p className="ai-provider-status">{store.ready?(selection.provider==='OPENAI_API'?'Đã cấu hình API · chưa xác nhận live':'Sẵn sàng cho model đã chọn'):connection?.state==='MISSING_PERMISSION'?'Đã xác nhận danh tính · chưa cấp quyền dùng gói ChatGPT':connection?.state==='RECONNECT_REQUIRED'?'Cần kết nối lại ChatGPT':connection&&['UNVERIFIED','VERIFIED'].includes(connection.state)?'Đã cấp quyền · Chưa kiểm chứng model này':selection.provider==='OLLAMA'&&provider?.enabled?'Chưa xác nhận Ollama và model cài sẵn.':aiError(provider?.reason||'AI_NOT_CONFIGURED',selection.provider)}</p>}
  {store.catalog?.error&&<p role="alert" className="ai-error">{store.catalog.error}</p>}
  {selection.provider==='OLLAMA'&&store.catalog?.ready&&!models.length&&<p className="ai-notice">Ollama đã phản hồi nhưng chưa có model được cài. Cài model bằng công cụ Ollama rồi tải lại.</p>}
  <details open={connectionsOnly||undefined}><summary><Link2 size={16} aria-hidden="true"/> Kết nối và hạn mức</summary>
   {connection?.accountLabel&&<p>Danh tính: {connection.accountLabel} · {connection.planPermission?'Đã cấp quyền gói':'Chưa cấp quyền gói'}</p>}
   {connection?.verifiedModel&&<p className="ai-caption">Đã kiểm chứng: {connection.verifiedModel} · phiên bản {connection.version}</p>}
   {connection?.failureCode&&<p className="ai-notice">{aiError(connection.failureCode,'CHATGPT')}</p>}
   <div className="ai-actions"><button className="ai-button" disabled={blocked||store.loading} onClick={store.refresh}><RefreshCw size={16} aria-hidden="true"/>Tải lại nguồn AI</button>
    {selection.provider==='CHATGPT'&&provider?.enabled&&<>
     {connection?.state==='MISSING_PERMISSION'?<button className="ai-button" disabled={blocked} onClick={()=>store.authorize(true,false)}>Cấp quyền dùng gói ChatGPT</button>:<button className="ai-button" disabled={blocked} onClick={()=>store.authorize(false,false)}>{connection&&connection.state!=='DISCONNECTED'?'Kết nối lại ChatGPT':'Kết nối ChatGPT'}</button>}
     {connection&&['UNVERIFIED','VERIFIED'].includes(connection.state)&&connection.planPermission&&<button className="ai-button" disabled={blocked||!selection.model||!store.catalog?.ready} onClick={store.probe}>{store.probeRequest?'Kiểm tra lại kết nối':'Kiểm tra kết nối model'} (có dùng hạn mức)</button>}
     {connection&&!['DISCONNECTED','RECONNECT_REQUIRED'].includes(connection.state)&&<button className="ai-button" disabled={blocked} onClick={store.disconnect}>Ngắt kết nối</button>}
     {connection&&connection.state!=='MISSING_PERMISSION'&&<button className="ai-button" disabled={blocked} onClick={()=>store.authorize(false,true)}>Đổi tài khoản ChatGPT</button>}
    </>}
    {store.attempt&&<button className="ai-button" disabled={store.busy} onClick={store.cancel}>Hủy đăng nhập ChatGPT</button>}
   </div>
   {store.authorizationUrl&&<p><a href={store.authorizationUrl} target="_blank" rel="noopener noreferrer">Mở đăng nhập ChatGPT chính thức</a></p>}
   {selection.provider==='CHATGPT'&&<p><a href="https://chatgpt.com/#settings" target="_blank" rel="noopener noreferrer">ChatGPT Usage / Settings</a></p>}
   {selection.provider==='OLLAMA'&&<p><a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">Hướng dẫn cài Ollama</a></p>}
  </details>
  {store.error&&<p role="alert" className="ai-error">{store.error}</p>}{store.notice&&<p role="status" className="ai-notice">{store.notice}</p>}
 </section>;
}
