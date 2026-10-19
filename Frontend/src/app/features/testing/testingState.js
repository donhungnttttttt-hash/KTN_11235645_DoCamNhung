import {useCallback,useEffect,useRef,useState} from 'react';

export function useTestingQuery(loader,deps) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const sequence=useRef(0);
  const load=useCallback(async()=>{const token=++sequence.current;setLoading(true);setError('');
    try{const result=await loader();if(token===sequence.current)setData(result);}
    catch(err){if(token===sequence.current){setError(err.message||'Không tải được dữ liệu.');setData(null);}}
    finally{if(token===sequence.current)setLoading(false);}
  },deps);
  useEffect(()=>{setData(null);load();return()=>{sequence.current++;};},[load]);
  return {data,error,loading,load};
}
export const requestKey=()=>crypto.randomUUID();
