import { useDialogFocus } from '../../hooks/useDialogFocus';
import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { testCasesApi } from '../../services/api/testCases';

export function ImportExcelDialog({ projectId, onClose, onSuccess }) {
  const [step, setStep] = useState('input'); // 'input' or 'preview'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus(onClose, loading);
  const [previewData, setPreviewData] = useState(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const previewHeading = useRef(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, [projectId]);
  useEffect(() => { if (step === 'preview') previewHeading.current?.focus(); }, [step]);

  const handleParseAndPreview = async () => {
    if (loading) return;
    const request = generation.current;
    setError('');
    if (!file || !file.name.toLowerCase().endsWith('.xlsx') || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError('Chọn tệp .xlsx không rỗng, không quá 5 MiB.');
      return;
    }
    setLoading(true);
    try {
      const preview = await testCasesApi.createImportPreview(projectId, file);
      if (request !== generation.current) return;
      setPreviewData(preview);
      setErrorsOnly(false);
      setStep('preview');
    } catch (err) {
      if (request === generation.current) setError(err.message || 'Lỗi khi tạo bản xem trước nhập liệu');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (loading || !previewData || previewData.status !== 'PREVIEW' || !previewData.validRows || previewData.errorRows > 0) return;
    const request = generation.current;
    setLoading(true);
    setError('');
    try {
      const committed = await testCasesApi.commitImportPreview(projectId, previewData.id);
      if (request !== generation.current) return;
      onSuccess(committed);
      onClose();
    } catch (err) {
      if (request === generation.current) setError(err.message || 'Lỗi khi xác nhận nhập dữ liệu');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  };

  return (
    <div className="tc-modal-overlay">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-busy={loading} aria-label="Nhập test case từ Excel" className="tc-modal-content" style={{ maxWidth: '850px' }}>
        <div className="tc-modal-header">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-teal-600" size={20} />
            <h3 className="font-bold text-slate-800">Nhập test case từ Excel</h3>
          </div>
          <button aria-label="Đóng" disabled={loading} onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="tc-modal-body">
          <ol aria-label="Các bước nhập Excel" className="flex gap-3 mb-4 text-xs border-b border-slate-200 pb-3">
            <li aria-current={step === 'input' ? 'step' : undefined} className={step === 'input' ? 'font-semibold text-teal-700' : 'text-slate-500'}>1. Chọn tệp</li>
            <li aria-current={step === 'preview' ? 'step' : undefined} className={step === 'preview' ? 'font-semibold text-teal-700' : 'text-slate-500'}>2. Xem trước và xác nhận</li>
          </ol>
          {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">{error}</div>}

          {step === 'input' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Tự nhận diện theo tên cột, không phụ thuộc thứ tự. Cần có ID, Đối tượng test, Các bước test và Kết quả mong đợi. Một sheet, tối đa 500 dòng, 64 cột và 5 MiB.</p>
              <details className="text-xs text-slate-600 rounded border border-slate-200 p-3">
                <summary className="cursor-pointer font-medium">Quy tắc nhận diện cột và ô gộp</summary>
                <p className="mt-2">Chấp nhận “Điều kiện tiền đề / Điều kiện tiên quyết”, “Mục xác nhận / Hạng mục xác nhận” và khoảng trắng trong tiêu đề. Giữ nguyên tên file, thứ tự và các cột bổ sung. Ô Đối tượng test trống kế thừa dòng trước để tạo case; dữ liệu nguồn vẫn giữ trống. Kết quả Excel chỉ để tham khảo. Mẫu TestCases nội bộ cũ vẫn được hỗ trợ.</p>
                <p className="mt-2">Mẫu khách hàng cho phép ô gộp ngang ở cột trình bày sang cột trống. Ô gộp trong ID, nội dung test case hoặc qua nhiều dòng cần tách trước; thông báo sẽ chỉ rõ vùng ô cần sửa.</p>
              </details>
              <button className="cat-btn" disabled={loading} onClick={async () => {
                const request = generation.current;
                setLoading(true); setError('');
                try {
                  const blob = await testCasesApi.importTemplate(projectId);
                  if (request !== generation.current) return;
                  const url = URL.createObjectURL(blob); const link = document.createElement('a');
                  link.href=url; link.download='test-cases-template.xlsx'; link.click();
                  setTimeout(() => URL.revokeObjectURL(url),1000);
                } catch (err) { if (request === generation.current) setError(err.message); } finally { if (request === generation.current) setLoading(false); }
              }}>Tải mẫu Excel theo tiêu đề</button>
              <label className="block text-sm font-medium">Chọn tệp Excel
                <input type="file" accept=".xlsx" disabled={loading} onChange={e => { setFile(e.target.files?.[0] || null); setError(''); }} className="block mt-2 w-full cat-input" />
              </label>
              {file && <p className="text-xs text-slate-500">{file.name}</p>}
              <p className="text-xs text-slate-500">Không ghi đè test case đã tồn tại. Nếu có dòng lỗi, sửa file và tải lên lại trước khi xác nhận.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 ref={previewHeading} tabIndex={-1} className="font-semibold text-sm text-slate-800">Xem trước dữ liệu</h4>
              <div className="text-sm"><strong>{previewData?.fileName}</strong><p className="text-xs text-slate-500 mt-1">{previewData?.format === 'CUSTOMER_V1' ? 'Mẫu tài liệu khách hàng' : 'Mẫu nội bộ'} · Sheet: {previewData?.sheetName || 'TestCases'}</p></div>
              {previewData?.status === "COMMITTED" && <><p role="status">Tệp này đã được nhập trước đó. Không tạo dữ liệu trùng.</p><button className="cat-btn cat-btn-mint" onClick={() => { onSuccess(previewData); onClose(); }}>Mở tài liệu đã nhập</button></>}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center">
                  <div className="text-xs text-slate-500 font-medium">Tổng số dòng</div>
                  <div className="text-lg font-bold text-slate-800">{previewData?.totalRows || 0}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-center">
                  <div className="text-xs text-emerald-600 font-medium">Hợp lệ</div>
                  <div className="text-lg font-bold text-emerald-700">{previewData?.validRows || 0}</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-center">
                  <div className="text-xs text-amber-600 font-medium">Dòng lỗi</div>
                  <div className="text-lg font-bold text-amber-700">{previewData?.errorRows || 0}</div>
                </div>
              </div>

              {previewData?.errorRows > 0 && <div className="p-3 rounded border border-amber-200 bg-amber-50 text-xs text-amber-900">
                <p>Chưa thể nhập: sửa các dòng lỗi trong Excel, sau đó chọn lại tệp để xem trước.</p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" checked={errorsOnly} onChange={e => setErrorsOnly(e.target.checked)} />Chỉ hiện dòng lỗi</label>
              </div>}
              <div role="region" aria-label="Các dòng xem trước" tabIndex={0} className="max-h-60 overflow-auto border border-slate-200 rounded">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="bg-slate-100 sticky top-0 text-slate-600 font-semibold border-b whitespace-nowrap">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">Dòng</th>
                      <th className="py-2 px-3 w-28">ID nguồn</th>
                      <th className="py-2 px-3 w-20">Nhóm test</th>
                      <th className="py-2 px-3">Tiêu đề kiểm thử</th>
                      <th className="py-2 px-3 w-28 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData?.rows?.filter(r => !errorsOnly || !r.valid).map(r => (
                      <tr key={r.rowNumber} className={r.valid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-mono font-medium">{r.sourceCaseKey}</td>
                        <td className="py-2 px-3 font-mono">{r.suiteCode || '-'}</td>
                        <td className="py-2 px-3">
                          <div>{r.titleVi}</div>
                          {r.errorMessage && (
                            <div className="text-[11px] text-red-600 font-medium mt-0.5">{r.errorMessage}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 size={13} /> Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                              <AlertTriangle size={13} /> Lỗi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="tc-modal-footer">
          {step === 'input' ? (
            <>
              <button type="button" disabled={loading} onClick={onClose} className="px-4 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50">
                Hủy
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleParseAndPreview}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : <>Xem trước kết quả <ArrowRight size={14} /></>}
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={loading} onClick={() => setStep('input')} className="px-4 py-2 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50">
                Quay lại sửa
              </button>
              <button
                type="button"
                disabled={loading || previewData?.status !== "PREVIEW" || (previewData?.validRows || 0) === 0 || previewData?.errorRows > 0}
                onClick={handleCommit}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? 'Đang nhập...' : `Xác nhận nhập (${previewData?.validRows || 0} dòng hợp lệ)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

