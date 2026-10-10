import {TableScroll} from '../../components/TableScroll';
import { canManageProjectWork } from '../projects/projectAccess';
import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../projects/ProjectProvider';
import { useAuth } from '../auth/AuthProvider';
import { executionApi } from '../../services/api/execution';
import { Pager, Field, ErrorNotice } from './components';
import './execution.css';

export function TestCyclesPage({ navigate }) {
  const { currentProject } = useProject() || {};
  return <Cycles key={currentProject?.id || 'none'} project={currentProject} navigate={navigate} />;
}
function Cycles({ project, navigate }) {
  const { hasRole } = useAuth();
  const manager = canManageProjectWork(project, hasRole);
  const [page, setPage] = useState(0), [reload, setReload] = useState(0);
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!project) return;
    let live = true; setData(null); setError('');
    executionApi.cycles(project.id, page).then(x => { if (live) setData(x); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [project?.id, page, reload]);
  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const c = await executionApi.create(project.id, form); if (live.current) navigate(`/tests/cycles/${c.id}`); }
    catch (err) { if (live.current) setError(err.message); } finally { if (live.current) setBusy(false); }
  }
  return <div className="cat-container ex-page py-3">
    <div className="ex-heading"><h2>Đợt kiểm thử {project && `· ${project.name}`}</h2>{manager && <button className="cat-btn cat-btn-mint" onClick={() => setForm({ code: '', name: '' })}>+ Tạo đợt kiểm thử</button>}</div>
    <p className="ex-help">Chọn test case đã duyệt, phân công người thực hiện và theo dõi từng lần kiểm thử theo build.</p>
    {!project && <p>Chọn dự án để xem các đợt kiểm thử.</p>}
    <ErrorNotice error={error} retry={() => setReload(x => x + 1)} />
    {form && <form className="ex-panel ex-fields" onSubmit={create}>
      <Field label="Mã đợt"><input className="cat-input" required maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,31}" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></Field>
      <Field label="Tên đợt"><input className="cat-input" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
      <button className="cat-btn cat-btn-mint" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo bản nháp'}</button><button type="button" className="cat-btn" disabled={busy} onClick={() => setForm(null)}>Hủy</button>
    </form>}
    {project && !data && !error && <p role="status">Đang tải…</p>}
    {data && <><TableScroll label="Đợt kiểm thử" className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Mã đợt</th><th>Tên đợt</th><th>Trạng thái</th><th>Phạm vi</th></tr></thead><tbody>
      {data.items.map(c => <tr key={c.id}><td><button className="ex-link" onClick={() => navigate(`/tests/cycles/${c.id}`)}>{c.code}</button></td><td>{c.name}</td><td>{c.statusCode === 'CLOSED' ? 'Đã chốt' : c.statusCode === 'ACTIVE' ? 'Đang thực hiện' : 'Bản nháp'}</td><td>{c.runCount} lượt kiểm thử</td></tr>)}
      {!data.items.length && <tr><td colSpan={4}>Chưa có đợt kiểm thử trong dự án.</td></tr>}
    </tbody></table></TableScroll><Pager data={data} onChange={setPage} /></>}
  </div>;
}
