import React,{useCallback,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {AdminUserProjectFilter} from './AdminUserProjectFilter';

const labels={IDENTITY:'Tài khoản',PROJECT:'Dự án',MEMBERSHIP:'Thành viên',DEVICE_ASSET:'Máy vật lý',DEVICE_ALLOCATION:'Bàn giao máy',STATUS_REPORT:'Báo cáo PM',CREATE:'Tạo mới',UPDATE:'Cập nhật',ARCHIVE:'Lưu trữ',REOPEN:'Mở lại',ASSIGN:'Bàn giao',RETURN:'Thu hồi',SET_ROLE:'Gán vai trò',REMOVE:'Gỡ thành viên',USER_CREATED:'Tạo tài khoản',USER_UPDATED:'Cập nhật tài khoản',USER_ENABLED:'Mở khóa tài khoản',USER_DISABLED:'Khóa tài khoản',CREATE_USERS_GRANTED:'Cấp quyền tạo Tester',CREATE_USERS_REVOKED:'Thu hồi quyền tạo Tester',ADMIN_BOOTSTRAPPED:'Khởi tạo quản trị viên',LOGIN_SUCCEEDED:'Đăng nhập',LOGIN_FAILED:'Đăng nhập thất bại',LOGOUT:'Đăng xuất'};
export function AdminAudit({api=adminApi,initialProjectId=''}) {
 const [filters,setFilters]=useState({projectId:initialProjectId,type:'',from:'',through:'',timezone:'Asia/Ho_Chi_Minh',page:0,size:20});
 const change=(key,value)=>setFilters(old=>({...old,[key]:value,page:0}));
 const load=useCallback(signal=>api.audit(filters,{signal}),[api,filters]);
 const state=useAdminRead(`audit:${JSON.stringify(filters)}`,load);
 return <><div className="admin-page-heading"><h1>Nhật ký quản trị</h1><button onClick={state.retry}>Tải lại</button></div>
  <div className="admin-card admin-filters"><AdminUserProjectFilter api={api} label="Dự án trong nhật ký" value={filters.projectId} onChange={v=>change('projectId',v)}/>
   <label>Loại sự kiện<select value={filters.type} onChange={e=>change('type',e.target.value)}><option value="">Tất cả loại</option>{['IDENTITY','PROJECT','MEMBERSHIP','DEVICE_ASSET','DEVICE_ALLOCATION','STATUS_REPORT'].map(type=><option key={type} value={type}>{labels[type]||type}</option>)}</select></label>
   <label>Từ ngày<input type="date" value={filters.from} onChange={e=>change('from',e.target.value)}/></label><label>Đến hết ngày<input type="date" value={filters.through} onChange={e=>change('through',e.target.value)}/></label>
   <label>Múi giờ ngày lọc<select value={filters.timezone} onChange={e=>change('timezone',e.target.value)}><option>Asia/Ho_Chi_Minh</option><option>UTC</option></select></label>
  </div><p>Ngày lọc và thời gian hiển thị: {filters.timezone}. Bao gồm trọn ngày kết thúc. Sự kiện toàn hệ thống chỉ có trong Tất cả dự án.</p>
  <ReadState {...state}/>{state.data&&<section className="admin-card"><p>{state.data.totalElements} sự kiện · Trang {filters.page+1}</p>
   {!state.data.items.length?<p>Không có sự kiện phù hợp.</p>:<div className="admin-table-scroll" tabIndex={0} aria-label="Nhật ký quản trị"><table><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Phạm vi</th><th>Đối tượng</th><th>Thao tác</th></tr></thead><tbody>{state.data.items.map(e=><tr key={e.id}><td><time dateTime={e.occurredAt} title={e.occurredAt}>{new Date(e.occurredAt).toLocaleString('vi-VN',{timeZone:filters.timezone})}</time></td><td>{e.actorName||'Hệ thống'}</td><td>{e.projectId?<a href={`#/admin/projects/${e.projectId}`}>{e.projectName}</a>:'Toàn hệ thống'}</td><td title={e.entityType}>{labels[e.entityType]||e.entityType} · {e.entityId||'—'}</td><td title={e.action}>{labels[e.action]||e.action}</td></tr>)}</tbody></table></div>}
   <div className="admin-pagination"><button disabled={!filters.page} onClick={()=>setFilters({...filters,page:filters.page-1})}>Trang trước</button><button disabled={(filters.page+1)*20>=state.data.totalElements} onClick={()=>setFilters({...filters,page:filters.page+1})}>Trang sau</button></div>
  </section>}
 </>;
}
