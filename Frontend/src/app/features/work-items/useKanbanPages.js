import {useEffect,useRef,useState} from 'react';
import {ticketColumns} from './ticketWorkflow';

// Each column owns its page. A new scope cancels every outstanding old request.
export function useKanbanPages({api,projectId,filters,reload,enabled}) {
 const [pages,setPages]=useState({}),session=useRef(null);
 const scope=JSON.stringify({featureId:filters.featureId,keyword:filters.keyword,status:filters.status,type:filters.type});
 useEffect(()=>{
  setPages({});if(!enabled)return;
  const controller=new AbortController(),current={controller,pending:new Set(),failed:new Map(),pages:{},scope:JSON.parse(scope)};
  session.current=current;
  async function load(column,append=false){
   if(controller.signal.aborted||current.pending.has(column))return;
   const previous=current.pages[column],page=append?(previous?.page??-1)+1:previous?.page??0;
   current.pending.add(column);setPages(old=>({...old,[column]:{...old[column],loading:true,error:''}}));
   try {
    const result=await api.list(projectId,{...current.scope,column,page,size:20,deleted:false},{signal:controller.signal});
    if(controller.signal.aborted)return;
    const received=result.items.filter(item=>item.boardColumn===column);
    const items=append?[...(previous?.items||[]),...received.filter(item=>!previous?.items.some(old=>old.id===item.id))]:received;
    const value={...result,items,page,loading:false,error:''};current.pages[column]=value;current.failed.delete(column);
    setPages(old=>({...old,[column]:value}));
   }catch(error){if(!controller.signal.aborted){current.failed.set(column,append);setPages(old=>({...old,[column]:{...old[column],loading:false,error:error.message||'Chưa tải được Ticket.'}}));}}
   finally{current.pending.delete(column);}
  }
  current.load=load;ticketColumns.forEach(column=>load(column.id));
  return()=>controller.abort();
 },[api,projectId,scope,reload,enabled]);
 return {pages,loadMore:column=>session.current?.load(column,true),retry:column=>session.current?.load(column,session.current?.failed.get(column)||false)};
}
