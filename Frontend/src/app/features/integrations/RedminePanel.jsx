import React, { useCallback, useEffect, useRef, useState } from 'react';
import { redmineApi } from '../../services/api/redmine';
import { Button } from '../work-items/components';
import { WorkField } from '../work-items/WorkItemForm';
import { statuses } from '../work-items/data';
import './redmine.css';

const labels = { QUEUED: 'Đang chờ gửi', RUNNING: 'Đang đối chiếu và gửi', RETRY_WAIT: 'Chờ thử lại', UNCERTAIN: 'Chưa rõ kết quả', DELIVERED: 'Đã đối chiếu khớp', FAILED: 'Gửi thất bại', CONFLICT: 'Có thay đổi cần đối chiếu', SUPERSEDED: 'Đã thay bằng yêu cầu mới', RETRY_REQUESTED: 'PM yêu cầu thử lại' };
const pending = status => ['QUEUED', 'RUNNING', 'RETRY_WAIT'].includes(status);
const date = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
const errors = {
  REMOTE_AUTH: 'Redmine từ chối quyền truy cập. Cần người vận hành kiểm tra tài khoản kết nối.',
  REMOTE_RATE_LIMIT: 'Redmine đang giới hạn số yêu cầu; hệ thống sẽ thử lại theo thời gian chờ.',
  REMOTE_REJECTED: 'Redmine từ chối dữ liệu. Cần kiểm tra quy tắc và cấu hình trường.',
  REMOTE_NOT_FOUND_AFTER_UNKNOWN_WRITE: 'Chưa tìm thấy ticket của lần gửi trước. Tiếp tục đối chiếu trước khi xử lý.',
  PUBLISH_PERMISSION_REVOKED: 'Quyền PM đã thay đổi hoặc dự án đã được lưu trữ.',
  REDMINE_CONFIGURATION_UNAVAILABLE: 'Cấu hình liên kết đã đổi hoặc chưa sẵn sàng.',
  REMOTE_DUPLICATE_MARKER: 'Có nhiều ticket cùng mã đối chiếu. Cần kiểm tra trên Redmine.',
  REMOTE_ALREADY_BOUND: 'Ticket này đã liên kết với một bug khác.',
  REMOTE_IDENTITY_MISMATCH: 'Thông tin dự án hoặc mã đối chiếu của ticket không khớp.',
};
export function RedminePanel(props) {
  const [open, setOpen] = useState(false);
  return <details className="wi-section rm-panel" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Công bố và đối chiếu Redmine</summary>
    {open && <RedmineContent key={`${props.projectId}:${props.bug.id}`} {...props} />}
  </details>;
}
function RedmineContent({ projectId, bug, writable }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(''), [reviewed, setReviewed] = useState(false), [stale, setStale] = useState(false);
  const generation = useRef(0), alive = useRef(true), requestKey = useRef(crypto.randomUUID());
  useEffect(() => { alive.current = true; return () => { alive.current = false; generation.current++; }; }, []);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await redmineApi.state(projectId, bug.id);
      if (!alive.current || current !== generation.current) return;
      setData(result); setError(''); setStale(false); setReviewed(false); requestKey.current = crypto.randomUUID();
    } catch (e) { if (alive.current && current === generation.current) setError(e.message); }
  }, [projectId, bug.id]);
  useEffect(() => { load(); }, [load, bug.version]);
  const latest = data?.deliveries[0], binding = data?.binding;
  useEffect(() => {
    if (!pending(latest?.status) || busy) return;
    const timer = setTimeout(load, 4000); return () => clearTimeout(timer);
  }, [latest, load, busy]);
  async function submit(kind) {
    if (busy) return;
    setBusy(true); setError(''); generation.current++;
    const body = kind === 'retry' ? { expectedVersion: latest.version, reason } : {
      expectedVersion: data.sourceVersion, reason, requestKey: requestKey.current,
      ...(kind === 'publish' && latest?.status === 'CONFLICT' ? { observedFingerprint: binding.observedFingerprint } : {}),
    };
    try {
      const result = await redmineApi[kind](projectId, kind === 'retry' ? latest.id : bug.id, body);
      if (!alive.current) return;
      setData(result); setReason(''); setReviewed(false); requestKey.current = crypto.randomUUID();
    } catch (e) { if (alive.current) { setError(e.message); setStale(e.status === 409); } }
    finally { if (alive.current) setBusy(false); }
  }
  const conflict = latest?.status === 'CONFLICT';
  const manage = data?.configured && data.canManage && writable;
  const publish = !latest || ['DELIVERED', 'FAILED', 'SUPERSEDED'].includes(latest.status) || (conflict && binding?.externalIssueId && binding?.observedFingerprint);
  const disabled = busy || stale || !reason.trim() || pending(latest?.status);
  return <div className="rm-content">
    <div className="wi-actions">{data && <strong className={`rm-status rm-${latest?.status || 'EMPTY'}`}>{latest ? labels[latest.status] : 'Chưa công bố'}</strong>}<Button disabled={busy} onClick={load}>Tải lại Redmine</Button></div>
    {error && <p role="alert" className="ex-error">{error}</p>}
    {stale && <p className="wi-note">Tải lại Redmine để đối chiếu bản hiện hành; lý do đã nhập được giữ lại.</p>}
    {!data && !error && <p>Đang tải liên kết Redmine…</p>}
    {data && <>
      {!data.configured && <p className="wi-note">Dự án chưa được liên kết với Redmine.</p>}
      {binding?.url && <p><a href={binding.url} target="_blank" rel="noreferrer">Redmine #{binding.externalIssueId}</a> · Đối chiếu gần nhất: {date(binding.observedAt)}</p>}
      {binding?.deliveredSourceVersion != null && binding.deliveredSourceVersion < data.sourceVersion && <p className="rm-warning">Bug có thay đổi trong TMS chưa được công bố lên Redmine.</p>}
      <p className="wi-note">TMS quản lý trạng thái bug và kết quả kiểm thử. Chỉ gửi các trường bug đã duyệt; bình luận và chứng cứ nội bộ được giữ trong dự án.</p>
      {latest?.errorCode && <p className="rm-warning">{errors[latest.errorCode] || (conflict ? 'Dữ liệu Redmine khác bản đã gửi. Xem thay đổi trước khi công bố lại.' : 'Lần gửi chưa được xác nhận. Xem kết quả và đối chiếu trước khi tiếp tục.')}</p>}
      {conflict && binding?.observedPayload && <Comparison binding={binding} mapping={data.mapping} />}
      {manage && !pending(latest?.status) && <div className="wi-form">
        <WorkField label="Lý do công bố hoặc đối chiếu"><textarea maxLength={1000} value={reason} disabled={busy} onChange={e => { setReason(e.target.value); requestKey.current = crypto.randomUUID(); }} /></WorkField>
        {conflict && publish && <label className="rm-review"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> Đã xem thay đổi trên Redmine</label>}
        <div className="wi-actions">
          {publish && <Button primary disabled={disabled || (conflict && !reviewed)} onClick={() => submit('publish')}>{conflict ? 'Công bố bản TMS đã duyệt' : 'Công bố lên Redmine'}</Button>}
          {latest?.status === 'FAILED' && <Button disabled={disabled} onClick={() => submit('retry')}>Thử lại lần gửi</Button>}
          {binding && <Button disabled={disabled} onClick={() => submit('reconcile')}>Đối chiếu Redmine</Button>}
        </div>
      </div>}
      {!!data.attempts.length && <details className="rm-history"><summary>Lịch sử gửi ({data.attempts.length} gần nhất)</summary>{data.attempts.map(a => <p key={a.id}>{date(a.occurredAt)} · Lần {a.attemptNo} · {labels[a.outcome] || a.outcome}{a.actor && ` · ${a.actor}`}{a.reason && <><br />{a.reason}</>}</p>)}</details>}
    </>}
  </div>;
}
function Comparison({ binding, mapping }) {
  const name = id => {
    const code = Object.keys(mapping?.statuses || {}).find(key => mapping.statuses[key] === id);
    return statuses.find(status => status.id === code)?.label || `Trạng thái #${id}`;
  };
  const value = (snapshot, field) => {
    if (!snapshot) return 'Chưa có bản đã công bố';
    if (field === 'statusId') return name(snapshot[field]);
    if (field === 'privateIssue') return snapshot[field] ? 'Riêng tư' : 'Công khai';
    if (field === 'priorityId') {
      const code = Object.keys(mapping?.priorities || {}).find(key => mapping.priorities[key] === snapshot[field]);
      return ({HIGH:'Cao', MEDIUM:'Trung bình', LOW:'Thấp'})[code] || `Mức #${snapshot[field]}`;
    }
    return snapshot[field];
  };
  return <div className="rm-compare"><table><caption>Bản đã công bố và bản quan sát trên Redmine</caption><thead><tr><th>Trường</th><th>Đã công bố</th><th>Redmine hiện tại</th></tr></thead><tbody>
    {[['subject', 'Tiêu đề'], ['statusId', 'Trạng thái'], ['priorityId', 'Độ ưu tiên'], ['privateIssue', 'Hiển thị'], ['description', 'Nội dung']].map(([field, label]) => <tr key={field}><th>{label}</th>{[binding.deliveredPayload, binding.observedPayload].map((snapshot, i) => <td key={i}>{value(snapshot, field)}</td>)}</tr>)}
  </tbody></table></div>;
}
