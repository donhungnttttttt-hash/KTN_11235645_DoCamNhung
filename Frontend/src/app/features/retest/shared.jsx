import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../work-items/components';
export const requestLabels = { OPEN: 'Chờ kiểm thử', SUBMITTED: 'Đã ghi kết quả', CANCELLED: 'Đã hủy' };
export const verdictLabels = { PASS: 'Đạt', FAIL: 'Không đạt' };
export const scopeLabel = scope => scope === 'FULL_CASE' ? 'Chạy lại toàn bộ case' : 'Chỉ xác minh bug';
export function useRetestAction() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function perform(action, saved) {
    setBusy(true); setError('');
    try { const result = await action(); if (live.current) await saved?.(result); }
    catch (e) { if (live.current) { setError(e.message); setConflict(e.status === 409); } }
    finally { if (live.current) setBusy(false); }
  }
  async function reconcile(load) { await perform(load, () => setConflict(false)); }
  return { busy, error, conflict, perform, reconcile };
}
export function RetestError({ action, reload }) {
  return <>{action.error && <p className="ex-error" role="alert">{action.error}</p>}{action.conflict && <Button disabled={action.busy} onClick={() => action.reconcile(reload)}>Tải bản hiện hành, giữ bản nháp</Button>}</>;
}
export function CoverageTable({ items, selected, onSelect }) {
  return <div className="ex-table-wrap"><table className="ex-table rt-table"><thead><tr>{onSelect && <th>Chọn</th>}<th>Test case</th><th>Cấu hình</th><th>Người thực hiện</th><th>Xác minh bug</th></tr></thead><tbody>
    {items.map(item => <tr key={item.id}>{onSelect && <td><input type="checkbox" aria-label={`Chọn ${item.caseNo} ${item.environmentName} ${item.deviceName}`} checked={selected.includes(item.id)} onChange={() => onSelect(item.id)} /></td>}<td><a href={`#/tests/cycles/${item.cycleId}`}>{item.caseNo}</a><small>{item.titleVi}</small></td><td>{item.environmentName}<small>{item.deviceName}</small></td><td>{item.assigneeName}</td><td><span className={`rt-verdict ${item.verdict || ''}`}>{verdictLabels[item.verdict] || 'Chưa xác minh'}</span></td></tr>)}
  </tbody></table></div>;
}
