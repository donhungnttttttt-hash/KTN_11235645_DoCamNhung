import React from 'react';

const statuses = ['Unexecuted', 'OK', 'P', 'NG', 'Fixed', 'NA'];
const aliases = { NOT_RUN: 'Unexecuted', UNEXECUTED: 'Unexecuted', '-': 'Unexecuted', '—': 'Unexecuted', FIX: 'Fixed', FIXED: 'Fixed', PENDING: 'P' };

// Controlled selection only. The caller owns validation, permissions and persistence.
export function ResultCycleButton({ value, sourceId, onChange, disabled = false }) {
  const raw = String(value || '').trim();
  const status = aliases[raw.toUpperCase()] || raw || 'Unexecuted';
  const next = statuses[(statuses.indexOf(status) + 1) % statuses.length];
  const color = status === 'P' ? 'pending' : status === 'Unexecuted' ? 'unexecuted' : status.toLowerCase();
  return <button type="button" disabled={disabled} className={`td-result td-result-${color}`}
    aria-label={`Kết quả test case ${sourceId}`} title={`${status} → ${next}`}
    onClick={() => onChange(next)}>{status}</button>;
}
