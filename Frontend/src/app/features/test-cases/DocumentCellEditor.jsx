import React,{useEffect,useRef,useState} from 'react';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {testCasesApi} from '../../services/api/testCases';

export function DocumentCellEditor({projectId,documentId,cell,onClose,onSaved}) {
  const [value,setValue]=useState(cell.value),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [history,setHistory]=useState(null),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(false),[historyRetry,setHistoryRetry]=useState(0);
  const historyRef=useRef(null);
  const ref=useDialogFocus(onClose,busy);
  useEffect(()=>{let live=true;setHistoryError('');setHistoryLoading(true);testCasesApi.documentCellHistory(projectId,documentId,cell.row.rowId,cell.index)
    .then(x=>{if(live)setHistory(x);}).catch(()=>{if(live)setHistoryError('Chưa tải được lịch sử ô.');}).finally(()=>{if(live)setHistoryLoading(false);});return()=>{live=false;};},[projectId,documentId,cell,historyRetry]);
  useEffect(()=>{if(historyError && historyRef.current)historyRef.current.open=true;},[historyError]);
  async function save(e){e.preventDefault();setBusy(true);setError('');
    try{await testCasesApi.editDocumentCell(projectId,documentId,cell.row.rowId,cell.index,{value,expectedVersion:cell.version,expectedRevisionId:cell.row.revisionId});await onSaved();onClose();}
    catch(err){setError(err.message || 'Chưa lưu được nội dung.');}finally{setBusy(false);}
  }
  return <div className="ex-modal"><section className="td-case-dialog td-edit-dialog" role="dialog" aria-modal="true" aria-label={`Sửa ô · ${cell.label}`} ref={ref} tabIndex={-1}>
    <header><h3>{cell.label} · Case {cell.row.sourceId}</h3><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></header>
    <form className="td-dialog-body" onSubmit={save}>
      <p className="td-muted">{cell.canonical?'Lưu thành phiên bản case mới, cần PM duyệt trước khi phân công. Các lượt đã chạy giữ phiên bản cũ.':'Lưu nội dung bổ sung của tài liệu và lịch sử thay đổi.'}</p>
      <label className="td-edit-field">Nội dung<textarea data-dialog-initial-focus maxLength={cell.maxLength} value={value} onChange={e=>setValue(e.target.value)} disabled={busy} rows={7}/></label>
      {error&&<p role="alert" className="td-error">{error}</p>}
      <div className="td-actions"><button className="cat-btn cat-btn-mint" disabled={busy || value===cell.value}>{busy?'Đang lưu…':'Lưu nội dung'}</button><button type="button" className="cat-btn" disabled={busy} onClick={onClose}>Hủy</button></div>
      <details ref={historyRef} className="td-edit-history"><summary>Lịch sử ô</summary>{historyLoading&&<p role="status">Đang tải lịch sử ô…</p>}{historyError&&<p role="alert">{historyError} <button type="button" className="cat-btn" disabled={historyLoading} onClick={()=>setHistoryRetry(n=>n+1)}>Thử lại lịch sử ô</button></p>}{!historyLoading&&history?.length===0&&<p>Chưa có thay đổi.</p>}
        {history?.map((h,i)=><div key={i}><strong>{h.actor}</strong><p><del>{h.beforeValue || '(Trống)'}</del></p><p>{h.afterValue || '(Trống)'}</p></div>)}
      </details>
    </form>
  </section></div>;
}
