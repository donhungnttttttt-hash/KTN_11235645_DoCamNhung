import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Upload, ListChecks, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProject } from '../projects/ProjectProvider';
import { useAuth } from '../auth/AuthProvider';
import { testCasesApi } from '../../services/api/testCases';
import { ImportExcelDialog } from './ImportExcelDialog';
import { documentDate } from './documentDownload';
import './test-cases.css';
import './test-documents.css';

const results = [['OK','OK'],['FIXED','Đã sửa'],['NG','NG'],['P','Tạm dừng'],['NA','Ngoài phạm vi'],['UNEXECUTED','Chưa chạy']];

export function TestDocumentsPage({ navigate }) {
  const { currentProject } = useProject() || {};
  if (!currentProject) return <div className="cat-container py-3"><h2 className="text-sm font-bold">Thư viện test case</h2><p role="status">Chọn dự án để xem tài liệu test.</p></div>;
  return <DocumentLibrary key={currentProject.id} project={currentProject} navigate={navigate} />;
}

function DocumentLibrary({ project, navigate }) {
  const { hasRole } = useAuth();
  const canImport = project.projectRole === 'PM' || hasRole?.('ADMIN');
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    if (keyword === search) return;
    const timer = setTimeout(() => { setSearch(keyword); setPage(0); }, 250);
    return () => clearTimeout(timer);
  }, [keyword, search]);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError(''); setData(null);
    try {
      const result = await testCasesApi.listDocuments(project.id, { page, keyword: search });
      if (id === request.current) setData(result);
    } catch (err) { if (id === request.current) setError(err.message || 'Không tải được tài liệu test.'); }
    finally { if (id === request.current) setLoading(false); }
  }, [project.id, page, search]);
  useEffect(() => { load(); return () => { request.current++; }; }, [load]);

  return <div className="cat-container td-page py-3">
    <div className="td-heading-row">
      <div><h2 className="text-sm font-bold text-slate-900">Thư viện test case</h2><p className="td-muted">Danh sách tài liệu Excel · {project.name}</p></div>
      <div className="td-actions">
        {canImport && <button className="cat-btn cat-btn-mint" onClick={() => setShowImport(true)}><Upload size={14} /> Nhập Excel</button>}
        <button className="cat-btn" onClick={() => navigate('/tests/cases')}><ListChecks size={14} /> Tất cả test case</button>
        <button className="cat-btn" aria-label="Làm mới tài liệu" disabled={loading} onClick={load}><RefreshCw size={14}/></button>
      </div>
    </div>
    <div className="td-filter-row">
      <label className="td-search"><Search size={15}/><input type="search" aria-label="Tìm tài liệu" placeholder="Tìm theo tên file Excel..." value={keyword} onChange={e => setKeyword(e.target.value)} /></label>
      <span className="td-muted">Kết quả tài liệu đã lưu · Tiến độ đợt kiểm thử quản lý riêng</span>
    </div>
    {error && <div className="td-error" role="alert">{error} <button className="cat-btn" onClick={load}>Thử lại</button></div>}
    {loading && <p role="status" className="td-empty">Đang tải danh sách tài liệu...</p>}
    {!loading && !error && <>
      <div className="td-table-scroll" role="region" aria-label="Danh sách tài liệu test" tabIndex={0}>
        <table className="td-file-table">
          <thead><tr><th scope="col">No.</th><th scope="col">Tài liệu test</th><th scope="col">Số dòng</th>{results.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}<th scope="col">Cập nhật lúc</th><th scope="col">Người cập nhật</th></tr></thead>
          <tbody>{data?.items?.map(doc => <tr key={doc.id}>
            <td>{doc.id}</td><td><button className="td-file-link" title={doc.fileName} onClick={() => navigate(`/tests/documents/${doc.id}`)}><FileSpreadsheet size={17}/><span>{doc.fileName}</span></button><small className="td-sheet">{doc.sheetName}</small></td>
            <td>{doc.totalRows}</td>{results.map(([key]) => <td key={key}><span className={(doc.resultCounts?.[key] || 0) > 0 ? `td-count td-count-${key.toLowerCase()}` : 'td-zero'}>{doc.resultCounts?.[key] ?? 0}</span></td>)}
            <td className="td-nowrap">{documentDate(doc.updatedAt,project.timezone)}</td><td>{doc.updatedBy || '—'}</td>
          </tr>)}</tbody>
        </table>
        {!data?.items?.length && <div className="td-empty"><FileSpreadsheet size={28}/><p>{search ? 'Không tìm thấy tài liệu phù hợp.' : 'Chưa có tài liệu Excel trong dự án.'}</p><p className="td-muted">Các case đã có vẫn nằm trong “Tất cả test case”.</p></div>}
      </div>
      <div className="td-pagination"><span>{data?.totalItems ?? 0} tài liệu</span><div><button className="cat-btn" aria-label="Trang trước" disabled={page===0} onClick={() => setPage(p => p-1)}><ChevronLeft size={14}/></button><span>Trang {page+1} / {Math.max(1,data?.totalPages || 0)}</span><button className="cat-btn" aria-label="Trang sau" disabled={page+1 >= (data?.totalPages || 0)} onClick={() => setPage(p => p+1)}><ChevronRight size={14}/></button></div></div>
    </>}
    {showImport && <ImportExcelDialog projectId={project.id} onClose={() => setShowImport(false)} onSuccess={result => { setShowImport(false); if (result?.id) navigate(`/tests/documents/${result.id}`); else load(); }} />}
  </div>;
}
