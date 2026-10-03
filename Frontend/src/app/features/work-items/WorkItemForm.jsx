import React, { useEffect, useRef, useState } from 'react';
import { workItemsApi } from '../../services/api/workItems';
import { testCasesApi } from '../../services/api/testCases';
import { Button } from './components';
import { typeLabels } from './ProjectData';

export function WorkField({ label, children }) { return <label className="wi-field"><span>{label}</span>{children}</label>; }
export function WorkSelect({ label, items = [], value, onChange, required = false, disabled = false, describe = item => item.name, id = item => item.id }) {
  return <WorkField label={label}><select value={value ?? ''} onChange={event => onChange(event.target.value)} required={required} disabled={disabled}>
    <option value="">Chưa chọn</option>{items.map(item => <option key={id(item)} value={id(item)}>{describe(item)}</option>)}
  </select></WorkField>;
}
export function WorkError({ error, retry }) { return error ? <div className="wi-error" role="alert">{error}{retry && <Button onClick={retry}>Thử lại</Button>}</div> : null; }
const empty = { type: 'BUG', title: '', description: '', steps: '', expectedResult: '', actualResult: '', buildId: '', environmentId: '', deviceId: '', revisionId: '', standaloneReason: '' };
export function NewWorkItemForm({ projectId, catalogs, canTriage = false, titlePrefix = '', attemptId, onCreated }) {
  const [form, setForm] = useState(empty), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [source, setSource] = useState(null), [sourceError, setSourceError] = useState(''), [retry, setRetry] = useState(0);
  const [cases, setCases] = useState(null), [caseError, setCaseError] = useState(''), [keyword, setKeyword] = useState(''), [page, setPage] = useState(0);
  const requestKey = useRef(crypto.randomUUID()), live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!attemptId) return;
    let current = true; setSourceError(''); setSource(null);
    workItemsApi.source(projectId, attemptId).then(value => { if (current) { setForm({ ...empty, ...value }); setSource(value); } }).catch(e => { if (current) setSourceError(e.message); });
    return () => { current = false; };
  }, [projectId, attemptId, retry]);
  useEffect(() => {
    if (attemptId || form.type !== 'BUG') return;
    let current = true; setCaseError('');
    testCasesApi.listCases(projectId, null, { page, keyword }).then(value => { if (current) setCases(value); }).catch(e => { if (current) setCaseError(e.message); });
    return () => { current = false; };
  }, [projectId, attemptId, form.type, page, keyword, retry]);
  function change(key, value) { setForm(old => ({ ...old, [key]: value })); requestKey.current = crypto.randomUUID(); }
  async function submit(event) {
    event.preventDefault(); setError('');
    if (form.type === 'BUG' && !form.revisionId && !canTriage) { setError('Chọn test case hoặc tạo bug từ một lần chạy NG.'); return; }
    setBusy(true);
    const payload = { ...form, requestKey: requestKey.current };
    for (const key of ['buildId', 'environmentId', 'deviceId', 'revisionId', 'attemptId']) payload[key] = form[key] ? Number(form[key]) : null;
    if (form.type !== 'BUG') for (const key of ['buildId', 'environmentId', 'deviceId', 'revisionId', 'attemptId']) payload[key] = null;
    try { const item = await workItemsApi.create(projectId, payload); if (live.current) onCreated(item); }
    catch (e) { if (live.current) setError(e.message); }
    finally { if (live.current) setBusy(false); }
  }
  if (attemptId && !source) return <><WorkError error={sourceError} retry={() => setRetry(v => v + 1)} />{!sourceError && <p>Đang lấy ngữ cảnh lần kiểm thử…</p>}</>;
  return <form className="wi-form" onSubmit={submit}>
    <WorkError error={error} />
    {source && <p className="wi-note">Tạo từ lần kiểm thử NG #{source.attemptId}. Ngữ cảnh thực thi được giữ nguyên.</p>}
    <WorkField label="Loại công việc"><select disabled={busy || !!attemptId} value={form.type} onChange={e => change('type', e.target.value)}>{Object.entries(typeLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></WorkField>
    <WorkField label="Tiêu đề"><input required maxLength={300} value={form.title} onChange={e => change('title', e.target.value)} disabled={busy} /></WorkField>
    {form.type === 'BUG' && titlePrefix && <p className="wi-note">Quy tắc nội bộ hiện hành yêu cầu tiêu đề bắt đầu bằng: <strong>{titlePrefix}</strong></p>}
    <WorkField label="Mô tả"><textarea rows={3} maxLength={20000} value={form.description} onChange={e => change('description', e.target.value)} disabled={busy} /></WorkField>
    {form.type === 'BUG' && <>
      <WorkField label="Các bước tái hiện"><textarea required rows={4} maxLength={20000} value={form.steps} onChange={e => change('steps', e.target.value)} disabled={busy} /></WorkField>
      <div className="wi-fields"><WorkField label="Kết quả mong đợi"><textarea required rows={3} maxLength={20000} value={form.expectedResult} onChange={e => change('expectedResult', e.target.value)} disabled={busy} /></WorkField>
        <WorkField label="Kết quả thực tế"><textarea required rows={3} maxLength={20000} value={form.actualResult} onChange={e => change('actualResult', e.target.value)} disabled={busy} /></WorkField></div>
      <div className="wi-fields three">
        <WorkSelect label="Build phát sinh" items={catalogs.builds} describe={b => `${b.platform} ${b.versionLabel} (${b.buildNumber || '—'})`} required value={form.buildId} onChange={v => change('buildId', v)} disabled={busy || !!attemptId} />
        <WorkSelect label="Môi trường" items={catalogs.environments} required value={form.environmentId} onChange={v => change('environmentId', v)} disabled={busy || !!attemptId} />
        <WorkSelect label="Thiết bị" items={catalogs.devices} required value={form.deviceId} onChange={v => change('deviceId', v)} disabled={busy || !!attemptId} />
      </div>
      {!attemptId && <section className="wi-section">
        <WorkField label="Tìm test case"><input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(0); }} placeholder="Tìm theo mã hoặc tiêu đề" /></WorkField>
        <WorkError error={caseError} retry={() => setRetry(v => v + 1)} />
        <WorkSelect label="Test case liên quan" required={!canTriage} items={cases?.items || []} id={c => c.currentRevisionId} describe={c => `${c.caseNo} · ${c.titleVi}`} value={form.revisionId} onChange={v => change('revisionId', v)} disabled={busy} />
        {(cases?.totalPages || 0) > 1 && <div className="wi-actions"><Button disabled={!page} onClick={() => setPage(p => p - 1)}>Case trước</Button><span>Trang {page + 1}/{cases.totalPages}</span><Button disabled={page + 1 >= cases.totalPages} onClick={() => setPage(p => p + 1)}>Case tiếp</Button></div>}
        {canTriage && !form.revisionId && <WorkField label="Lý do chưa có test case"><textarea required maxLength={1000} value={form.standaloneReason} onChange={e => change('standaloneReason', e.target.value)} disabled={busy} /></WorkField>}
      </section>}
    </>}
    <div className="wi-actions"><span className="wi-note">Công việc mới bắt đầu ở trạng thái Chưa xử lý.</span><Button primary type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Tạo công việc'}</Button></div>
  </form>;
}
