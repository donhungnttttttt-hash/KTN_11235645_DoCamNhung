import React,{useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AiChat} from './src/app/features/ai/AiChat';
import {AiProviderProvider} from './src/app/features/ai/AiConnections';
import './src/app/styles/global.css';

// Disposable browser fixture: no session, database, key or provider requests.
window.fetch=()=>Promise.reject(new Error('Fixture blocks network API calls'));
const projectApi={list:async()=>[]};
function Fixture(){
 const [requests,setRequests]=useState([]),[creates,setCreates]=useState(0),[waiting,setWaiting]=useState(false);
 const completion=useRef(null),nextTurn=useRef(1);
 const api=useMemo(()=>({
  providers:async()=>({providers:[{code:'OPENAI_API',available:true,models:[{id:'synthetic-model',label:'synthetic-model'}]}]}),
  chatList:async()=>({items:[],nextBefore:null}),
  chatCreate:async body=>{setCreates(n=>n+1);return {id:9001,...body};},
  chatSend:async(id,body)=>{setRequests(old=>[...old,{threadId:id,text:body.text}]);setWaiting(true);return new Promise(resolve=>{completion.current=()=>{setWaiting(false);resolve({id:nextTurn.current++,text:body.text,state:'READY',provider:'OPENAI_API',model:'synthetic-model',content:{text:'Phản hồi giả lập: đã nhận đúng một yêu cầu.',sources:[]}});};});},
 }),[]);
 return <><main style={{padding:32,maxWidth:720}}><h1>Kiểm tra gửi gợi ý AI</h1><p>Chỉ dữ liệu giả lập · không gọi API/backend/nhà cung cấp.</p><p>Hội thoại tạo: {creates} · Yêu cầu gửi: {requests.length}</p><button type="button" disabled={!waiting} onClick={()=>{const finish=completion.current;completion.current=null;finish?.();}}>Trả lời giả lập</button><ol>{requests.map((r,i)=><li key={i}>{r.text}</li>)}</ol></main><AiProviderProvider api={api}><AiChat api={api} projectApi={projectApi}/></AiProviderProvider></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
