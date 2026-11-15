import {useRefreshOnReturn} from '../../hooks/useRefreshOnReturn';
import {UnifiedSelect} from '../../components/UnifiedSelect';
import {SearchableSelect} from '../../components/SearchableSelect';
import {featuresApi} from '../../services/api/features';
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
import {ColumnResizeHandle,testingColumnWidth,approvedTestColumns,testerNames} from './TestingGridColumns';
import '../test-cases/test-cases.css';
import '../test-cases/test-documents.css';
import './testing.css';
import './testing-spreadsheet.css';

export function TestingDocumentPage({projectId,featureId,documentId,caseId,onBack,navigate,renderIssueAction}) {
  const {currentProject}=useProject()||{},p=projectId||currentProject?.id;
  if(!p)return <p role="status">Chọn dự án để xem file.</p>;
  return <FeatureDocument key={`${p}/${featureId}/${documentId}`} projectId={p} featureId={featureId} documentId={documentId} caseId={caseId} renderIssueAction={renderIssueAction} onBack={onBack||(()=>navigate?.(`/board/testing/features/${featureId}`))}/>;
}
function FeatureDocument({projectId,featureId,documentId,caseId,onBack,renderIssueAction}) {
 useRefreshOnReturn(()=>{if(!results.pending)query.load();});
  const query=useTestingQuery(async()=>{const value=await testCasesApi.getDocument(projectId,documentId);if(String(value.document.featureId)!==String(featureId))throw new Error('File không thuộc Đợt kiểm thử đang mở.');return value;},[projectId,featureId,documentId]);
  const [environmentId,setEnvironmentId]=useState(''),[contextBusy,setContextBusy]=useState(false),[contextError,setContextError]=useState('');const contextLock=useRef(false);
  const [assignmentHistory,setAssignmentHistory]=useState(false);
  const [columnWidths,setColumnWidths]=useState({});
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(0),[pageSize,setPageSize]=useState(20),[editing,setEditing]=useState(null),[assigning,setAssigning]=useState(false),[selected,setSelected]=useState(null),[history,setHistory]=useState(null),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState(''),[saved,setSaved]=useState(null);
  const [executedOn,setExecutedOn]=useState(()=>vietnamDate()),[testVersionId,setTestVersionId]=useState(''),[savedExecutions,setSavedExecutions]=useState({});
  const results=useDocumentResults(projectId,documentId,query.data,value=>{setSaved(value);setSavedExecutions(old=>({...old,[value.rowId]:{testVersionId:value.testVersionId,testVersionName:value.testVersionName,executedOn:value.executedOn,environmentId:value.environmentId,environmentName:value.environmentName,contextVersion:value.contextVersion,...(value.firstTesterName!=null?{firstTesterName:value.firstTesterName}:{})}}));});
  const data=query.data,columns=data?.columns||{},sourceIndex=columns.sourceId??0;
  const versions=data?.testVersions||[],environments=data?.testEnvironments||[];
  const sourceColumns=useMemo(()=>approvedTestColumns(data),[data]);
  useEffect(()=>{if(data){setSavedExecutions({});setContextError('');setTestVersionId(previous=>data.testVersions?.some(v=>String(v.id)===previous)?previous:suggestedVersion(data.testVersions||[],executedOn));}},[data]);
  const rows=useMemo(()=>(data?.rows||[]).map(row=>({...row,...savedExecutions[row.rowId],resultStatus:results.overrides[row.rowId]??row.resultStatus})),[data,results.overrides,savedExecutions]);
  const filtered=useMemo(()=>rows.filter(row=>(!status||row.resultStatus===status)&&matchesSearch([row.sourceId,...sourceColumns.map(column=>row.cells[column.index]||''),row.testVersionName,row.environmentName,...testerNames(row)],search)),[rows,status,search,sourceColumns]);
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
  const blocked=contextBusy||!!contextError||results.pending>0||!!results.error||query.loading||exporting;
  const missingContext=versions.length>0&&(!testVersionId||!executedOn);
  const statusBlockedReason=results.pending>0?'Đang lưu Status. Vui lòng chờ.':results.error?'Kết quả chưa được xác nhận. Tải lại kết quả trước khi sửa.':query.loading?'Đang tải lại bảng case.':exporting?'Đang xuất file. Vui lòng chờ.':missingContext?'Chọn version test và ngày thực hiện trước khi đổi Status.':'Case đang ở chế độ chỉ đọc hoặc tài khoản không có quyền ghi kết quả trong dự án.';
  function edit(row,index){const field=Object.keys(columns).find(name=>columns[name]===index)||['','','titleVi','preconditionsVi','stepsVi','expectedVi','titleJp','preconditionsJp','stepsJp','expectedJp','sourceReference'][index];setEditing({row,index,value:row.cells[index]||'',version:data.cellVersions?.[row.rowId]?.[index]||0,label:data.headers[index]||`Cột ${index+1}`,canonical:false});}
  async function download(original){if(blocked)return;setExporting(true);setExportError('');try{const blob=await testCasesApi.exportDocument(projectId,documentId,original);downloadWorkbook(blob,documentExportName(data.document.fileName,original));}catch(err){setExportError(err.message||'Chưa tải được file.');}finally{setExporting(false);}}
  if(!data)return <section className="testing-page"><button className="cat-btn" onClick={onBack}>← File trong Đợt kiểm thử</button>{query.loading&&<p role="status">Đang tải bảng case…</p>}{query.error&&<p role="alert" className="td-error">{query.error} <button className="cat-btn" onClick={query.load}>Thử lại</button></p>}</section>;
  const visibleColumns=[...sourceColumns,{key:'version',label:'MT & Ver',index:-1}];
  const gridColumns=[...visibleColumns.map(column=>({...column,defaultWidth:testingColumnWidth(column,columns,sourceIndex)})),{key:'status',label:'Status',defaultWidth:104},{key:'issue',label:'Ticket',defaultWidth:112},{key:'testers',label:'Người test',defaultWidth:170}];
  const widthOf=column=>columnWidths[column.key]??column.defaultWidth;
  const versionColumn=index=>index===-1;
  const selectedCurrent=selected&&(rows.find(row=>row.rowId===selected.rowId)||selected);
  const selectedIndex=selectedCurrent?filtered.findIndex(row=>row.rowId===selectedCurrent.rowId):-1;
  function moveCase(offset){const index=selectedIndex+offset;if(index>=0&&index<filtered.length){setSelected(filtered[index]);setPage(Math.floor(index/pageSize));}}
  const dialogRow=selectedCurrent&&{...selectedCurrent,cells:[...visibleColumns.map(({index})=>versionColumn(index)?[selectedCurrent.environmentName,selectedCurrent.testVersionName].filter(Boolean).join(' · '):selectedCurrent.cells[index]||''),selectedCurrent.executedOn||'',selectedCurrent.resultStatus,testerNames(selectedCurrent).join('\n')]};
  const dialogHeaders=[...visibleColumns.map(({label})=>label),'Ngày thực hiện','Status','Người test'];
  async function changeContext(row,field,value){
    if(blocked||contextLock.current||!row.canUpdateResult||!value||String(row[field])===value)return;
    contextLock.current=true;setContextBusy(true);setContextError('');
    try{const result=await featuresApi.updateExecutionContext(projectId,documentId,row.rowId,{[field]:Number(value),expectedContextVersion:row.contextVersion||0,requestKey:crypto.randomUUID()});setSavedExecutions(old=>({...old,[row.rowId]:{...old[row.rowId],...result}}));}
    catch(e){setContextError(e.message||'Chưa lưu được môi trường/version. Tải lại để kiểm tra.');}
    finally{contextLock.current=false;setContextBusy(false);}
  }
  function choices(items,id,name){return [...(id&&!items.some(v=>String(v.id)===String(id))?[{value:id,label:name+' (đã xóa)',disabled:true}]:[]),...items.map(v=>({value:v.id,label:v.name}))];}
  function issueRow(row){return {...row,title:row.cells[columns.titleVi??2]||'',steps:row.cells[columns.stepsVi??4]||'',expected:row.cells[columns.expectedVi??5]||''};}
  return <section className="testing-page testing-document testing-spreadsheet td-page"><div className="td-sheet-title"><button className="cat-btn testing-back" onClick={onBack}>← File trong Đợt kiểm thử</button><span className="testing-feature-tag">Đợt kiểm thử #{featureId}</span><h2>{data.document.fileName}</h2></div>
    <div className="td-sheet-toolbar" role="region" aria-label="Điều khiển bảng case" tabIndex={0}><div className="testing-progress"><TestProgress tested={tested} total={rows.length} label="Tiến độ file"/>
      <div className="testing-execution-actions"><div className="testing-execution-context"><label>Môi trường<SearchableSelect label="Môi trường áp dụng" value={environmentId} disabled={blocked} options={[{value:'',label:'Giữ môi trường của case'},...choices(environments)]} onChange={setEnvironmentId}/></label><label>Version test<SearchableSelect label="Version test áp dụng" value={testVersionId} disabled={blocked||!versions.length} placeholder="Chưa có version test" options={choices(versions)} onChange={setTestVersionId}/></label><label>Ngày thực hiện<input type="date" value={executedOn} disabled={blocked} onChange={e=>{setExecutedOn(e.target.value);setTestVersionId(suggestedVersion(versions,e.target.value));}}/></label></div>
      <div className="testing-progress-actions">{(data.canManage||data.canAssign)&&<button className="cat-btn" disabled={blocked} onClick={()=>setAssigning(true)}>Phân công test case</button>}<button className="cat-btn" disabled={results.pending>0} onClick={()=>setAssignmentHistory(true)}>Lịch sử phân công</button></div></div></div>
      {!versions.length&&<p className="td-source-note">Đợt kiểm thử chưa có version test. Thêm version tại màn File trong Đợt kiểm thử để ghi kèm vào kết quả mới. Kết quả cũ được giữ nguyên.</p>}
      <div className="td-filter-row"><label>Tìm trong file<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label><label>Status<UnifiedSelect value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">Tất cả</option>{['UNEXECUTED','OK','NG','P','NA'].map(s=><option key={s} value={s}>{s==='UNEXECUTED'?'Unexecuted':s}</option>)}</UnifiedSelect></label><div className="testing-file-actions"><button className="cat-btn" disabled={blocked} onClick={()=>download(false)}>Xuất Excel</button>{data.document.hasSourceFile&&<button className="cat-btn" disabled={blocked} onClick={()=>download(true)}>Tải file gốc</button>}</div></div>
      <div className="td-toolbar-pagination"><button className="cat-btn" disabled={currentPage===0} onClick={()=>setPage(n=>n-1)}>Trang trước</button><span>Trang {currentPage+1}/{pages} · {filtered.length} case</span><button className="cat-btn" disabled={currentPage+1>=pages} onClick={()=>setPage(n=>n+1)}>Trang sau</button><label>Số dòng<UnifiedSelect value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0);}}>{[20,50,100].map(n=><option key={n}>{n}</option>)}</UnifiedSelect></label></div>
    </div>
    <p className="td-source-note">Version/ngày áp dụng khi ghi kết quả từng case. Người test là người đầu tiên; mỗi lần đổi Status đều lưu người thực hiện trong lịch sử.</p>
    {contextError&&<p role="alert" className="td-error">{contextError} <button onClick={query.load}>Thử lại thông tin case</button></p>}
    {results.error&&<p role="alert" className="td-error">{results.error} {(query.error||results.error)&&<button className="cat-btn" disabled={results.pending>0} onClick={query.load}>Thử lại kết quả</button>}</p>}{exportError&&<p role="alert" className="td-error">{exportError}</p>}<p role="status">{results.pending?'Đang lưu Status…':saved?'Đã lưu kết quả và thông tin version của case.':''}</p>
    <div className="td-grid-scroll" role="region" aria-label="Bảng test case của Đợt kiểm thử" tabIndex={0}>
      <table className="td-case-grid" style={{width:gridColumns.reduce((sum,column)=>sum+widthOf(column),0)}}><colgroup>{gridColumns.map(column=><col key={column.key} style={{width:widthOf(column)}}/>)}</colgroup><thead><tr>
        {gridColumns.map(column=><th key={column.key} scope="col" aria-label={column.label||`Cột ${column.index+1}`} className={column.index===sourceIndex?'td-sticky-id':['status','issue'].includes(column.key)?'testing-result-heading':undefined}><span className="testing-column-label">{column.label||`Cột ${column.index+1}`}</span><ColumnResizeHandle label={column.label||`Cột ${column.index+1}`} width={widthOf(column)} defaultWidth={column.defaultWidth} onResize={width=>setColumnWidths(old=>({...old,[column.key]:width}))}/></th>)}
      </tr></thead><tbody>{visible.map(row=><tr key={row.rowId} ref={row.rowId===linkedRow?.rowId?focusedRow:undefined} tabIndex={row.rowId===linkedRow?.rowId?-1:undefined} aria-current={row.rowId===linkedRow?.rowId?true:undefined}>
        {visibleColumns.map(({index,key})=>key==='sourceId'?
          <th key={key} scope="row" className="td-sticky-id"><button ref={element=>{if(element)caseButtons.current.set(row.rowId,element);else caseButtons.current.delete(row.rowId);}} className="td-case-id" onClick={()=>setSelected(row)}>{row.sourceId||row.cells[index]}</button></th>:
          <td key={key}>{versionColumn(index)?<div className="testing-case-version"><SearchableSelect label={`Môi trường · case ${row.sourceId}`} value={row.environmentId??''} disabled={blocked||!row.canUpdateResult||!environments.length} placeholder="Chưa ghi môi trường" options={choices(environments,row.environmentId,row.environmentName)} onChange={value=>changeContext(row,'environmentId',value)}/><SearchableSelect label={`Version test · case ${row.sourceId}`} value={row.testVersionId??''} disabled={blocked||!row.canUpdateResult||!versions.length} placeholder="Chưa ghi version" options={choices(versions,row.testVersionId,row.testVersionName)} onChange={value=>changeContext(row,'testVersionId',value)}/>{row.executedOn&&<span>Ngày thực hiện: {row.executedOn}</span>}</div>:index!=null&&data.canManage&&!blocked?<button className="testing-case-text" aria-label={`Sửa ${data.headers[index]} · case ${row.sourceId}`} onClick={()=>edit(row,index)}>{row.cells[index]||'—'}</button>:<span className="td-cell-text">{row.cells[index]||'—'}</span>}</td>)}
        <td className="td-result-cell"><div className="testing-result-actions">
          <ResultCycleButton sourceId={row.sourceId} value={row.resultStatus} disabled={blocked||missingContext||!row.canUpdateResult} disabledReason={statusBlockedReason} onChange={value=>results.change(row,value,{...(testVersionId?{testVersionId:Number(testVersionId)}:{}),...(environmentId?{environmentId:Number(environmentId)}:{}),executedOn,expectedContextVersion:row.contextVersion||0})}/>
          <button className="td-result-history" disabled={results.pending>0} onClick={()=>setHistory(row)}>Lịch sử Status</button>
        </div></td><td className="testing-issue-cell">{renderIssueAction?.({projectId,featureId,documentId,row:issueRow(row),document:data.document,refresh:query.load})||'—'}</td><td className="testing-testers">{testerNames(row).length?testerNames(row).map(name=><span key={name}>{name}</span>):'—'}</td>
      </tr>)}</tbody></table>{!visible.length&&<p className="td-empty">Không có case phù hợp.</p>}
    </div>
    {editing&&<DocumentCellEditor projectId={projectId} documentId={documentId} cell={editing} authorized={data.canManage} onClose={()=>setEditing(null)} onSaved={query.load}/>}
    {assigning&&<DocumentAssignments projectId={projectId} documentId={documentId} data={data} onClose={()=>setAssigning(false)} onSaved={query.load}/>}
    {assignmentHistory&&<DocumentAssignmentHistory projectId={projectId} documentId={documentId} rows={rows} onClose={()=>setAssignmentHistory(false)}/>}
    {dialogRow&&<DocumentCaseDialog row={dialogRow} headers={dialogHeaders} onClose={()=>setSelected(null)} onPrevious={selectedIndex>0?()=>moveCase(-1):undefined} onNext={selectedIndex>=0&&selectedIndex+1<filtered.length?()=>moveCase(1):undefined}/>}
    {history&&<DocumentResultHistory projectId={projectId} documentId={documentId} row={history} timeZone="Asia/Ho_Chi_Minh" onClose={()=>setHistory(null)}/>}
  </section>;
}
