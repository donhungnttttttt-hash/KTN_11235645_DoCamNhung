import React, { useEffect, useState } from 'react';
import { testCasesApi } from '../../services/api/testCases';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { documentDate } from './documentDownload';

export function DocumentResultHistory({projectId,documentId,row,timeZone,onClose,onExecution}) {
  const ref=useDialogFocus(onClose);
  const [items,setItems]=useState([]),[before,setBefore]=useState(0),[more,setMore]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;setBusy(true);setError('');
    testCasesApi.documentResultHistory(projectId,documentId,row.rowId,before).then(values=>{
      if(live){setItems(old=>before?[...old,...values]:values);setMore(values.length===50);}
    }).catch(e=>{if(live)setError(e.message || 'Không tải được lịch sử.');}).finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[projectId,documentId,row.rowId,before,retry]);
  return <div className="tc-modal-overlay"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Lịch sử kết quả tài liệu ${row.sourceId}`} className="td-case-dialog">
    <header><h3>Lịch sử kết quả · Case {row.sourceId}</h3><button className="cat-btn" aria-label="Đóng lịch sử kết quả" onClick={onClose}>Đóng</button></header>
    <div className="td-dialog-body"><p>Kết quả ghi trên tài liệu. Lịch sử đợt kiểm thử và chứng cứ được quản lý riêng.</p>
      <button className="cat-btn" onClick={onExecution}>Lịch sử / chứng cứ đợt kiểm thử</button>
      {error && <div role="alert" className="td-error">{error} <button className="cat-btn" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>}
      {busy && <p role="status">Đang tải lịch sử…</p>}
      {!busy && !error && !items.length && <p>Chưa có thay đổi kết quả trên tài liệu.</p>}
      {!!items.length && <div className="td-table-scroll"><table className="td-history-table td-document-result-history"><thead><tr><th>Thời gian</th><th>Người sửa</th><th>Trước</th><th>Sau</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{documentDate(item.occurredAt,timeZone)}</td><td>{item.actor}</td><td>{item.before}</td><td>{item.after}</td></tr>)}</tbody></table></div>}
      {more && !error && <button className="cat-btn" disabled={busy} onClick={()=>setBefore(items.at(-1).id)}>Xem lịch sử cũ hơn</button>}
    </div>
  </section></div>;
}
