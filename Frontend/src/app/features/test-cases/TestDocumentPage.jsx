import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Search, ClipboardList, RefreshCw, Table2, Highlighter, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useProject } from '../projects/ProjectProvider';
import { useAuth } from '../auth/AuthProvider';
import { testCasesApi } from '../../services/api/testCases';
import { CaseDetailModal } from './CaseDetailModal';
import { DocumentCaseDialog } from './DocumentCaseDialog';
import { CaseHistoryDialog } from './CaseHistoryDialog';
import { useDocumentExecution, DocumentExecutionControls } from './DocumentExecution';
import { ResultCycleButton } from './ResultCycleButton';
import { useDocumentResults } from './useDocumentResults';
import { DocumentResultHistory } from './DocumentResultHistory';
import { downloadWorkbook, documentDate, documentExportName } from './documentDownload';
import './test-cases.css';
import './test-documents.css';

const internalLabels = ['Mã case','Mã nhóm','Đối tượng test','Điều kiện tiên quyết','Các bước test','Kết quả mong đợi','Tiêu đề gốc','Điều kiện gốc','Các bước gốc','Kết quả gốc','Tham chiếu nguồn'];
const resultOptions = [['OK','OK'],['FIXED','Đã sửa'],['NG','NG'],['PENDING','Tạm dừng'],['NA','Ngoài phạm vi'],['-','Chưa ghi'],['OTHER','Khác']];
const fieldWidths = {sourceId:48,titleVi:155,preconditionsVi:190,stepsVi:200,viewpoint:155,confirmation:180,expectedVi:210,designNote:175,result:84,executionNote:180,sourceReference:120,tester:140};
const legacyColumns = {sourceId:0,titleVi:1,preconditionsVi:2,stepsVi:3,viewpoint:4,confirmation:5,expectedVi:6,designNote:7,result:8,executionNote:9,sourceReference:10,tester:11};
function resultKey(value) {
  const key=String(value || '').trim().toUpperCase();
  if (!key || key==='-' || key==='UNEXECUTED' || key==='NOT_RUN') return '-';
  if (key==='FIX') return 'FIXED';
  if (key==='P') return 'PENDING';
  return resultOptions.some(([code])=>code===key) ? key : 'OTHER';
}
function CellText({ value }) {
  return <div className="td-cell-text">{String(value ?? '').split(/(https?:\/\/[^\s<>]+)/g).map((part,index)=>/^https?:\/\//.test(part)
    ? <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part)}</div>;
}
export function TestDocumentPage({ documentId, navigate }) {
  const { currentProject } = useProject() || {};
  if (!currentProject) return <div className="cat-container py-3"><p role="status">Chọn dự án để xem tài liệu test.</p></div>;
  return <DocumentGrid key={`${currentProject.id}/${documentId}`} project={currentProject} documentId={documentId} navigate={navigate}/>;
}

function DocumentGrid({ project, documentId, navigate }) {
  const {hasRole}=useAuth();
  const dev=hasRole?.('DEV') || project.projectRole==='DEV';
  const execution=useDocumentExecution(project,documentId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [fontSize, setFontSize] = useState(13);
  const [highlight, setHighlight] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const grid = useRef(null);
  const [activeCase, setActiveCase] = useState(null);
  const [caseMenu,setCaseMenu]=useState(null),[detailCase,setDetailCase]=useState(null),[historyCase,setHistoryCase]=useState(null),[message,setMessage]=useState('');
  const [widths,setWidths]=useState({});
  const [resultHistory,setResultHistory]=useState(null),[lastSaved,setLastSaved]=useState(null);
  const results=useDocumentResults(project.id,documentId,data,setLastSaved);
  const resize=useRef(null),menuRef=useRef(null);
  const request = useRef(0), mounted = useRef(true);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError('');
    try { const result = await testCasesApi.getDocument(project.id, documentId); if (id===request.current) setData(result); }
    catch (err) { if (id===request.current) { setError(err.message || 'Không tải được tài liệu test.'); setData(null); setActiveCase(null); } }
    finally { if (id===request.current) setLoading(false); }
  }, [project.id, documentId]);
  useEffect(() => { mounted.current=true; load(); return () => { request.current++; mounted.current=false; }; }, [load]);
  const customer = data?.document.format==='CUSTOMER_V1';
  const columns = data?.columns || (customer ? legacyColumns : {sourceId:0});
  const idColumn = columns.sourceId ?? 0;
  const resultColumn = columns.result;
  const columnWidth = index => widths[index] || (customer ? (fieldWidths[Object.keys(columns).find(key=>columns[key]===index)] || 140) : index===0?90:210);
  const displayRows=useMemo(()=>(data?.rows || []).map(row=>{
    if(resultColumn==null)return row;
    const cells=[...row.cells];cells[resultColumn]=results.overrides[row.rowId] ?? row.resultStatus ?? 'Unexecuted';
    return {...row,cells};
  }),[data,resultColumn,results.overrides]);
  const rows = useMemo(() => displayRows.filter(row =>
    (!resultFilter || resultKey(row.cells[resultColumn])===resultFilter) &&
    row.cells.some(cell => String(cell).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))), [displayRows, search, resultFilter, resultColumn]);
  const totalPages = Math.max(1,Math.ceil(rows.length/pageSize));
  const currentPage = Math.min(page,totalPages-1);
  const visibleRows = rows.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  useEffect(()=>{ if (grid.current) grid.current.scrollTop=0; },[currentPage,search,resultFilter,pageSize]);
  useEffect(()=>{setCaseMenu(null);},[currentPage,search,resultFilter,pageSize]);
  useEffect(()=>{
    if(!caseMenu)return;
    const outside=e=>{if(!menuRef.current?.contains(e.target))setCaseMenu(null);};
    const escape=e=>{if(e.key==='Escape'){menuRef.current?.querySelector('button')?.focus();setCaseMenu(null);}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[caseMenu]);
  useEffect(()=>{
    if(!data)return;
    const id=new URLSearchParams(window.location.hash.split('?')[1] || '').get('caseId');
    const row=data.rows.find(r=>String(r.caseId)===id);
    if(row)setDetailCase(row.caseId);
  },[data?.document.id]);
  async function copyCase(row){
    setCaseMenu(null);setMessage('');
    try{await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/tests/documents/${documentId}?caseId=${row.caseId}`);if(mounted.current)setMessage(`Đã sao chép URL test case ${row.sourceId}.`);}
    catch{if(mounted.current)setMessage('Không sao chép được liên kết. Hãy kiểm tra quyền clipboard của trình duyệt.');}
  }
  function clearFilters() { setSearch(''); setResultFilter(''); setPage(0); }
  async function download(original) {
    setDownloading(true); setDownloadError('');
    try {
      const blob = await testCasesApi.exportDocument(project.id, documentId, original);
      if (mounted.current) downloadWorkbook(blob,documentExportName(data.document.fileName,original));
    } catch (err) { if (mounted.current) setDownloadError(err.message || 'Không xuất được Excel.'); }
    finally { if (mounted.current) setDownloading(false); }
  }
  const back = <button className="cat-btn" onClick={() => navigate('/tests')}><ArrowLeft size={14}/> Danh sách tài liệu</button>;
  if (!data) return <div className="cat-container td-page py-3">{back}{loading && <p role="status" className="td-empty">Đang tải bảng test case...</p>}{error && <div className="td-error" role="alert">{error} <button className="cat-btn" onClick={load}>Thử lại</button></div>}</div>;
  const { document: doc, headers } = data;
  return <div className={`td-page td-document ${highlight?'td-highlight':''}`}>
    <div className="td-sheet-title">
      <button className="td-sheet-back" aria-label="Danh sách tài liệu" title="Danh sách tài liệu" onClick={()=>navigate('/tests')}><ArrowLeft size={18}/></button>
      <h2 title={doc.fileName}><FileSpreadsheet size={18}/>{doc.fileName}</h2>
      <span>{project.name}</span>
    </div>
    <div className="td-sheet-tabs"><span><Table2 size={14}/>{doc.sheetName}</span><small>{data.rows.length} test case · {lastSaved?.updatedBy || doc.updatedBy} · {documentDate(lastSaved?.updatedAt || doc.updatedAt,project.timezone)}</small></div>
    <fieldset className="td-sheet-toolbar">
      <div className="td-actions">
        <button className="cat-btn" aria-expanded={execution.open} onClick={()=>execution.setOpen(v=>!v)}>Ghi kết quả</button>
        <button className="cat-btn" aria-expanded={showSummary} onClick={()=>setShowSummary(v=>!v)}><Table2 size={14}/> Tổng quan tài liệu</button>
        <button className="cat-btn" aria-label="Tô màu kết quả" aria-pressed={highlight} onClick={()=>setHighlight(v=>!v)}><Highlighter size={14}/> Tô màu {highlight?'Bật':'Tắt'}</button>
      </div>
      <label className="td-search"><Search size={15}/><input type="search" aria-label="Tìm trong tài liệu" placeholder="Tìm ID, nội dung..." value={search} onChange={e => {setSearch(e.target.value);setPage(0);}}/></label>
      <div className="td-actions">
        {customer && resultColumn!=null && <select aria-label="Lọc kết quả" value={resultFilter} onChange={e=>{setResultFilter(e.target.value);setPage(0);}}><option value="">Tất cả kết quả</option>{resultOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>}
        <button className="cat-btn" onClick={clearFilters}>Xóa bộ lọc</button>
        <button className="cat-btn cat-btn-mint" title="Xuất toàn bộ tài liệu với các thay đổi đã lưu; bộ lọc màn hình không giới hạn file xuất" disabled={downloading || loading || results.pending>0 || !!results.error} onClick={() => download(false)}><Download size={14}/> Xuất Excel</button>
        {doc.hasSourceFile && <button className="cat-btn" disabled={downloading || loading} onClick={() => download(true)}>Tải file gốc</button>}
        <button className="cat-btn" onClick={() => navigate('/tests/cycles')}><ClipboardList size={14}/> Đợt kiểm thử</button>
        <button className="cat-btn" aria-label="Làm mới bảng case" disabled={loading || results.pending>0} onClick={load}><RefreshCw size={14}/></button>
      </div>
    </fieldset>
    {showSummary && <section className="td-sheet-summary" aria-label="Tổng quan tài liệu"><strong>{doc.totalRows} dòng · {doc.caseCount} test case</strong><span>Cập nhật: {documentDate(lastSaved?.updatedAt || doc.updatedAt,project.timezone)} · {lastSaved?.updatedBy || doc.updatedBy}</span>{customer && <div><strong>Kết quả tài liệu:</strong>{resultOptions.map(([key,label])=><span key={key}>{label}: <b>{displayRows.filter(row=>resultKey(row.cells[resultColumn])===key).length}</b></span>)}</div>}</section>}
    {downloadError && <div role="alert" className="td-error">{downloadError}</div>}
    {results.error && <div role="alert" className="td-error">{results.error} <button className="cat-btn" disabled={results.pending>0} onClick={load}>Tải lại kết quả đã lưu</button></div>}
    <div role="status" className="td-source-note">{results.pending ? 'Đang lưu kết quả…' : results.error ? 'Chưa xác nhận được kết quả. Hãy tải lại bảng.' : lastSaved ? `Đã lưu · ${lastSaved.updatedBy} · ${documentDate(lastSaved.updatedAt,project.timezone)}` : ''}</div>
    {downloading && <p role="status" className="td-muted">Đang chuẩn bị file Excel...</p>}
    <DocumentExecutionControls execution={execution} project={project} navigate={navigate}/>
    {message && <div role="status" className="td-source-note">{message}</div>}
    <div className="td-source-note">{customer ? 'Bấm ô để đổi Unexecuted → OK → P → NG → Fixed → NA và tự lưu vào tài liệu. Xuất Excel lấy bản cập nhật; Tải file gốc giữ bản nhập. Kết quả đợt kiểm thử quản lý riêng.' : 'Nội dung hiển thị theo phiên bản case hiện tại.'}</div>
    <div ref={grid} className="td-grid-scroll" role="region" aria-label="Bảng test case của tài liệu" tabIndex={0} aria-busy={loading} data-lenis-prevent>
      <table className="td-case-grid" style={{fontSize:`${fontSize}px`,width:headers.reduce((sum,_,index)=>sum+columnWidth(index),0)}}>
        <colgroup>{headers.map((_,index)=><col key={index} style={{width:columnWidth(index)}}/>)}</colgroup>
        <thead><tr>{headers.map((header,index) => <th key={index} scope="col" className={index===idColumn?'td-sticky-id':''}>{customer ? (header || `Cột ${String.fromCharCode(65+index)} (nguồn)`) : (internalLabels[index] || header)}<span role="separator" tabIndex={0} aria-label={`Độ rộng cột ${header || index+1}`} aria-orientation="vertical" aria-valuenow={columnWidth(index)} aria-valuemin={48} aria-valuemax={800} className="td-column-resize"
          onPointerDown={e=>{resize.current={index,x:e.clientX,width:columnWidth(index)};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(resize.current?.index===index)setWidths(v=>({...v,[index]:Math.max(48,Math.min(800,resize.current.width+e.clientX-resize.current.x))}));}}
          onPointerUp={()=>{resize.current=null;}} onPointerCancel={()=>{resize.current=null;}}
          onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setWidths(v=>({...v,[index]:Math.max(48,Math.min(800,columnWidth(index)+(e.key==='ArrowRight'?20:-20)))}));}}}/></th>)}</tr></thead>
        <tbody>{visibleRows.map(row => <React.Fragment key={row.rowNumber}><tr className={row.archived?'td-archived':''}>
          {row.cells.map((value,index) => <td key={index} className={index===idColumn?`td-sticky-id ${caseMenu===row.caseId?'td-menu-open':''}`:customer && index===resultColumn?`td-result-cell td-outcome-${resultKey(value).toLowerCase()}`:''}>
            {index===idColumn ? <><button className="td-case-id" aria-label={`Mở test case ${row.sourceId}`} onClick={() => setActiveCase(row.caseId)}>{value || row.sourceId}</button>
              <div className="td-case-menu" ref={caseMenu===row.caseId?menuRef:null}><button className="td-menu-trigger" aria-label={`Tùy chọn test case ${row.sourceId}`} aria-expanded={caseMenu===row.caseId} onClick={()=>setCaseMenu(v=>v===row.caseId?null:row.caseId)}><List size={15}/></button>
                {caseMenu===row.caseId && <div className="td-menu-items"><button onClick={()=>{setDetailCase(row.caseId);setCaseMenu(null);}}>Hiển thị chi tiết</button><button onClick={()=>{setHistoryCase(row);setCaseMenu(null);}}>Hiển thị lịch sử</button><button onClick={()=>copyCase(row)}>Sao chép URL</button></div>}
              </div><small>{row.archived?'Đã lưu trữ':row.approved?'Đã duyệt':'Dự thảo'}</small></> :
              customer && index===resultColumn ? <><ResultCycleButton disabled={dev || loading || downloading || !!results.error || row.rowId==null || row.archived || project.archived} value={value} sourceId={row.sourceId} onChange={resultCode=>results.change(row,resultCode)}/>
                <button className="td-result-history" disabled={results.pending>0} onClick={()=>setResultHistory(row)}>Lịch sử / chứng cứ</button>
                {!dev && project.projectRole==='PM' && !project.archived && execution.context?.cycle.statusCode==='ACTIVE' && execution.byCase.has(String(row.caseId)) && <button className="td-result-history" onClick={()=>execution.setScope(execution.byCase.get(String(row.caseId)))}>{execution.byCase.get(String(row.caseId)).excluded?'Khôi phục phạm vi':'NA · Ngoài phạm vi'}</button>}
              </> : <CellText value={value}/>}
          </td>)}
        </tr></React.Fragment>)}</tbody>
      </table>
      {!rows.length && <p className="td-empty">Không có dòng phù hợp với từ khóa.</p>}
    </div>
    <fieldset className="td-sheet-footer">
      <div className="td-actions"><button className="cat-btn" aria-label="Trang trước" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={16}/></button><span>Trang {currentPage+1} / {totalPages}</span><button className="cat-btn" aria-label="Trang sau" disabled={currentPage+1>=totalPages} onClick={()=>setPage(currentPage+1)}><ChevronRight size={16}/></button>
        <label>Hiển thị: <select aria-label="Số dòng mỗi trang" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0);}}>{[20,50,100].map(size=><option key={size}>{size}</option>)}</select></label>
        <label className="td-font-control">Cỡ chữ: <input type="range" aria-label="Cỡ chữ bảng" min="11" max="18" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}/><span>{fontSize}</span></label>
      </div>
      <span>{rows.length ? currentPage*pageSize+1 : 0}–{Math.min((currentPage+1)*pageSize,rows.length)} / {rows.length} dòng</span>
    </fieldset>
    {activeCase && <CaseDetailModal key={activeCase} projectId={project.id} caseId={activeCase} onClose={() => setActiveCase(null)} onUpdated={load}/>}
    {resultHistory && <DocumentResultHistory projectId={project.id} documentId={documentId} row={resultHistory} timeZone={project.timezone} onClose={()=>setResultHistory(null)} onExecution={()=>{execution.show({...resultHistory,historyOnly:true});setResultHistory(null);}}/>}
    {detailCase && displayRows.some(r=>r.caseId===detailCase) && <DocumentCaseDialog row={displayRows.find(r=>r.caseId===detailCase)} headers={headers} onClose={()=>setDetailCase(null)}
      onPrevious={displayRows.findIndex(r=>r.caseId===detailCase)>0?()=>setDetailCase(displayRows[displayRows.findIndex(r=>r.caseId===detailCase)-1].caseId):null}
      onNext={displayRows.findIndex(r=>r.caseId===detailCase)<displayRows.length-1?()=>setDetailCase(displayRows[displayRows.findIndex(r=>r.caseId===detailCase)+1].caseId):null}
      onManage={()=>{setActiveCase(detailCase);setDetailCase(null);}} onHistory={()=>{setHistoryCase(displayRows.find(r=>r.caseId===detailCase));setDetailCase(null);}}/>}
    {historyCase && <CaseHistoryDialog key={historyCase.caseId} projectId={project.id} row={historyCase} timeZone={project.timezone} onClose={()=>setHistoryCase(null)} onExecution={()=>{execution.show(historyCase);setHistoryCase(null);}}/>}
  </div>;
}
