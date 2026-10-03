import React from 'react';
export const resultLabels = { NOT_RUN: 'Chưa chạy', OK: 'OK · Đạt', NG: 'NG · Không đạt', P: 'P · Tạm hoãn' };
export function formatTime(value, timeZone = 'UTC') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone }).format(date); }
  catch { return `${date.toISOString()} (UTC)`; }
}
export function Result({ value }) { return <span className={`ex-result ex-result-${value}`}>{resultLabels[value] || value}</span>; }
export function Pager({ data, onChange }) {
  return <div className="ex-pager"><span>{data.totalItems} bản ghi · Trang {data.page + 1}/{Math.max(1, data.totalPages)}</span>
    <button className="cat-btn" disabled={!data.page} onClick={() => onChange(data.page - 1)}>Trước</button>
    <button className="cat-btn" disabled={data.page + 1 >= data.totalPages} onClick={() => onChange(data.page + 1)}>Tiếp</button></div>;
}
export function ErrorNotice({ error, retry }) { return error && <div className="ex-error" role="alert">{error} {retry && <button className="cat-btn" onClick={retry}>Thử lại</button>}</div>; }
export function Field({ label, children }) { return <label className="ex-field"><span>{label}</span>{children}</label>; }
export function Select({ value, onChange, items, label, describe = x => x.name, required = true }) {
  return <Field label={label}><select className="cat-select" required={required} value={value} onChange={e => onChange(e.target.value)}>
    <option value="">Chọn {label.toLowerCase()}</option>{items.map(x => <option key={x.id} value={x.id}>{describe(x)}</option>)}</select></Field>;
}
