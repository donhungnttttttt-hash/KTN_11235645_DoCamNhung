import React,{useRef,useState} from 'react';
import {featuresApi} from '../../services/api/features';
import {useAuth} from '../auth/AuthProvider';
import {useProject} from '../projects/ProjectProvider';
import {canManageProjectWork} from '../projects/projectAccess';
import {TableScroll} from '../../components/TableScroll';
import {TestProgress} from '../../components/TestProgress';
import {ImportExcelDialog} from '../test-cases/ImportExcelDialog';
import {requestKey,useTestingQuery} from './testingState';
import './testing.css';

export function TestingFeaturePage({projectId,featureId,onOpenDocument,onBack,navigate}) {
  const {currentProject}=useProject()||{},p=projectId||currentProject?.id;
  if(!p)return <p role="status">Chọn dự án để xem Feature.</p>;
  return <FeatureFiles key={`${p}/${featureId}`} projectId={p} featureId={featureId} project={currentProject} onOpenDocument={onOpenDocument||((d)=>navigate?.(`/board/testing/features/${featureId}/documents/${d}`))} onBack={onBack||(()=>navigate?.('/board/testing'))}/>;
}
function FeatureFiles({projectId,featureId,project,onOpenDocument,onBack}) {
  const {hasRole}=useAuth(),[page,setPage]=useState(0),[keyword,setKeyword]=useState(''),[importing,setImporting]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),query=useTestingQuery(async()=>{const [feature,files]=await Promise.all([featuresApi.get(projectId,featureId),featuresApi.documents(projectId,featureId,{page,keyword})]);return {feature,files};},[projectId,featureId,page,keyword]);
  const canManage=!project?.archived&&(hasRole('ADMIN')||canManageProjectWork(project,hasRole))&&!query.data?.feature.archivedAt;
  function reloadList(){setError('');return query.load();}
  async function hide(doc){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await featuresApi.hideDocument(projectId,featureId,doc.id,{expectedVersion:doc.version,requestKey:requestKey()});await query.load();}catch(err){setError(err.message||'Chưa xóa được file khỏi danh sách.');}finally{lock.current=false;setBusy(false);}}
  return <section className="cat-container testing-page testing-list-page testing-feature-page"><button className="cat-btn testing-back" onClick={onBack}>← Danh sách Feature</button>
    {query.loading&&<p role="status">Đang tải file của Feature…</p>}{(error||query.error)&&<div role="alert" className="td-error"><p>{error||query.error}</p>{error&&<p>Tải lại chỉ đọc danh sách, không tự gửi lại thao tác. Kiểm tra trạng thái file trước khi chọn Xóa khỏi danh sách lần nữa.</p>}<button className="cat-btn" disabled={query.loading||busy} onClick={reloadList}>Tải lại danh sách</button></div>}
    {query.data&&<><div className="td-heading-row"><div><h2 className="ui-page-title">{query.data.feature.name}</h2><p>{query.data.feature.environment||'Chưa ghi môi trường / server'}</p>{query.data.feature.description?.trim()&&<p className="td-muted">{query.data.feature.description}</p>}{query.data.feature.archivedAt&&<p role="status">Feature đã lưu trữ · chỉ xem</p>}</div>{canManage&&<button className="cat-btn cat-btn-mint" onClick={()=>setImporting(true)}>Nhập Excel</button>}</div>
      <div className="td-filter-row testing-list-filters"><label className="testing-search-field">Tìm file<input type="search" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label><button className="cat-btn" disabled={query.loading||busy} onClick={reloadList}>Làm mới</button></div>
      <TableScroll role="region" aria-label="File trong Feature" tabIndex={0}><table className="td-file-table"><thead><tr><th>File test case</th><th className="testing-progress-column">Tiến độ</th><th>Người phụ trách</th>{canManage&&<th>Thao tác</th>}</tr></thead><tbody>{query.data.files.items.map(doc=><tr key={doc.id}><td><button className="td-file-link" onClick={()=>onOpenDocument(doc.id)}>{doc.fileName}</button><small className="td-sheet">{doc.sheetName}</small></td><td className="testing-progress-column"><TestProgress tested={doc.testedCaseCount} total={doc.caseCount} label={`Tiến độ ${doc.fileName}`}/></td><td>{doc.assignees?.map(a=>a.name).join(', ')||'Chưa phân công'}</td>{canManage&&<td><button className="cat-btn" disabled={busy} onClick={()=>hide(doc)}>Xóa khỏi danh sách</button></td>}</tr>)}</tbody></table></TableScroll>
      {!query.data.files.items.length&&<p className="td-empty">Chưa có file phù hợp trong Feature.</p>}<div className="td-pagination"><span>{query.data.files.totalItems} file</span><div><button className="cat-btn" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Trang trước</button><span>Trang {page+1}/{Math.max(1,query.data.files.totalPages)}</span><button className="cat-btn" disabled={page+1>=query.data.files.totalPages} onClick={()=>setPage(n=>n+1)}>Trang sau</button></div></div></>}
    {importing&&<ImportExcelDialog projectId={projectId} featureId={featureId} onClose={()=>setImporting(false)} onSuccess={result=>{setImporting(false);if(result?.id)onOpenDocument(result.id);else query.load();}}/>}
  </section>;
}
