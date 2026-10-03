import React, { useEffect, useRef, useState } from 'react';
import { executionApi } from '../../services/api/execution';
import { ErrorNotice, Field, Select, Result, Pager, formatTime } from './components';
import { DecisionHistory } from './CycleDecisionDialog';
import { NgBugActions } from './NgBugActions';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import '../work-items/work-items-live.css';

export function AttemptDialog({ projectId, run: initial, builds, active, currentUserId, onClose, onSaved, timeZone = 'UTC' }) {
  const [run, setRun] = useState(initial), [history, setHistory] = useState(null), [page, setPage] = useState(0);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [success, setSuccess] = useState(''), [conflict, setConflict] = useState(false);
  const [historyError, setHistoryError] = useState(''), [historyReload, setHistoryReload] = useState(0);
  const dialogRef = useDialogFocus(onClose, busy);
  const [form, setForm] = useState({ resultCode: 'NG', buildId: String(initial.defaultBuildId), actualResult: '', reason: '', evidenceReference: '' });
  const requestKey = useRef(crypto.randomUUID());
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    setHistory(null); setHistoryError('');
    executionApi.attempts(projectId, run.id, page).then(x => { if (current) setHistory(x); }).catch(e => { if (current) setHistoryError(e.message); });
    return () => { current = false; };
  }, [projectId, run.id, run.version, page, historyReload]);
  const canRecord = active && !run.excluded && String(run.assigneeUserId) === String(currentUserId);
  function update(key, value) { requestKey.current = crypto.randomUUID(); setForm(prev => ({ ...prev, [key]: value })); setSuccess(''); }
  async function refresh() {
    setBusy(true);
    try { const latest = await executionApi.run(projectId, run.id); if (!live.current) return; setRun(latest); setConflict(false); setError(''); requestKey.current = crypto.randomUUID(); setSuccess('Đã tải dữ liệu hiện hành. Bản nháp được giữ; hãy đối chiếu rồi bấm Ghi kết quả.'); }
    catch (e) { if (live.current) setError(e.message); } finally { if (live.current) setBusy(false); }
  }
  async function submit(e) {
    e.preventDefault();
    if (busy || conflict || !canRecord) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const saved = await executionApi.record(projectId, run.id, { ...form, buildId: Number(form.buildId), requestKey: requestKey.current, expectedVersion: run.version });
      if (!live.current) return;
      setSuccess(`Đã lưu lần chạy #${saved.attemptNo}.`); setPage(0);
      setRun(prev => ({ ...prev, version: prev.version + 1, resultCode: saved.resultCode, latestAttemptId: saved.id }));
      requestKey.current = crypto.randomUUID(); onSaved();
    } catch (err) { if (live.current) { setError(err.message); setConflict(err.status === 409); } }
    finally { if (live.current) setBusy(false); }
  }
  function context(attempt) { try { return (typeof attempt.contextSnapshot === 'string' ? JSON.parse(attempt.contextSnapshot) : attempt.contextSnapshot) || {}; } catch { return {}; } }
  return <div className="ex-modal"><section ref={dialogRef} tabIndex={-1} className="ex-dialog ex-attempt-dialog" role="dialog" aria-modal="true" aria-label={`Thực thi ${run.caseNo}`}>
    <div className="ex-heading"><h3>{run.caseNo} · {run.titleVi}</h3><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></div>
    <p className="ex-help">Phiên bản {run.revisionNo} · {run.environmentName} / {run.deviceName} · {run.assigneeName}</p>
    <div className="ex-current-result"><span>Kết quả hiện tại</span><Result value={run.excluded ? 'NA' : run.resultCode || 'NOT_RUN'} /><span>Mỗi lần lưu tạo một bản ghi lịch sử.</span></div>
    <ErrorNotice error={error} />{conflict && <button className="cat-btn" disabled={busy} onClick={refresh}>Tải bản hiện hành, giữ bản nháp</button>}
    {success && <p className="ex-success" role="status">{success}</p>}
    <div className="ex-detail"><article><h4>Điều kiện tiên quyết</h4>{run.preconditionsVi || '—'}<h4>Các bước thực hiện</h4>{run.stepsVi}<h4>Kết quả mong đợi</h4>{run.expectedVi}</article>
      {canRecord ? <form onSubmit={submit} className="ex-result-form" aria-busy={busy}>
        <h4>Ghi kết quả lần kiểm thử này</h4>
        <fieldset disabled={busy} className="space-y-3">
        <div className="ex-fields"><Field label="Kết quả"><select className="cat-select" value={form.resultCode} onChange={e => update('resultCode', e.target.value)}><option value="OK">OK · Đạt</option><option value="NG">NG · Không đạt</option><option value="P">P · Tạm hoãn</option></select></Field>
          <Select label="Build thực tế" items={builds} value={form.buildId} describe={x => `${x.platform} ${x.versionLabel} (${x.buildNumber || '—'})`} onChange={v => update('buildId', v)} /></div>
        <Field label="Kết quả thực tế"><textarea required={form.resultCode === 'NG'} maxLength={8000} value={form.actualResult} onChange={e => update('actualResult', e.target.value)} /></Field>
        {form.resultCode === 'NG' && <p className="ex-field-hint">Bắt buộc mô tả kết quả thực tế khi không đạt (NG).</p>}
        <Field label="Lý do / ghi chú lần chạy"><textarea required={form.resultCode === 'P'} maxLength={1000} value={form.reason} onChange={e => update('reason', e.target.value)} /></Field>
        {form.resultCode === 'P' && <p className="ex-field-hint">Bắt buộc ghi lý do tạm hoãn (P).</p>}
        <Field label="Tham chiếu chứng cứ"><input className="cat-input" maxLength={1000} value={form.evidenceReference} onChange={e => update('evidenceReference', e.target.value)} placeholder="Tên tệp hoặc đường dẫn chứng cứ" /></Field>
        </fieldset>
        <div className="ex-attempt-actions"><button className="cat-btn cat-btn-mint" disabled={busy || conflict}>{busy ? 'Đang lưu…' : 'Ghi kết quả'}</button></div>
      </form> : <p className="ex-help">{run.excluded ? 'NA: lượt này đã được PM loại khỏi phạm vi áp dụng.' : active ? 'Chỉ người được phân công được ghi kết quả. Bạn có thể xem nội dung và lịch sử.' : 'Đợt chưa bắt đầu hoặc đã chốt. Bạn có thể xem nội dung và lịch sử.'}</p>}
    </div>
    <DecisionHistory projectId={projectId} id={run.id} scope timeZone={timeZone} />
    <h3 className="mt-5 mb-3">Lịch sử thực thi</h3>
    <ErrorNotice error={historyError} retry={() => setHistoryReload(value => value + 1)} />
    {!history && !historyError && <p role="status" className="ex-help">Đang tải lịch sử thực thi…</p>}
    {history?.items.map(a => { const c = context(a); return <article className="ex-history" key={a.id}><Result value={a.resultCode} /> <strong>Lần #{a.attemptNo}</strong>
      <small>{c.executor?.displayName || a.executorName} · {formatTime(a.executedAt, timeZone)} ({timeZone}) · {c.build?.platform} {c.build?.versionLabel} ({c.build?.buildNumber || '—'}) · {c.environment?.name} / {c.device?.name}</small>
      {a.actualResult && <p>{a.actualResult}</p>}{a.reason && <p>Ghi chú: {a.reason}</p>}{a.evidenceReference && <p>Chứng cứ: {a.evidenceReference}</p>}
      {active && a.resultCode === 'NG' && <NgBugActions projectId={projectId} attempt={a} onLinked={onSaved} />}
    </article>; })}
    {history && !history.totalItems && <p className="ex-help">Chưa có lần chạy nào.</p>}{history && <Pager data={history} onChange={setPage} />}
  </section></div>;
}
