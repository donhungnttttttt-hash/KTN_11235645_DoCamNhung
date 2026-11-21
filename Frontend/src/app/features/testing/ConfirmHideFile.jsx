import {ConfirmationDialog} from '../../components/ConfirmationDialog';
import React from 'react';
export function ConfirmHideFile({document:doc,busy,error,onCancel,onConfirm,opener}){
 return <ConfirmationDialog title="Xóa file khỏi danh sách?" busy={busy} onCancel={onCancel} returnFocusRef={opener}><p><strong>{doc.fileName}</strong> sẽ được ẩn khỏi danh sách. Các case, Ticket và lịch sử được giữ nguyên; bạn có thể khôi phục file ở danh sách đã ẩn.</p>{error&&<p role="alert">{error}</p>}<div className="testing-version-confirm-actions"><button className="cat-btn" data-dialog-initial-focus disabled={busy} onClick={onCancel}>Hủy</button><button className="cat-btn" disabled={busy} onClick={onConfirm}>{busy?'Đang xử lý…':'Xác nhận'}</button></div></ConfirmationDialog>;
}
