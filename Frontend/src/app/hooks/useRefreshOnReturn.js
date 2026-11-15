import {useEffect,useRef} from 'react';

// Reconcile read data when the user returns from another window/tab. Callers keep
// their existing draft-preserving loaders and skip reads while a write is pending.
export function useRefreshOnReturn(refresh){
 const latest=useRef(refresh);latest.current=refresh;
 useEffect(()=>{
  const onFocus=event=>{if(event.target===event.currentTarget)latest.current();};
  window.addEventListener('focus',onFocus);
  return()=>window.removeEventListener('focus',onFocus);
 },[]);
}
