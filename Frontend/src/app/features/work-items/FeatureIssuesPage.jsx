import React,{useEffect,useState} from 'react';
import {featureIssuesApi} from '../../services/api/featureIssues';
import {featuresApi} from '../../services/api/features';
import {TableScroll} from '../../components/TableScroll';
import {Modal,useModalState} from './components';
import {ticketColumns,ticketLabel} from './ticketWorkflow';
import {statuses} from './data';
import {TicketResponsibilities} from './TicketResponsibilities';
import {FeatureIssueForm} from './FeatureIssueForm';
import {FeatureIssueDetail} from './FeatureIssueDetail';
import {FeatureIssueBoard} from './FeatureIssueBoard';
import './feature-issues.css';
import './feature-kanban.css';

function routeFilters(route) {
 const params=new URLSearchParams(route.split('?')[1]||'');
 return {page:Number(params.get('page'))||0,size:20,column:params.get('column')||'',type:params.get('type')||'',status:params.get('status')||'',keyword:params.get('keyword')||'',featureId:params.get('featureId')||''};
}
function MonkeyFeatureSelect({features,value,onChange,authorized}){
 const activity=useModalState();return <><label className="wi-field">Feature phát hiện lỗi<select value={value} disabled={!authorized||activity?.busy||activity?.dirty} onChange={event=>onChange(event.target.value)}><option value="">Chọn Feature</option>{features.map(feature=><option key={feature.id} value={feature.id}>{feature.name}</option>)}</select></label>{activity?.dirty&&<p className="wi-note">Bản nháp thuộc Feature đã chọn. Dùng Hủy nếu muốn bỏ bản nháp và chọn Feature khác.</p>}</>;
}
export function FeatureIssuesPage({projectId,activeRoute='/board',navigate=()=>{},api=featureIssuesApi,featureApi=featuresApi,canCreate=false}) {
 const [path,search='']=activeRoute.split('?'),params=new URLSearchParams(search);
 const errorsView=path==='/issues'||params.get('from')==='issues';
 const list=errorsView||path==='/board/list'||params.get('view')==='list';
 const match=/^\/board\/issue\/([1-9]\d*)$/.exec(path),detailId=match?Number(match[1]):null;
 const [board,setBoard]=useState(null),[boardError,setBoardError]=useState(''),[duties,setDuties]=useState(false);
 const [filters,setFilters]=useState(()=>routeFilters(activeRoute));
 const [data,setData]=useState(null),[features,setFeatures]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[featureError,setFeatureError]=useState(''),[reload,setReload]=useState(0),[featureReload,setFeatureReload]=useState(0),[monkey,setMonkey]=useState(false),[monkeyFeature,setMonkeyFeature]=useState(''),[notice,setNotice]=useState(''),[move,setMove]=useState(null);
 useEffect(()=>{const next=routeFilters(activeRoute);setFilters(current=>Object.keys(next).every(key=>next[key]===current[key])?current:next);},[activeRoute]);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');
  api.list(projectId,filters,{signal:abort.signal}).then(value=>{if(!abort.signal.aborted)setData(value);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[api,projectId,filters,reload]);
 useEffect(()=>{const abort=new AbortController();setBoard(null);setBoardError('');
  const {page,size,column,...scope}=filters;
  api.board(projectId,scope,{signal:abort.signal}).then(value=>{if(!abort.signal.aborted)setBoard(value);}).catch(e=>{if(!abort.signal.aborted)setBoardError(e.message);});return()=>abort.abort();
 },[api,projectId,filters,reload]);
 useEffect(()=>{const abort=new AbortController();setFeatureError('');setFeatures([]);
  (async()=>{const all=[];let page=0,totalPages=1;do{const result=await featureApi.list(projectId,{page});if(abort.signal.aborted)return;all.push(...result.items);totalPages=result.totalPages||0;page++;}while(page<totalPages);if(!abort.signal.aborted)setFeatures(all);})().catch(e=>{if(!abort.signal.aborted)setFeatureError(e.message);});return()=>abort.abort();
 },[featureApi,projectId,featureReload]);
 function updateFilters(next){setFilters(next);setNotice('');window.history.replaceState(null,'',`#${route(path,next)}`);window.dispatchEvent(new HashChangeEvent('hashchange'));}
 function change(name,value){updateFilters({...filters,[name]:value,...(name==='column'?{status:''}:{}),page:0});}
 function route(base,values=filters){const query=new URLSearchParams(Object.entries(values).filter(([,value])=>value!==''&&value!=null).map(([key,value])=>[key,String(value)]));query.set('projectId',String(projectId));if(params.get('workspace')==='1')query.set('workspace','1');if(base.startsWith('/board/issue/')){if(list&&!errorsView)query.set('view','list');if(errorsView)query.set('from','issues');}return base+(query.size?'?'+query.toString():'');}
 function openIssue(id,status){setMove(status?{id,status}:null);navigate(route('/board/issue/'+id));}
 function close(){setMove(null);navigate(route(errorsView?'/issues':list?'/board/list':'/board'));}
 function changed(){setReload(value=>value+1);setNotice('Đã cập nhật Issue.');}
 function requestMove(item,status){if(!item?.allowedTransitions?.some(value=>value.columnId===status)){setNotice('Bạn không có quyền chuyển Issue sang trạng thái này.');return;}openIssue(item.id,status);}
 const items=data?.items||[];
 return <section className="cat-container feature-issues-page">
  <header className="td-heading-row"><div><h1 className="ui-page-title">{errorsView?'Quản lý lỗi':'Bảng trạng thái'}</h1><p className="td-muted">Bug và QA của dự án · {board?.totalItems??'—'} Issue theo bộ lọc</p></div><div className="wi-actions"><button className="cat-btn" onClick={()=>setDuties(true)}>Trách nhiệm Ticket</button>{errorsView&&canCreate&&<button className="cat-btn cat-btn-mint" onClick={()=>setMonkey(true)}>Ghi lỗi monkey</button>}</div></header>
  {!errorsView&&<div role="group" aria-label="Chế độ xem công việc" className="feature-issue-view-switch"><button className="cat-btn" aria-pressed={!list} onClick={()=>navigate(route('/board'))}>Kanban</button><button className="cat-btn" aria-pressed={list} onClick={()=>navigate(route('/board/list'))}>Danh sách</button></div>}
  <div className="feature-issue-filters"><label>Feature<select value={filters.featureId} onChange={e=>change('featureId',e.target.value)}><option value="">Tất cả Feature</option>{features.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Loại<select value={filters.type} onChange={e=>change('type',e.target.value)}><option value="">Bug và QA</option><option value="BUG">Bug</option><option value="QA">QA</option></select></label><label>Cột Ticket<select value={filters.column} onChange={e=>change('column',e.target.value)}><option value="">Tất cả cột</option>{ticketColumns.map(column=><option key={column.id} value={column.id}>{column.label}</option>)}<option value="legacy">Cần đối chiếu lịch sử</option></select></label><label>Tìm Issue<input type="search" value={filters.keyword} onChange={e=>change('keyword',e.target.value)} maxLength={200} placeholder="Mã, tiêu đề hoặc tên Feature"/></label><button className="cat-btn" disabled={loading} onClick={()=>setReload(value=>value+1)}>Tải lại</button></div>
  {filters.status&&<p className="ticket-legacy-summary">Trạng thái lịch sử từ liên kết: {statuses.find(value=>value.id===filters.status)?.label||filters.status}. Không suy diễn lý do đóng. <button className="cat-btn" onClick={()=>change('status','')}>Bỏ lọc trạng thái lịch sử</button></p>}
  {featureError&&<p role="alert">{featureError} <button className="cat-btn" onClick={()=>setFeatureReload(value=>value+1)}>Tải lại Feature</button></p>}
  {boardError&&<p role="alert">Chưa tải được tổng Ticket: {boardError} <button className="cat-btn" onClick={()=>setReload(value=>value+1)}>Tải lại tổng</button></p>}
  <section className="ticket-legacy-summary" aria-label="Đối chiếu Ticket lịch sử"><span>{board?.legacyCount??'—'} Ticket cần đối chiếu lịch sử · Giữ nguyên kết luận cũ, không suy diễn Đã sửa.</span><button className="cat-btn" aria-pressed={filters.column==='legacy'} onClick={()=>change('column','legacy')}>Xem Ticket lịch sử</button>{filters.column&&<button className="cat-btn" onClick={()=>change('column','')}>Xem tất cả cột</button>}</section>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{loading&&<p role="status">Đang tải Issue…</p>}
  {!loading&&!error&&(list||filters.column==='legacy'?<TableScroll label="Danh sách Bug và QA"><table className="td-file-table"><thead><tr><th>Mã / loại</th><th>Tiêu đề</th><th>Feature / file</th><th>Người phụ trách</th><th>Trạng thái</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><button className="td-file-link" onClick={()=>openIssue(item.id)}>{item.key}</button><small>{item.type}</small></td><td><button className="td-file-link" onClick={()=>openIssue(item.id)}>{item.title}</button></td><td>{item.featureName}<small>{item.fileName}</small></td><td>{item.assignee||'Chưa phân công'}</td><td><span>{ticketLabel(item)}</span></td></tr>)}</tbody></table></TableScroll>:<>
   <FeatureIssueBoard items={items} columns={board?.columns} selectedColumn={filters.column} onColumn={value=>change('column',value)} onOpen={openIssue} onMove={requestMove}/>
  </>)}
  {!loading&&!error&&!items.length&&data?.totalItems===0&&<p>Chưa có Issue phù hợp. Tạo Issue tại case hoặc ghi lỗi monkey ở Quản lý lỗi.</p>}
  <div className="td-pagination"><span>{data?.totalItems??0} Issue · Trang {filters.page+1}/{Math.max(1,data?.totalPages||0)}</span><div><button className="cat-btn" disabled={loading||filters.page===0} onClick={()=>updateFilters({...filters,page:filters.page-1})}>Trước</button><button className="cat-btn" disabled={loading||filters.page+1>=(data?.totalPages||0)} onClick={()=>updateFilters({...filters,page:filters.page+1})}>Tiếp</button></div></div>
  {duties&&<Modal title="Trách nhiệm Ticket" wide onClose={()=>setDuties(false)}><TicketResponsibilities projectId={projectId} api={api}/></Modal>}
  {detailId&&<Modal title="Chi tiết Issue" wide drawer onClose={close}><FeatureIssueDetail key={`${projectId}/${detailId}`} projectId={projectId} id={detailId} api={api} initialStatus={move?.id===detailId?move.status:null} onChanged={changed} onDeleted={()=>{changed();close();}}/></Modal>}
  {monkey&&<Modal title="Ghi lỗi monkey" wide onClose={()=>setMonkey(false)}><MonkeyFeatureSelect features={features} value={monkeyFeature} authorized={canCreate} onChange={setMonkeyFeature}/>{monkeyFeature?<FeatureIssueForm key={projectId+'/'+monkeyFeature} projectId={projectId} featureId={Number(monkeyFeature)} featureName={features.find(f=>String(f.id)===monkeyFeature)?.name} api={api} monkey authorized={canCreate} onSaved={()=>{setMonkey(false);changed();}} onCancel={()=>setMonkey(false)}/>:<p>Chọn đúng Feature của lần kiểm thử phát hiện lỗi.</p>}</Modal>}
 </section>;
}
