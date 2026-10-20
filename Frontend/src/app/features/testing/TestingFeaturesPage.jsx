import React,{useRef,useState} from 'react';
import {featuresApi} from '../../services/api/features';
import {useAuth} from '../auth/AuthProvider';
import {useProject} from '../projects/ProjectProvider';
import {canManageProjectWork} from '../projects/projectAccess';
import {TableScroll} from '../../components/TableScroll';
import {TestProgress} from '../../components/TestProgress';
import {FeatureForm} from './FeatureForm';
import {FeatureListFilters,defaultFeatureFilters} from './FeatureListFilters';
import {requestKey,useTestingQuery} from './testingState';
import '../test-cases/test-cases.css';
import '../test-cases/test-documents.css';
import './testing.css';

export function TestingFeaturesPage({projectId,onOpenFeature,navigate}) {
  const {currentProject}=useProject()||{};const p=projectId||currentProject?.id;
  if(!p)return <p role="status">Chọn dự án để xem Feature.</p>;
  return <Features key={p} projectId={p} project={currentProject} onOpenFeature={onOpenFeature||((id)=>navigate?.(`/board/testing/features/${id}`))}/>;
}
function Features({projectId,project,onOpenFeature}) {
  const {hasRole}=useAuth();const canEdit=!project?.archived&&(hasRole('ADMIN')||canManageProjectWork(project,hasRole));
  const [page,setPage]=useState(0),[filters,setFilters]=useState(defaultFeatureFilters),[form,setForm]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const {archived}=filters,hasSearch=!!(filters.keyword||filters.createdFrom||filters.createdTo);
  const lock=useRef(false),query=useTestingQuery(()=>featuresApi.list(projectId,{page,...filters}),[projectId,page,filters]);
  function applyFilters(next){setPage(0);setFilters(next);setError('');}
  function reloadList(){setError('');return query.load();}
  async function toggle(feature){if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await featuresApi[archived?'restore':'archive'](projectId,feature.id,{expectedVersion:feature.version,requestKey:requestKey()});await query.load();}
    catch(err){setError(err.message||'Chưa cập nhật được Feature.');}finally{lock.current=false;setBusy(false);}}
  return <section className="cat-container testing-page testing-list-page"><div className="td-heading-row"><div><h2 className="ui-page-title">Quản lý kiểm thử</h2><p className="td-muted">Feature · các đợt kiểm thử của dự án</p></div>{canEdit&&<button className="cat-btn cat-btn-mint" onClick={()=>setForm({})}>Tạo Feature</button>}</div>
    <FeatureListFilters onApply={applyFilters} onReload={reloadList} loading={query.loading} busy={busy}/>
    {(error||query.error)&&<div role="alert" className="td-error"><p>{error||query.error}</p>{error&&<p>Tải lại chỉ đọc danh sách, không tự gửi lại thao tác. Kiểm tra trạng thái Feature trước khi chọn {archived?'Khôi phục':'Lưu trữ'} lần nữa.</p>}<button className="cat-btn" disabled={query.loading||busy} onClick={reloadList}>Tải lại danh sách</button></div>}
    {query.loading&&<p role="status">Đang tải Feature…</p>}
    {!query.loading&&query.data&&<><TableScroll role="region" aria-label="Danh sách Feature" tabIndex={0}><table className="td-file-table"><thead><tr><th>Feature</th><th>Môi trường / server</th><th className="testing-progress-column">Tiến độ</th>{canEdit&&<th>Thao tác</th>}</tr></thead><tbody>{query.data.items.map(feature=><tr key={feature.id}><td><button className="td-file-link" onClick={()=>onOpenFeature(feature.id)}>{feature.name}</button>{feature.description?.trim()&&<p className="td-muted">{feature.description}</p>}<p className="testing-created-at">Ngày tạo: {featureCreatedAt(feature.createdAt)}</p></td><td>{feature.environment||'—'}</td><td className="testing-progress-column"><TestProgress tested={feature.testedCaseCount} total={feature.caseCount} label={`Tiến độ ${feature.name}`}/></td>{canEdit&&<td><div className="td-actions">{!archived&&<button className="cat-btn" disabled={busy} onClick={()=>setForm(feature)}>Sửa</button>}<button className="cat-btn" disabled={busy} onClick={()=>toggle(feature)}>{archived?'Khôi phục':'Lưu trữ'}</button></div></td>}</tr>)}</tbody></table></TableScroll>
      {!query.data.items.length&&<p className="td-empty">{hasSearch?'Không tìm thấy Feature phù hợp với bộ lọc.':archived?'Chưa có Feature lưu trữ.':'Chưa có Feature. Tạo một đợt kiểm thử để thêm file.'}</p>}
      <div className="td-pagination"><span>{query.data.totalItems} Feature</span><div><button className="cat-btn" disabled={busy||query.loading||page===0} onClick={()=>setPage(n=>n-1)}>Trang trước</button><span>Trang {page+1}/{Math.max(1,query.data.totalPages)}</span><button className="cat-btn" disabled={busy||query.loading||page+1>=query.data.totalPages} onClick={()=>setPage(n=>n+1)}>Trang sau</button></div></div></>}
    {form&&<FeatureForm projectId={projectId} feature={form.id?form:null} onClose={()=>setForm(null)} onSaved={query.load}/>}
  </section>;
}

function featureCreatedAt(value) {
  if(!value)return 'Chưa có dữ liệu';
  // The JDBC response uses a timezone-less ISO timestamp whose value is UTC.
  const text=String(value).replace(' ','T');
  const date=new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)?text:text+'Z');
  if(Number.isNaN(date.getTime()))return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
}
