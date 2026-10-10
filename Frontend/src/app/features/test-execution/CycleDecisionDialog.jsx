import React, { useEffect, useRef, useState } from 'react';
import { executionApi } from '../../services/api/execution';
import { ErrorNotice, Field, Pager, formatTime } from './components';
import { useDialogFocus } from '../../hooks/useDialogFocus';

export function CycleDecisionDialog({ projectId, cycle, run, onClose, onSaved }) {
  const [current, setCurrent] = useState(run || cycle);
  const [reason, setReason] = useState(''), [outstandingReason, setOutstandingReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false);
  const mode = useRef(run ? (run.excluded ? 'RESTORE' : 'NA') : (cycle.statusCode === 'CLOSED' ? 'REOPEN' : 'CLOSE')).current;
  const live = useRef(true);
  const dialogRef = useDialogFocus(onClose, busy);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const label = { NA: 'Xác nhận NA', RESTORE: 'Đưa lại vào phạm vi', CLOSE: 'Xác nhận chốt đợt', REOPEN: 'Xác nhận mở lại đợt' }[mode];
  const applicable = run ? Boolean(current.excluded) === (mode === 'RESTORE') : current.statusCode === (mode === 'REOPEN' ? 'CLOSED' : 'ACTIVE');
  async function refresh() {
    setBusy(true);
    try {
      const next = await (run ? executionApi.run(projectId, run.id) : executionApi.cycle(projectId, cycle.id));
      if (live.current) { setCurrent(next); setConflict(false); setError(''); }
    } catch (e) { if (live.current) setError(e.message); }
    finally { if (live.current) setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (run) await executionApi.decideScope(projectId, run.id, { excluded: mode === 'NA', reason, expectedVersion: current.version });
      else await executionApi.decideCycle(projectId, cycle.id, { action: mode, reason, outstandingReason, expectedVersion: current.version });
      if (live.current) onSaved();
    } catch (e) { if (live.current) { setError(e.message); setConflict(e.status === 409); } }
    finally { if (live.current) setBusy(false); }
  }
  return <div className="ex-modal"><section ref={dialogRef} tabIndex={-1} className="ex-dialog" role="dialog" aria-modal="true" aria-label={label}>
    <div className="ex-heading"><h3>{label}{run && ` · ${run.caseNo}`}</h3><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></div>
    <p className="ex-help">{run ? 'Quyết định phạm vi giữ nguyên lịch sử thực thi. NA loại lượt khỏi mẫu số báo cáo và yêu cầu PM xác nhận lại phạm vi retest liên quan.' : mode === 'CLOSE' ? 'Chốt khi không còn Chưa chạy / Tạm hoãn và các kết quả NG đã liên kết bug. Ghi rõ tồn đọng; đợt đã chốt khóa ghi kết quả và retest.' : 'Mở lại cho phép tiếp tục thực thi, giữ nguyên kết quả và quyết định trước đó.'}</p>
    <ErrorNotice error={error} />{conflict && <button className="cat-btn" disabled={busy} onClick={refresh}>Tải bản hiện hành, giữ bản nháp</button>}
    {!applicable && <p role="status">Trạng thái đã thay đổi; quyết định này không còn áp dụng. Đóng hộp thoại và kiểm tra lại.</p>}
    <form onSubmit={submit} className="space-y-3 mt-3"><Field label="Lý do quyết định"><textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></Field>
      {mode === 'CLOSE' && <Field label="Ghi nhận tồn đọng"><textarea maxLength={2000} value={outstandingReason} onChange={e => setOutstandingReason(e.target.value)} placeholder="Bắt buộc nếu còn NG, bug chưa đóng hoặc retest chưa xong" /></Field>}
      <button className="cat-btn cat-btn-mint" disabled={busy || conflict || !applicable}>{busy ? 'Đang lưu…' : label}</button>
    </form>
  </section></div>;
}

export function DecisionHistory({ projectId, id, scope = false, timeZone = 'UTC' }) {
  const [open, setOpen] = useState(false), [page, setPage] = useState(0), [reload, setReload] = useState(0);
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let live = true; setData(null); setError('');
    (scope ? executionApi.scopeDecisions(projectId, id, page) : executionApi.cycleDecisions(projectId, id, page))
      .then(value => { if (live) setData(value); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [projectId, id, scope, page, open, reload]);
  return <div className="my-2"><button className="ex-link" aria-expanded={open} onClick={() => setOpen(x => !x)}>{scope ? 'Lịch sử phạm vi NA' : 'Lịch sử chốt / mở đợt'}</button>{open && <section className="ex-panel">
    <ErrorNotice error={error} retry={() => setReload(x => x + 1)} />{!data && !error && <p role="status">Đang tải quyết định…</p>}
    {data?.items.map(d => <article className="ex-history" key={d.id}><strong>{scope ? (d.excluded ? 'NA' : 'Áp dụng') : (d.action === 'CLOSE' ? 'Chốt đợt' : 'Mở lại')}</strong><small>{d.actor} · {formatTime(d.decidedAt, timeZone)}</small><p>{d.reason}</p>{d.outstandingReason && <p>Tồn đọng: {d.outstandingReason}</p>}</article>)}
    {data && !data.totalItems && <p>Chưa có quyết định.</p>}{data && <Pager data={data} onChange={setPage} />}
  </section>}</div>;
}
