import React, { useEffect, useState } from 'react';
import { Plus, ListFilter, RefreshCw } from 'lucide-react';
import BoardPage from '../features/work-items/BoardPage';
import { Button, Modal, StatusBadge, TypeBadge, Avatar } from '../features/work-items/components';
import { useProjectData, typeLabels } from '../features/work-items/ProjectData';
import { NewWorkItemForm, WorkError, WorkSelect, WorkField } from '../features/work-items/WorkItemForm';
import { WorkItemDetail } from '../features/work-items/WorkItemDetail';
import { TransitionDialog } from '../features/work-items/TransitionDialog';
import '../features/work-items/work-items.css';
import '../features/work-items/work-items-live.css';
import '../styles/work-board.css';

export function WorkBoardPage({ activeRoute, navigate }) {
  const data=useProjectData();
  const {issues,projectId,query,setQuery,metadata,catalogs,canTriage,writable,loading,error,refresh}=data;
  const [path,search='']=activeRoute.split('?'),params=new URLSearchParams(search);
  const bugView=path==='/issues'||params.get('view')==='bugs';
  const list=bugView||path==='/board/list'||params.get('view')==='list';
  const back=bugView?'/issues':list?'/board/list':'/board';
  const suffix=bugView?'?view=bugs':list?'?view=list':'';
  const [filtersVisible,setFiltersVisible]=useState(true),[advanced,setAdvanced]=useState(false),[selected,setSelected]=useState([]),[batchStatus,setBatchStatus]=useState('ready');
  const [transition,setTransition]=useState(null),[notice,setNotice]=useState('');
  const routeId=path.startsWith('/board/issue/')?path.split('/')[3]:null;
  const detailId=routeId&&(/^\d+$/.test(routeId)?Number(routeId):issues.find(item=>item.id===routeId)?.serverId);
  const statusParam=params.get('status'),keywordParam=params.get('keyword');
  useEffect(()=>{setSelected([]);setTransition(null);},[projectId,query]);
  useEffect(()=>{setQuery(old=>({...old,page:0,type:bugView?'BUG':'',...(statusParam!=null?{status:statusParam}:{}),...(keywordParam!=null?{keyword:keywordParam}:{})}));},[bugView,projectId,statusParam,keywordParam,setQuery]);
  function change(key,value){setQuery(old=>({...old,[key]:value,page:0}));}
  function go(route){
    if(route==='/board/new'){navigate('/board/new'+suffix);return;}
    if(route.startsWith('/board/issue/')){const key=route.split('/')[3],item=issues.find(i=>i.id===key);navigate('/board/issue/'+(item?.serverId||key)+suffix);return;}
    navigate(route);
  }
  function requestMove(key,status){const item=issues.find(i=>i.id===key);if(item&&canTriage&&item.status!==status)setTransition({items:[item],status});}
  function saved(){setTransition(null);setSelected([]);setNotice('Đã lưu thay đổi.');refresh();}
  if(!projectId)return <div className="cat-container">Chọn một dự án để xem công việc.</div>;
  return <div className="work-items dashboard-board" data-lenis-prevent>
    <header className="wb-heading"><div className="wb-heading-summary"><h1>{bugView?'Quản lý lỗi':list?'Danh sách công việc':'Bảng Kanban'}</h1><span className="wb-filter-count">{data.totalItems??0} công việc</span></div>
      <Button primary icon={Plus} disabled={!writable} onClick={()=>go('/board/new')}>Thêm công việc</Button></header>
    <div className="wi-actions"><Button icon={ListFilter} onClick={()=>setFiltersVisible(v=>!v)}>{filtersVisible?'Ẩn bộ lọc':'Hiện bộ lọc'}</Button><Button icon={RefreshCw} disabled={loading} onClick={refresh}>Tải lại</Button>
      {notice&&<span role="status">{notice}</span>}</div>
    {filtersVisible&&<><div className="wi-toolbar">
      <WorkSelect label="Loại" items={metadata?.types} describe={t=>t.label} value={bugView?'BUG':query.type} onChange={v=>change('type',v)} disabled={bugView}/>
      <WorkSelect label="Trạng thái" items={metadata?.statuses} describe={s=>s.label} value={query.status} onChange={v=>change('status',v)}/>
      <WorkSelect label="Người phụ trách" items={catalogs.members} id={m=>m.membershipId} describe={m=>m.displayName+' ('+m.username+')'} value={query.assignee} onChange={v=>change('assignee',v)}/>
      <WorkField label="Từ khóa"><input placeholder="Mã hoặc tiêu đề công việc" value={query.keyword||''} maxLength={200} onChange={e=>change('keyword',e.target.value)}/></WorkField>
      <Button onClick={()=>setAdvanced(v=>!v)}>{advanced?'Thu gọn':'Tìm kiếm nâng cao'}</Button>
    </div>{advanced&&<div className="wi-toolbar"><WorkSelect label="Danh mục" items={catalogs.categories} value={query.category} onChange={v=>change('category',v)}/><WorkSelect label="Mốc phát hành" items={catalogs.milestones} value={query.milestone} onChange={v=>change('milestone',v)}/><Button onClick={()=>setQuery({page:0,size:50,type:bugView?'BUG':''})}>Xóa điều kiện</Button></div>}</>}
    <WorkError error={error} retry={refresh}/>{loading&&<p className="wi-note" role="status">Đang tải công việc…</p>}
    {canTriage&&selected.length>0&&<div className="wi-batch"><span>{selected.length} công việc đã chọn</span><select aria-label="Trạng thái hàng loạt" value={batchStatus} onChange={e=>setBatchStatus(e.target.value)}>{metadata?.statuses.filter(s=>!s.terminal).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select><Button onClick={()=>setTransition({items:issues.filter(i=>selected.includes(i.serverId)),status:batchStatus})}>Cập nhật hàng loạt</Button></div>}
    {!loading&&!error&&(list?<div className="wi-table-scroll"><table className="wi-table"><thead><tr>{canTriage&&<th>Chọn</th>}{['Loại','Mã','Tiêu đề','Người phụ trách','Trạng thái','Danh mục','Ưu tiên','Build phát sinh','Mốc phát hành','Ngày tạo','Cập nhật'].map(label=><th key={label}>{label}</th>)}</tr></thead>
      <tbody>{issues.map(item=><tr key={item.serverId}>{canTriage&&<td><input type="checkbox" aria-label={'Chọn '+item.id} checked={selected.includes(item.serverId)} onChange={e=>setSelected(old=>e.target.checked?[...old,item.serverId]:old.filter(id=>id!==item.serverId))}/></td>}<td><TypeBadge type={item.type}/></td><td><button className="d-issue-key" onClick={()=>go('/board/issue/'+item.id)}>{item.id}</button></td>
        <td className="wi-title"><button onClick={()=>go('/board/issue/'+item.id)}>{item.title}</button></td><td><Avatar name={item.assignee}/> {item.assignee}</td><td><StatusBadge id={item.status}/></td><td>{item.category||'—'}</td><td>{item.priority}</td><td>{item.buildLabel||'—'}</td><td>{item.milestone||'—'}</td><td>{item.created}</td><td>{item.updated}</td></tr>)}</tbody></table>
      {!issues.length&&<p className="wi-note p-4">Chưa có công việc phù hợp.</p>}</div>:<BoardPage issues={issues} embedded hideControls statuses={metadata?.statuses||[]} canTriage={canTriage} onMove={requestMove} navigate={go} notify={setNotice}/>)}
    <div className="wi-actions"><span className="wi-note">Đang hiển thị {issues.length}/{data.totalItems??0} công việc · Trang {(data.page??0)+1}/{Math.max(1,data.totalPages||0)}</span><Button disabled={loading||!query.page} onClick={()=>setQuery(old=>({...old,page:old.page-1}))}>Trước</Button><Button disabled={loading||(query.page||0)+1>=(data.totalPages||0)} onClick={()=>setQuery(old=>({...old,page:(old.page||0)+1}))}>Tiếp</Button></div>
    {(path==='/board/new'||routeId)&&<Modal title={path==='/board/new'?'Thêm công việc':'Chi tiết công việc'} wide drawer={!!routeId} onClose={()=>navigate(back)}>
      {path==='/board/new'?<NewWorkItemForm key={projectId+':'+(params.get('attempt')||'')} projectId={projectId} catalogs={catalogs} canTriage={canTriage} titlePrefix={metadata?.titlePrefix} attemptId={params.get('attempt')?Number(params.get('attempt')):undefined} onCreated={item=>{refresh();navigate('/board/issue/'+item.id+suffix);}}/>:detailId?<WorkItemDetail key={projectId+':'+detailId} projectId={projectId} id={detailId} catalogs={catalogs} canTriage={canTriage} writable={writable} membershipId={metadata?.membershipId} onChanged={refresh}/>:<p>Không tìm thấy công việc này.</p>}
    </Modal>}
    {transition&&<TransitionDialog projectId={projectId} {...transition} catalogs={catalogs} onClose={()=>setTransition(null)} onSaved={saved}/>}
  </div>;
}
