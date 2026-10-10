import {TableScroll} from '../../components/TableScroll';
import React, {useState} from 'react';

export function useCaseViewState() {
  return useState(()=>({single:typeof window!=='undefined' && !!window.matchMedia?.('(max-width: 900px)').matches,selected:null}));
}
/** The owner can retain position while refreshed data temporarily hides this view. */
export function FileCaseView({view,raw,renderResult,renderActions,viewState}) {
  const localState=useCaseViewState();
  const [{single,selected},setPosition]=viewState || localState;
  const setSingle=single=>setPosition(current=>({...current,single}));
  const setSelected=selected=>setPosition(current=>({...current,selected}));
  const index=Math.max(0,view.rows.findIndex(row=>row.runItemId===selected));
  const row=view.rows[index];
  return <section className="fw-case-view" aria-label="Nội dung thực thi">
    <div className="fw-actions fw-view-switch" role="group" aria-label="Cách xem test case">
      <button type="button" aria-pressed={!single} onClick={()=>setSingle(false)}>Xem dạng bảng</button>
      <button type="button" aria-pressed={single} onClick={()=>setSingle(true)}>Xem từng case</button>
    </div>
    {single ? row && <section className="fw-case-card" role="region" aria-label="Case đang xem">
      <div className="fw-case-navigation"><label className="fw-field">Chọn case<select value={row.runItemId} onChange={e=>setSelected(Number(e.target.value))}>{view.rows.map(r=><option key={r.runItemId} value={r.runItemId}>{r.caseNo} · {r.titleVi}</option>)}</select></label>
        <button type="button" disabled={!index} onClick={()=>setSelected(view.rows[index-1].runItemId)}>Case trước</button>
        <button type="button" disabled={index+1>=view.rows.length} onClick={()=>setSelected(view.rows[index+1].runItemId)}>Case tiếp</button>
      </div>
      <h3>{row.caseNo} · {row.titleVi}</h3><p>{index+1}/{view.rows.length} case trong file</p>
      <div className="fw-case-result">{renderResult(row)}{renderActions(row)}</div>
      <dl className="fw-case-fields">{(raw?row.sourceCells:row.cells).map((cell,i)=><div key={i}><dt>{view.headers[i] || `Cột ${i+1}`}</dt><dd>{cell || '—'}</dd></div>)}</dl>
    </section> : <TableScroll className="fw-table-scroll" tabIndex={0} role="region" aria-label="Case thực thi chính thức"><table>
      <thead><tr>{view.headers.map((h,i)=><th key={i} scope="col">{h}</th>)}<th>Kết quả / ngữ cảnh</th><th>Thao tác</th></tr></thead>
      <tbody>{view.rows.map(r=><tr key={r.runItemId}>{(raw?r.sourceCells:r.cells).map((cell,i)=><td key={i}>{cell}</td>)}<td>{renderResult(r)}</td><td>{renderActions(r)}</td></tr>)}</tbody>
    </table></TableScroll>}
  </section>;
}

export function SessionContext({context={}}) {
  const fields=[['Người thực hiện',context.executor?.displayName],['Máy',context.physicalAsset?.assetCode],['Mẫu máy',context.physicalAsset?.model],['Hệ điều hành',[context.physicalAsset?.osName,context.physicalAsset?.osVersion].filter(Boolean).join(' ')],['Môi trường',context.environment?.name],['Thiết bị kiểm thử',context.device?.name],['Build',context.build?.versionLabel]];
  return <dl className="fw-context">{fields.filter(([,v])=>v).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl>;
}
