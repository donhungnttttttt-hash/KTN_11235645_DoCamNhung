import React, { useEffect, useRef, useState } from 'react';
import { executionApi } from '../../services/api/execution';
import { ErrorNotice, Field, Select, formatTime } from './components';

export function AssignmentDialog({ projectId, run, members, timeZone, onClose, onSaved }) {
  const [currentRun, setCurrentRun] = useState(run);
  const [assigneeId, setAssigneeId] = useState(String(run.assigneeMembershipId));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setHistoryLoading(true);
    setHistoryError('');
    executionApi.assignments(projectId, run.id)
      .then(items => { if (current) setHistory(items); })
      .catch(err => { if (current) setHistoryError(err.message); })
      .finally(() => { if (current) setHistoryLoading(false); });
    return () => { current = false; };
  }, [projectId, run.id, reload]);

  async function refreshVersion() {
    setBusy(true);
    setError('');
    try {
      const latest = await executionApi.run(projectId, run.id);
      if (live.current) {
        setCurrentRun(latest);
        setConflict(false);
        setReload(value => value + 1);
      }
    } catch (err) {
      if (live.current) setError(err.message);
    } finally {
      if (live.current) setBusy(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (busy || conflict) return;
    setBusy(true);
    setError('');
    try {
      await executionApi.assign(projectId, run.id, {
        assigneeMembershipId: Number(assigneeId), reason, expectedVersion: currentRun.version,
      });
      if (live.current) onSaved();
    } catch (err) {
      if (live.current) {
        setError(err.message);
        setConflict(err.status === 409);
      }
    } finally {
      if (live.current) setBusy(false);
    }
  }

  return <div className="ex-modal"><section className="ex-dialog" role="dialog" aria-modal="true" aria-label="Phân công lượt kiểm thử">
    <div className="ex-heading"><h3>Phân công · {run.caseNo}</h3><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></div>
    <ErrorNotice error={error} />
    {conflict && <button className="cat-btn" disabled={busy} onClick={refreshVersion}>Tải bản hiện hành, giữ bản nháp</button>}
    <p className="my-2">Người đang được giao: {currentRun.assigneeName}. Kiểm tra lại trước khi lưu thay đổi.</p>
    <form onSubmit={save} className="ex-fields">
      <Select label="Người thực hiện" items={members.filter(member => member.active && ['PM', 'TESTER'].includes(member.projectRole))} value={assigneeId} describe={member => member.displayName} onChange={setAssigneeId} />
      <Field label="Lý do phân công"><input className="cat-input" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></Field>
      <button className="cat-btn cat-btn-mint" disabled={busy || conflict}>Lưu phân công</button>
    </form>
    <h4 className="font-semibold mt-4">Lịch sử phân công</h4>
    <ErrorNotice error={historyError} retry={() => setReload(value => value + 1)} />
    {historyLoading && <p role="status">Đang tải lịch sử…</p>}
    {!historyLoading && !historyError && !history.length && <p>Chưa có lịch sử phân công.</p>}
    {history.map(item => <p key={item.id} className="ex-history">{item.assigneeName} · {item.reason}<small>{formatTime(item.assignedAt, timeZone)}</small></p>)}
  </section></div>;
}
