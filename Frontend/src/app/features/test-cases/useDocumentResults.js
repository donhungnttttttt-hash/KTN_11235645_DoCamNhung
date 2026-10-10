import { useEffect, useRef, useState } from 'react';
import { testCasesApi } from '../../services/api/testCases';

// Each row has a serial queue: quick clicks retain their order and server version.
export function useDocumentResults(projectId, documentId, data, onSaved) {
  const [overrides,setOverrides]=useState({}),[pending,setPending]=useState(0),[error,setError]=useState('');
  const queues=useRef(new Map()),states=useRef(new Map()),failed=useRef(false),live=useRef(true);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{
    if(!data)return;
    states.current=new Map(data.rows.map(row=>[row.rowId,{status:row.resultStatus || 'UNEXECUTED',version:row.resultVersion || 0}]));
    setOverrides({});setError('');failed.current=false;
  },[data]);
  useEffect(()=>{
    if(!pending)return;
    const warn=e=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[pending]);
  function change(row,value) {
    if(failed.current || row.rowId==null)return;
    const status=value.toUpperCase(),requestKey=crypto.randomUUID();
    setOverrides(current=>({...current,[row.rowId]:status}));setPending(n=>n+1);
    const next=(queues.current.get(row.rowId) || Promise.resolve()).then(async()=>{
      if(failed.current)return;
      try {
        const previous=states.current.get(row.rowId);
        const saved=await testCasesApi.updateDocumentResult(projectId,documentId,row.rowId,{status,expectedVersion:previous.version,requestKey});
        states.current.set(row.rowId,saved);
        if(live.current){onSaved(saved);if(failed.current)setOverrides(current=>({...current,[row.rowId]:saved.status}));}
      } catch(err) {
        failed.current=true;
        if(live.current){setError(err.message || 'Không lưu được kết quả. Tải lại bảng để kiểm tra trước khi sửa tiếp.');setOverrides(Object.fromEntries([...states.current].map(([key,state])=>[key,state.status])));}
      }
    }).finally(()=>{if(live.current)setPending(n=>n-1);if(queues.current.get(row.rowId)===next)queues.current.delete(row.rowId);});
    queues.current.set(row.rowId,next);
  }
  return {overrides,pending,error,change};
}
