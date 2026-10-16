import React,{useEffect,useRef,useState} from 'react';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {testCasesApi} from '../../services/api/testCases';

export function DocumentCellEditor({projectId,documentId,cell,onClose,onSaved,authorized=true}) {
  const [value,setValue]=useState(cell.value),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [current,setCurrent]=useState(cell),[conflict,setConflict]=useState(false),[blocked,setBlocked]=useState(false),[refreshed,setRefreshed]=useState(false);
  const [history,setHistory]=useState(null),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(false),[historyRetry,setHistoryRetry]=useState(0);
  const historyRef=useRef(null),live=useRef(true),lock=useRef(false);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const ref=useDialogFocus(onClose,busy);
  useEffect(()=>{let live=true;setHistoryError('');setHistoryLoading(true);testCasesApi.documentCellHistory(projectId,documentId,cell.row.rowId,cell.index)
    .then(x=>{if(live)setHistory(x);}).catch(()=>{if(live)setHistoryError('Chưa tải được lịch sử ô.');}).finally(()=>{if(live)setHistoryLoading(false);});return()=>{live=false;};},[projectId,documentId,cell,historyRetry]);
  useEffect(()=>{if(historyError && historyRef.current)historyRef.current.open=true;},[historyError]);
  async function reload(){if(lock.current || !authorized || blocked)return;lock.current=true;setBusy(true);setError('');
    try {
      const detail=await testCasesApi.getDocument(projectId,documentId);if(!live.current)return;
      const row=detail.rows.find(r=>r.rowId===cell.row.rowId);
      if(detail.document.id!==Number(documentId) || !row || row.caseId!==cell.row.caseId || row.archived || row.cells[cell.index]==null) {
        setError('Case đã lưu trữ hoặc ngữ cảnh ô đã thay đổi. Giữ bản nháp và mở lại tài liệu để kiểm tra.');return;
      }
      setCurrent({...cell,row,value:row.cells[cell.index],version:detail.cellVersions?.[row.rowId]?.[cell.index] || 0});
      setConflict(false);setRefreshed(true);setHistoryRetry(n=>n+1);
    }catch(err){if(live.current){setError(err.message || 'Chưa tải được dữ liệu hiện hành.');if([401,403,404].includes(err.status))setBlocked(true);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  async function save(e){e.preventDefault();if(lock.current || conflict || blocked || !authorized)return;lock.current=true;setBusy(true);setError('');
    try{await testCasesApi.editDocumentCell(projectId,documentId,cell.row.rowId,cell.index,{value,expectedVersion:current.version,expectedRevisionId:current.row.revisionId});if(!live.current)return;await onSaved();if(live.current)onClose();}
    catch(err){if(live.current){setError(err.message || 'Chưa lưu được nội dung.');setConflict(err.status===409);if([401,403,404].includes(err.status))setBlocked(true);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  return <div className="ex-modal"><section className="td-case-dialog td-edit-dialog" role="dialog" aria-modal="true" aria-label={`Sửa ô · ${cell.label}`} ref={ref} tabIndex={-1}>
    <header><h3>{cell.label} · Case {cell.row.sourceId}</h3><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></header>
    <form className="td-dialog-body" onSubmit={save}>
      <p className="td-muted">{cell.canonical?'Lưu thành phiên bản case mới, cần PM duyệt trước khi phân công. Các lượt đã chạy giữ phiên bản cũ.':'Lưu nội dung bổ sung của tài liệu và lịch sử thay đổi.'}</p>
      <label className="td-edit-field">Nội dung<textarea data-dialog-initial-focus maxLength={cell.maxLength} value={value} onChange={e=>setValue(e.target.value)} disabled={busy} rows={7}/></label>
      {error&&<p role="alert" className="td-error">{error}</p>}
      {(!authorized || blocked)&&<p role="alert">Không còn quyền lưu trong ngữ cảnh này. Bản nháp được giữ để bạn đối chiếu trước khi đóng.</p>}
      {conflict&&<button type="button" className="cat-btn" disabled={busy || blocked || !authorized} onClick={reload}>Tải bản hiện hành, giữ bản nháp</button>}
      {refreshed&&<div role="status"><p>Nội dung hiện hành · phiên bản case #{current.row.revisionId}. Đối chiếu với bản nháp rồi bấm Lưu nội dung.</p><p className="td-cell-text">{current.value || '(Trống)'}</p></div>}
      <div className="td-actions"><button className="cat-btn cat-btn-mint" disabled={busy || conflict || blocked || !authorized || value===current.value}>{busy?'Đang lưu…':'Lưu nội dung'}</button><button type="button" className="cat-btn" disabled={busy} onClick={onClose}>Hủy</button></div>
      <details ref={historyRef} className="td-edit-history"><summary>Lịch sử ô</summary>{historyLoading&&<p role="status">Đang tải lịch sử ô…</p>}{historyError&&<p role="alert">{historyError} <button type="button" className="cat-btn" disabled={historyLoading} onClick={()=>setHistoryRetry(n=>n+1)}>Thử lại lịch sử ô</button></p>}{!historyLoading&&history?.length===0&&<p>Chưa có thay đổi.</p>}
        {history?.map((h,i)=><div key={i}><strong>{h.actor}</strong><p><del>{h.beforeValue || '(Trống)'}</del></p><p>{h.afterValue || '(Trống)'}</p></div>)}
      </details>
    </form>
  </section></div>;
}
