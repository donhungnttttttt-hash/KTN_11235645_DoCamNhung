import { canManageProjectWork } from '../projects/projectAccess';
import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../projects/ProjectProvider';
import { useAuth } from '../auth/AuthProvider';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { CycleDecisionDialog, DecisionHistory } from './CycleDecisionDialog';
import { ScopeSetup } from './ScopeSetup';
import { AttemptDialog } from './AttemptDialog';
import { AssignmentDialog } from './AssignmentDialog';
import { ErrorNotice, Pager, Result } from './components';
import './execution.css';

const positiveId = value => (typeof value === 'number' || typeof value === 'string') && /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));

export function ExecutionRunnerPage(props) {
  const { currentProject } = useProject() || {};
  return <Runner key={`${currentProject?.id}/${props.cycleId}`} {...props} project={currentProject} />;
}
function Runner({ project, cycleId, navigate }) {
  const { hasRole, user } = useAuth();
  const dev = hasRole?.('DEV') || project?.projectRole==='DEV';
  const manager = canManageProjectWork(project, hasRole);
  const [data, setData] = useState(null), [runs, setRuns] = useState(null), [reload, setReload] = useState(0);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0), [mine, setMine] = useState(false), [pendingBug, setPendingBug] = useState(false);
  const [selected, setSelected] = useState(null), [assignment, setAssignment] = useState(null), [confirmStart, setConfirmStart] = useState(false);
  const [decision, setDecision] = useState(null);
  const projectPm = !dev && project?.projectRole === 'PM' && !project.archived;
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (!project) { setLoading(false); return; }
    let current = true; setLoading(true); setError('');
    Promise.all([executionApi.cycle(project.id, cycleId), executionApi.configurations(project.id, cycleId), projectsApi.listMembers(project.id), projectsApi.listCatalog(project.id, 'environments'), projectsApi.listCatalog(project.id, 'devices'), projectsApi.listCatalog(project.id, 'builds'), executionApi.runs(project.id, cycleId, { page, mine, pendingBug })])
      .then(([cycle, configs, members, environments, devices, builds, runPage]) => { if (current) { setData({ cycle, configs, members: members.map(m => ({ ...m, id: m.membershipId })), catalogs: { environments, devices, builds } }); setRuns(runPage); } })
      .catch(e => { if (current) { setError(e.message); setRuns(null); } }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [project?.id, cycleId, page, mine, pendingBug, reload]);
  const refresh = () => setReload(x => x + 1);
  function openRun(run) {
    if (run.fileWorkGroupId != null) {
      if (positiveId(run.fileWorkGroupId)) navigate(`/tests/file-work/${run.fileWorkGroupId}`);
      else setError('Không mở được công việc theo file vì mã nhóm không hợp lệ. Tải lại để kiểm tra.');
      return;
    }
    setSelected(run);
  }
  async function start() {
    setBusy(true); setError('');
    try { await executionApi.activate(project.id, cycleId, data.cycle.version); if (live.current) { setConfirmStart(false); refresh(); } }
    catch (e) { if (live.current) setError(e.message); } finally { if (live.current) setBusy(false); }
  }
  return <div className="cat-container ex-page py-3">
    <div className="ex-heading"><h2>{data?.cycle.name || 'Thực thi kiểm thử'}</h2><button className="cat-btn" onClick={() => navigate('/tests/cycles')}>Danh sách đợt</button></div>
    {!project && <p>Chọn dự án để mở đợt kiểm thử.</p>}
    <ErrorNotice error={error} retry={refresh} />{loading && <p role="status">Đang tải đợt kiểm thử…</p>}
    {data && <>
      <div className="ex-heading"><p>{data.cycle.code} · {data.cycle.statusCode === 'CLOSED' ? 'Đã chốt · Khóa ghi kết quả' : data.cycle.statusCode === 'ACTIVE' ? 'Đang thực hiện · Phạm vi đã khóa' : 'Bản nháp'} · {data.cycle.runCount} lượt kiểm thử</p>
        {manager && data.cycle.statusCode === 'DRAFT' && <button className="cat-btn cat-btn-mint" disabled={loading || busy || !data.cycle.runCount} onClick={() => setConfirmStart(true)}>Bắt đầu đợt kiểm thử</button>}</div>
      {projectPm && data.cycle.statusCode !== 'DRAFT' && <button className="cat-btn" disabled={loading} onClick={() => setDecision({ cycle: data.cycle })}>{data.cycle.statusCode === 'CLOSED' ? 'Mở lại đợt' : 'Chốt đợt kiểm thử'}</button>}
      <DecisionHistory key={`cycle-history-${reload}`} projectId={project.id} id={cycleId} timeZone={project.timezone} />
      {confirmStart && <section className="ex-panel" role="alertdialog" aria-label="Xác nhận bắt đầu đợt"><p>Khóa {data.cycle.runCount} lượt kiểm thử theo phiên bản case đã chọn và cho phép người được phân công ghi kết quả?</p><div className="ex-checks"><button className="cat-btn cat-btn-mint" disabled={busy} onClick={start}>Xác nhận bắt đầu</button><button className="cat-btn" disabled={busy} onClick={() => setConfirmStart(false)}>Hủy</button></div></section>}
      {manager && data.cycle.statusCode === 'DRAFT' && <ScopeSetup projectId={project.id} cycle={data.cycle} configs={data.configs} catalogs={data.catalogs} members={data.members} onSaved={refresh} refreshKey={reload} />}
      <div className="ex-checks"><label><input type="checkbox" checked={mine} onChange={e => { setMine(e.target.checked); setPage(0); }} />Được giao cho tôi</label><label><input type="checkbox" checked={pendingBug} onChange={e => { setPendingBug(e.target.checked); setPage(0); }} />NG chờ liên kết bug</label><button className="cat-btn" onClick={refresh}>Tải lại</button></div>
      {runs && <><div className="ex-table-wrap"><table className="ex-table"><thead><tr><th>Mã case</th><th>Nội dung kiểm thử</th><th>Cấu hình chạy</th><th>Người thực hiện</th><th>Kết quả mới nhất</th><th>Thao tác</th></tr></thead><tbody>
        {runs.items.map(r => <tr key={r.id}><td><button className="ex-link" onClick={() => openRun(r)}>{r.caseNo}</button><small>Phiên bản {r.revisionNo}</small></td><td>{r.titleVi}</td><td>{r.environmentName}<small>{r.deviceName}</small></td><td>{r.assigneeName}</td><td><Result value={r.resultCode} />{r.excluded && <small title={r.scopeReason}>NA · Ngoài phạm vi</small>}{!!r.pendingBugLink && <small>Chờ liên kết bug</small>}</td><td><div className="ui-actions ex-row-actions"><button className="cat-btn" disabled={r.fileWorkGroupId != null && !positiveId(r.fileWorkGroupId)} onClick={() => openRun(r)}>{r.fileWorkGroupId != null ? 'Công việc theo file' : !dev && data.cycle.statusCode === 'ACTIVE' && !r.excluded && r.assigneeUserId === user?.id ? 'Ghi kết quả' : 'Chi tiết / lịch sử'}</button>{manager && data.cycle.statusCode !== 'CLOSED' && <button className="cat-btn" onClick={() => setAssignment(r)}>Phân công</button>}{projectPm && data.cycle.statusCode === 'ACTIVE' && <button className="cat-btn" onClick={() => setDecision({ run: r })}>{r.excluded ? 'Khôi phục phạm vi' : 'Đánh dấu NA'}</button>}</div></td></tr>)}
        {!runs.items.length && <tr><td colSpan={6}>Chưa có lượt kiểm thử phù hợp.</td></tr>}
      </tbody></table></div><Pager data={runs} onChange={setPage} /></>}
      {selected && <AttemptDialog key={selected.id} projectId={project.id} run={selected} builds={data.catalogs.builds} active={!dev && data.cycle.statusCode === 'ACTIVE' && !project.archived} currentUserId={user?.id} onClose={() => setSelected(null)} onSaved={refresh} timeZone={project.timezone} />}
    </>}
    {decision && <CycleDecisionDialog projectId={project.id} {...decision} onClose={() => setDecision(null)} onSaved={() => { setDecision(null); refresh(); }} />}
    {assignment && <AssignmentDialog key={assignment.id} projectId={project.id} run={assignment} members={data.members} timeZone={project.timezone} onClose={() => setAssignment(null)} onSaved={() => { setAssignment(null); refresh(); }} />}
  </div>;
}
