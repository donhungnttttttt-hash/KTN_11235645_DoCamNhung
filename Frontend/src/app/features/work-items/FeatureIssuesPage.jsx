import React,{useEffect,useState} from 'react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {featuresApi} from '../../services/api/features';
import {TableScroll} from '../../components/TableScroll';
import {Modal,StatusBadge,useModalState} from './components';
import {statuses} from './data';
import {FeatureIssueForm} from './FeatureIssueForm';
import {FeatureIssueDetail} from './FeatureIssueDetail';
import './feature-issues.css';

function routeFilters(route) {
 const params=new URLSearchParams(route.split('?')[1]||'');
 return {page:Number(params.get('page'))||0,size:20,type:params.get('type')||'',status:params.get('status')||'',keyword:params.get('keyword')||'',featureId:params.get('featureId')||''};
}
function MonkeyFeatureSelect({features,value,onChange,authorized}){
 const activity=useModalState();return <><label className="wi-field">Feature phát hiện lỗi<select value={value} disabled={!authorized||activity?.busy||activity?.dirty} onChange={event=>onChange(event.target.value)}><option value="">Chọn Feature</option>{features.map(feature=><option key={feature.id} value={feature.id}>{feature.name}</option>)}</select></label>{activity?.dirty&&<p className="wi-note">Bản nháp thuộc Feature đã chọn. Dùng Hủy nếu muốn bỏ bản nháp và chọn Feature khác.</p>}</>;
}
export function FeatureIssuesPage({projectId,activeRoute='/board',navigate=()=>{},api=featureIssuesApi,featureApi=featuresApi,canCreate=false}) {
 const [path,search='']=activeRoute.split('?'),params=new URLSearchParams(search);
 const errorsView=path==='/issues'||params.get('from')==='issues';
 const list=errorsView||path==='/board/list'||params.get('view')==='list';
 const match=/^\/board\/issue\/([1-9]\d*)$/.exec(path),detailId=match?Number(match[1]):null;
 const [filters,setFilters]=useState(()=>routeFilters(activeRoute));
 const [data,setData]=useState(null),[features,setFeatures]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[featureError,setFeatureError]=useState(''),[reload,setReload]=useState(0),[featureReload,setFeatureReload]=useState(0),[monkey,setMonkey]=useState(false),[monkeyFeature,setMonkeyFeature]=useState(''),[notice,setNotice]=useState(''),[move,setMove]=useState(null);
 useEffect(()=>{const next=routeFilters(activeRoute);setFilters(current=>Object.keys(next).every(key=>next[key]===current[key])?current:next);},[activeRoute]);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');
  api.list(projectId,filters,{signal:abort.signal}).then(value=>{if(!abort.signal.aborted)setData(value);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[api,projectId,filters,reload]);
 useEffect(()=>{const abort=new AbortController();setFeatureError('');setFeatures([]);
  (async()=>{const all=[];let page=0,totalPages=1;do{const result=await featureApi.list(projectId,{page});if(abort.signal.aborted)return;all.push(...result.items);totalPages=result.totalPages||0;page++;}while(page<totalPages);if(!abort.signal.aborted)setFeatures(all);})().catch(e=>{if(!abort.signal.aborted)setFeatureError(e.message);});return()=>abort.abort();
 },[featureApi,projectId,featureReload]);
 function updateFilters(next){setFilters(next);setNotice('');window.history.replaceState(null,'',`#${route(path,next)}`);window.dispatchEvent(new HashChangeEvent('hashchange'));}
 function change(name,value){updateFilters({...filters,[name]:value,page:0});}
 function route(base,values=filters){const query=new URLSearchParams(Object.entries(values).filter(([,value])=>value!==''&&value!=null).map(([key,value])=>[key,String(value)]));query.set('projectId',String(projectId));if(params.get('workspace')==='1')query.set('workspace','1');if(base.startsWith('/board/issue/')){if(list&&!errorsView)query.set('view','list');if(errorsView)query.set('from','issues');}return base+(query.size?'?'+query.toString():'');}
 function openIssue(id,status){setMove(status?{id,status}:null);navigate(route('/board/issue/'+id));}
 function close(){setMove(null);navigate(route(errorsView?'/issues':list?'/board/list':'/board'));}
 function changed(){setReload(value=>value+1);setNotice('Đã cập nhật Issue.');}
 function requestMove(item,status){if(!item?.canTransition||!item.allowedStatuses?.some(value=>value.id===status)){setNotice('Bạn không có quyền chuyển Issue sang trạng thái này.');return;}openIssue(item.id,status);}
 const items=data?.items||[];
 return <section className="cat-container feature-issues-page">
  <header className="td-heading-row"><div><h1 className="ui-page-title">{errorsView?'Quản lý lỗi':'Bảng trạng thái'}</h1><p className="td-muted">Bug và QA của dự án · {data?.totalItems??0} Issue</p></div>{errorsView&&canCreate&&<button className="cat-btn cat-btn-mint" onClick={()=>setMonkey(true)}>Ghi lỗi monkey</button>}</header>
  {!errorsView&&<div role="group" aria-label="Chế độ xem công việc" className="wi-actions"><button className="cat-btn" aria-pressed={!list} onClick={()=>navigate(route('/board'))}>Kanban</button><button className="cat-btn" aria-pressed={list} onClick={()=>navigate(route('/board/list'))}>Danh sách</button></div>}
  <div className="feature-issue-filters"><label>Feature<select value={filters.featureId} onChange={e=>change('featureId',e.target.value)}><option value="">Tất cả Feature</option>{features.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Loại<select value={filters.type} onChange={e=>change('type',e.target.value)}><option value="">Bug và QA</option><option value="BUG">Bug</option><option value="QA">QA</option></select></label><label>Trạng thái<select value={filters.status} onChange={e=>change('status',e.target.value)}><option value="">Tất cả trạng thái</option>{statuses.map(status=><option key={status.id} value={status.id}>{status.label}</option>)}</select></label><label>Tìm Issue<input type="search" value={filters.keyword} onChange={e=>change('keyword',e.target.value)} maxLength={200} placeholder="Mã, tiêu đề hoặc tên Feature"/></label><button className="cat-btn" disabled={loading} onClick={()=>setReload(value=>value+1)}>Tải lại</button></div>
  {featureError&&<p role="alert">{featureError} <button className="cat-btn" onClick={()=>setFeatureReload(value=>value+1)}>Tải lại Feature</button></p>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{loading&&<p role="status">Đang tải Issue…</p>}
  {!loading&&!error&&(list?<TableScroll label="Danh sách Bug và QA"><table className="td-file-table"><thead><tr><th>Mã / loại</th><th>Tiêu đề</th><th>Feature / file</th><th>Người phụ trách</th><th>Trạng thái</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><button className="td-file-link" onClick={()=>openIssue(item.id)}>{item.key}</button><small>{item.type}</small></td><td><button className="td-file-link" onClick={()=>openIssue(item.id)}>{item.title}</button></td><td>{item.featureName}<small>{item.fileName}</small></td><td>{item.assignee||'Chưa phân công'}</td><td><StatusBadge id={item.status}/></td></tr>)}</tbody></table></TableScroll>:<>
   <p className="td-muted">Thẻ và số lượng theo trang đang xem. Mở thẻ để xử lý hoặc dùng bộ chọn trạng thái; kéo thả mở bước xác nhận.</p>
   <div className="feature-status-board" aria-label="Bảng trạng thái Bug và QA">{statuses.map(status=><section key={status.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');requestMove(items.find(item=>String(item.id)===id),status.id);}}><h2>{status.label} <span>{items.filter(item=>item.status===status.id).length}</span></h2>{items.filter(item=>item.status===status.id).map(item=><article key={item.id} draggable={item.canTransition} onDragStart={e=>e.dataTransfer.setData('text/plain',String(item.id))}><small>{item.type} · {item.key}</small><button className="td-file-link" onClick={()=>openIssue(item.id)}>{item.title}</button><p>{item.featureName}</p><small>{item.assignee||'Chưa phân công'}</small>{item.canTransition&&<select aria-label={'Chuyển trạng thái '+item.key} value="" onChange={e=>requestMove(item,e.target.value)}><option value="">Chuyển trạng thái…</option>{item.allowedStatuses?.filter(value=>value.id!==item.status).map(value=><option key={value.id} value={value.id}>{value.label}</option>)}</select>}</article>)}</section>)}</div>
  </>)}
  {!loading&&!error&&!items.length&&<p>Chưa có Issue phù hợp. Tạo Issue tại case hoặc ghi lỗi monkey ở Quản lý lỗi.</p>}
  <div className="td-pagination"><span>{data?.totalItems??0} Issue · Trang {filters.page+1}/{Math.max(1,data?.totalPages||0)}</span><div><button className="cat-btn" disabled={loading||filters.page===0} onClick={()=>updateFilters({...filters,page:filters.page-1})}>Trước</button><button className="cat-btn" disabled={loading||filters.page+1>=(data?.totalPages||0)} onClick={()=>updateFilters({...filters,page:filters.page+1})}>Tiếp</button></div></div>
  {detailId&&<Modal title="Chi tiết Issue" wide drawer onClose={close}><FeatureIssueDetail key={`${projectId}/${detailId}`} projectId={projectId} id={detailId} api={api} initialStatus={move?.id===detailId?move.status:null} onChanged={changed} onDeleted={()=>{changed();close();}}/></Modal>}
  {monkey&&<Modal title="Ghi lỗi monkey" wide onClose={()=>setMonkey(false)}><MonkeyFeatureSelect features={features} value={monkeyFeature} authorized={canCreate} onChange={setMonkeyFeature}/>{monkeyFeature?<FeatureIssueForm key={projectId+'/'+monkeyFeature} projectId={projectId} featureId={Number(monkeyFeature)} featureName={features.find(f=>String(f.id)===monkeyFeature)?.name} api={api} monkey authorized={canCreate} onSaved={()=>{setMonkey(false);changed();}} onCancel={()=>setMonkey(false)}/>:<p>Chọn đúng Feature của lần kiểm thử phát hiện lỗi.</p>}</Modal>}
 </section>;
}
