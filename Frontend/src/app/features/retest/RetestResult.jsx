import React, { useCallback, useEffect, useRef, useState } from 'react';
import { retestApi } from '../../services/api/retest';
import { workItemsApi } from '../../services/api/workItems';
import { Button } from '../work-items/components';
import { WorkField, WorkSelect } from '../work-items/WorkItemForm';
import { useRetestAction, RetestError, requestLabels, scopeLabel, verdictLabels } from './shared';
import './retest.css';

export function RetestResult({ projectId, requestId, writable, onSaved, onClose }) {
  const [data, setData] = useState(null), [files, setFiles] = useState([]), [draft, setDraft] = useState({}), [loadError, setLoadError] = useState('');
  const action = useRetestAction(), key = useRef(crypto.randomUUID()), generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    const request = await retestApi.request(projectId, requestId);
    const attachments = await workItemsApi.attachments(projectId, request.bugId);
    if (current !== generation.current) return;
    setData(request); setFiles(attachments); setLoadError('');
  }, [projectId, requestId]);
  useEffect(() => { let live=true;load().catch(e => {if(live)setLoadError(e.message);}); return () => {live=false;generation.current++;}; }, [load]);
  function update(id, field, value) { key.current = crypto.randomUUID(); setDraft(old => ({ ...old, [id]: { ...old[id], [field]: value } })); }
  function submit(event) {
    event.preventDefault();
    const body = { expectedVersion: data.version, expectedBugVersion: data.bugVersion, requestKey: key.current,
      results: data.items.map(item => ({ coverageItemId: item.id, verdict: draft[item.id]?.verdict || '', actualResult: draft[item.id]?.actualResult || '', evidenceAttachmentId: draft[item.id]?.evidenceAttachmentId || null, expectedRunVersion: item.runVersion })) };
    action.perform(() => retestApi.submit(projectId, requestId, body), async () => { await load(); await onSaved(); });
  }
  let context = {}; try { context = typeof data?.contextSnapshot === 'string' ? JSON.parse(data.contextSnapshot) : data?.contextSnapshot || {}; } catch { /* Use server labels for older records. */ }
  return <section className="rt-result ex-panel" aria-label="Chi tiết kiểm thử lại">
    <div className="rt-heading"><h3>Yêu cầu kiểm thử lại {data && `· ${data.bugKey}`}</h3><Button onClick={onClose}>Đóng yêu cầu</Button></div>
    {loadError && <p className="ex-error" role="alert">{loadError} <Button onClick={() => action.perform(load)}>Thử lại</Button></p>}
    {!data && !loadError && <p>Đang tải yêu cầu…</p>}
    <RetestError action={action} reload={load} />
    {data && <><h4>{data.bugTitle}</h4><p>{scopeLabel(data.verificationScope)} · {requestLabels[data.status]}</p>
      <p className="rt-context">Build {context.build?.versionLabel || data.buildLabel} · {context.environment?.name || data.environmentName} · {context.device?.name || data.deviceName}</p>
      <p className="wi-note">{data.verificationScope === 'BUG_ONLY' ? 'Kết quả này chỉ xác minh bug, không đổi kết quả NG của toàn bộ case.' : 'Chạy lại tất cả bước của case. Lưu sẽ tạo lần chạy OK/NG mới và giữ nguyên lịch sử cũ.'} Kết quả không đạt đưa bug về Đang xử lý.</p>
      {!data.current && <p role="status">Yêu cầu thuộc phạm vi cũ. PM cần chuẩn bị yêu cầu mới.</p>}
      {data.cycleActive === false && data.status === 'OPEN' && <p role="status">Đợt kiểm thử đã chốt hoặc lượt đã được loại khỏi phạm vi. PM cần đối chiếu phạm vi và mở lại đợt trước khi tiếp tục.</p>}
      {data.canSubmit && writable ? <form className="wi-form" onSubmit={submit}>
        <fieldset disabled={action.busy || action.conflict} className="rt-fieldset">{data.items.map(item => <section className="rt-run" key={item.id}>
          <h4>{item.caseNo} · {item.titleVi}</h4><details><summary>Xem các bước và kết quả mong đợi</summary><p>{item.stepsVi}</p><p>{item.expectedVi}</p></details>
          <WorkSelect label={`Kết quả ${item.caseNo}`} required items={[{id:'PASS',name:'Đạt'},{id:'FAIL',name:'Không đạt'}]} value={draft[item.id]?.verdict} onChange={v=>update(item.id,'verdict',v)}/>
          <WorkField label={`Thực tế ${item.caseNo}`}><textarea required maxLength={8000} value={draft[item.id]?.actualResult || ''} onChange={e=>update(item.id,'actualResult',e.target.value)}/></WorkField>
          <WorkSelect label={`Chứng cứ ${item.caseNo}`} items={files} value={draft[item.id]?.evidenceAttachmentId} onChange={v=>update(item.id,'evidenceAttachmentId',v)}/>
        </section>)}<Button primary type="submit" disabled={action.busy || action.conflict}>Lưu kết quả retest</Button></fieldset>
      </form> : <>{data.status === 'OPEN' && <p>Chỉ người đang được phân công mới được ghi kết quả.</p>}{data.results.map(result=><article className="wi-history-item" key={result.coverageItemId}><strong>{data.items.find(i=>i.id===result.coverageItemId)?.caseNo} · {verdictLabels[result.verdict]}</strong><p>{result.actualResult}</p><small>{result.executionAttemptId ? `Lần chạy mới #${result.executionAttemptId}` : 'Xác minh riêng bug'}</small></article>)}</>}
    </>}
  </section>;
}
