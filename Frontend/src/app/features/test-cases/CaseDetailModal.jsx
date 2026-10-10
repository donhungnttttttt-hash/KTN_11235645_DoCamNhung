import { useDialogFocus } from '../../hooks/useDialogFocus';
import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Clock, History, Plus, FileText, Check } from 'lucide-react';
import { testCasesApi } from '../../services/api/testCases';
import { useAuth } from '../auth/AuthProvider';
import { useProject } from '../projects/ProjectProvider';

export function CaseDetailModal({ projectId, caseId, onClose, onUpdated }) {
  return <CaseDetailContent key={`${projectId}:${caseId}`} projectId={projectId} caseId={caseId} onClose={onClose} onUpdated={onUpdated}/>;
}

function CaseDetailContent({ projectId, caseId, onClose, onUpdated }) {
  const { hasRole } = useAuth();
  const { currentProject } = useProject() || {};
  const canApprove = currentProject?.id === projectId && currentProject.projectRole === 'PM';
  const canEdit = canApprove || (currentProject?.id === projectId && hasRole?.('ADMIN'));
  const [selectedRevision, setSelectedRevision] = useState(null);

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('vi'); // 'vi' or 'jp'
  const [showAddRev, setShowAddRev] = useState(false);
  const [newRev, setNewRev] = useState({
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
  const [submitting, setSubmitting] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    loadCase();
    return () => { requestSequence.current += 1; };
  }, [projectId, caseId]);

  const loadCase = async () => {
    const request = ++requestSequence.current;
    setLoading(true);
    setError('');
    try {
      const data = await testCasesApi.getCase(projectId, caseId);
      if (request !== requestSequence.current) return;
      setCaseData(data);
      setSelectedRevision(null);
      if (data.currentRevision) {
        setNewRev({
          titleVi: data.currentRevision.titleVi || '',
          preconditionsVi: data.currentRevision.preconditionsVi || '',
          stepsVi: data.currentRevision.stepsVi || '',
          expectedVi: data.currentRevision.expectedVi || '',
          titleJp: data.currentRevision.titleJp || '',
          preconditionsJp: data.currentRevision.preconditionsJp || '',
          stepsJp: data.currentRevision.stepsJp || '',
          expectedJp: data.currentRevision.expectedJp || '',
          sourceReference: data.currentRevision.sourceReference || ''
        });
      }
    } catch (err) {
      if (request === requestSequence.current) setError(err.message || 'Không thể tải chi tiết test case');
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  };

  const handleApprove = async (revisionId) => {
    setSubmitting(true);
    try {
      await testCasesApi.approveRevision(projectId, caseId, revisionId);
      setPendingApprovalId(null);
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError('Lỗi phê duyệt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRevision = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await testCasesApi.addRevision(projectId, caseId, {...newRev, expectedCurrentRevisionId:caseData.currentRevisionId});
      setShowAddRev(false);
      await loadCase();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || 'Không thể tạo phiên bản mới');
    } finally {
      setSubmitting(false);
    }
  };

  const dialogRef = useDialogFocus(onClose, submitting);

  const cur = selectedRevision || caseData?.currentRevision;

  return (
    <div className="tc-modal-overlay">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Chi tiết test case" className="tc-modal-content tc-case-detail" style={{ maxWidth: '850px' }}>
        <div className="tc-modal-header">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-slate-800 font-mono text-base">{caseData?.caseNo || 'Chi tiết test case'}</h3>
            {!loading && cur && (cur.approved ? (
              <span className="tc-badge-approved">
                <CheckCircle2 size={12} /> Đã phê duyệt (Rev {cur.revisionNo})
              </span>
            ) : (
              <span className="tc-badge-draft">
                <Clock size={12} /> Dự thảo (Rev {cur?.revisionNo || 1})
              </span>
            ))}
          </div>
          <button aria-label="Đóng" disabled={submitting} onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="tc-modal-body space-y-4">
          {error && <div role="alert" className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">{error}
            {!loading && !caseData && <button type="button" className="cat-btn ml-2" disabled={submitting} onClick={loadCase}>Thử lại</button>}
          </div>}

          {loading ? <p role="status" className="p-4 text-center text-slate-500">Đang tải chi tiết test case...</p> : caseData && (!showAddRev ? (
            <>
              {/* Language switcher & Revision info */}
              <div className="flex flex-wrap gap-2 items-center justify-between border-b pb-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('vi')}
                    aria-pressed={activeTab === 'vi'}
                    className={`px-3 py-1 rounded text-xs font-medium ${activeTab === 'vi' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Bản tiếng Việt
                  </button>
                  <button
                    onClick={() => setActiveTab('jp')}
                    aria-pressed={activeTab === 'jp'}
                    className={`px-3 py-1 rounded text-xs font-medium ${activeTab === 'jp' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Bản gốc tiếng Nhật (JP)
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canApprove && cur && !cur.approved && (
                    <button
                      onClick={() => setPendingApprovalId(cur.id)}
                      disabled={submitting}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1"
                    >
                      <Check size={14} /> Phê duyệt bản này
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setShowAddRev(true)}
                      disabled={submitting}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium flex items-center gap-1"
                    >
                      <Plus size={14} /> Thêm phiên bản
                    </button>
                  )}
                </div>
              </div>

              {/* Revision content */}
              {pendingApprovalId && <div role="alertdialog" aria-label="Xác nhận phê duyệt" className="p-3 border border-teal-300 rounded bg-teal-50 text-sm">
                <p>Phê duyệt phiên bản này để có thể đưa vào đợt kiểm thử? Nội dung đã lưu được giữ nguyên.</p>
                <div className="flex gap-2 mt-2">
                  <button disabled={submitting} className="cat-btn cat-btn-mint" onClick={()=>handleApprove(pendingApprovalId)}>Xác nhận phê duyệt</button>
                  <button disabled={submitting} className="cat-btn" onClick={()=>setPendingApprovalId(null)}>Hủy phê duyệt</button>
                </div>
              </div>}
              {cur ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded border border-slate-200 text-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {activeTab === 'vi' ? 'Tiêu đề kiểm thử' : 'Tiêu đề kiểm thử'}
                    </span>
                    <div className="font-semibold text-slate-800">
                      {activeTab === 'vi' ? cur.titleVi : (cur.titleJp || 'Chưa có bản tiếng Nhật')}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {activeTab === 'vi' ? 'Tiền điều kiện' : 'Tiền điều kiện'}
                    </span>
                    <div className="text-slate-700 whitespace-pre-wrap text-xs bg-white p-2.5 rounded border border-slate-200">
                      {activeTab === 'vi' ? (cur.preconditionsVi || 'Không có') : (cur.preconditionsJp || 'Chưa có nội dung')}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {activeTab === 'vi' ? 'Các bước thực hiện' : 'Các bước thực hiện'}
                    </span>
                    <div className="text-slate-700 whitespace-pre-wrap text-xs font-mono bg-white p-2.5 rounded border border-slate-200">
                      {activeTab === 'vi' ? cur.stepsVi : (cur.stepsJp || 'Chưa có nội dung')}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {activeTab === 'vi' ? 'Kết quả mong đợi' : 'Kết quả mong đợi'}
                    </span>
                    <div className="text-slate-700 whitespace-pre-wrap text-xs bg-white p-2.5 rounded border border-slate-200">
                      {activeTab === 'vi' ? cur.expectedVi : (cur.expectedJp || 'Chưa có nội dung')}
                    </div>
                  </div>

                  {cur.sourceReference && (
                    <div className="text-xs text-slate-500">
                      <strong>Tham chiếu nguồn:</strong> {cur.sourceReference}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-4">Chưa có nội dung phiên bản</div>
              )}

              {/* Revision history list */}
              <div className="border-t pt-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                  <History size={14} /> Lịch sử các phiên bản ({caseData?.revisions?.length || 0})
                </h4>
                <div className="space-y-1.5">
                  {caseData?.revisions?.map(r => (
                    <div key={r.id} className="flex flex-wrap gap-2 items-center justify-between text-xs py-1.5 px-3 bg-white border border-slate-200 rounded">
                      <div className="flex flex-wrap min-w-0 items-center gap-2">
                        <button disabled={submitting} className="cat-link font-bold" onClick={async () => {
                          setSubmitting(true); setError('');
                          try { setSelectedRevision(await testCasesApi.getRevision(projectId,caseId,r.id)); }
                          catch (err) { setError(err.message); } finally { setSubmitting(false); }
                        }}>Xem phiên bản {r.revisionNo}</button>
                        <span title={r.titleVi} className="text-slate-600 break-words">{r.titleVi}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {r.approved ? (
                          <span className="text-emerald-600 font-medium">✓ Đã duyệt</span>
                        ) : (
                          <span className="text-amber-600">Dự thảo</span>
                        )}
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Add revision form */
            <form onSubmit={handleAddRevision} className="space-y-3">
              <fieldset disabled={submitting} className="space-y-3 min-w-0">
              <div className="font-bold text-slate-800 text-sm border-b pb-2">
                Soạn thảo phiên bản mới (từ phiên bản {caseData?.currentRevision?.revisionNo || 1})
              </div>

              <div>
                <label htmlFor="CaseDetailModal-field-1" className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề kiểm thử (VI) *</label>
                <input id="CaseDetailModal-field-1"
                  type="text"
                  required
                  value={newRev.titleVi}
                  onChange={e => setNewRev({ ...newRev, titleVi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>

              <div>
                <label htmlFor="CaseDetailModal-field-2" className="block text-xs font-semibold text-slate-700 mb-1">Tiền điều kiện (VI)</label>
                <textarea id="CaseDetailModal-field-2"
                  rows={2}
                  value={newRev.preconditionsVi}
                  onChange={e => setNewRev({ ...newRev, preconditionsVi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div>
                <label htmlFor="CaseDetailModal-field-3" className="block text-xs font-semibold text-slate-700 mb-1">Các bước thực hiện (VI) *</label>
                <textarea id="CaseDetailModal-field-3"
                  rows={4}
                  required
                  value={newRev.stepsVi}
                  onChange={e => setNewRev({ ...newRev, stepsVi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono"
                />
              </div>

              <div>
                <label htmlFor="CaseDetailModal-field-4" className="block text-xs font-semibold text-slate-700 mb-1">Kết quả mong đợi (VI) *</label>
                <textarea id="CaseDetailModal-field-4"
                  rows={3}
                  required
                  value={newRev.expectedVi}
                  onChange={e => setNewRev({ ...newRev, expectedVi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <fieldset className="space-y-3 border-t pt-3">
                <legend className="text-xs font-semibold">Bản gốc tiếng Nhật và nguồn tham chiếu</legend>
                {[
                  ['titleJp','Tiêu đề gốc'], ['preconditionsJp','Tiền điều kiện gốc'],
                  ['stepsJp','Các bước gốc'], ['expectedJp','Kết quả mong đợi gốc'], ['sourceReference','Tham chiếu nguồn'],
                ].map(([field,label]) => <label key={field} className="block text-xs text-slate-600">{label}
                  <textarea rows={field === 'titleJp' || field === 'sourceReference' ? 1 : 3}
                    maxLength={field === 'titleJp' || field === 'sourceReference' ? 255 : 8000}
                    value={newRev[field]} onChange={e=>setNewRev({...newRev,[field]:e.target.value})}
                    className="w-full px-3 py-2 mt-1 border border-slate-300 rounded" />
                </label>)}
              </fieldset>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowAddRev(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu phiên bản'}
                </button>
              </div>
              </fieldset>
            </form>
          ))}
        </div>

        <div className="tc-modal-footer">
          <button type="button" disabled={submitting} onClick={onClose} className="px-4 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

