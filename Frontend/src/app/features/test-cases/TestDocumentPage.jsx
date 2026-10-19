import { isProjectObserver, isProjectDeveloper, canManageProjectWork } from '../projects/projectAccess';
import {matchesSearch} from '../../utils/multiWordSearch';
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
import { DocumentCellEditor } from './DocumentCellEditor';
import { DocumentSecondTestDialog } from './DocumentSecondTestDialog';
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
function resultDisabledReason({readOnly,project,row,loading,downloading,error}) {
  if(readOnly)return 'Chỉ xem. Bạn chưa có quyền cập nhật kết quả trong dự án.';
  if(project.archived)return 'Dự án đã lưu trữ; không thể cập nhật kết quả.';
  if(row.archived)return 'Case đã lưu trữ; không thể cập nhật kết quả.';
  if(row.rowId==null)return 'Dòng tài liệu chưa có mã để lưu kết quả.';
  if(error)return 'Chưa xác nhận được kết quả đã lưu. Tải lại kết quả trước khi cập nhật.';
  if(loading)return 'Bảng tài liệu đang tải; chờ tải xong để cập nhật.';
  if(downloading)return 'Đang chuẩn bị file Excel; chờ hoàn tất để cập nhật.';
  return undefined;
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
  const dev=isProjectDeveloper(project,hasRole);
  const readOnly=dev || isProjectObserver(project, hasRole);
  const canEdit=!readOnly && !project.archived && (project.projectRole==='PM' || hasRole?.('ADMIN'));
  const canAssign=canManageProjectWork(project,hasRole);
  const [editing,setEditing]=useState(null),[secondTest,setSecondTest]=useState(null);
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
    matchesSearch(row.cells,search)), [displayRows, search, resultFilter, resultColumn]);
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
  const visibleColumns=headers.map((header,index)=>({header,index})).filter(({header,index})=>
    !customer || header.trim() || Object.values(columns).includes(index) || data.rows.some(r=>String(r.cells[index] || '').trim()));
  const secondTests=new Map((data.secondTests || []).map(x=>[x.rowId,x]));
  const mutationBlocked=loading || downloading || results.pending>0 || !!results.error;
  const canOpenSecondTest=row=>canAssign && !mutationBlocked && !row.archived && row.rowId!=null;
  const assignmentCellProps=row=>canOpenSecondTest(row)?{
    tabIndex:0,title:'Nhấp đúp hoặc nhấn Enter để sửa phân công test lần 2',
    onDoubleClick:e=>{if(!e.target.closest('button,a'))setSecondTest(row);},
    onKeyDown:e=>{if(e.key==='Enter' && e.target===e.currentTarget){e.preventDefault();setSecondTest(row);}}
  }:{};
  function openCell(row,index){
    const field=customer ? Object.keys(columns).find(key=>columns[key]===index) : ['','','titleVi','preconditionsVi','stepsVi','expectedVi','titleJp','preconditionsJp','stepsJp','expectedJp','sourceReference'][index];
    const canonical=['titleVi','preconditionsVi','stepsVi','expectedVi','titleJp','preconditionsJp','stepsJp','expectedJp','sourceReference'].includes(field);
    setEditing({row,index,value:row.cells[index] || '',version:data.cellVersions?.[row.rowId]?.[index] || 0,
      label:headers[index] || 'Cột '+String.fromCharCode(65+index),canonical,maxLength:['titleVi','titleJp','sourceReference'].includes(field)?255:8000});
  }
  return <div className={`td-page td-document ${highlight?'td-highlight':''}`}>
    <div className="td-sheet-title">
      <button className="td-sheet-back" aria-label="Danh sách tài liệu" title="Danh sách tài liệu" onClick={()=>navigate('/tests')}><ArrowLeft size={18}/></button>
      <h2 title={doc.fileName}><FileSpreadsheet size={18}/>{doc.fileName}</h2>
      <span>{project.name}</span>
    </div>
    <div className="td-sheet-tabs"><span><Table2 size={14}/>{doc.sheetName}</span><small>{data.rows.length} test case · {lastSaved?.updatedBy || doc.updatedBy} · {documentDate(lastSaved?.updatedAt || doc.updatedAt,project.timezone)}</small></div>
    <fieldset className="td-sheet-toolbar">
      <div className="td-actions">
        <button className="cat-btn" aria-expanded={execution.open} onClick={()=>execution.setOpen(v=>!v)}>{readOnly ? 'Xem kết quả theo đợt' : 'Ghi kết quả'}</button>
        <button className="cat-btn" aria-expanded={showSummary} onClick={()=>setShowSummary(v=>!v)}><Table2 size={14}/> Tổng quan tài liệu</button>
        <button className="cat-btn" aria-label="Tô màu kết quả" aria-pressed={highlight} onClick={()=>setHighlight(v=>!v)}><Highlighter size={14}/> Tô màu {highlight?'Bật':'Tắt'}</button>
      </div>
      <label className="td-search"><Search size={15}/><input type="search" aria-label="Tìm trong tài liệu" placeholder="Tìm ID, nội dung..." value={search} onChange={e => {setSearch(e.target.value);setPage(0);}}/></label>
      <div className="td-actions">
        {customer && resultColumn!=null && <select aria-label="Lọc kết quả" value={resultFilter} onChange={e=>{setResultFilter(e.target.value);setPage(0);}}><option value="">Tất cả kết quả</option>{resultOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>}
        <button className="cat-btn" onClick={clearFilters}>Xóa bộ lọc</button>
        <button className="cat-btn cat-btn-mint" aria-describedby="td-export-scope" disabled={downloading || loading || results.pending>0 || !!results.error} onClick={() => download(false)}><Download size={14}/> Xuất Excel</button>
        {doc.hasSourceFile && <button className="cat-btn" aria-describedby="td-original-scope" disabled={downloading || loading} onClick={() => download(true)}>Tải file gốc</button>}
        <button className="cat-btn" onClick={() => navigate('/tests/cycles')}><ClipboardList size={14}/> Đợt kiểm thử</button>
        <button className="cat-btn" aria-label="Làm mới bảng case" disabled={loading || results.pending>0} onClick={load}><RefreshCw size={14}/></button>
      </div>
    <div className="td-toolbar-pagination" aria-label="Điều khiển bảng">
      <div className="td-actions"><button className="cat-btn" aria-label="Trang trước" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={16}/></button><span>Trang {currentPage+1} / {totalPages}</span><button className="cat-btn" aria-label="Trang sau" disabled={currentPage+1>=totalPages} onClick={()=>setPage(currentPage+1)}><ChevronRight size={16}/></button>
        <label>Hiển thị: <select aria-label="Số dòng mỗi trang" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0);}}>{[20,50,100].map(size=><option key={size}>{size}</option>)}</select></label>
        <label className="td-font-control">Cỡ chữ: <input type="range" aria-label="Cỡ chữ bảng" min="11" max="18" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}/><span>{fontSize}</span></label>
      </div>
      <span>{rows.length ? currentPage*pageSize+1 : 0}–{Math.min((currentPage+1)*pageSize,rows.length)} / {rows.length} dòng</span>
    </div>
    </fieldset>
    <p className="td-export-help"><span id="td-export-scope">Xuất Excel lấy toàn bộ tài liệu đã lưu, kể cả các dòng bị ẩn bởi bộ lọc hoặc phân trang.</span>{doc.hasSourceFile&&<> <span id="td-original-scope">File gốc giữ nguyên bản đã nhập.</span></>}{customer&&<> Kết quả thực thi theo đợt/build được xuất riêng tại Công việc theo file.</>}</p>
    {showSummary && <section className="td-sheet-summary" aria-label="Tổng quan tài liệu"><strong>{doc.totalRows} dòng · {doc.caseCount} test case</strong><span>Cập nhật: {documentDate(lastSaved?.updatedAt || doc.updatedAt,project.timezone)} · {lastSaved?.updatedBy || doc.updatedBy}</span>{customer && <div><strong>Kết quả tài liệu:</strong>{resultOptions.map(([key,label])=><span key={key}>{label}: <b>{displayRows.filter(row=>resultKey(row.cells[resultColumn])===key).length}</b></span>)}</div>}</section>}
    {downloadError && <div role="alert" className="td-error">{downloadError}</div>}
    {results.error && <div role="alert" className="td-error">{results.error} <button className="cat-btn" disabled={results.pending>0} onClick={load}>Tải lại kết quả đã lưu</button></div>}
    <div role="status" className="td-source-note">{results.pending ? 'Đang lưu kết quả…' : results.error ? 'Chưa xác nhận được kết quả. Hãy tải lại bảng.' : lastSaved ? `Đã lưu · ${lastSaved.updatedBy} · ${documentDate(lastSaved.updatedAt,project.timezone)}` : ''}</div>
    {downloading && <p role="status" className="td-muted">Đang chuẩn bị file Excel...</p>}
    <DocumentExecutionControls execution={execution} project={project} navigate={navigate} onSaved={load}/>
    {message && <div role="status" className="td-source-note">{message}</div>}
    <div className="td-source-note">{customer && readOnly ? 'Chỉ xem kết quả: tài khoản này chưa có quyền thực thi trong dự án. PM phân công; Tester được giao ghi kết quả theo đợt.' : customer ? 'Bấm ô để đổi Unexecuted → OK → NG → P → NA → Unexecuted và tự lưu vào tài liệu.' : 'Nội dung hiển thị theo phiên bản case hiện tại.'}{canEdit && ' Nhấp đúp ô nội dung hoặc nhấn Enter để sửa. PM phân công test lần 2 ở cuối bảng.'}</div>
    <div ref={grid} className="td-grid-scroll" role="region" aria-label="Bảng test case của tài liệu" tabIndex={0} aria-busy={loading} data-lenis-prevent>
      <table className="td-case-grid" style={{fontSize:`${fontSize}px`,width:visibleColumns.reduce((sum,{index})=>sum+columnWidth(index),0)+380}}>
        <colgroup>{visibleColumns.map(({index})=><col key={index} style={{width:columnWidth(index)}}/>)}<col style={{width:200}}/><col style={{width:180}}/></colgroup>
        <thead><tr>{visibleColumns.map(({header,index}) => <th key={index} scope="col" className={index===idColumn?'td-sticky-id':''}>{customer ? (header || `Cột ${String.fromCharCode(65+index)} (nguồn)`) : (internalLabels[index] || header)}<span role="separator" tabIndex={0} aria-label={`Độ rộng cột ${header || index+1}`} aria-orientation="vertical" aria-valuenow={columnWidth(index)} aria-valuemin={48} aria-valuemax={800} className="td-column-resize"
          onPointerDown={e=>{resize.current={index,x:e.clientX,width:columnWidth(index)};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{if(resize.current?.index===index)setWidths(v=>({...v,[index]:Math.max(48,Math.min(800,resize.current.width+e.clientX-resize.current.x))}));}}
          onPointerUp={()=>{resize.current=null;}} onPointerCancel={()=>{resize.current=null;}}
          onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setWidths(v=>({...v,[index]:Math.max(48,Math.min(800,columnWidth(index)+(e.key==='ArrowRight'?20:-20)))}));}}}/></th>)}<th scope="col">Người test lần 2</th><th scope="col">Ghi chú 2</th></tr></thead>
        <tbody>{visibleRows.map(row => <React.Fragment key={row.rowNumber}><tr className={row.archived?'td-archived':''}>
          {visibleColumns.map(({index}) => {const value=row.cells[index];const editable=canEdit && !mutationBlocked && !row.archived && row.rowId!=null && index!==idColumn && index!==resultColumn && (customer || index!==1);return <td key={index}
            tabIndex={editable?0:undefined} title={editable?'Nhấp đúp hoặc nhấn Enter để sửa':undefined}
            onDoubleClick={editable?()=>openCell(row,index):undefined}
            onKeyDown={editable?e=>{if(e.key==='Enter' && e.target===e.currentTarget){e.preventDefault();openCell(row,index);}}:undefined} className={index===idColumn?`td-sticky-id ${caseMenu===row.caseId?'td-menu-open':''}`:customer && index===resultColumn?`td-result-cell td-outcome-${resultKey(value).toLowerCase()}`:''}>
            {index===idColumn ? <><button className="td-case-id" aria-label={`Mở test case ${row.sourceId}`} onClick={() => setActiveCase(row.caseId)}>{value || row.sourceId}</button>
              <div className="td-case-menu" ref={caseMenu===row.caseId?menuRef:null}><button className="td-menu-trigger" aria-label={`Tùy chọn test case ${row.sourceId}`} aria-expanded={caseMenu===row.caseId} onClick={()=>setCaseMenu(v=>v===row.caseId?null:row.caseId)}><List size={15}/></button>
                {caseMenu===row.caseId && <div className="td-menu-items"><button onClick={()=>{setDetailCase(row.caseId);setCaseMenu(null);}}>Hiển thị chi tiết</button><button onClick={()=>{setHistoryCase(row);setCaseMenu(null);}}>Hiển thị lịch sử</button><button onClick={()=>copyCase(row)}>Sao chép URL</button></div>}
              </div><small>{row.archived?'Đã lưu trữ':row.approved?'Đã duyệt':'Dự thảo'}</small></> :
              customer && index===resultColumn ? <><ResultCycleButton disabledReason={resultDisabledReason({readOnly,project,row,loading,downloading,error:results.error})} disabled={readOnly || loading || downloading || !!results.error || row.rowId==null || row.archived || project.archived} value={value} sourceId={row.sourceId} onChange={resultCode=>results.change(row,resultCode)}/>
                <button className="td-result-history" disabled={results.pending>0} onClick={()=>setResultHistory(row)}>Lịch sử / chứng cứ</button>
                {canAssign && execution.context?.cycle.statusCode==='ACTIVE' && execution.byCase.has(String(row.caseId)) && <button className="td-result-history" onClick={()=>execution.setScope(execution.byCase.get(String(row.caseId)))}>{execution.byCase.get(String(row.caseId)).excluded?'Khôi phục phạm vi':'NA · Ngoài phạm vi'}</button>}
              </> : <CellText value={value}/>}
          </td>;})}
          <td className="td-second-test" {...assignmentCellProps(row)}>{secondTests.has(row.rowId)?<><strong>{secondTests.get(row.rowId).assigneeName}</strong><small>Đợt: {secondTests.get(row.rowId).cycleName}</small><small>Kết quả lượt được giao: {secondTests.get(row.rowId).resultCode==='NOT_RUN'?'Chưa chạy':secondTests.get(row.rowId).resultCode}</small><button type="button" className="td-result-history" onClick={()=>navigate('/tests/cycles/'+secondTests.get(row.rowId).cycleId)}>Mở lượt kiểm thử</button></>:<span className="td-muted">Chưa phân công</span>}
            {canAssign && <button className="td-result-history" disabled={!canOpenSecondTest(row)} title={row.archived?'Case đã lưu trữ.':mutationBlocked?'Chờ thao tác tài liệu hoàn tất.':'Chọn người kiểm thử lại và ghi chú.'} onClick={()=>setSecondTest(row)}>{secondTests.has(row.rowId)?'Đổi phân công':'Giao test lần 2'}</button>}
          </td><td {...assignmentCellProps(row)}><CellText value={secondTests.get(row.rowId)?.note || ''}/></td>
        </tr></React.Fragment>)}</tbody>
      </table>
      {!rows.length && <p className="td-empty">Không có dòng phù hợp với từ khóa.</p>}
    </div>

    {editing && <DocumentCellEditor projectId={project.id} documentId={documentId} cell={editing} authorized={canEdit} onClose={()=>setEditing(null)} onSaved={load}/>}
    {secondTest && <DocumentSecondTestDialog projectId={project.id} documentId={documentId} row={secondTest} assignment={secondTests.get(secondTest.rowId)} authorized={canAssign} onClose={()=>setSecondTest(null)} onSaved={load}
      onApproved={()=>setData(current=>({...current,rows:current.rows.map(row=>row.rowId===secondTest.rowId && row.revisionId===secondTest.revisionId?{...row,approved:true}:row)}))} navigate={navigate}/>}
    {activeCase && <CaseDetailModal key={activeCase} projectId={project.id} caseId={activeCase} onClose={() => setActiveCase(null)} onUpdated={load}/>}
    {resultHistory && <DocumentResultHistory projectId={project.id} documentId={documentId} row={resultHistory} timeZone={project.timezone} onClose={()=>setResultHistory(null)} onExecution={()=>{execution.show({...resultHistory,historyOnly:true});setResultHistory(null);}}/>}
    {detailCase && displayRows.some(r=>r.caseId===detailCase) && <DocumentCaseDialog row={displayRows.find(r=>r.caseId===detailCase)} headers={headers} onClose={()=>setDetailCase(null)}
      onPrevious={displayRows.findIndex(r=>r.caseId===detailCase)>0?()=>setDetailCase(displayRows[displayRows.findIndex(r=>r.caseId===detailCase)-1].caseId):null}
      onNext={displayRows.findIndex(r=>r.caseId===detailCase)<displayRows.length-1?()=>setDetailCase(displayRows[displayRows.findIndex(r=>r.caseId===detailCase)+1].caseId):null}
      onManage={()=>{setActiveCase(detailCase);setDetailCase(null);}} onHistory={()=>{setHistoryCase(displayRows.find(r=>r.caseId===detailCase));setDetailCase(null);}}/>}
    {historyCase && <CaseHistoryDialog key={historyCase.caseId} projectId={project.id} row={historyCase} timeZone={project.timezone} onClose={()=>setHistoryCase(null)} onExecution={()=>{execution.show(historyCase);setHistoryCase(null);}}/>}
  </div>;
}
