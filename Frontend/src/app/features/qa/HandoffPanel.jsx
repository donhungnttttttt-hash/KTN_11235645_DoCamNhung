import React, { useEffect, useRef, useState } from 'react';
import { qaApi } from '../../services/api/qa';
import { Button } from '../work-items/components';

const states = {
  PREPARE_RETEST: 'Chuẩn bị kiểm thử lại', ASSIGNED: 'Đã giao kiểm thử lại',
  VERIFYING: 'Đang xác minh / PM đối chiếu', READY_TO_CLOSE: 'Đủ kết quả xác minh', RETRY_REQUIRED: 'Cần xử lý lại',
};
export function HandoffPanel({ projectId, navigate }) {
  const [query, setQuery] = useState({ projectId, page: 0, size: 20, state: '', keyword: '' });
  const [retry, setRetry] = useState(0), [result, setResult] = useState({ loading: true });
  const generation = useRef(0);
  const currentQuery = query.projectId === projectId ? query : { projectId, page: 0, size: 20, state: '', keyword: '' };
  const scope = JSON.stringify(currentQuery);
  useEffect(() => {
    const request = ++generation.current, controller = new AbortController();
    const { projectId: p, ...filters } = JSON.parse(scope);
    setResult({ scope, loading: true });
    qaApi.handoff(p, filters, { signal: controller.signal }).then(data => { if (request === generation.current) setResult({ scope, loading: false, data }); })
      .catch(e => { if (request === generation.current && e.name !== 'AbortError') setResult({ scope, loading: false, error: e.message, status: e.status }); });
    return () => { generation.current++; controller.abort(); };
  }, [scope, retry]);
  const current = result.scope === scope ? result : { loading: true };
  function filter(key, value) { setQuery({ ...currentQuery, [key]: value, page: key === 'page' ? value : 0 }); }
  return <section className="wi-section" aria-label="Hàng chờ bàn giao">
    <h3>Hàng chờ bàn giao BUG</h3><p className="wi-note">Dữ liệu vòng kiểm thử hiện tại từ máy chủ. PM mở chi tiết để chuẩn bị kiểm thử lại hoặc đối chiếu điều kiện kết thúc.</p>
    <div className="wi-fields"><label className="wi-field"><span>Trạng thái bàn giao</span><select value={currentQuery.state} onChange={e => filter('state', e.target.value)}><option value="">Tất cả</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="wi-field"><span>Tìm BUG bàn giao</span><input value={currentQuery.keyword} maxLength={255} onChange={e => filter('keyword', e.target.value)} /></label></div>
    {current.loading && <p role="status">Đang tải hàng chờ…</p>}
    {current.error && <div className="wi-error" role="alert"><p>{current.error}</p>{current.status === 403 && <p>Hàng chờ dành cho PM dự án hiện tại.</p>}<Button onClick={() => setRetry(v => v + 1)}>Thử lại</Button></div>}
    {current.data && <>
      {!current.data.items.length && <p>Chưa có BUG trong hàng chờ này.</p>}
      {current.data.items.map(row => {
        const target = `/board/issue/${row.workItemId}`;
        return <article key={row.workItemId} className="wi-section">
          <h4><a href={'#' + target} onClick={e => { if (navigate && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) { e.preventDefault(); navigate(target); } }}>{row.key}</a> · {row.title}</h4>
          <p>{states[row.state] || row.state} · Vòng {row.roundNo} · Build #{row.fixedBuildId ?? '—'}</p>
          <div className="wi-actions"><span>Phạm vi: {row.applicableCount}</span><span>Đã yêu cầu: {row.requestedCount}</span><span>Đang chờ: {row.pendingCount}</span><span>PASS: {row.passCount}</span><span>FAIL: {row.failCount}</span></div>
          <p>Yêu cầu hiện tại: {(row.requestIds || []).map(id => `#${id}`).join(', ') || 'Chưa có'}</p>
          <p>{row.canPrepareRetest === true ? 'Có thể chuẩn bị kiểm thử lại trong chi tiết.' : 'Hiện không thể chuẩn bị kiểm thử lại.'} {row.canClose === true ? 'PM có thể đối chiếu và kết thúc trong chi tiết.' : 'Hiện chưa được phép kết thúc.'}</p>
          {row.state === 'VERIFYING' && <p>PM đối chiếu yêu cầu, kết quả và điều kiện kết thúc hiện hành.</p>}
        </article>;
      })}
      <div className="wi-actions"><Button disabled={!currentQuery.page} onClick={() => filter('page', currentQuery.page - 1)}>Bàn giao trước</Button><span>Trang {current.data.page + 1}/{Math.max(1, current.data.totalPages)} · {current.data.totalItems} BUG</span><Button disabled={currentQuery.page + 1 >= current.data.totalPages} onClick={() => filter('page', currentQuery.page + 1)}>Bàn giao tiếp</Button><Button onClick={() => setRetry(v => v + 1)}>Tải lại hàng chờ</Button></div>
    </>}
  </section>;
}
