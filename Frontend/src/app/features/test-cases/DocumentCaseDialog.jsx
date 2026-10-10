import React from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

export function DocumentCaseDialog({ row, headers, onClose, onPrevious, onNext, onManage, onHistory }) {
  const ref=useDialogFocus(onClose);
  return <div className="tc-modal-overlay"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Chi tiết test case ${row.sourceId}`} className="td-case-dialog">
    <header><h3>Chi tiết test case #{row.sourceId}</h3><button aria-label="Đóng chi tiết tài liệu" onClick={onClose}><X size={18}/></button></header>
    <div className="td-dialog-body" data-lenis-prevent>
      <div className="td-actions"><button className="cat-btn" onClick={onHistory}>Hiển thị lịch sử</button><button className="cat-btn" onClick={onManage}>Nội dung / phiên bản</button><span>{row.caseNo}</span></div>
      <table className="td-detail-fields"><tbody>{headers.map((name,index)=><tr key={index}><th scope="row">{name || `Cột nguồn ${index+1}`}</th><td>{row.cells[index] || '—'}</td></tr>)}</tbody></table>
      <div className="td-detail-navigation"><button className="cat-btn" disabled={!onPrevious} onClick={onPrevious}>‹ Trước</button><button className="cat-btn cat-btn-mint" disabled={!onNext} onClick={onNext}>Tiếp ›</button></div>
    </div>
  </section></div>;
}
