import React,{createContext,useContext,useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useAuth} from '../auth/AuthProvider';
const DraftContext=createContext(null);
export const useReportDrafts=()=>useContext(DraftContext);
export function ReportDraftProvider({children}){
 const auth=useAuth(),owner=auth?.user?.id;
 return <OwnerDrafts key={owner==null?'signed-out':`owner:${owner}`} active={owner!=null&&auth.status==='authenticated'}>{children}</OwnerDrafts>;
}
function OwnerDrafts({children,active}){
 const memory=useRef(null);
 const activeRef=useRef(active),alive=useRef(true);
 activeRef.current=active;
 if(!memory.current){
  const entries=new Map(),lastEntry=new Map(),key=(project,id)=>`${project}/${id}`;
  memory.current={
   read:project=>activeRef.current&&alive.current?entries.get(lastEntry.get(String(project)))||null:null,
   write:(project,id,value)=>{
    if(!activeRef.current||!alive.current)return;
    const entryKey=key(project,id);
    entries.set(entryKey,{featureId:value.featureId,editor:{...value.editor},baseline:{...value.baseline},saved:value.saved?{id:value.saved.id,featureId:value.saved.featureId,version:value.saved.version}:null});
    lastEntry.set(String(project),entryKey);
   },
   remove:(project,id)=>{if(!activeRef.current||!alive.current)return;const entryKey=key(project,id);entries.delete(entryKey);if(lastEntry.get(String(project))===entryKey)lastEntry.delete(String(project));},
   hasDrafts:()=>entries.size>0,
   clear:()=>{entries.clear();lastEntry.clear();},
  };
 }
 // Layout setup runs before the editor's passive persistence effect, including
 // StrictMode's effect replay. A disposed owner's captured handles cannot write.
 useLayoutEffect(()=>{alive.current=true;return()=>{alive.current=false;memory.current.clear();};},[]);
 useEffect(()=>{
  const store=memory.current;
  const warn=event=>{if(store.hasDrafts()){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[]);
 const value=useMemo(()=>({...memory.current,active}),[active]);
 return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}
