import React, { useEffect, useState } from 'react';
import { Plus, ListFilter, RefreshCw } from 'lucide-react';
import BoardPage from '../features/work-items/BoardPage';
import { Button, Modal, StatusBadge, TypeBadge, Avatar } from '../features/work-items/components';
import { useProjectData } from '../features/work-items/ProjectData';
import { NewWorkItemForm, WorkError, WorkSelect, WorkField } from '../features/work-items/WorkItemForm';
import { WorkItemDetail } from '../features/work-items/WorkItemDetail';
import { TransitionDialog } from '../features/work-items/TransitionDialog';
import { QaForm, positiveId } from '../features/qa/QaForm';
import '../features/work-items/work-items.css';
import '../features/work-items/work-items-live.css';
import '../styles/work-board.css';

export function WorkBoardPage({ activeRoute, navigate }) {
  const data=useProjectData();
  const {issues,projectId,query,setQuery,metadata,catalogs,canTriage,writable,loading,error,refresh}=data;
  const [path,search='']=activeRoute.split('?'),params=new URLSearchParams(search);
  const contextualQa=path==='/board/list'&&params.getAll('create').includes('QA');
  const context={}; let contextError='';
  if(contextualQa){
    for(const key of ['documentId','groupId','runItemId','revisionId']){
      if(!params.has(key))continue;
      const values=params.getAll(key),value=positiveId(values[0]);
      if(values.length!==1||value==null)contextError='Ngữ cảnh QA không hợp lệ. Kiểm tra lại liên kết nguồn.';
      else context[key]=value;
    }
    if(params.getAll('create').length!==1||params.has('attempt')||params.get('view')==='bugs')contextError='Ngữ cảnh QA mâu thuẫn. Kiểm tra lại liên kết nguồn.';
  }
  const qaScope=projectId+':'+JSON.stringify(context);
  const canCreateQa=metadata?.canCreateQa===true&&writable&&!loading&&!error;
  const canCreateGeneric=writable&&!loading&&!error&&metadata?.canCreate!==false;
  const [openedQa,setOpenedQa]=useState(null),[openedNew,setOpenedNew]=useState(null);
  const newScope=projectId+':'+(params.get('attempt')||'');
  useEffect(()=>{if(contextualQa&&!contextError&&canCreateQa)setOpenedQa(qaScope);else if(!contextualQa)setOpenedQa(null);},[contextualQa,contextError,canCreateQa,qaScope]);
  useEffect(()=>{if(path==='/board/new'&&(canCreateGeneric||canCreateQa))setOpenedNew(newScope);else if(path!=='/board/new')setOpenedNew(null);},[path,canCreateGeneric,canCreateQa,newScope]);
  const cleanParams=new URLSearchParams(search);for(const key of ['create','documentId','groupId','runItemId','revisionId'])cleanParams.delete(key);
  const contextBack='/board/list'+(cleanParams.size?'?'+cleanParams.toString():'');
  const bugView=path==='/issues'||params.get('view')==='bugs';
  const list=bugView||path==='/board/list'||params.get('view')==='list';
  const back=bugView?'/issues':list?'/board/list':'/board';
  const suffix=bugView?'?view=bugs':list?'?view=list':'';
  const [filtersVisible,setFiltersVisible]=useState(true),[advanced,setAdvanced]=useState(false),[selected,setSelected]=useState([]),[batchStatus,setBatchStatus]=useState('ready');
  const [transition,setTransition]=useState(null),[notice,setNotice]=useState('');
  const routeId=path.startsWith('/board/issue/')?path.split('/')[3]:null;
  const detailId=routeId&&(/^\d+$/.test(routeId)?Number(routeId):issues.find(item=>item.id===routeId)?.serverId);
  const statusParam=params.get('status'),keywordParam=params.get('keyword'),milestoneParam=params.get('milestone');
  useEffect(()=>{setSelected([]);setTransition(null);},[projectId,query]);
  useEffect(()=>{setQuery(old=>({...old,page:0,type:bugView?'BUG':'',...(statusParam!=null?{status:statusParam}:{}),...(keywordParam!=null?{keyword:keywordParam}:{}),...(milestoneParam!=null?{milestone:/^[1-9]\d*$/.test(milestoneParam)?milestoneParam:''}:{})}));},[bugView,projectId,statusParam,keywordParam,milestoneParam,setQuery]);
  const statusOptions=metadata?.statusesByType?.[bugView?'BUG':query.type]||metadata?.statuses||[];
  const genericItem=item=>!!item&&item.typeCode!=='QA'&&item.type!=='QA';
  function change(key,value){setQuery(old=>({...old,[key]:value,...(key==='type'?{status:''}:{}),page:0}));}
  function go(route){
    if(route==='/board/new'){navigate('/board/new'+suffix);return;}
    if(route.startsWith('/board/issue/')){const key=route.split('/')[3],item=issues.find(i=>i.id===key);navigate('/board/issue/'+(item?.serverId||key)+suffix);return;}
    navigate(route);
  }
  function requestMove(key,status){const item=issues.find(i=>i.id===key);if(genericItem(item)&&canTriage&&item.status!==status)setTransition({items:[item],status});}
  function batchMove(){const items=issues.filter(i=>selected.includes(i.serverId));if(items.length!==selected.length||!items.every(genericItem)){setNotice('QA phải xử lý qua chi tiết QA.');return;}setTransition({items,status:batchStatus});}
  function saved(){setTransition(null);setSelected([]);setNotice('Đã lưu thay đổi.');refresh();}
  if(!projectId)return <div className="cat-container">Chọn một dự án để xem công việc.</div>;
  return <div className="work-items dashboard-board" data-lenis-prevent>
    <header className="wb-heading"><div className="wb-heading-summary"><h1>{bugView?'Quản lý lỗi':list?'Danh sách công việc':'Bảng Kanban'}</h1><span className="wb-filter-count">{data.totalItems??0} công việc</span></div>
      <Button primary icon={Plus} disabled={!canCreateGeneric&&!canCreateQa} onClick={()=>go('/board/new')}>Thêm công việc</Button></header>
    <div className="wi-actions"><Button icon={ListFilter} onClick={()=>setFiltersVisible(v=>!v)}>{filtersVisible?'Ẩn bộ lọc':'Hiện bộ lọc'}</Button><Button icon={RefreshCw} disabled={loading} onClick={refresh}>Tải lại</Button>
      {notice&&<span role="status">{notice}</span>}</div>
    {filtersVisible&&<><div className="wi-toolbar">
      <WorkSelect label="Loại" items={metadata?.types} describe={t=>t.label} value={bugView?'BUG':query.type} onChange={v=>change('type',v)} disabled={bugView}/>
      <WorkSelect label="Trạng thái" items={statusOptions} describe={s=>s.label} value={query.status} onChange={v=>change('status',v)}/>
      <WorkSelect label="Người phụ trách" items={catalogs.members} id={m=>m.membershipId} describe={m=>m.displayName+' ('+m.username+')'} value={query.assignee} onChange={v=>change('assignee',v)}/>
      <WorkField label="Từ khóa"><input placeholder="Mã hoặc tiêu đề công việc" value={query.keyword||''} maxLength={200} onChange={e=>change('keyword',e.target.value)}/></WorkField>
      <Button onClick={()=>setAdvanced(v=>!v)}>{advanced?'Thu gọn':'Tìm kiếm nâng cao'}</Button>
    </div>{advanced&&<div className="wi-toolbar"><WorkSelect label="Danh mục" items={catalogs.categories} value={query.category} onChange={v=>change('category',v)}/><WorkSelect label="Mốc phát hành" items={catalogs.milestones} value={query.milestone} onChange={v=>change('milestone',v)}/><Button onClick={()=>setQuery({page:0,size:50,type:bugView?'BUG':''})}>Xóa điều kiện</Button></div>}</>}
    <WorkError error={error} retry={refresh}/>{loading&&<p className="wi-note" role="status">Đang tải công việc…</p>}
    {canTriage&&selected.length>0&&<div className="wi-batch"><span>{selected.length} công việc đã chọn</span><select aria-label="Trạng thái hàng loạt" value={batchStatus} onChange={e=>setBatchStatus(e.target.value)}>{metadata?.statuses?.filter(s=>!s.terminal).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select><Button onClick={batchMove}>Cập nhật hàng loạt</Button></div>}
    {!loading&&!error&&(list?<div className="wi-table-scroll"><table className="wi-table"><thead><tr>{canTriage&&<th>Chọn</th>}{['Loại','Mã','Tiêu đề','Người phụ trách','Trạng thái','Danh mục','Ưu tiên','Build phát sinh','Mốc phát hành','Ngày tạo','Cập nhật'].map(label=><th key={label}>{label}</th>)}</tr></thead>
      <tbody>{issues.map(item=><tr key={item.serverId}>{canTriage&&<td>{genericItem(item)&&<input type="checkbox" aria-label={'Chọn '+item.id} checked={selected.includes(item.serverId)} onChange={e=>setSelected(old=>e.target.checked?[...old,item.serverId]:old.filter(id=>id!==item.serverId))}/>}</td>}<td><TypeBadge type={item.type}/></td><td><button className="d-issue-key" onClick={()=>go('/board/issue/'+item.id)}>{item.id}</button></td>
        <td className="wi-title"><button onClick={()=>go('/board/issue/'+item.id)}>{item.title}</button></td><td><Avatar name={item.assignee}/> {item.assignee}</td><td>{!genericItem(item)?<span className="d-status-badge">{item.statusLabel||metadata?.statusesByType?.QA?.find(s=>s.id===item.status)?.label||item.status}</span>:<StatusBadge id={item.status}/>}</td><td>{item.category||'—'}</td><td>{item.priority}</td><td>{item.buildLabel||'—'}</td><td>{item.milestone||'—'}</td><td>{item.created}</td><td>{item.updated}</td></tr>)}</tbody></table>
      {!issues.length&&<p className="wi-note p-4">Chưa có công việc phù hợp.</p>}</div>:<BoardPage issues={issues} embedded hideControls statuses={statusOptions} canTriage={canTriage} onMove={requestMove} navigate={go} notify={setNotice}/>)}
    <div className="wi-actions"><span className="wi-note">Đang hiển thị {issues.length}/{data.totalItems??0} công việc · Trang {(data.page??0)+1}/{Math.max(1,data.totalPages||0)}</span><Button disabled={loading||!query.page} onClick={()=>setQuery(old=>({...old,page:old.page-1}))}>Trước</Button><Button disabled={loading||(query.page||0)+1>=(data.totalPages||0)} onClick={()=>setQuery(old=>({...old,page:(old.page||0)+1}))}>Tiếp</Button></div>
    {(path==='/board/new'||routeId||contextualQa)&&<Modal title={contextualQa?'Tạo QA từ ngữ cảnh':path==='/board/new'?'Thêm công việc':'Chi tiết công việc'} wide drawer={!!routeId} onClose={()=>navigate(contextualQa?contextBack:back)}>
      {contextualQa?contextError?<WorkError error={contextError}/>:canCreateQa||openedQa===qaScope?<QaForm key={qaScope} projectId={projectId} catalogs={catalogs} canCreateQa={canCreateQa} context={context} onCreated={fresh=>{refresh();navigate('/board/issue/'+fresh.item.id+'?view=list');}}/>:<p>{loading?'Đang tải quyền tạo QA…':'Hiện không có quyền tạo QA.'}</p>:path==='/board/new'?(canCreateGeneric||canCreateQa||openedNew===newScope?<NewWorkItemForm key={newScope} projectId={projectId} catalogs={catalogs} canTriage={canTriage} canCreate={canCreateGeneric} canCreateQa={canCreateQa} titlePrefix={metadata?.titlePrefix} attemptId={params.get('attempt')?Number(params.get('attempt')):undefined} onCreated={item=>{refresh();navigate('/board/issue/'+item.id+suffix);}}/>:<p>{loading?'Đang tải quyền tạo công việc…':'Dev chỉ xử lý bug được giao.'}</p>):detailId?<WorkItemDetail key={projectId+':'+detailId} projectId={projectId} id={detailId} catalogs={catalogs} canTriage={canTriage} writable={writable} membershipId={metadata?.membershipId} onChanged={refresh}/>:<p>Không tìm thấy công việc này.</p>}
    </Modal>}
    {transition&&transition.items.every(item=>genericItem(item)&&genericItem(issues.find(current=>current.serverId===item.serverId)))&&<TransitionDialog projectId={projectId} {...transition} catalogs={catalogs} onClose={()=>setTransition(null)} onSaved={saved}/>}
  </div>;
}
