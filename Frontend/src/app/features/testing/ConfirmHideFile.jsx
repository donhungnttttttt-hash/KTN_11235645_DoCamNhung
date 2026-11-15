import React,{useId} from 'react';
import {createPortal} from 'react-dom';
import {useDialogFocus} from '../../hooks/useDialogFocus';
export function ConfirmHideFile({document:doc,busy,error,onCancel,onConfirm,opener}){
 const id=useId(),ref=useDialogFocus(onCancel,busy,true,opener);
 return createPortal(<div className="testing-version-confirm-overlay"><section ref={ref} className="testing-version-confirm" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}><h2 id={id}>Xóa file khỏi danh sách?</h2><p><strong>{doc.fileName}</strong> sẽ được ẩn khỏi danh sách. Các case, Ticket và lịch sử được giữ nguyên; bạn có thể khôi phục file ở danh sách đã ẩn.</p>{error&&<p role="alert">{error}</p>}<div className="testing-version-confirm-actions"><button className="cat-btn" data-dialog-initial-focus disabled={busy} onClick={onCancel}>Hủy</button><button className="cat-btn" disabled={busy} onClick={onConfirm}>{busy?'Đang xử lý…':'Xác nhận'}</button></div></section></div>,document.body);
}
