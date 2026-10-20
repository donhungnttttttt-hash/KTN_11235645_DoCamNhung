import React from 'react';
import './test-progress.css';

const caseCount = (value) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function TestProgress({ tested, total, label = 'Tiến độ kiểm thử' }) {
  const testedCount = caseCount(tested);
  const totalCount = caseCount(total);
  const empty = totalCount === 0;
  const complete = !empty && testedCount >= totalCount;
  const current = Math.min(testedCount, totalCount);
  const scaled = current * 100;
  const ratio = empty ? 0 : Number.isFinite(scaled) ? scaled / totalCount : current / totalCount * 100;
  const percent = complete ? 100 : Math.min(99.9, Math.round(ratio * 10) / 10);
  const description = empty ? 'Chưa có case' : `${testedCount}/${totalCount} case · ${percent}%`;

  return (
    <div className={`test-progress${empty ? ' is-empty' : complete ? ' is-complete' : ''}`}>
      <span className="test-progress-label">{description}</span>
      <div
        className="test-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={totalCount || 1}
        aria-valuenow={current}
        aria-valuetext={description}
      >
        <span className="test-progress-fill" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}
