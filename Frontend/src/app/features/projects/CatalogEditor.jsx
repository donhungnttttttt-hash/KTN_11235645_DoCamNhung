import React, { useState } from 'react';
import { projectsApi } from '../../services/api/projects';

const code = { key: 'code', label: 'Mã', max: 32, required: true };
const name = { key: 'name', label: 'Tên', max: 100, required: true };
export const catalogFields = {
  environments: [code, name, { key: 'description', label: 'Mô tả', max: 500 }],
  builds: [{ key: 'platform', label: 'Nền tảng', max: 32, required: true }, { key: 'versionLabel', label: 'Phiên bản', max: 50, required: true }, { key: 'buildNumber', label: 'Số bản build', max: 50 }, { key: 'notes', label: 'Ghi chú', max: 500 }, { key: 'releasedAt', label: 'Ngày phát hành', type: 'date' }],
  devices: [code, name, { key: 'model', label: 'Mẫu thiết bị', max: 100 }, { key: 'osName', label: 'Hệ điều hành', max: 50 }, { key: 'osVersion', label: 'Phiên bản hệ điều hành', max: 50 }],
  categories: [code, name],
  milestones: [code, name, { key: 'startsOn', label: 'Ngày bắt đầu', type: 'date' }, { key: 'dueOn', label: 'Ngày kết thúc', type: 'date' }],
};

export function CatalogEditor({ projectId, kind, item, onClose, onSaved }) {
  const fields = catalogFields[kind];
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(field => [field.key, item?.[field.key] ?? ''])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const payload = Object.fromEntries(fields.filter(field => !item || field.key !== 'code').map(field => [field.key, field.type === 'date' ? (form[field.key] || null) : form[field.key].trim()]));
      const clearDates = fields.filter(field => item && field.type === 'date' && item[field.key] && !form[field.key]).map(field => field.key);
      if (clearDates.length) payload.clearDates = clearDates;
      if (item) await projectsApi.updateCatalog(projectId, kind, item.id, { ...payload, expectedVersion: item.version });
      else await projectsApi.createCatalog(projectId, kind, payload);
      onSaved();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form className="settings-editor" onSubmit={save} aria-label={item ? 'Sửa danh mục' : 'Thêm danh mục'}>
    <h2>{item ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <fieldset disabled={busy} className="settings-fields">
      {fields.map((field, index) => <label className="form-group" key={field.key}>{field.label}
        <input autoFocus={index === 0} type={field.type || 'text'} maxLength={field.max} required={field.required} disabled={!!item && field.key === 'code'} value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} />
      </label>)}
    </fieldset>
    <div className="settings-actions"><button className="cat-btn primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu danh mục'}</button><button type="button" className="cat-btn" disabled={busy} onClick={onClose}>Hủy</button></div>
    {item && <p className="settings-hint">Nếu dữ liệu đã thay đổi, hủy bản sửa và mở lại để lấy phiên bản mới nhất.</p>}
  </form>;
}
