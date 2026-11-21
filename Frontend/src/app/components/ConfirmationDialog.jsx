import React,{useCallback,useContext,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {useDialogFocus} from '../hooks/useDialogFocus';
import {DialogVisibilityContext} from '../features/auth/DialogVisibilityContext';
import './confirmation-dialog.css';

/** Confirmations always live outside page/editor layout, including inside drawers. */
export function ConfirmationDialog({title,children,onCancel,busy=false,returnFocusRef=null,role='dialog',closeLabel='Đóng xác nhận'}) {
 const visible=useContext(DialogVisibilityContext),titleId=useId();
 const ref=useDialogFocus(onCancel,busy,visible,returnFocusRef);
 if(!visible)return null;
 return createPortal(<div className="confirmation-overlay" onClick={event=>event.stopPropagation()}>
  <section ref={ref} className="confirmation-dialog" role={role} aria-modal="true" aria-labelledby={titleId} aria-busy={busy} tabIndex={-1}>
   <header className="confirmation-heading"><h2 id={titleId}>{title}</h2><button type="button" className="confirmation-close" aria-label={closeLabel} disabled={busy} onClick={onCancel}><X size={18} aria-hidden="true"/></button></header>
   <div className="confirmation-content">{children}</div>
  </section>
 </div>,document.body);
}

/** Async replacement for browser confirm. A scope change/unmount cancels pending work. */
export function useConfirmation(scope) {
 const visible=useContext(DialogVisibilityContext),[request,setRequest]=useState(null);
 const pending=useRef(null),opener=useRef(null);
 const finish=useCallback(answer=>{
  const resolve=pending.current;pending.current=null;setRequest(null);resolve?.(answer);
 },[]);
 useEffect(()=>()=>{pending.current?.(false);pending.current=null;},[scope,visible]);
 useEffect(()=>{setRequest(null);},[scope,visible]);
 const ask=useCallback(options=>{
  if(!visible)return Promise.resolve(false);
  pending.current?.(false);opener.current=document.activeElement;
  return new Promise(resolve=>{pending.current=resolve;setRequest(options);});
 },[visible]);
 const confirmation=request&&visible?<ConfirmationDialog title={request.title||'Xác nhận thao tác'} onCancel={()=>finish(false)} returnFocusRef={opener}>
  <p>{request.message}</p><div className="confirmation-actions">
   <button type="button" data-dialog-initial-focus onClick={()=>finish(false)}>{request.cancelLabel||'Hủy'}</button>
   <button type="button" className="confirmation-primary" onClick={()=>finish(true)}>{request.confirmLabel||'Xác nhận'}</button>
  </div>
 </ConfirmationDialog>:null;
 return {ask,confirmation};
}
