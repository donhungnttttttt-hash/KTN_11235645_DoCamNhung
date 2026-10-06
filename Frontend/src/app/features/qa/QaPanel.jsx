import React, { useEffect, useId, useRef, useState } from 'react';
import { qaApi } from '../../services/api/qa';
import { Button } from '../work-items/components';
import { positiveId, QaContext, QaErrorSummary, QaField, qaFieldErrors } from './QaForm';

const actions = {
  assign: { cap: 'canAssign', label: 'Phân công Dev', send: 'Gửi phân công', reason: true },
  start: { cap: 'canStart', label: 'Bắt đầu xác minh', send: 'Gửi bắt đầu', reason: true },
  requestInfo: { cap: 'canRequestInfo', label: 'Yêu cầu bổ sung', send: 'Gửi yêu cầu bổ sung', reason: true },
  provideInfo: { cap: 'canProvideInfo', label: 'Bổ sung thông tin', send: 'Gửi bổ sung', field: 'Nội dung bổ sung' },
  answer: { cap: 'canAnswer', label: 'Trả lời QA', send: 'Gửi câu trả lời', field: 'Nội dung trả lời' },
  confirm: { cap: 'canConfirm', label: 'Xác nhận câu trả lời', send: 'Gửi xác nhận', field: 'Nội dung xác nhận' },
  close: { cap: 'canClose', label: 'PM kết thúc', send: 'Gửi kết thúc', reason: true },
  closeException: { cap: 'canCloseException', label: 'Kết thúc ngoại lệ', send: 'Gửi kết thúc ngoại lệ', reason: true },
  reopen: { cap: 'canReopen', label: 'Mở lại QA', send: 'Gửi mở lại', reason: true },
};
const sameTarget = (pin, item) => !!item && pin.projectId === item.projectId && pin.id === item.id && pin.generation === item.generation;
function pinned(detail) {
  return { projectId: detail.item.projectId, id: detail.item.id, version: detail.item.version, generation: detail.item.generation,
    answerId: detail.currentAnswer?.id, answerVersion: detail.currentAnswer?.answerVersion };
}
function sameVersion(pin, detail, action) {
  return sameTarget(pin, detail?.item) && pin.version === detail.item.version && (action !== 'confirm' ||
    pin.answerId === detail.currentAnswer?.id && pin.answerVersion === detail.currentAnswer?.answerVersion && detail.currentAnswer?.generation === pin.generation);
}
function Reference({ value }) {
  if (!value) return null;
  let safe = false;
  try { const url = new URL(value); safe = ['http:', 'https:'].includes(url.protocol); } catch { /* Plain text references are supported. */ }
  return <p>Tham chiếu: {safe ? <a href={value} target="_blank" rel="noopener noreferrer">{value}</a> : <span>{value}</span>}</p>;
}
function AnswerView({ answer }) {
  return <article className="wi-section"><p>#{answer.id} · Phiên bản {answer.answerVersion} · Vòng {answer.generation}</p><p>{answer.authorName} · {answer.answeredAt}</p><p style={{ whiteSpace: 'pre-wrap' }}>{answer.body}</p><Reference value={answer.basisReference} /></article>;
}
function ConfirmationView({ confirmation }) {
  return <article className="wi-section"><p>#{confirmation.id} · Câu trả lời #{confirmation.answerId}, phiên bản {confirmation.answerVersion} · Vòng {confirmation.generation}</p><p>{confirmation.confirmerName} · {confirmation.confirmedAt}</p><p style={{ whiteSpace: 'pre-wrap' }}>{confirmation.body}</p></article>;
}
function QaHistory({ projectId, id, kind, revision }) {
  const [page, setPage] = useState(0), [retry, setRetry] = useState(0);
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const scope = `${projectId}/${id}/${kind}/${page}/${revision}`;
  useEffect(() => { setPage(0); }, [projectId, id]);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setState({ data: null, error: '', loading: true, scope });
    qaApi[kind](projectId, id, { page, size: 20 }, { signal: controller.signal }).then(data => {
      if (active) setState({ data, error: '', loading: false, scope });
    }).catch(e => { if (active && e.name !== 'AbortError') setState({ data: null, error: e.message, loading: false, scope }); });
    return () => { active = false; controller.abort(); };
  }, [projectId, id, kind, page, revision, retry]);
  const current = state.scope === scope ? state : { loading: true };
  const title = kind === 'answers' ? 'Lịch sử câu trả lời' : 'Lịch sử xác nhận';
  return <section className="wi-section" aria-label={title}><h3>{title}</h3>
    {current.loading && <p role="status">Đang tải lịch sử…</p>}
    {current.error && <div role="alert" className="wi-error">{current.error}<Button onClick={() => setRetry(v => v + 1)}>Tải lại {title.toLowerCase()}</Button></div>}
    {current.data && <>{!current.data.items.length && <p>Chưa có bản ghi.</p>}{current.data.items.map(row => kind === 'answers' ? <AnswerView key={row.id} answer={row} /> : <ConfirmationView key={row.id} confirmation={row} />)}
      <div className="wi-actions"><Button disabled={!page || current.loading} onClick={() => setPage(p => p - 1)}>{title} trước</Button><span>Trang {current.data.page + 1}/{Math.max(1, current.data.totalPages)} · {current.data.totalItems} bản ghi</span><Button disabled={page + 1 >= current.data.totalPages || current.loading} onClick={() => setPage(p => p + 1)}>{title} tiếp</Button></div>
    </>}
  </section>;
}

// Optional onReadState({ projectId, id, readId, loading, error, detail }) reports only
// current detail GETs. Loading/error carry detail:null; histories never notify.
// onChanged remains command/replay + successful fresh GET only. Callback changes
// are ref-backed and do not restart reads or reset the mounted draft.
export function QaPanel({ projectId, id, catalogs = {}, onChanged, onReadState }) {
  const prefix = `${useId()}-command-`;
  const scope = `${projectId}/${id}`, currentScope = useRef(scope); currentScope.current = scope;
  const [state, setState] = useState({ scope, detail: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0), [draft, setDraft] = useState(null);
  const [error, setError] = useState(''), [fields, setFields] = useState({}), [conflict, setConflict] = useState(false), [busy, setBusy] = useState(false);
  const readSequence = useRef(0), readController = useRef(null), live = useRef(false), submitting = useRef(false);
  const notify = useRef(onChanged); notify.current = onChanged;
  const notifyRead = useRef(onReadState); notifyRead.current = onReadState;
  useEffect(() => { live.current = true; return () => { live.current = false; readController.current?.abort(); }; }, []);
  async function refresh(changed = false) {
    if (!live.current || currentScope.current !== scope) return;
    const request = ++readSequence.current, targetScope = scope;
    const reportRead = (loading, error = '', detail = null) => {
      if (live.current && currentScope.current === targetScope && request === readSequence.current)
        notifyRead.current?.({ projectId, id, readId: request, loading, error, detail });
    };
    readController.current?.abort(); const controller = new AbortController(); readController.current = controller;
    setState(old => ({ ...old, scope: targetScope, loading: true, error: '', detail: old.scope === targetScope ? old.detail : null }));
    reportRead(true);
    try {
      const detail = await qaApi.get(projectId, id, { signal: controller.signal });
      if (!live.current || currentScope.current !== targetScope || request !== readSequence.current) return;
      // Guard against a malformed or wrong-resource response as well as stale completion.
      if (detail?.item?.projectId !== projectId || detail?.item?.id !== id || detail.item.type !== 'QA') throw new Error('Chi tiết QA không khớp ngữ cảnh hiện tại.');
      setState({ scope: targetScope, detail, readId: request, loading: false, error: '' }); setRevision(v => v + 1);
      reportRead(false, '', detail);
      if (changed) { setDraft(null); setConflict(false); notify.current?.(detail); }
      return detail;
    } catch (e) {
      if (live.current && currentScope.current === targetScope && request === readSequence.current && e.name !== 'AbortError') {
        setState(old => ({ ...old, scope: targetScope, loading: false, error: e.message }));
        reportRead(false, e.message);
      }
    }
  }
  useEffect(() => { refresh(); return () => { readSequence.current++; readController.current?.abort(); }; }, [projectId, id]); // Scope owns this read lifecycle.
  const current = state.scope === scope ? state : { loading: true, detail: null, error: '' };
  const detail = current.detail, item = detail?.item;
  const usable = !!item && !current.loading && !current.error && !busy;
  const caps = item?.capabilities || {};
  const active = draft && actions[draft.action];
  const targetMatches = draft && sameTarget(draft.pin, item);
  const versionMatches = draft && sameVersion(draft.pin, detail, draft.action);
  const commandCap = !!draft && caps[active.cap] === true && (item?.status !== 'closed' || draft.action === 'reopen');
  const allowed = !!draft && usable && commandCap && targetMatches && versionMatches && !conflict && !draft.accepted;
  const canAcknowledge = draft && usable && targetMatches && commandCap && !draft.accepted && (!versionMatches || conflict) && (!conflict || current.readId > conflict.readId) && (draft.action !== 'confirm' || !!detail.currentAnswer && detail.currentAnswer.generation === item.generation);
  function begin(action) {
    if (!usable || draft || caps[actions[action].cap] !== true) return;
    setDraft({ action, pin: pinned(detail), body: '', reason: '', basisReference: '', assigneeMembershipId: '', requestKey: crypto.randomUUID(), accepted: false });
    setConflict(false); setError(''); setFields({});
  }
  function change(key, value) { setDraft(old => ({ ...old, [key]: value, requestKey: crypto.randomUUID() })); }
  function acknowledge() {
    if (!canAcknowledge) return;
    setDraft(old => ({ ...old, pin: pinned(detail), requestKey: crypto.randomUUID() })); setConflict(false); setError(''); setFields({});
  }
  async function submit(event) {
    event.preventDefault(); if (!allowed || submitting.current) return;
    const validation = {};
    const text = active.reason ? draft.reason.trim() : draft.body.trim();
    const field = active.reason ? 'reason' : 'body';
    if (!text || text.length > (active.reason ? 1000 : 20000)) validation[field] = active.reason ? 'Nhập lý do cụ thể (tối đa 1000 ký tự).' : 'Nhập nội dung (tối đa 20000 ký tự).';
    if (draft.action === 'assign' && !eligible.some(m => m.membershipId === positiveId(draft.assigneeMembershipId))) validation.assigneeMembershipId = 'Chọn Dev đủ điều kiện hiện tại.';
    if (draft.basisReference.length > 1000) validation.basisReference = 'Tham chiếu tối đa 1000 ký tự.';
    setFields(validation); if (Object.keys(validation).length) { setError('Kiểm tra lệnh QA.'); return; }
    const body = { [field]: text, expectedVersion: draft.pin.version, requestKey: draft.requestKey };
    if (draft.action === 'assign') body.assigneeMembershipId = positiveId(draft.assigneeMembershipId);
    if (draft.action === 'answer') body.basisReference = draft.basisReference.trim();
    if (draft.action === 'confirm') { body.answerId = draft.pin.answerId; body.answerVersion = draft.pin.answerVersion; }
    if (draft.action === 'close' || draft.action === 'closeException') body.exception = draft.action === 'closeException';
    const pending = draft, targetScope = `${pending.pin.projectId}/${pending.pin.id}`;
    submitting.current = true; setBusy(true); setError('');
    try {
      await qaApi[pending.action === 'closeException' ? 'close' : pending.action](pending.pin.projectId, pending.pin.id, body);
      if (live.current && currentScope.current === targetScope) {
        setDraft(old => old === pending ? { ...old, accepted: true } : old);
        await refresh(true);
      }
    } catch (e) {
      if (live.current && currentScope.current === targetScope) { setError(e.message); setFields(qaFieldErrors(e)); if (e.status === 409) setConflict({ readId: readSequence.current }); }
    } finally { submitting.current = false; if (live.current) setBusy(false); }
  }
  const eligible = (catalogs.members || []).filter(m => m.active === true && m.projectRole === 'DEV' && m.systemRole === 'DEV' && m.enabled !== false && positiveId(m.membershipId) != null && positiveId(m.membershipId) !== undefined);
  return <section className="wi-section" aria-label="QA chi tiết">
    <div className="wi-actions"><h3>QA</h3><Button disabled={busy || current.loading} onClick={() => refresh(!!draft?.accepted && targetMatches)}>Tải lại QA</Button></div>
    {current.loading && <p role="status">Đang tải QA…</p>}
    {current.error && <div className="wi-error" role="alert">{current.error}</div>}
    {item && <>
      <h3>{item.key} · {item.title}</h3><p>{item.statusLabel || catalogs.statusesByType?.QA?.find(s => s.id === item.status)?.label || item.status}</p><p>Vòng QA: {item.generation} · Phiên bản: {item.version}</p>
      <p>Người tạo: {item.creatorName || item.createdBy} · Dev: {item.assigneeName || 'Chưa phân công'}</p>
      <h4>Câu hỏi</h4><p style={{ whiteSpace: 'pre-wrap' }}>{item.question}</p><QaContext context={{ ...item, contextSnapshot: detail.contextSnapshot }} />
      <h4>Câu trả lời hiện tại</h4>{detail.currentAnswer ? <AnswerView answer={detail.currentAnswer} /> : <p>Chưa có câu trả lời trong vòng hiện tại.</p>}
      <h4>Xác nhận hiện tại</h4>{detail.currentConfirmation ? <ConfirmationView confirmation={detail.currentConfirmation} /> : <p>Chưa có xác nhận trong vòng hiện tại.</p>}
      {item.status === 'closed' && <p>QA đã kết thúc; nội dung chỉ đọc.</p>}
      <div className="wi-actions">{Object.entries(actions).filter(([key, a]) => caps[a.cap] === true && (item.status !== 'closed' || key === 'reopen')).map(([key, a]) => <Button key={key} disabled={!usable || !!draft} onClick={() => begin(key)}>{a.label}</Button>)}</div>
    </>}
    {draft && <form className="wi-form" aria-label={`Bản nháp ${active.label}`} onSubmit={submit} noValidate>
      <h4>{active.label}</h4><p>Bản nháp ghim dự án {draft.pin.projectId} · QA #{draft.pin.id} · Vòng {draft.pin.generation} · Phiên bản {draft.pin.version}{draft.action === 'confirm' && ` · Câu trả lời #${draft.pin.answerId}, phiên bản ${draft.pin.answerVersion}`}</p>
      <QaErrorSummary error={error} fields={fields} prefix={prefix} />
      {(!targetMatches || !versionMatches || conflict) && <p role="status">Dữ liệu đã thay đổi. Bản nháp cũ được giữ; tải lại và đối chiếu trước khi gửi.</p>}
      {draft.accepted && <p role="status">Lệnh đã được chấp nhận. Tải lại QA để lấy dữ liệu hiện tại; không gửi lại lệnh.</p>}
      {draft.action === 'assign' && <><QaField label="Dev phụ trách" name="assigneeMembershipId" prefix={prefix} error={fields.assigneeMembershipId}><select value={draft.assigneeMembershipId} onChange={e => change('assigneeMembershipId', e.target.value)} disabled={busy || draft.accepted}><option value="">Chưa chọn</option>{eligible.map(m => <option key={m.membershipId} value={m.membershipId}>{m.displayName}</option>)}</select></QaField><p>Máy chủ kiểm tra lại tài khoản đang bật và quyền Dev tại thời điểm phân công.</p></>}
      <QaField label={active.reason ? 'Lý do' : active.field} name={active.reason ? 'reason' : 'body'} prefix={prefix} error={fields[active.reason ? 'reason' : 'body']}><textarea rows={4} maxLength={active.reason ? 1000 : 20000} value={active.reason ? draft.reason : draft.body} onChange={e => change(active.reason ? 'reason' : 'body', e.target.value)} disabled={busy || draft.accepted} /></QaField>
      {draft.action === 'answer' && <QaField label="Tham chiếu căn cứ" name="basisReference" prefix={prefix} error={fields.basisReference}><input maxLength={1000} value={draft.basisReference} onChange={e => change('basisReference', e.target.value)} disabled={busy || draft.accepted} /></QaField>}
      {draft.action === 'closeException' && <p>PM kết thúc ngoại lệ với lý do riêng. Thao tác này không tạo xác nhận Tester.</p>}
      <div className="wi-actions"><Button type="submit" primary disabled={!allowed}>{busy ? 'Đang gửi…' : active.send}</Button>{canAcknowledge && <Button onClick={acknowledge}>Đã đối chiếu dữ liệu hiện tại</Button>}<Button disabled={busy} onClick={() => { setDraft(null); setError(''); setFields({}); setConflict(false); }}>Bỏ bản nháp</Button></div>
    </form>}
    {item && <><QaHistory projectId={projectId} id={id} kind="answers" revision={revision} /><QaHistory projectId={projectId} id={id} kind="confirmations" revision={revision} /></>}
  </section>;
}
