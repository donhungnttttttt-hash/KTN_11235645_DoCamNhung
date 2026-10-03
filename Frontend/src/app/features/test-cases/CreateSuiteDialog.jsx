import { useDialogFocus } from '../../hooks/useDialogFocus';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { testCasesApi } from '../../services/api/testCases';

export function CreateSuiteDialog({ projectId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    sortOrder: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus(onClose, loading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await testCasesApi.createSuite(projectId, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể tạo nhóm test case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tc-modal-overlay">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Tạo nhóm test case" className="tc-modal-content" style={{ maxWidth: '500px' }}>
        <div className="tc-modal-header">
          <h3 className="font-bold text-slate-800">Tạo nhóm Test Specification mới</h3>
          <button aria-label="Đóng" disabled={loading} onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="tc-modal-body space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">{error}</div>}
            <div>
              <label htmlFor="CreateSuiteDialog-field-1" className="block text-xs font-semibold text-slate-700 mb-1">Mã nhóm (Suite Code) *</label>
              <input id="CreateSuiteDialog-field-1"
                type="text"
                required
                placeholder="VD: AUTH, DASHBOARD, BILLING"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label htmlFor="CreateSuiteDialog-field-2" className="block text-xs font-semibold text-slate-700 mb-1">Tên nhóm *</label>
              <input id="CreateSuiteDialog-field-2"
                type="text"
                required
                placeholder="VD: Kiểm thử chức năng Đăng nhập & Xác thực"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label htmlFor="CreateSuiteDialog-field-3" className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
              <textarea id="CreateSuiteDialog-field-3"
                rows={3}
                placeholder="Mô tả phạm vi các ca kiểm thử trong nhóm..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div className="tc-modal-footer">
            <button type="button" disabled={loading} onClick={onClose} className="px-4 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50">
              Hủy
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-medium disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

