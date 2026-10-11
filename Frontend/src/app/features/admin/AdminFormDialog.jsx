import React, {useId} from 'react';
import {X} from 'lucide-react';
import {useDialogFocus} from '../../hooks/useDialogFocus';

/** A bounded editor: the page remains in place while the form scrolls independently. */
export function AdminFormDialog({title, onClose, busy, wide=false, children}) {
 const titleId=useId();
 const ref=useDialogFocus(()=>onClose?.(), busy);
 return <div className="admin-form-overlay">
  <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}
   className={`admin-form-dialog${wide?' admin-form-dialog-wide':''}`}>
   <header className="admin-form-dialog-header"><h2 id={titleId} tabIndex={-1} data-dialog-initial-focus>{title}</h2>
    {onClose&&<button type="button" aria-label="Đóng" onClick={onClose} disabled={busy}><X size={20} aria-hidden="true"/></button>}
   </header>
   <div className="admin-form-dialog-body">{children}</div>
  </section>
 </div>;
}
