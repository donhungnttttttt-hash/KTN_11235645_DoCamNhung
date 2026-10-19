import React, {useCallback,useContext,useEffect,useId,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {DialogVisibilityContext} from '../auth/DialogVisibilityContext';

export function useAdminFormClose(onClose,busy,dirty){
 const visible=useContext(DialogVisibilityContext),[confirming,setConfirming]=useState(false);
 const returnFocusRef=useRef(null);
 useEffect(()=>{if(!visible)setConfirming(false);},[visible]);
 const close=useCallback(()=>{
  if(busy||!visible)return;
  if(dirty){returnFocusRef.current=document.activeElement;setConfirming(true);return;}
  onClose?.();
 },[onClose,busy,dirty,visible]);
 return {close,confirmation:confirming?{
  busy,
  returnFocusRef,
  onContinue:()=>setConfirming(false),
  onDiscard:()=>{if(busy||!visible)return;setConfirming(false);onClose?.();},
 }:null};
}

/** A bounded editor: the page remains in place while the form scrolls independently. */
export function AdminFormDialog({title, onClose, busy, wide=false, children,confirmation=null,focusTitle=true,returnFocusRef=null}) {
 const titleId=useId();
 const ref=useDialogFocus(()=>onClose?.(), busy,true,returnFocusRef);
 return <><div className="admin-form-overlay" inert={confirmation?'':undefined} aria-hidden={confirmation?'true':undefined}>
  <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}
   className={`admin-form-dialog${wide?' admin-form-dialog-wide':''}`}>
   <header className="admin-form-dialog-header"><h2 id={titleId} tabIndex={-1} data-dialog-initial-focus={focusTitle||undefined}>{title}</h2>
    {onClose&&<button type="button" aria-label="Đóng" onClick={onClose} disabled={busy}><X size={20} aria-hidden="true"/></button>}
   </header>
   <div className="admin-form-dialog-body">{children}</div>
  </section>
 </div>{confirmation&&<AdminFormDialog title="Bỏ nội dung chưa lưu?" onClose={confirmation.onContinue} busy={confirmation.busy} focusTitle={false} returnFocusRef={confirmation.returnFocusRef}>
  <p>Nội dung đang soạn chưa được lưu. Bạn có thể tiếp tục soạn hoặc bỏ bản nháp này.</p>
  <div className="admin-actions"><button type="button" className="cat-btn cat-btn-mint" data-dialog-initial-focus disabled={confirmation.busy} onClick={confirmation.onContinue}>Tiếp tục soạn</button><button type="button" className="cat-btn" disabled={confirmation.busy} onClick={confirmation.onDiscard}>Bỏ bản nháp</button></div>
 </AdminFormDialog>}</>;
}
