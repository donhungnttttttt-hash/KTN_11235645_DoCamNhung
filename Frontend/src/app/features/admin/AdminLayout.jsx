import React, { useCallback, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { adminApi } from '../../services/api/admin';
import { useAdminRead, ReadState } from './shared';

export function AdminLayout({path,projectId,navigate,children,api=adminApi}) {
  const {user,logout}=useAuth();
  const [logoutError,setLogoutError]=useState('');const [busy,setBusy]=useState(false);
  const [pickerPage,setPickerPage]=useState(0);
  const projectsPage=path.startsWith('/admin/projects');
  const load=useCallback(signal=>projectsPage ? api.projects({page:pickerPage,size:100},{signal}) : Promise.resolve({items:[],totalElements:0}),[api,pickerPage,projectsPage]);
  const picker=useAdminRead(`picker:${projectsPage}:${pickerPage}`,load);
  async function signOut() {setBusy(true);setLogoutError('');try{await logout();}catch(error){setLogoutError(error.message);}finally{setBusy(false);}}
  return <div className="admin-shell">
    <a className="admin-skip" href="#admin-main" onClick={event=>{event.preventDefault();document.getElementById('admin-main')?.focus();}}>Đến nội dung</a>
    <header className="admin-header"><div><strong>TMS</strong><span>Quản trị hệ thống</span></div><div><span>{user.displayName}</span><button onClick={signOut} disabled={busy}>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div></header>
    <aside className="admin-sidebar"><nav aria-label="Quản trị"><a href="#/admin" aria-current={path==='/admin' ? 'page' : undefined}>Tổng quan</a><a href="#/admin/projects" aria-current={projectsPage ? 'page' : undefined}>Dự án</a><a href="#/admin/users" aria-current={path==='/admin/users' ? 'page' : undefined}>Người dùng</a><a href="#/admin/devices" aria-current={path==='/admin/devices' ? 'page' : undefined}>Thiết bị</a><a href="#/admin/audit" aria-current={path==='/admin/audit' ? 'page' : undefined}>Nhật ký quản trị</a><a href="#/dashboard?workspace=1">Không gian dự án</a></nav><p>Quản trị tập trung</p></aside>
    <main id="admin-main" className="admin-main" tabIndex={-1}>
      {logoutError && <p role="alert">{logoutError}</p>}
      {projectsPage && <section className="admin-project-filter" aria-label="Lọc dự án">
        <div className="admin-scope"><label htmlFor="admin-project-scope">Phạm vi dự án</label><select id="admin-project-scope" value={projectId || ''} onChange={e=>navigate(path,e.target.value)}><option value="">Tất cả dự án</option>{projectId && !picker.data?.items.some(p=>String(p.id)===String(projectId)) && <option value={projectId}>Dự án #{projectId}</option>}{picker.data?.items.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>{picker.data?.totalElements>100 && <div className="admin-picker-pages"><button disabled={!pickerPage} onClick={()=>setPickerPage(pickerPage-1)} aria-label="Dự án trước trong bộ chọn">‹</button><span>{pickerPage+1}</span><button disabled={(pickerPage+1)*100>=picker.data.totalElements} onClick={()=>setPickerPage(pickerPage+1)} aria-label="Dự án sau trong bộ chọn">›</button></div>}</div>
        {picker.error && <ReadState {...picker}/>}
      </section>}
      {children}
    </main>
  </div>;
}
