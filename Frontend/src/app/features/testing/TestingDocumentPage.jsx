import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {testCasesApi} from '../../services/api/testCases';
import {useProject} from '../projects/ProjectProvider';
import {DocumentCellEditor} from '../test-cases/DocumentCellEditor';
import {DocumentCaseDialog} from '../test-cases/DocumentCaseDialog';
import {DocumentResultHistory} from '../test-cases/DocumentResultHistory';
import {ResultCycleButton} from '../test-cases/ResultCycleButton';
import {useDocumentResults} from '../test-cases/useDocumentResults';
import {downloadWorkbook,documentExportName} from '../test-cases/documentDownload';
import {matchesSearch} from '../../utils/multiWordSearch';
import {DocumentAssignments} from './DocumentAssignments';
import {DocumentAssignmentHistory} from './DocumentAssignmentHistory';
import {useTestingQuery} from './testingState';
import '../test-cases/test-cases.css';
import '../test-cases/test-documents.css';
import './testing.css';

export function TestingDocumentPage({projectId,featureId,documentId,caseId,onBack,navigate,renderIssueAction}) {
  const {currentProject}=useProject()||{},p=projectId||currentProject?.id;
  if(!p)return <p role="status">Chọn dự án để xem file.</p>;
  return <FeatureDocument key={`${p}/${featureId}/${documentId}`} projectId={p} featureId={featureId} documentId={documentId} caseId={caseId} renderIssueAction={renderIssueAction} onBack={onBack||(()=>navigate?.(`/board/testing/features/${featureId}`))}/>;
}
function FeatureDocument({projectId,featureId,documentId,caseId,onBack,renderIssueAction}) {
  const query=useTestingQuery(async()=>{const value=await testCasesApi.getDocument(projectId,documentId);if(String(value.document.featureId)!==String(featureId))throw new Error('File không thuộc Feature đang mở.');return value;},[projectId,featureId,documentId]);
  const [assignmentHistory,setAssignmentHistory]=useState(false);
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(0),[pageSize,setPageSize]=useState(20),[editing,setEditing]=useState(null),[assigning,setAssigning]=useState(false),[selected,setSelected]=useState(null),[history,setHistory]=useState(null),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState(''),[saved,setSaved]=useState(null);
  const results=useDocumentResults(projectId,documentId,query.data,setSaved);
  const data=query.data,columns=data?.columns||{},sourceIndex=columns.sourceId??0;
  const rows=useMemo(()=>(data?.rows||[]).map(row=>({...row,resultStatus:results.overrides[row.rowId]??row.resultStatus})),[data,results.overrides]);
  const filtered=useMemo(()=>rows.filter(row=>(!status||row.resultStatus===status)&&matchesSearch([row.sourceId,...row.cells],search)),[rows,status,search]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize)),currentPage=Math.min(page,pages-1),visible=filtered.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  const focusedRow=useRef(null),focusedLink=useRef(null),caseButtons=useRef(new Map()),lastSelected=useRef(null);
  useEffect(()=>{if(selected)lastSelected.current=selected.rowId;else if(lastSelected.current){caseButtons.current.get(lastSelected.current)?.focus();lastSelected.current=null;}},[selected]);
  const linkedRow=caseId==null?null:rows.find(row=>String(row.rowId)===String(caseId))||rows.find(row=>String(row.caseId)===String(caseId));
  useEffect(()=>{
    if(!linkedRow||focusedLink.current===String(caseId))return;
    focusedLink.current=String(caseId);setSearch('');setStatus('');
    setPage(Math.floor(rows.findIndex(row=>row.rowId===linkedRow.rowId)/pageSize));
  },[caseId,linkedRow,rows,pageSize]);
  useLayoutEffect(()=>{if(linkedRow&&visible.some(row=>row.rowId===linkedRow.rowId)){focusedRow.current?.focus({preventScroll:true});focusedRow.current?.scrollIntoView?.({block:'nearest'});}},[linkedRow?.rowId,currentPage]);
  const tested=rows.filter(row=>row.resultStatus!=='UNEXECUTED').length,percent=rows.length?Math.round(tested*100/rows.length):0;
  const blocked=results.pending>0||!!results.error||query.loading||exporting;
  const statusBlockedReason=results.pending>0?'Đang lưu Status. Vui lòng chờ.':results.error?'Kết quả chưa được xác nhận. Tải lại kết quả trước khi sửa.':query.loading?'Đang tải lại bảng case.':exporting?'Đang xuất file. Vui lòng chờ.':'Case đang ở chế độ chỉ đọc hoặc không thuộc phạm vi bạn phụ trách.';
  function edit(row,index){const field=Object.keys(columns).find(name=>columns[name]===index)||['','','titleVi','preconditionsVi','stepsVi','expectedVi','titleJp','preconditionsJp','stepsJp','expectedJp','sourceReference'][index];setEditing({row,index,value:row.cells[index]||'',version:data.cellVersions?.[row.rowId]?.[index]||0,label:data.headers[index]||`Cột ${index+1}`,canonical:false,maxLength:['titleVi','titleJp','sourceReference'].includes(field)?255:8000});}
  async function download(original){if(blocked)return;setExporting(true);setExportError('');try{const blob=await testCasesApi.exportDocument(projectId,documentId,original);downloadWorkbook(blob,documentExportName(data.document.fileName,original));}catch(err){setExportError(err.message||'Chưa tải được file.');}finally{setExporting(false);}}
  if(!data)return <section className="testing-page"><button className="cat-btn" onClick={onBack}>← File trong Feature</button>{query.loading&&<p role="status">Đang tải bảng case…</p>}{query.error&&<p role="alert" className="td-error">{query.error} <button className="cat-btn" onClick={query.load}>Thử lại</button></p>}</section>;
  const visibleColumns=data.headers.map((label,index)=>({label,index})).filter(({index})=>index!==columns.result&&index!==columns.tester&&index!==columns.latestTester);
  const selectedCurrent=selected&&(rows.find(row=>row.rowId===selected.rowId)||selected);
  const selectedIndex=selectedCurrent?filtered.findIndex(row=>row.rowId===selectedCurrent.rowId):-1;
  function moveCase(offset){const index=selectedIndex+offset;if(index>=0&&index<filtered.length){setSelected(filtered[index]);setPage(Math.floor(index/pageSize));}}
  const dialogRow=selectedCurrent&&{...selectedCurrent,cells:[...visibleColumns.map(({index})=>selectedCurrent.cells[index]),selectedCurrent.resultStatus,selectedCurrent.firstTesterName||'',selectedCurrent.latestTesterName||'']};
  const dialogHeaders=[...visibleColumns.map(({label})=>label),'Status','Người test đầu tiên','Người test lại gần nhất'];
  function issueRow(row){return {...row,title:row.cells[columns.titleVi??2]||'',steps:row.cells[columns.stepsVi??4]||'',expected:row.cells[columns.expectedVi??5]||''};}
  return <section className="testing-page testing-document td-page"><div className="td-sheet-title"><button className="cat-btn" onClick={onBack}>← File trong Feature</button><h2>{data.document.fileName}</h2></div>
    <div className="td-sheet-toolbar" role="region" aria-label="Điều khiển bảng case" tabIndex={0}><div className="testing-progress"><strong>{tested}/{rows.length} case · {percent}%</strong><progress value={tested} max={Math.max(1,rows.length)} aria-label="Tiến độ file"/>{(data.canManage||data.canAssign)&&<button className="cat-btn" disabled={blocked} onClick={()=>setAssigning(true)}>{data.canManage?'Phân công case':'Tự nhận / sửa phạm vi'}</button>}<button className="cat-btn" disabled={results.pending>0} onClick={()=>setAssignmentHistory(true)}>Lịch sử phân công</button></div>
      <div className="td-filter-row"><label>Tìm trong file<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label><label>Status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">Tất cả</option>{['UNEXECUTED','OK','NG','P','NA'].map(s=><option key={s} value={s}>{s==='UNEXECUTED'?'Unexecuted':s}</option>)}</select></label><button className="cat-btn" disabled={blocked} onClick={()=>download(false)}>Xuất Excel</button>{data.document.hasSourceFile&&<button className="cat-btn" disabled={blocked} onClick={()=>download(true)}>Tải file gốc</button>}<button className="cat-btn" disabled={results.pending>0} onClick={query.load}>Làm mới</button></div>
      <div className="td-toolbar-pagination"><button className="cat-btn" disabled={currentPage===0} onClick={()=>setPage(n=>n-1)}>Trang trước</button><span>Trang {currentPage+1}/{pages} · {filtered.length} case</span><button className="cat-btn" disabled={currentPage+1>=pages} onClick={()=>setPage(n=>n+1)}>Trang sau</button><label>Số dòng<select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0);}}>{[20,50,100].map(n=><option key={n}>{n}</option>)}</select></label></div>
    </div>
    <p className="td-source-note">Status lưu riêng cho từng Feature. Hai cột người test thể hiện phân công; người ghi kết quả có trong lịch sử.</p>
    {results.error&&<p role="alert" className="td-error">{results.error} <button className="cat-btn" disabled={results.pending>0} onClick={query.load}>Tải lại kết quả</button></p>}{exportError&&<p role="alert" className="td-error">{exportError}</p>}<p role="status">{results.pending?'Đang lưu Status…':saved?'Đã lưu Status.':''}</p>
    <div className="td-grid-scroll" role="region" aria-label="Bảng test case của Feature" tabIndex={0}>
      <table className="td-case-grid"><thead><tr>
        {visibleColumns.map(({label,index})=><th key={index} scope="col" className={index===sourceIndex?'td-sticky-id':undefined}>{label||`Cột ${index+1}`}</th>)}
        <th scope="col">Status / Issue</th><th scope="col">Người test đầu tiên</th><th scope="col">Người test lại gần nhất</th>
      </tr></thead><tbody>{visible.map(row=><tr key={row.rowId} ref={row.rowId===linkedRow?.rowId?focusedRow:undefined} tabIndex={row.rowId===linkedRow?.rowId?-1:undefined} aria-current={row.rowId===linkedRow?.rowId?true:undefined}>
        {visibleColumns.map(({index})=>index===sourceIndex?
          <th key={index} scope="row" className="td-sticky-id"><button ref={element=>{if(element)caseButtons.current.set(row.rowId,element);else caseButtons.current.delete(row.rowId);}} className="td-case-id" onClick={()=>setSelected(row)}>{row.sourceId||row.cells[index]}</button></th>:
          <td key={index}>{data.canManage&&!blocked?<button className="testing-case-text" aria-label={`Sửa ${data.headers[index]} · case ${row.sourceId}`} onClick={()=>edit(row,index)}>{row.cells[index]||'—'}</button>:<span className="td-cell-text">{row.cells[index]||'—'}</span>}</td>)}
        <td className="td-result-cell">
          <ResultCycleButton sourceId={row.sourceId} value={row.resultStatus} disabled={blocked||!row.canUpdateResult} disabledReason={statusBlockedReason} onChange={value=>results.change(row,value)}/>
          {renderIssueAction?.({projectId,featureId,documentId,row:issueRow(row),document:data.document,refresh:query.load})}
          <button className="td-result-history" disabled={results.pending>0} onClick={()=>setHistory(row)}>Lịch sử Status</button>
        </td><td>{row.firstTesterName||'—'}</td><td>{row.latestTesterName||'—'}</td>
      </tr>)}</tbody></table>{!visible.length&&<p className="td-empty">Không có case phù hợp.</p>}
    </div>
    {editing&&<DocumentCellEditor projectId={projectId} documentId={documentId} cell={editing} authorized={data.canManage} onClose={()=>setEditing(null)} onSaved={query.load}/>}
    {assigning&&<DocumentAssignments projectId={projectId} documentId={documentId} data={data} onClose={()=>setAssigning(false)} onSaved={query.load}/>}
    {assignmentHistory&&<DocumentAssignmentHistory projectId={projectId} documentId={documentId} rows={rows} onClose={()=>setAssignmentHistory(false)}/>}
    {dialogRow&&<DocumentCaseDialog row={dialogRow} headers={dialogHeaders} onClose={()=>setSelected(null)} onPrevious={selectedIndex>0?()=>moveCase(-1):undefined} onNext={selectedIndex>=0&&selectedIndex+1<filtered.length?()=>moveCase(1):undefined}/>}
    {history&&<DocumentResultHistory projectId={projectId} documentId={documentId} row={history} timeZone="Asia/Ho_Chi_Minh" onClose={()=>setHistory(null)}/>}
  </section>;
}
