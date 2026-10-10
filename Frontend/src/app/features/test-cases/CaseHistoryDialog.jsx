import {TableScroll} from '../../components/TableScroll';
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { testCasesApi } from '../../services/api/testCases';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { documentDate } from './documentDownload';

const fields={titleVi:'Đối tượng test',preconditionsVi:'Điều kiện tiên quyết',stepsVi:'Các bước test',expectedVi:'Kết quả mong đợi',titleJp:'Đối tượng (JP)',preconditionsJp:'Điều kiện (JP)',stepsJp:'Các bước (JP)',expectedJp:'Kết quả (JP)',sourceReference:'Tham chiếu nguồn'};
export function CaseHistoryDialog({ projectId, row, timeZone, onClose, onExecution }) {
  const ref=useDialogFocus(onClose);
  const [data,setData]=useState(null),[selected,setSelected]=useState(''),[diff,setDiff]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;setError('');setData(null);
    testCasesApi.getCase(projectId,row.caseId).then(value=>{if(live){setData(value);setSelected(String(value.currentRevisionId));}}).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[projectId,row.caseId,retry]);
  useEffect(()=>{
    if(!data || !selected)return;
    let live=true;setDiff(null);setError('');
    const ordered=[...data.revisions].sort((a,b)=>b.revisionNo-a.revisionNo);
    const index=ordered.findIndex(r=>String(r.id)===selected),previous=ordered[index+1];
    Promise.all([testCasesApi.getRevision(projectId,row.caseId,selected),previous?testCasesApi.getRevision(projectId,row.caseId,previous.id):Promise.resolve(null)])
      .then(([current,old])=>{if(live)setDiff({current,old,changes:Object.entries(fields).filter(([field])=>(current[field]||'')!==(old?.[field]||''))});})
      .catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[projectId,row.caseId,data,selected]);
  return <div className="tc-modal-overlay"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Lịch sử test case ${row.sourceId}`} className="td-case-dialog td-history-dialog">
    <header><h3>Lịch sử thay đổi · Test case #{row.sourceId}</h3><button aria-label="Đóng lịch sử" onClick={onClose}><X size={18}/></button></header>
    <div className="td-dialog-body" data-lenis-prevent>
      <div className="td-actions"><label>Phiên bản <select aria-label="Phiên bản lịch sử" value={selected} onChange={e=>setSelected(e.target.value)}>{data?.revisions.map(r=><option key={r.id} value={r.id}>Rev {r.revisionNo}</option>)}</select></label><button className="cat-btn" onClick={onExecution}>Lịch sử thực thi / kết quả</button></div>
      <p className="td-history-note">Các cột thay đổi được đối chiếu với phiên bản liền trước. Nội dung cũ màu đỏ, nội dung mới nền vàng.</p>
      {error?<div className="td-error" role="alert">{error} <button className="cat-btn" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></div>:!diff?<p role="status">Đang tải lịch sử…</p>:<>
        <p>Rev {diff.current.revisionNo} · {documentDate(diff.current.createdAt,timeZone)} · Người sửa: thành viên #{diff.current.createdBy ?? '—'}</p>
        <TableScroll label="Lịch sử phiên bản case" className="td-table-scroll"><table className="td-history-table"><thead><tr><th>Cột / hạng mục</th><th>Nội dung trước khi sửa</th><th>Nội dung sau khi sửa</th></tr></thead><tbody>{diff.changes.map(([field,label])=><tr key={field}><th scope="row">{label}</th><td><del>{diff.old?.[field] || '—'}</del></td><td><mark>{diff.current[field] || '—'}</mark></td></tr>)}</tbody></table></TableScroll>
        {!diff.old && <p>Phiên bản đầu tiên được lưu trong hệ thống.</p>}{!diff.changes.length && <p>Không có thay đổi nội dung giữa hai phiên bản.</p>}
      </>}
    </div>
  </section></div>;
}
