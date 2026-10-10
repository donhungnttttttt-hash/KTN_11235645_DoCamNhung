import React,{createContext,useContext,useEffect,useRef} from 'react';

const EditContext=createContext(null);
// Mounted inside AuthBoundary's identity-keyed subtree: route changes preserve
// unsaved text; logout or a different account destroys it. No browser storage.
export function AiEditBuffer({children}) {
 const edits=useRef(new Map());
 useEffect(()=>{
  const warn=event=>{if(edits.current.size){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[]);
 return <EditContext.Provider value={edits.current}>{children}</EditContext.Provider>;
}
export function useAiEditBuffer(){return useContext(EditContext);}
