import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { TableScroll } from '../../components/TableScroll';

export function ExcelImportPreview({ previewData }) {
  const [errorsOnly, setErrorsOnly] = useState(false);
  return <div className="space-y-4">
              <div className="text-sm"><strong>{previewData?.fileName}</strong><p className="text-xs text-slate-500 mt-1">{previewData?.format === 'CUSTOMER_V1' ? 'Mẫu tài liệu khách hàng' : 'Mẫu nội bộ'} · Sheet: {previewData?.sheetName || 'TestCases'}</p></div>

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
              <TableScroll label="Các dòng xem trước" role="region" aria-label="Các dòng xem trước" tabIndex={0} className="max-h-60 overflow-auto border border-slate-200 rounded">
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
                            <div className="ui-caption text-red-600 font-medium mt-0.5">{r.errorMessage}</div>
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
              </TableScroll>
  </div>;
}
