import {useRefreshOnReturn} from '../../hooks/useRefreshOnReturn';
import {TableScroll} from '../../components/TableScroll';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AdminProjectForm } from './AdminProjectForm';
import { adminApi } from '../../services/api/admin';
import { useAdminRead, ReadState, percent } from './shared';
import { Plus, Search, FolderKanban, RotateCcw } from 'lucide-react';
import { UnifiedSelect } from '../../components/UnifiedSelect';
import './admin-projects.css';

export function AdminProjects({api=adminApi}) {
  const [creating,setCreating]=useState(false);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [keyword,setKeyword]=useState('');const [page,setPage]=useState(0);
  const [sort,setSort]=useState('newest'),[createdFrom,setCreatedFrom]=useState(''),[createdTo,setCreatedTo]=useState('');
  const invalidDates=Boolean(createdFrom&&createdTo&&createdFrom>createdTo);
  const load=useCallback(signal=>invalidDates?Promise.resolve(null):api.projects({keyword,page,size:20,sort,createdFrom,createdTo},{signal}),[api,keyword,page,sort,createdFrom,createdTo,invalidDates]);
  const state=useAdminRead(`projects:${keyword}:${page}:${sort}:${createdFrom}:${createdTo}`,load);
  function change(setter,value){setter(value);setPage(0);}
  function clearFilters(){setKeyword('');setSort('newest');setCreatedFrom('');setCreatedTo('');setPage(0);}
  const filtered=keyword||createdFrom||createdTo||sort!=='newest';
  return <div className="admin-projects-page">
    <div className="admin-page-heading admin-projects-heading"><div><span className="admin-projects-eyebrow">QUẢN LÝ DỰ ÁN</span><h1>Dự án</h1><p>Theo dõi tiến độ, nhân sự và tình trạng các dự án.</p></div><button className="admin-projects-create" onClick={()=>setCreating(true)}><Plus size={18} aria-hidden="true"/>Tạo dự án mới</button></div>
    {creating&&<AdminProjectForm api={api} onCancel={()=>setCreating(false)} onSaved={p=>{if(!mounted.current)return;setCreating(false);window.location.hash=`/admin/projects/${p.id}`;state.retry();}}/>}
    <form className="admin-projects-filters" onSubmit={e=>e.preventDefault()} aria-label="Bộ lọc danh sách dự án">
      <div className="admin-projects-search"><label htmlFor="admin-search">Tìm mã hoặc tên dự án</label><div><Search size={18} aria-hidden="true"/><input id="admin-search" type="search" placeholder="Nhập tên hoặc mã dự án…" maxLength={100} value={keyword} onChange={e=>change(setKeyword,e.target.value)}/></div></div>
      <div><label htmlFor="admin-project-sort">Sắp xếp</label><UnifiedSelect id="admin-project-sort" aria-label="Sắp xếp" value={sort} onChange={e=>change(setSort,e.target.value)}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></UnifiedSelect></div>
      <div><label htmlFor="admin-project-from">Từ ngày</label><input id="admin-project-from" type="date" aria-describedby="project-date-hint" value={createdFrom} max={createdTo||undefined} onChange={e=>change(setCreatedFrom,e.target.value)}/></div>
      <div><label htmlFor="admin-project-to">Đến ngày</label><input id="admin-project-to" type="date" aria-describedby="project-date-hint" value={createdTo} min={createdFrom||undefined} onChange={e=>change(setCreatedTo,e.target.value)}/></div>
      <button className="admin-projects-reset" type="button" disabled={!filtered} onClick={clearFilters} title="Xóa bộ lọc" aria-label="Xóa bộ lọc"><RotateCcw size={18} aria-hidden="true"/></button>
      <small id="project-date-hint">Lọc theo ngày tạo dự án · giờ Việt Nam</small>
    </form>
    {invalidDates?<p className="admin-error" role="alert">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>:<ReadState {...state}/>}
    {!invalidDates&&state.data&&<section className="admin-card admin-projects-results" aria-label="Danh sách dự án">
      <div className="admin-projects-result-heading"><strong>{state.data.totalElements} dự án</strong><span>Trang {page+1} / {Math.max(1,Math.ceil(state.data.totalElements/20))}</span></div>
      {state.data.items.length?<ProjectsListTable items={state.data.items}/>:<div className="admin-projects-empty"><FolderKanban size={36} aria-hidden="true"/><p>Không có dự án phù hợp.</p>{filtered&&<button type="button" onClick={clearFilters}>Xem tất cả dự án</button>}</div>}
      <div className="admin-pagination"><button disabled={!page} onClick={()=>setPage(page-1)}>Trang trước</button><button disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Trang sau</button></div>
    </section>}
  </div>;
}
function ProjectsListTable({items}){
  return <TableScroll className="admin-table-scroll admin-projects-table" tabIndex={0} aria-label="Bảng tổng hợp dự án"><table><thead><tr><th>Dự án</th><th>PM hoạt động</th><th>Thành viên</th><th>Tiến độ kiểm thử</th><th>Tỷ lệ OK</th><th>Bug mở</th><th>Mốc quá hạn</th><th>Máy đang giữ</th><th>Trạng thái</th></tr></thead><tbody>{items.map(p=>{
    const progress=p.metrics.executionPercent;
    const date=p.createdAt?new Date(p.createdAt):null;
    return <tr key={p.id}><th scope="row"><a className="admin-projects-name" href={`#/admin/projects/${p.id}`} aria-label={`${p.code} · ${p.name}`}><span>{p.code}</span><strong>{p.name}</strong></a><small>Ngày tạo: {date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—'}</small></th>
      <td><span className="admin-projects-pms" title={p.pmNames||'Chưa có PM hoạt động'}>{p.pmNames||'Chưa có PM hoạt động'}</span></td><td className="admin-projects-number">{p.activeMembers}</td>
      <td><div className="admin-projects-progress-label"><strong>{progress==null?'—':percent(progress)}</strong><span>{p.metrics.total} case</span></div><div className="admin-projects-progress" role="img" aria-label={`Đã test: ${percent(progress)}`}><span style={{width:`${Math.min(100,Math.max(0,Number(progress)||0))}%`}}/></div></td>
      <td className="admin-projects-number">{p.metrics.passPercent==null?'—':percent(p.metrics.passPercent)}</td><td className="admin-projects-number"><span className={p.openBugs?'admin-projects-count-warning':undefined}>{p.openBugs}</span></td><td className="admin-projects-number">{p.overdueMilestones??0}</td><td className="admin-projects-number">{p.heldDevices??0}</td><td><span className={`admin-projects-status${p.archivedAt?' is-archived':''}`}>{p.archivedAt?'Lưu trữ':'Hoạt động'}</span></td></tr>;
  })}</tbody></table></TableScroll>;
}
export function AdminProjectDetail({id,api=adminApi,children,onReload}) {
 useRefreshOnReturn(()=>{(onReload||state.retry)();});
  const load=useCallback(signal=>api.project(id,{signal}),[api,id]);const state=useAdminRead(`project:${id}`,load);
  if (!state.data) return <ReadState {...state}/>;
  const p=state.data;
  return <><div className="admin-page-heading"><h1>{p.code} · {p.name}</h1></div><section className="admin-card"><p>{p.description || 'Chưa có mô tả.'}</p><p>Múi giờ: {p.timezone} · {p.archivedAt ? 'Lưu trữ' : 'Hoạt động'}</p><p>PM hoạt động: {p.pmNames || 'Chưa có PM hoạt động'}</p><p>{p.activeMembers} thành viên hoạt động · {p.openBugs} bug chưa kết thúc · {p.awaitingVerification} chờ xác minh</p><p>Đã test: {percent(p.metrics.executionPercent)} · Tỷ lệ OK: {percent(p.metrics.passPercent)}</p><p>OK {p.metrics.ok} · NG {p.metrics.ng} · P {p.metrics.pending} · Chưa chạy {p.metrics.notRun} · NA {p.metrics.na}</p><p><a href={`#/admin/devices?projectId=${p.id}`}>{p.heldDevices??0} máy vật lý đang giữ</a></p></section>{children}<section className="admin-card"><h2>Mốc & tiến độ</h2>{p.milestones.length ? <TableScroll label="Mốc phát hành" className="admin-table-scroll" tabIndex={0}><table><thead><tr><th>Mốc</th><th>Hạn</th><th>Cảnh báo</th></tr></thead><tbody>{p.milestones.map(m=><tr key={m.id}><th>{m.name}</th><td>{m.dueOn || 'Chưa có hạn'}</td><td>{m.deadlineStatus==='OVERDUE' ? 'Quá hạn' : m.deadlineStatus==='INSUFFICIENT_DATA' ? 'Chưa đủ dữ liệu' : 'Không có cảnh báo quá hạn'}</td></tr>)}</tbody></table></TableScroll> : <p>Chưa có mốc. Chưa đủ dữ liệu để đánh giá hạn.</p>}</section>
  </>;
}
