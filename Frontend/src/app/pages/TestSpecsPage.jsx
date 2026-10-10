import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Upload, FolderPlus, CheckCircle2, Clock, Eye, Search, Layers, ListCheck } from 'lucide-react';
import { useProject } from '../features/projects/ProjectProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { testCasesApi } from '../services/api/testCases';
import { CreateSuiteDialog } from '../features/test-cases/CreateSuiteDialog';
import { CreateCaseDialog } from '../features/test-cases/CreateCaseDialog';
import { ImportExcelDialog } from '../features/test-cases/ImportExcelDialog';
import { CaseDetailModal } from '../features/test-cases/CaseDetailModal';
import '../features/test-cases/test-cases.css';
import '../features/test-execution/execution.css';

export function TestSpecsPage({ navigate = () => {} }) {
  const projectContext = useProject();
  const currentProject = projectContext?.currentProject;
  const { hasRole } = useAuth();
  const canEdit = !!currentProject && (currentProject.projectRole === 'PM' || hasRole?.('ADMIN'));
  const requestId = useRef(0);

  const [viewMode, setViewMode] = useState('cases'); // 'cases' or 'suites'
  const [suites, setSuites] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  useEffect(() => { const timer=setTimeout(()=>{setSearch(searchKeyword);setPage(0);},250); return ()=>clearTimeout(timer); },[searchKeyword]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showCreateSuite, setShowCreateSuite] = useState(false);
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState(null);

  const loadData = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!currentProject) { setSuites([]); setCases([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const [suitesData, casesData] = await Promise.all([
        testCasesApi.listSuites(currentProject.id),
        testCasesApi.listCases(currentProject.id, selectedSuiteId || undefined, {page,keyword:search})
      ]);
      if (requestId.current !== currentRequest) return;
      setSuites(suitesData);
      setCases(casesData.items); setTotalItems(casesData.totalItems); setTotalPages(casesData.totalPages);
    } catch (err) {
      if (requestId.current !== currentRequest) return;
      setSuites([]); setCases([]); setError(err.message || 'Không tải được dữ liệu. Vui lòng thử lại.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [currentProject, selectedSuiteId, page, search]);

  useEffect(() => {
    loadData();
    return () => { requestId.current++; };
  }, [loadData]);

  useEffect(() => {
    setSelectedSuiteId(''); setPage(0); setPage(0); setTotalItems(0); setTotalPages(0); setCases([]); setSuites([]);
    setShowCreateSuite(false); setShowCreateCase(false); setShowImport(false); setActiveCaseId(null);
  }, [currentProject?.id]);

  const filteredCases = cases;

  return (
    <div className="cat-container space-y-3 py-3">
      {!currentProject && <p role="status">Chọn hoặc tạo dự án để quản lý test case.</p>}
      {/* Top Header Bar */}
      <div className="tc-library-header">
        <div className="tc-library-heading">
          <h2 className="text-sm font-bold text-slate-900">
            Thư viện test case
            {currentProject && <span className="text-xs text-teal-700 font-normal ml-2">({currentProject.name})</span>}
          </h2>

          <div className="tc-library-views flex bg-slate-100 p-0.5 rounded text-xs" role="group" aria-label="Nội dung thư viện">
            <button
              onClick={() => setViewMode('cases')}
              aria-pressed={viewMode === 'cases'}
              className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 ${viewMode === 'cases' ? 'bg-white shadow-sm text-teal-800' : 'text-slate-600'}`}
            >
              <ListCheck size={13} /> Test case ({totalItems})
            </button>
            <button
              onClick={() => setViewMode('suites')}
              aria-pressed={viewMode === 'suites'}
              className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 ${viewMode === 'suites' ? 'bg-white shadow-sm text-teal-800' : 'text-slate-600'}`}
            >
              <Layers size={13} /> Nhóm test case ({suites.length})
            </button>
          </div>
        </div>

        <div className="tc-library-actions flex flex-wrap items-center gap-1.5 text-[11px]">
          <button className="cat-btn" onClick={() => navigate('/tests')}>Tài liệu Excel</button>
          {canEdit && currentProject && (
            <>
              <button
                onClick={() => setShowCreateCase(true)}
                className="cat-btn cat-btn-mint flex items-center gap-1"
              >
                <Plus size={13} /> Đăng ký Case
              </button>
              <button
                onClick={() => setShowCreateSuite(true)}
                className="cat-btn flex items-center gap-1"
              >
                <FolderPlus size={13} /> Tạo nhóm
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="cat-btn flex items-center gap-1 bg-slate-50 border-teal-300 text-teal-700 font-semibold"
              >
                <Upload size={13} /> Nhập Excel
              </button>
            </>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm mã / tên case..."
              aria-label="Tìm kiếm mã hoặc tên test case"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="cat-input w-48 pl-7"
            />
            <Search size={13} className="absolute left-2 top-2 text-slate-400" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
          {error} <button onClick={loadData} className="cat-btn">Thử lại</button>
        </div>
      )}

      {/* Main View Mode: Test Cases */}
      {viewMode === 'cases' && (
        <div className="space-y-2">
          {/* Suite filter bar */}
          {suites.length > 0 && (
            <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
              <span className="text-slate-500 font-medium">Lọc theo Suite:</span>
              <button
                onClick={() => { setSelectedSuiteId(''); setPage(0); }}
                className={`px-2 py-0.5 rounded border ${!selectedSuiteId ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-slate-300 text-slate-600'}`}
              >
                Tất cả ({totalItems})
              </button>
              {suites.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSuiteId(String(s.id)); setPage(0); }}
                  className={`px-2 py-0.5 rounded border ${selectedSuiteId === String(s.id) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-slate-300 text-slate-600'}`}
                >
                  {s.code} ({s.caseCount || 0})
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="cat-table">
              <thead>
                <tr>
                  <th className="w-24 text-center">Case No.</th>
                  <th>Tiêu đề kiểm thử</th>
                  <th className="w-28 text-center">Phiên bản</th>
                  <th className="w-32 text-center">Trạng thái duyệt</th>
                  <th className="w-28">Ngày tạo</th>
                  <th className="w-20 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      {loading ? 'Đang tải dữ liệu...' : 'Chưa có test case nào trong phạm vi này. Nhấn "Đăng ký Case" hoặc "Nhập Excel" để thêm mới.'}
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setActiveCaseId(c.id)}>
                      <td className="text-center font-mono font-bold text-teal-700 text-xs">
                        {c.caseNo}
                      </td>
                      <td>
                        <span className="font-medium text-slate-800 text-xs hover:text-teal-600">
                          {c.titleVi || '(Chưa có tiêu đề)'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          Rev {c.currentRevisionId ? 'Hiện tại' : '1'}
                        </span>
                      </td>
                      <td className="text-center">
                        {c.approved ? (
                          <span className="tc-badge-approved">
                            <CheckCircle2 size={11} /> Đã duyệt
                          </span>
                        ) : (
                          <span className="tc-badge-draft">
                            <Clock size={11} /> Dự thảo
                          </span>
                        )}
                      </td>
                      <td className="text-slate-500 text-[10px]">
                        {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveCaseId(c.id); }}
                          className="text-slate-500 hover:text-teal-600 p-1"
                          title="Xem chi tiết và lịch sử"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'cases' && totalItems > 0 && <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{totalItems} test case · Trang {page+1}/{Math.max(totalPages,1)}</span>
        <div className="flex gap-2">
          <button className="cat-btn" disabled={loading || page===0} onClick={()=>setPage(p=>p-1)}>Trang trước</button>
          <button className="cat-btn" disabled={loading || page+1>=totalPages} onClick={()=>setPage(p=>p+1)}>Trang sau</button>
        </div>
      </div>}
      {/* Secondary View Mode: Test Suites / Specifications */}
      {viewMode === 'suites' && (
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="cat-table">
            <thead>
              <tr>
                <th className="w-12 text-center">No.</th>
                <th>Mã nhóm (Suite Code)</th>
                <th>Tên Test Specification</th>
                <th className="text-center">Số Case</th>
                <th>Mô tả</th>
                <th>Ngày cập nhật</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {suites.length > 0 ? (
                suites.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="font-mono font-bold text-teal-700 text-xs">{s.code}</td>
                    <td>
                      <span
                        onClick={() => { setSelectedSuiteId(String(s.id)); setPage(0); setViewMode('cases'); }}
                        className="cat-link font-medium cursor-pointer"
                      >
                        {s.name}
                      </span>
                    </td>
                    <td className="text-center font-bold">{s.caseCount || 0}</td>
                    <td className="text-slate-600 text-xs">{s.description || '-'}</td>
                    <td className="text-slate-500 text-[10px]">{new Date(s.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="text-center">
                      <button
                        onClick={() => { setSelectedSuiteId(String(s.id)); setViewMode('cases'); }}
                        className="cat-btn text-[10px] px-2 py-0.5"
                      >
                        Xem {s.caseCount || 0} cases
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-6 text-slate-500">{loading ? 'Đang tải...' : 'Chưa có nhóm test case.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateSuite && currentProject && (
        <CreateSuiteDialog
          projectId={currentProject.id}
          onClose={() => setShowCreateSuite(false)}
          onSuccess={loadData}
        />
      )}

      {showCreateCase && currentProject && (
        <CreateCaseDialog
          projectId={currentProject.id}
          suites={suites}
          defaultSuiteId={selectedSuiteId ? Number(selectedSuiteId) : undefined}
          onClose={() => setShowCreateCase(false)}
          onSuccess={loadData}
        />
      )}

      {showImport && currentProject && (
        <ImportExcelDialog
          projectId={currentProject.id}
          onClose={() => setShowImport(false)}
          onSuccess={result => navigate?.(`/tests/documents/${result.id}`)}
        />
      )}

      {activeCaseId && currentProject && (
        <CaseDetailModal key={`${currentProject.id}-${activeCaseId}`}
          projectId={currentProject.id}
          caseId={activeCaseId}
          onClose={() => setActiveCaseId(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
