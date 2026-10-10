import { useDialogFocus } from '../../hooks/useDialogFocus';
import React, { useState } from 'react';
import { X, Languages } from 'lucide-react';
import { testCasesApi } from '../../services/api/testCases';

export function CreateCaseDialog({ projectId, suites, onClose, onSuccess, defaultSuiteId }) {
  const [activeTab, setActiveTab] = useState('vi'); // 'vi' or 'jp'
  const [formData, setFormData] = useState({
    caseNo: '',
    suiteId: defaultSuiteId || (suites[0]?.id || ''),
    titleVi: '',
    preconditionsVi: '',
    stepsVi: '',
    expectedVi: '',
    titleJp: '',
    preconditionsJp: '',
    stepsJp: '',
    expectedJp: '',
    sourceReference: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus(onClose, loading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.suiteId) {
      setError('Vui lòng chọn nhóm Test Specification');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await testCasesApi.createCase(projectId, {
        ...formData,
        suiteId: Number(formData.suiteId)
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể tạo test case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tc-modal-overlay">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Tạo test case" className="tc-modal-content">
        <div className="tc-modal-header">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">Đăng ký Test Case mới</h3>
            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-mono">Revision 1</span>
          </div>
          <button aria-label="Đóng" disabled={loading} onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="tc-modal-body space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="CreateCaseDialog-field-1" className="block text-xs font-semibold text-slate-700 mb-1">Mã Test Case (Case No.) *</label>
                <input id="CreateCaseDialog-field-1"
                  type="text"
                  required
                  placeholder="VD: TC-AUTH-001"
                  value={formData.caseNo}
                  onChange={e => setFormData({ ...formData, caseNo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label htmlFor="CreateCaseDialog-field-2" className="block text-xs font-semibold text-slate-700 mb-1">Nhóm Test Specification *</label>
                <select id="CreateCaseDialog-field-2"
                  required
                  value={formData.suiteId}
                  onChange={e => setFormData({ ...formData, suiteId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500 bg-white"
                >
                  <option value="">-- Chọn nhóm --</option>
                  {suites.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="CreateCaseDialog-field-3" className="block text-xs font-semibold text-slate-700 mb-1">Nguồn tham chiếu (Source Reference)</label>
              <input id="CreateCaseDialog-field-3"
                type="text"
                placeholder="VD: Sheet Login_v2.0 dòng 14 / JIRA-1234"
                value={formData.sourceReference}
                onChange={e => setFormData({ ...formData, sourceReference: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Language tabs */}
            <div>
              <div className="tc-tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('vi')}
                  className={`tc-tab-btn ${activeTab === 'vi' ? 'active' : ''}`}
                >
                  <span className="tc-lang-label tc-lang-vi">VI</span> Bản dịch tiếng Việt *
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('jp')}
                  className={`tc-tab-btn ${activeTab === 'jp' ? 'active' : ''}`}
                >
                  <span className="tc-lang-label tc-lang-jp">JP</span> Bản gốc tiếng Nhật (Source)
                </button>
              </div>

              {activeTab === 'vi' ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="CreateCaseDialog-field-4" className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề ca kiểm thử (VI) *</label>
                    <input id="CreateCaseDialog-field-4"
                      type="text"
                      required
                      placeholder="VD: Đăng nhập thành công với tài khoản hợp lệ"
                      value={formData.titleVi}
                      onChange={e => setFormData({ ...formData, titleVi: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="CreateCaseDialog-field-5" className="block text-xs font-semibold text-slate-700 mb-1">Tiền điều kiện (Preconditions VI)</label>
                    <textarea id="CreateCaseDialog-field-5"
                      rows={2}
                      placeholder="VD: Người dùng đã được cấp tài khoản và kích hoạt"
                      value={formData.preconditionsVi}
                      onChange={e => setFormData({ ...formData, preconditionsVi: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="CreateCaseDialog-field-6" className="block text-xs font-semibold text-slate-700 mb-1">Các bước thực hiện (Steps VI) *</label>
                    <textarea id="CreateCaseDialog-field-6"
                      rows={4}
                      required
                      placeholder="1. Mở trang đăng nhập&#10;2. Nhập tên người dùng hợp lệ&#10;3. Nhập mật khẩu và nhấn 'Đăng nhập'"
                      value={formData.stepsVi}
                      onChange={e => setFormData({ ...formData, stepsVi: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="CreateCaseDialog-field-7" className="block text-xs font-semibold text-slate-700 mb-1">Kết quả mong đợi (Expected Result VI) *</label>
                    <textarea id="CreateCaseDialog-field-7"
                      rows={3}
                      required
                      placeholder="VD: Đăng nhập thành công, chuyển hướng vào màn hình Tổng quan"
                      value={formData.expectedVi}
                      onChange={e => setFormData({ ...formData, expectedVi: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="CreateCaseDialog-field-8" className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề gốc (Nhật)</label>
                    <input id="CreateCaseDialog-field-8"
                      type="text"
                      placeholder="例: 有効なアカウントで正常にログインできること"
                      value={formData.titleJp}
                      onChange={e => setFormData({ ...formData, titleJp: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="CreateCaseDialog-field-9" className="block text-xs font-semibold text-slate-700 mb-1">Tiền điều kiện gốc (Nhật)</label>
                    <textarea id="CreateCaseDialog-field-9"
                      rows={2}
                      placeholder="例: ユーザーが有効化されていること"
                      value={formData.preconditionsJp}
                      onChange={e => setFormData({ ...formData, preconditionsJp: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="CreateCaseDialog-field-10" className="block text-xs font-semibold text-slate-700 mb-1">Các bước gốc (Nhật)</label>
                    <textarea id="CreateCaseDialog-field-10"
                      rows={4}
                      placeholder="1. ログイン画面を開く&#10;2. 正しいIDとPWを入力する&#10;3. ログインボタンを押下する"
                      value={formData.stepsJp}
                      onChange={e => setFormData({ ...formData, stepsJp: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="CreateCaseDialog-field-11" className="block text-xs font-semibold text-slate-700 mb-1">Kết quả mong đợi gốc (Nhật)</label>
                    <textarea id="CreateCaseDialog-field-11"
                      rows={3}
                      placeholder="例: 正常にログインでき、ダッシュボードへ遷移すること"
                      value={formData.expectedJp}
                      onChange={e => setFormData({ ...formData, expectedJp: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="tc-modal-footer">
            <button type="button" disabled={loading} onClick={onClose} className="px-4 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50">
              Hủy
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-medium disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Lưu Test Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

