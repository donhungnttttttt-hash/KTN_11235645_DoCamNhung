import React, { useRef, useState } from 'react';
import { workItemsApi } from '../../services/api/workItems';
import { Button, Modal, StatusBadge } from './components';
import { WorkField, WorkSelect, WorkError } from './WorkItemForm';

export function TransitionDialog({ projectId, items, status, catalogs, onClose, onSaved }) {
  const [current, setCurrent] = useState(items), [reason, setReason] = useState(''), [build, setBuild] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false), [refreshed, setRefreshed] = useState(false);
  const live = useRef(true);
  React.useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function reload() {
    setBusy(true);
    try { const updated = await Promise.all(current.map(item => workItemsApi.get(projectId, item.serverId))); if (!live.current) return;
      setCurrent(updated.map(item => ({ ...item, serverId: item.id, id: item.key, typeCode: item.type })));
      setConflict(false); setRefreshed(true); setError(''); }
    catch (e) { if (live.current) setError(e.message); } finally { if (live.current) setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = { status, reason, fixedBuildId: build ? Number(build) : null };
    try {
      if (current.length === 1) await workItemsApi.transition(projectId, current[0].serverId, { ...body, expectedVersion: current[0].version });
      else await workItemsApi.batch(projectId, { ...body, items: current.map(item => ({ id: item.serverId, expectedVersion: item.version })) });
      if (live.current) onSaved();
    } catch (e) { if (live.current) { setError(e.message); setConflict(e.status === 409); } }
    finally { if (live.current) setBusy(false); }
  }
  return <Modal title={`Chuyển trạng thái · ${current.length} công việc`} onClose={busy ? () => {} : onClose}><form className="wi-form" onSubmit={submit}>
    <p>{current.map(item => item.id).join(', ')}</p><WorkError error={error} />
    {conflict && <Button disabled={busy} onClick={reload}>Tải bản hiện hành, giữ lý do</Button>}
    {refreshed && <p className="wi-note" role="status">Đã tải lại. Đối chiếu trạng thái rồi xác nhận lưu lại.</p>}
    <ul>{current.map(item => <li key={item.serverId}>{item.id}: <StatusBadge id={item.status}/> → <StatusBadge id={status}/></li>)}</ul>
    <WorkField label="Lý do chuyển trạng thái"><textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></WorkField>
    {status === 'resolved' && current.some(item => item.typeCode === 'BUG') && <><WorkSelect label="Build đã sửa" required items={catalogs.builds} value={build} onChange={setBuild} describe={b => `${b.platform} ${b.versionLabel} (${b.buildNumber || '—'})`} /><p className="wi-note">Đã xử lý vẫn chờ Tester kiểm thử lại.</p></>}
    <div className="wi-actions"><Button disabled={busy} onClick={onClose}>Hủy</Button><Button primary type="submit" disabled={busy || conflict}>{busy ? 'Đang lưu…' : 'Xác nhận chuyển'}</Button></div>
  </form></Modal>;
}
