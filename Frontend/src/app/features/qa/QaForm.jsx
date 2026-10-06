import React, { useEffect, useId, useRef, useState } from 'react';
import { qaApi } from '../../services/api/qa';
import { Button } from '../work-items/components';

const sourceKeys = ['documentId', 'groupId', 'runItemId', 'revisionId'];
const initialForm = { title: '', question: '', priority: 'MEDIUM', categoryId: '', milestoneId: '' };
const sourcePin = context => Object.fromEntries(sourceKeys.map(key => [key, context[key] ?? null]));
const contextKey = (p, context) => JSON.stringify([p, sourcePin(context)]);
export function positiveId(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) return undefined;
  return Number(value);
}
export function qaFieldErrors(error) {
  const errors = error?.fieldErrors;
  if (Array.isArray(errors)) return Object.fromEntries(errors.map(e => [e.field, e.message]));
  return errors && typeof errors === 'object' ? errors : {};
}
export function QaErrorSummary({ error, fields = {}, prefix = '', children }) {
  const ref = useRef(null);
  const [editable, setEditable] = useState([]);
  const target = key => Array.from(ref.current?.closest('form')?.querySelectorAll('input,textarea,select') || [])
    .find(field => field.id === `${prefix}${key}` && !field.disabled && !field.readOnly);
  useEffect(() => {
    if (error) { ref.current?.focus(); setEditable(Object.keys(fields).filter(key => target(key))); }
  }, [error, fields, prefix]);
  if (!error) return null;
  return <div className="wi-error" role="alert" tabIndex={-1} ref={ref}>
    <p>{error}</p>{Object.entries(fields).length > 0 && <ul>{Object.entries(fields).map(([key, message]) => <li key={key}>{editable.includes(key) ? <button type="button" onClick={() => target(key)?.focus()}>{String(message)}</button> : String(message)}</li>)}</ul>}{children}
  </div>;
}
export function QaField({ label, name, prefix = '', error, children }) {
  const id = `${prefix}${name}`;
  return <div className="wi-field"><label htmlFor={id}>{label}</label>{React.cloneElement(children, { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined })}
    {error && <span id={`${id}-error`} className="wi-error">{String(error)}</span>}
  </div>;
}
export function QaContext({ context = {} }) {
  const snapshot = context.contextSnapshot || context;
  const ids = sourceKeys.filter(key => context[key] != null || snapshot[key] != null);
  return <section className="wi-section" aria-label="Ngữ cảnh QA">
    <h3>Ngữ cảnh nguồn</h3>
    {snapshot.document?.fileName && <p>{snapshot.document.fileName}</p>}
    {snapshot.revision?.caseNo && <p>{snapshot.revision.caseNo}</p>}
    {snapshot.revision?.title && <p>{snapshot.revision.title}</p>}
    {['preconditions', 'steps', 'expected'].map(key => snapshot.revision?.[key] && <p style={{ whiteSpace: 'pre-wrap' }} key={key}>{snapshot.revision[key]}</p>)}
    {ids.map(key => <p key={key}>{key}: {String(context[key] ?? snapshot[key])}</p>)}
    {!ids.length && !snapshot.document && !snapshot.revision && <p>QA độc lập, chưa có nguồn được chọn.</p>}
  </section>;
}

export function QaForm({ projectId, catalogs = {}, canCreateQa = false, context = {}, onCreated }) {
  const prefix = `${useId()}-qa-`;
  const [form, setForm] = useState(initialForm);
  const [pin, setPin] = useState(() => ({ projectId, context: { ...context }, key: contextKey(projectId, context) }));
  const [error, setError] = useState(''), [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false), [accepted, setAccepted] = useState(null), [conflict, setConflict] = useState(false);
  const command = useRef(null), submitting = useRef(false), live = useRef(false), latest = useRef(null);
  latest.current = contextKey(projectId, context);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const current = pin.key === latest.current;
  // An accepted POST is recovered through its pinned GET, whose read authority is server-enforced.
  const allowed = current && (!!accepted || canCreateQa === true) && positiveId(projectId) != null && positiveId(projectId) !== undefined;
  const change = (key, value) => { setForm(old => ({ ...old, [key]: value })); command.current = null; };
  function newDraft() {
    if (submitting.current) return;
    setForm(initialForm); setPin({ projectId, context: { ...context }, key: contextKey(projectId, context) });
    setError(''); setFields({}); setConflict(false); setAccepted(null); command.current = null;
  }
  async function submit(event) {
    event.preventDefault(); if (submitting.current || !allowed || (conflict && !accepted)) return;
    const validation = {}, body = { ...form, title: form.title.trim(), question: form.question.trim() };
    if (!body.title || body.title.length > 300) validation.title = 'Nhập tiêu đề từ 1 đến 300 ký tự.';
    if (!body.question || body.question.length > 20000) validation.question = 'Nhập câu hỏi từ 1 đến 20000 ký tự.';
    for (const key of ['categoryId', 'milestoneId', ...sourceKeys]) {
      const raw = sourceKeys.includes(key) ? pin.context[key] : form[key];
      body[key] = positiveId(raw);
      if (body[key] === undefined) validation[key] = `${key}: ${String(raw)} không phải ID nguyên dương hợp lệ.`;
    }
    setFields(validation);
    if (Object.keys(validation).length) { setError('Kiểm tra thông tin QA.'); return; }
    setError(''); submitting.current = true; setBusy(true);
    // Exact retry retains the original project, source DTO and key. Changes get a new key.
    if (!command.current) command.current = { projectId: pin.projectId, target: pin.key, body: { ...body, requestKey: crypto.randomUUID() } };
    const pending = command.current;
    try {
      const saved = accepted || await qaApi.create(pending.projectId, pending.body);
      if (!live.current || latest.current !== pending.target) return;
      setAccepted(saved);
      const fresh = await qaApi.get(pending.projectId, saved.item.id);
      if (live.current && latest.current === pending.target) { setAccepted(fresh); onCreated?.(fresh); }
    } catch (e) {
      if (live.current && latest.current === pending.target) { setError(e.message); setFields(qaFieldErrors(e)); if (e.status === 409) setConflict(true); }
    } finally { submitting.current = false; if (live.current) setBusy(false); }
  }
  return <form className="wi-form" noValidate onSubmit={submit} aria-label="Tạo QA">
    <QaErrorSummary error={error} fields={fields} prefix={prefix} />
    {!current && <p role="status">Bản nháp vẫn thuộc dự án/ngữ cảnh nguồn ban đầu. Tạo bản nháp mới để đổi nguồn.</p>}
    {canCreateQa !== true && <p>Hiện không có quyền tạo QA.</p>}
    {accepted && <p role="status">QA đã được gửi. Tải lại chi tiết trước khi tiếp tục.</p>}
    {conflict && <p role="status">Có xung đột. Giữ bản nháp để đối chiếu, tạo bản nháp mới trước khi gửi lệnh khác.</p>}
    <QaContext context={pin.context} />
    {sourceKeys.map(key => fields[key] && <p id={`${prefix}${key}`} key={key} className="wi-error">{fields[key]}</p>)}
    <QaField label="Tiêu đề QA" name="title" prefix={prefix} error={fields.title}><input value={form.title} maxLength={300} onChange={e => change('title', e.target.value)} disabled={busy || !!accepted} /></QaField>
    <QaField label="Câu hỏi" name="question" prefix={prefix} error={fields.question}><textarea rows={5} value={form.question} maxLength={20000} onChange={e => change('question', e.target.value)} disabled={busy || !!accepted} /></QaField>
    <div className="wi-fields three">
      <QaField label="Độ ưu tiên" name="priority" prefix={prefix}><select value={form.priority} onChange={e => change('priority', e.target.value)} disabled={busy || !!accepted}><option value="HIGH">Cao</option><option value="MEDIUM">Trung bình</option><option value="LOW">Thấp</option></select></QaField>
      {['categoryId', 'milestoneId'].map((key, index) => <QaField key={key} label={index ? 'Mốc tiến độ' : 'Phân loại'} name={key} prefix={prefix} error={fields[key]}><select value={form[key]} onChange={e => change(key, e.target.value)} disabled={busy || !!accepted}><option value="">Chưa chọn</option>{(catalogs[index ? 'milestones' : 'categories'] || []).filter(c => c.active !== false && !c.archived).map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></QaField>)}
    </div>
    <div className="wi-actions"><Button primary type="submit" disabled={busy || !allowed || (conflict && !accepted)}>{busy ? 'Đang gửi…' : accepted ? 'Tải lại QA đã tạo' : 'Tạo QA'}</Button><Button disabled={busy} onClick={newDraft}>Tạo bản nháp mới</Button></div>
  </form>;
}
