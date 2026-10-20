import React, { useId } from 'react';

const RESULTS = [
  ['ok', 'OK'], ['ng', 'NG'], ['pending', 'P'], ['na', 'NA'], ['notRun', 'Chưa chạy'],
];
const percent = value => `${Number(value.toFixed(2))}%`;

function Donut({ rows, total, descriptionId }) {
  let offset = 0;
  return <svg className="admin-health-donut" viewBox="0 0 240 240" role="img"
    aria-label="Biểu đồ tròn kết quả kiểm thử" aria-describedby={descriptionId}>
    <desc id={descriptionId}>{rows.map(row => row.description).join('; ')}.</desc>
    <circle className="admin-health-donut-track" cx="120" cy="120" r="94" fill="none" strokeWidth="32" />
    {rows.filter(row => row.value > 0).map(row => {
      const start = offset;
      offset += row.share;
      return <circle key={row.key} className={`admin-health-slice admin-health-${row.key}`}
        cx="120" cy="120" r="94" fill="none" strokeWidth="32" pathLength="100"
        strokeDasharray={`${row.share} ${100 - row.share}`} strokeDashoffset={-start}
        transform="rotate(-90 120 120)">
        <title>{row.description}</title>
      </circle>;
    })}
    <text className="admin-health-donut-total" x="120" y="118" textAnchor="middle">{total}</text>
    <text className="admin-health-chart-label" x="120" y="143" textAnchor="middle">Tổng case</text>
  </svg>;
}

function Columns({ rows, descriptionId }) {
  return <div className="admin-health-columns" role="img"
    aria-label="Biểu đồ cột kết quả kiểm thử" aria-describedby={descriptionId}>
    <span id={descriptionId} className="admin-health-sr-only">{rows.map(row => row.description).join('; ')}.</span>
    <div className="admin-health-plot" aria-hidden="true">
      <div className="admin-health-axis">
        {[100, 75, 50, 25, 0].map(tick => <span key={tick} style={{ top: `${100 - tick}%` }}>{tick}%</span>)}
      </div>
      <div className="admin-health-bars">
        {rows.map(row => <div className="admin-health-column" key={row.key} title={row.description}>
          <div className={`admin-health-bar admin-health-${row.key}`} style={{ height: `${row.share}%` }}>
            <strong className="admin-health-bar-value">{row.value}</strong>
          </div>
          <div className="admin-health-column-label"><span>{row.label}</span><small>{percent(row.share)}</small></div>
        </div>)}
      </div>
    </div>
  </div>;
}

export function HealthResultChart({ metrics, circular = false }) {
  const descriptionId = useId();
  const total = metrics.total;
  const tested = metrics.tested ?? metrics.ok + metrics.ng + metrics.pending + metrics.na;
  const rows = RESULTS.map(([key, label]) => {
    const value = metrics[key];
    const share = total > 0 ? value / total * 100 : 0;
    return { key, label, value, share, description: `${label}: ${value} case (${percent(share)})` };
  });
  return <div className="admin-health-results">
    <div className="admin-health-progress-label">
      <span>Đã test {tested}/{total} case</span>
      <strong>{total ? `${metrics.executionPercent ?? Math.round(tested / total * 100)}%` : '0%'}</strong>
    </div>
    {total > 0 ? circular ? <div className="admin-health-donut-layout">
      <Donut rows={rows} total={total} descriptionId={descriptionId} />
      <dl className="admin-health-legend">
        {rows.map(row => <div key={row.key} role="group" aria-label={`${row.label}: ${row.value} case`}>
          <dt><i className={`admin-health-${row.key}`} aria-hidden="true" />{row.label}</dt>
          <dd><strong>{row.value}</strong><span>{percent(row.share)}</span></dd>
        </div>)}
      </dl>
    </div> : <Columns rows={rows} descriptionId={descriptionId} />
      : <p className="admin-health-empty">Chưa có case trong phạm vi kiểm thử.</p>}
  </div>;
}
