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
import {TestProgress} from '../../components/TestProgress';
import {DocumentAssignments} from './DocumentAssignments';
import {DocumentAssignmentHistory} from './DocumentAssignmentHistory';
import {useTestingQuery} from './testingState';
import {suggestedVersion,vietnamDate} from './testVersionSelection';
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
  const [executedOn,setExecutedOn]=useState(()=>vietnamDate()),[testVersionId,setTestVersionId]=useState(''),[savedExecutions,setSavedExecutions]=useState({});
  const results=useDocumentResults(projectId,documentId,query.data,value=>{setSaved(value);setSavedExecutions(old=>({...old,[value.rowId]:{testVersionId:value.testVersionId,testVersionName:value.testVersionName,executedOn:value.executedOn}}));});
  const data=query.data,columns=data?.columns||{},sourceIndex=columns.sourceId??0;
  const versions=data?.testVersions||[];
  useEffect(()=>{if(data){setSavedExecutions({});setTestVersionId(previous=>data.testVersions?.some(v=>String(v.id)===previous)?previous:suggestedVersion(data.testVersions||[],executedOn));}},[data]);
  const rows=useMemo(()=>(data?.rows||[]).map(row=>({...row,...savedExecutions[row.rowId],resultStatus:results.overrides[row.rowId]??row.resultStatus})),[data,results.overrides,savedExecutions]);
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
  const tested=rows.filter(row=>row.resultStatus!=='UNEXECUTED').length;
  const blocked=results.pending>0||!!results.error||query.loading||exporting;
  const missingContext=versions.length>0&&(!testVersionId||!executedOn);
  const statusBlockedReason=results.pending>0?'Đang lưu Status. Vui lòng chờ.':results.error?'Kết quả chưa được xác nhận. Tải lại kết quả trước khi sửa.':query.loading?'Đang tải lại bảng case.':exporting?'Đang xuất file. Vui lòng chờ.':missingContext?'Chọn version test và ngày thực hiện trước khi đổi Status.':'Case đang ở chế độ chỉ đọc hoặc không thuộc phạm vi bạn phụ trách.';
  function edit(row,index){const field=Object.keys(columns).find(name=>columns[name]===index)||['','','titleVi','preconditionsVi','stepsVi','expectedVi','titleJp','preconditionsJp','stepsJp','expectedJp','sourceReference'][index];setEditing({row,index,value:row.cells[index]||'',version:data.cellVersions?.[row.rowId]?.[index]||0,label:data.headers[index]||`Cột ${index+1}`,canonical:false,maxLength:['titleVi','titleJp','sourceReference'].includes(field)?255:8000});}
  async function download(original){if(blocked)return;setExporting(true);setExportError('');try{const blob=await testCasesApi.exportDocument(projectId,documentId,original);downloadWorkbook(blob,documentExportName(data.document.fileName,original));}catch(err){setExportError(err.message||'Chưa tải được file.');}finally{setExporting(false);}}
  if(!data)return <section className="testing-page"><button className="cat-btn" onClick={onBack}>← File trong Feature</button>{query.loading&&<p role="status">Đang tải bảng case…</p>}{query.error&&<p role="alert" className="td-error">{query.error} <button className="cat-btn" onClick={query.load}>Thử lại</button></p>}</section>;
  const visibleColumns=data.headers.map((label,index)=>({label:index===columns.executionNote?'Version test':label,index})).filter(({index})=>index!==columns.result&&index!==columns.tester&&index!==columns.latestTester);
  if(columns.executionNote==null)visibleColumns.push({label:'Version test',index:-1});
  const versionColumn=index=>index===columns.executionNote||index===-1;
  const selectedCurrent=selected&&(rows.find(row=>row.rowId===selected.rowId)||selected);
  const selectedIndex=selectedCurrent?filtered.findIndex(row=>row.rowId===selectedCurrent.rowId):-1;
  function moveCase(offset){const index=selectedIndex+offset;if(index>=0&&index<filtered.length){setSelected(filtered[index]);setPage(Math.floor(index/pageSize));}}
  const dialogRow=selectedCurrent&&{...selectedCurrent,cells:[...visibleColumns.map(({index})=>versionColumn(index)?selectedCurrent.testVersionName||'':selectedCurrent.cells[index]),selectedCurrent.executedOn||'',selectedCurrent.cells[columns.executionNote]||'',selectedCurrent.resultStatus,selectedCurrent.firstTesterName||'',selectedCurrent.latestTesterName||'']};
  const dialogHeaders=[...visibleColumns.map(({label})=>label),'Ngày thực hiện','Ghi chú thực thi (cũ)','Status','Người test đầu tiên','Người test lại gần nhất'];
  function changeVersion(row,value){if(blocked||!row.canUpdateResult||!value||String(row.testVersionId)===value)return;const date=row.executedOn||executedOn;if(!date)return;results.change(row,row.resultStatus,{testVersionId:Number(value),executedOn:date});}
  function issueRow(row){return {...row,title:row.cells[columns.titleVi??2]||'',steps:row.cells[columns.stepsVi??4]||'',expected:row.cells[columns.expectedVi??5]||''};}
  return <section className="testing-page testing-document td-page"><div className="td-sheet-title"><button className="cat-btn testing-back" onClick={onBack}>← File trong Feature</button><h2>{data.document.fileName}</h2></div>
    <div className="td-sheet-toolbar" role="region" aria-label="Điều khiển bảng case" tabIndex={0}><div className="testing-progress"><TestProgress tested={tested} total={rows.length} label="Tiến độ file"/>
      <div className="testing-execution-actions"><div className="testing-execution-context"><label>Version test<select value={testVersionId} disabled={blocked||!versions.length} onChange={e=>setTestVersionId(e.target.value)}><option value="">{versions.length?'Chọn version test':'Chưa có version test'}</option>{versions.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Ngày thực hiện<input type="date" value={executedOn} disabled={blocked} onChange={e=>{setExecutedOn(e.target.value);setTestVersionId(suggestedVersion(versions,e.target.value));}}/></label></div>
      <div className="testing-progress-actions">{(data.canManage||data.canAssign)&&<button className="cat-btn" disabled={blocked} onClick={()=>setAssigning(true)}>{data.canManage?'Phân công case':'Tự nhận / sửa phạm vi'}</button>}<button className="cat-btn" disabled={results.pending>0} onClick={()=>setAssignmentHistory(true)}>Lịch sử phân công</button></div></div></div>
      {!versions.length&&<p className="td-source-note">Feature chưa có version test. Thêm version tại màn File trong Feature để ghi kèm vào kết quả mới. Kết quả cũ được giữ nguyên.</p>}
      <div className="td-filter-row"><label>Tìm trong file<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label><label>Status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">Tất cả</option>{['UNEXECUTED','OK','NG','P','NA'].map(s=><option key={s} value={s}>{s==='UNEXECUTED'?'Unexecuted':s}</option>)}</select></label><div className="testing-file-actions"><button className="cat-btn" disabled={blocked} onClick={()=>download(false)}>Xuất Excel</button>{data.document.hasSourceFile&&<button className="cat-btn" disabled={blocked} onClick={()=>download(true)}>Tải file gốc</button>}<button className="cat-btn" disabled={results.pending>0} onClick={query.load}>Làm mới</button></div></div>
      <div className="td-toolbar-pagination"><button className="cat-btn" disabled={currentPage===0} onClick={()=>setPage(n=>n-1)}>Trang trước</button><span>Trang {currentPage+1}/{pages} · {filtered.length} case</span><button className="cat-btn" disabled={currentPage+1>=pages} onClick={()=>setPage(n=>n+1)}>Trang sau</button><label>Số dòng<select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0);}}>{[20,50,100].map(n=><option key={n}>{n}</option>)}</select></label></div>
    </div>
    <p className="td-source-note">Version/ngày ở đầu bảng áp dụng khi đổi Status. Dropdown từng dòng sửa riêng version của case, giữ ngày đã lưu. Hai cột người test thể hiện phân công; người ghi kết quả có trong lịch sử.</p>
    {results.error&&<p role="alert" className="td-error">{results.error} <button className="cat-btn" disabled={results.pending>0} onClick={query.load}>Tải lại kết quả</button></p>}{exportError&&<p role="alert" className="td-error">{exportError}</p>}<p role="status">{results.pending?'Đang lưu Status…':saved?'Đã lưu kết quả và thông tin version của case.':''}</p>
    <div className="td-grid-scroll" role="region" aria-label="Bảng test case của Feature" tabIndex={0}>
      <table className="td-case-grid"><thead><tr>
        {visibleColumns.map(({label,index})=><th key={index} scope="col" className={index===sourceIndex?'td-sticky-id':undefined}>{label||`Cột ${index+1}`}</th>)}
        <th scope="col" className="testing-result-heading">Status / Issue</th><th scope="col">Người test đầu tiên</th><th scope="col">Người test lại gần nhất</th>
      </tr></thead><tbody>{visible.map(row=><tr key={row.rowId} ref={row.rowId===linkedRow?.rowId?focusedRow:undefined} tabIndex={row.rowId===linkedRow?.rowId?-1:undefined} aria-current={row.rowId===linkedRow?.rowId?true:undefined}>
        {visibleColumns.map(({index})=>index===sourceIndex?
          <th key={index} scope="row" className="td-sticky-id"><button ref={element=>{if(element)caseButtons.current.set(row.rowId,element);else caseButtons.current.delete(row.rowId);}} className="td-case-id" onClick={()=>setSelected(row)}>{row.sourceId||row.cells[index]}</button></th>:
          <td key={index}>{versionColumn(index)?<div className="testing-case-version"><select aria-label={`Version test · case ${row.sourceId}`} value={row.testVersionId??''} disabled={blocked||!row.canUpdateResult||!versions.length||!(row.executedOn||executedOn)} onChange={e=>changeVersion(row,e.target.value)}><option value="" disabled>Chưa ghi version</option>{row.testVersionId&&!versions.some(v=>String(v.id)===String(row.testVersionId))&&<option value={row.testVersionId} disabled>{row.testVersionName} (đã xóa)</option>}{versions.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>{row.executedOn&&<span>Ngày thực hiện: {row.executedOn}</span>}{row.cells[columns.executionNote]&&<details><summary>Ghi chú thực thi cũ</summary><p>{row.cells[columns.executionNote]}</p></details>}</div>:data.canManage&&!blocked?<button className="testing-case-text" aria-label={`Sửa ${data.headers[index]} · case ${row.sourceId}`} onClick={()=>edit(row,index)}>{row.cells[index]||'—'}</button>:<span className="td-cell-text">{row.cells[index]||'—'}</span>}</td>)}
        <td className="td-result-cell"><div className="testing-result-actions">
          <ResultCycleButton sourceId={row.sourceId} value={row.resultStatus} disabled={blocked||missingContext||!row.canUpdateResult} disabledReason={statusBlockedReason} onChange={value=>results.change(row,value,testVersionId?{testVersionId:Number(testVersionId),executedOn}:{})}/>
          {renderIssueAction?.({projectId,featureId,documentId,row:issueRow(row),document:data.document,refresh:query.load})}
          <button className="td-result-history" disabled={results.pending>0} onClick={()=>setHistory(row)}>Lịch sử Status</button>
        </div></td><td>{row.firstTesterName||'—'}</td><td>{row.latestTesterName||'—'}</td>
      </tr>)}</tbody></table>{!visible.length&&<p className="td-empty">Không có case phù hợp.</p>}
    </div>
    {editing&&<DocumentCellEditor projectId={projectId} documentId={documentId} cell={editing} authorized={data.canManage} onClose={()=>setEditing(null)} onSaved={query.load}/>}
    {assigning&&<DocumentAssignments projectId={projectId} documentId={documentId} data={data} onClose={()=>setAssigning(false)} onSaved={query.load}/>}
    {assignmentHistory&&<DocumentAssignmentHistory projectId={projectId} documentId={documentId} rows={rows} onClose={()=>setAssignmentHistory(false)}/>}
    {dialogRow&&<DocumentCaseDialog row={dialogRow} headers={dialogHeaders} onClose={()=>setSelected(null)} onPrevious={selectedIndex>0?()=>moveCase(-1):undefined} onNext={selectedIndex>=0&&selectedIndex+1<filtered.length?()=>moveCase(1):undefined}/>}
    {history&&<DocumentResultHistory projectId={projectId} documentId={documentId} row={history} timeZone="Asia/Ho_Chi_Minh" onClose={()=>setHistory(null)}/>}
  </section>;
}
