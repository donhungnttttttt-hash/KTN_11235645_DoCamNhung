import React, { useCallback, useId } from 'react';
import { useAdminRead } from './shared';
import { HealthResultChart } from './HealthResultChart';
import './admin-health-charts.css';

// The overview embeds only ten projects. Read the remaining scope through the
// existing paginated endpoint, never label a partial page as the whole portfolio.
async function readProjects(api, overview, projectId, signal) {
  if (overview.byProject.length === overview.totalProjects) return overview.byProject;
  const rows = [];
  const size = 100;
  let total;
  for (let page = 0; total === undefined || rows.length < total; page += 1) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const result = await api.projects({ projectId, page, size }, { signal });
    if (!Array.isArray(result.items) || !Number.isSafeInteger(result.totalElements) || result.totalElements < 0) {
      throw new Error('Không đọc được đầy đủ danh sách dự án. Vui lòng thử lại.');
    }
    total ??= result.totalElements;
    if (result.totalElements !== total || result.page !== page || result.items.length > size
      || (result.items.length === 0 && rows.length < total)) {
      throw new Error('Danh sách dự án đã thay đổi trong lúc tải. Vui lòng thử lại.');
    }
    rows.push(...result.items);
  }
  if (rows.length !== total || new Set(rows.map(row => row.id)).size !== total) {
    throw new Error('Danh sách dự án đã thay đổi trong lúc tải. Vui lòng thử lại.');
  }
  return rows;
}

function Indicators({ openBugs, awaitingVerification, overdueMilestones, insufficientMilestoneData }) {
  const values = [
    ['Bug chưa kết thúc', openBugs], ['Chờ xác minh', awaitingVerification], ['Mốc quá hạn', overdueMilestones],
  ];
  return <>
    <dl className="admin-health-indicators">
      {values.map(([label, value]) => <div key={label} role="group" aria-label={`${label}: ${value ?? 'Chưa có dữ liệu'}`}>
        <dt>{label}</dt><dd>{value ?? '—'}</dd>
      </div>)}
    </dl>
    {!!insufficientMilestoneData && <p className="admin-health-data-note">{insufficientMilestoneData} mốc chưa đủ dữ liệu về hạn hoặc phạm vi.</p>}
  </>;
}

export function AdminHealthCharts({ overview, projectId, api }) {
  const headingId = useId();
  const projectHeadingId = useId();
  const load = useCallback(signal => readProjects(api, overview, projectId, signal), [api, overview, projectId]);
  const state = useAdminRead(`health:${projectId ?? 'all'}:${overview.asOf}`, load);
  const scope = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return <div className="admin-health">
    <section className="admin-card admin-health-overall" aria-label="Sức khỏe toàn bộ dự án">
      <header className="admin-health-heading">
        <div><h2 id={headingId}>Biểu đồ toàn cảnh</h2><p>{projectId ? 'Phạm vi dự án đang chọn' : `${overview.totalProjects} dự án trong toàn hệ thống`}</p></div>
        <span className="admin-health-caption">Kết quả kiểm thử hiện tại</span>
      </header>
      <HealthResultChart metrics={overview.metrics} circular />
      <Indicators openBugs={overview.openBugs} awaitingVerification={overview.awaitingVerification}
        overdueMilestones={overview.attention.overdueMilestoneCount ?? overview.attention.overdueMilestones.length}
        insufficientMilestoneData={overview.attention.insufficientMilestoneData} />
      <p className="admin-health-definition">Tiến độ phản ánh case đã test, chưa kết luận chất lượng. Đối chiếu NG, bug và mốc quá hạn để theo dõi dự án.</p>
    </section>
    <section className="admin-health-projects" aria-labelledby={projectHeadingId}>
      <header className="admin-health-heading">
        <div><h2 id={projectHeadingId}>Biểu đồ từng dự án</h2><p>Chiều cao cột theo tỷ lệ 0–100% của từng dự án. Số case ở đầu cột, tỷ lệ ở dưới.</p></div>
        {state.data && <span className="admin-health-caption">{state.data.length} dự án</span>}
      </header>
      {state.loading && <div className="admin-card admin-health-loading" role="status" aria-label="Đang tải biểu đồ dự án" aria-busy="true">Đang tải đầy đủ biểu đồ dự án…</div>}
      {state.error && <div className="admin-error" role="alert"><p>{state.error.message}</p><button type="button" onClick={state.retry}>Thử lại biểu đồ dự án</button></div>}
      {state.data && (state.data.length ? <div className="admin-health-project-grid">
        {state.data.map(project => <article className="admin-card admin-health-project" key={project.id} aria-label={`Sức khỏe dự án ${project.code}`}>
          <header className="admin-health-heading">
            <div><h3>{project.code} · {project.name}</h3><span className="admin-health-caption">{project.archivedAt ? 'Đã lưu trữ' : 'Đang hoạt động'}</span></div>
          </header>
          <HealthResultChart metrics={project.metrics} />
          <Indicators {...project} />
          <a className="admin-health-project-link" href={`#/admin/projects/${project.id}${scope}`}>Xem dự án {project.code}</a>
        </article>)}
      </div> : <p className="admin-card admin-health-empty">Chưa có dự án trong phạm vi đã chọn.</p>)}
    </section>
  </div>;
}
