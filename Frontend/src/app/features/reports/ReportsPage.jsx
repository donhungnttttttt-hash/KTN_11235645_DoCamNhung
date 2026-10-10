import {TableScroll} from '../../components/TableScroll';
import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../projects/ProjectProvider';
import { reportsApi } from '../../services/api/reports';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { KpiSummaryBar } from '../../modules/KpiSummaryBar';
import { ErrorNotice, Field, Pager, Result, formatTime } from '../test-execution/components';
import '../test-execution/execution.css';
import './reports.css';
import {ProjectStatusReports} from '../admin/ProjectStatusReports';

export function ReportsPage({ mode = 'overview' }) {
  const { currentProject } = useProject() || {};
  return <Report key={`${currentProject?.id}/${mode}`} project={currentProject} mode={mode} />;
}
function Report({ project, mode }) {
  const [cycleId, setCycle] = useState(''), [buildId, setBuild] = useState(''), [page, setPage] = useState(0);
  const [cyclePage, setCyclePage] = useState(0), [cycles, setCycles] = useState(null), [builds, setBuilds] = useState([]);
  const [data, setData] = useState(null), [error, setError] = useState(''), [filterError, setFilterError] = useState('');
  const [reload, setReload] = useState(0), [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('');
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!project) return;
    let current = true; setFilterError('');
    Promise.all([executionApi.cycles(project.id, cyclePage), projectsApi.listCatalog(project.id, 'builds')])
      .then(([c, b]) => { if (current) { setCycles(c); setBuilds(b); } }).catch(e => { if (current) setFilterError(e.message); });
    return () => { current = false; };
  }, [project?.id, cyclePage, reload]);
  useEffect(() => {
    if (!project) return;
    let current = true; setData(null); setError(''); setExportError('');
    reportsApi.summary(project.id, { cycleId, buildId, page }).then(value => { if (current) setData(value); }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [project?.id, cycleId, buildId, page, reload]);
  async function download() {
    setExporting(true); setExportError('');
    try {
      const blob = await reportsApi.export(project.id, { cycleId, buildId });
      if (!live.current) return;
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `bao-cao-${project.id}.xlsx`; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { if (live.current) setExportError(e.message); }
    finally { if (live.current) setExporting(false); }
  }
  const refresh = () => setReload(x => x + 1);
  const title = { overview: 'Tổng quan kiểm thử', progress: 'Quản lý tiến độ', quality: 'Tổng hợp & Phân tích' }[mode];
  if (!project) return <div className="cat-container py-3">Chọn dự án để xem báo cáo.</div>;
  return <div className="cat-container ex-page rp-page py-3">
    <header className="ex-heading"><div><h2>{title}</h2><p className="ex-help">{project.name} · Số liệu thực thi và chất lượng nội bộ</p></div><div className="ex-checks"><button className="cat-btn" onClick={refresh}>Làm mới</button><button className="cat-btn cat-btn-mint" disabled={!data || exporting} onClick={download}>{exporting ? 'Đang xuất…' : 'Xuất Excel'}</button></div></header>
    <section className="rp-filters"><Field label="Đợt kiểm thử"><select className="cat-select" value={cycleId} onChange={e => { setCycle(e.target.value); setPage(0); }}><option value="">Tất cả đợt đã bắt đầu</option>{cycles?.items.filter(c => c.statusCode !== 'DRAFT').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      {cycles?.totalPages > 1 && <div className="ex-checks"><button className="cat-btn" disabled={!cyclePage} onClick={() => { setCyclePage(x => x - 1); setCycle(''); setPage(0); }}>Đợt trước</button><button className="cat-btn" disabled={cyclePage + 1 >= cycles.totalPages} onClick={() => { setCyclePage(x => x + 1); setCycle(''); setPage(0); }}>Đợt tiếp</button></div>}
      <Field label="Build thực thi"><select className="cat-select" value={buildId} onChange={e => { setBuild(e.target.value); setPage(0); }}><option value="">Mới nhất trên mọi build</option>{builds.map(b => <option key={b.id} value={b.id}>{b.versionLabel} ({b.buildNumber || '—'})</option>)}</select></Field>
    </section>
    {mode==='progress'&&<ProjectStatusReports projectId={project.id}/>}
    <ErrorNotice error={filterError} retry={refresh} /><ErrorNotice error={error} retry={refresh} /><ErrorNotice error={exportError} />
    {!data && !error && <p role="status">Đang tải số liệu…</p>}
    {data && <>
      <p className="ex-help">Cập nhật {formatTime(data.asOf, data.timeZone)} · {data.timeZone}. Chọn build sẽ lấy lần chạy mới nhất trên build đó.</p>
      <KpiSummaryBar metrics={data.metrics} />
      <section className="rp-rates"><Rate label="Tiến độ thực thi" value={data.metrics.executionPercent} formula="(OK + NG) / phạm vi áp dụng" /><Rate label="Tỷ lệ đạt" value={data.metrics.passPercent} formula="OK / phạm vi áp dụng" /><article className="ex-panel"><h3>Phạm vi áp dụng</h3><strong>{data.metrics.applicable} / {data.metrics.total}</strong><p>Đã loại {data.metrics.na} lượt NA được PM duyệt.</p><small>Chờ retest không tự tính là đạt.</small></article></section>
      {mode !== 'quality' && <>
        <MetricTable title="Tiến độ theo đợt" rows={data.byCycle} label="Đợt kiểm thử" />
        <MetricTable title="Phạm vi đang phân công" rows={data.byAssignee} label="Người thực hiện" />
      </>}
      {mode === 'progress' && <section className="ex-panel"><h3>Lịch sử thực thi trong 14 ngày gần nhất</h3><p className="ex-help">Đếm số lần thực thi theo người thực hiện và ngày của dự án, gồm cả các lượt sau đó được đánh dấu NA.</p><TableScroll label="Lịch sử thực thi" className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Ngày</th><th>Người thực hiện</th><th>Số lần chạy</th><th>OK</th><th>NG</th><th>P</th></tr></thead><tbody>{data.daily.map((d, i) => <tr key={i}><td>{d.date}</td><td>{d.name}</td><td>{d.attempts}</td><td>{d.ok}</td><td>{d.ng}</td><td>{d.pending}</td></tr>)}{!data.daily.length && <tr><td colSpan={6}>Chưa có lần thực thi trong khoảng này.</td></tr>}</tbody></table></TableScroll></section>}
      {mode === 'quality' && <BugTable bugs={data.bugs} metrics={data.metrics} />}
      <SourceTable source={data.source} onPage={setPage} />
      <p className="ex-help">Excel ghi thời điểm xuất riêng, cùng bộ lọc và công thức. Dữ liệu có thể thay đổi sau khi tải màn hình.</p>
    </>}
  </div>;
}
function Rate({ label, value, formula }) {
  return <article className="ex-panel"><h3>{label}</h3><strong>{value == null ? 'Chưa có phạm vi áp dụng' : `${value}%`}</strong><div className="rp-meter" role="img" aria-label={`${label}: ${value == null ? 'chưa có phạm vi' : `${value}%`}`}><span style={{ width: `${value ?? 0}%` }} /></div><small>{formula}</small></article>;
}
function MetricTable({ title, rows, label }) {
  return <section className="ex-panel"><h3>{title}</h3><TableScroll label={title} className="ex-table-wrap"><table className="ex-table"><thead><tr><th>{label}</th><th>Áp dụng</th><th>OK</th><th>NG</th><th>Tạm hoãn</th><th>Chưa chạy</th><th>NA</th><th>Thực thi</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.applicable}</td><td>{r.ok}</td><td>{r.ng}</td><td>{r.pending}</td><td>{r.notRun}</td><td>{r.na}</td><td>{r.executionPercent == null ? '—' : `${r.executionPercent}%`}</td></tr>)}{!rows.length && <tr><td colSpan={8}>Chưa có phạm vi áp dụng.</td></tr>}</tbody></table></TableScroll></section>;
}
function BugTable({ bugs, metrics }) {
  const [page, setPage] = useState(0);
  return <section className="ex-panel"><h3>Lỗi liên quan phạm vi · mọi build</h3><p>{metrics.bugs} lỗi duy nhất · {metrics.openBugs} chưa đóng · {metrics.awaitingVerification} đã báo sửa, chờ xác minh</p><TableScroll label="Lỗi trong phạm vi báo cáo" className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Mã lỗi</th><th>Tiêu đề</th><th>Trạng thái</th><th>Ưu tiên</th></tr></thead><tbody>{bugs.slice(page * 50, (page + 1) * 50).map(b => <tr key={b.id}><td><a href={`#/board/issue/${b.id}`}>{b.key}</a></td><td>{b.title}</td><td>{b.statusLabel}</td><td>{b.priorityLabel}</td></tr>)}{!bugs.length && <tr><td colSpan={4}>Chưa có lỗi liên quan.</td></tr>}</tbody></table></TableScroll><Pager data={{ page, totalItems: bugs.length, totalPages: Math.ceil(bugs.length / 50) }} onChange={setPage} /></section>;
}
function SourceTable({ source, onPage }) {
  return <section className="ex-panel"><h3>Dữ liệu nguồn</h3><TableScroll label="Dữ liệu nguồn báo cáo" className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Test case</th><th>Đợt / cấu hình</th><th>Người phụ trách</th><th>Kết quả</th><th>Build lần chạy</th><th>Phạm vi</th></tr></thead><tbody>{source.items.map(r => <tr key={r.id}><td><a href={`#/tests/cycles/${r.cycleId}`}>{r.caseNo}</a><small>{r.titleVi}</small></td><td>{r.cycleName}<small>{r.environmentName} / {r.deviceName}</small></td><td>{r.assigneeName}</td><td><Result value={r.resultCode} /><small>{r.attemptId ? `Lần chạy #${r.attemptId}` : ''}</small></td><td>{r.buildLabel || '—'}</td><td title={r.scopeReason || ''}>{r.excluded ? 'NA' : 'Áp dụng'}</td></tr>)}{!source.items.length && <tr><td colSpan={6}>Chưa có lượt kiểm thử phù hợp.</td></tr>}</tbody></table></TableScroll><Pager data={source} onChange={onPage} /></section>;
}
