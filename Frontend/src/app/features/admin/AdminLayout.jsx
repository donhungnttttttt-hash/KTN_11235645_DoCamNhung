import React, { useState } from 'react';
import { Home, FolderKanban, Users, TabletSmartphone, ScrollText, PanelsTopLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { adminApi } from '../../services/api/admin';
import { AdminUserProjectFilter } from './AdminUserProjectFilter';

export function AdminLayout({path,projectId,navigate,children,api=adminApi}) {
  const {user,logout}=useAuth();
  const [logoutError,setLogoutError]=useState('');const [busy,setBusy]=useState(false);
  const projectsPage=path.startsWith('/admin/projects');
  async function signOut() {setBusy(true);setLogoutError('');try{await logout();}catch(error){setLogoutError(error.message);}finally{setBusy(false);}}
  return <div className="admin-shell">
    <a className="admin-skip" href="#admin-main" onClick={event=>{event.preventDefault();document.getElementById('admin-main')?.focus();}}>Đến nội dung</a>
    <header className="admin-header"><div><strong>TMS</strong><span>Quản trị hệ thống</span></div><div><span>{user.displayName}</span><button onClick={signOut} disabled={busy}>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div></header>
    <aside className="admin-sidebar">
      <nav aria-label="Quản trị">
        {[
          ['/admin', 'Tổng quan', Home, path === '/admin'],
          ['/admin/projects', 'Dự án', FolderKanban, projectsPage],
          ['/admin/users', 'Người dùng', Users, path === '/admin/users'],
          ['/admin/devices', 'Thiết bị', TabletSmartphone, path === '/admin/devices'],
          ['/admin/audit', 'Nhật ký quản trị', ScrollText, path === '/admin/audit'],
          ['/dashboard?workspace=1', 'Không gian dự án', PanelsTopLeft, false],
        ].map(([href, label, Icon, active]) => (
          <a key={href} href={`#${href}`} aria-current={active ? 'page' : undefined}>
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="admin-sidebar-bottom"><strong>S+TMS</strong><small>Quản trị tập trung</small></div>
    </aside>
    <main id="admin-main" className="admin-main" tabIndex={-1}>
      {logoutError && <p role="alert">{logoutError}</p>}
      {projectsPage && <section className="admin-project-filter" aria-label="Lọc dự án">
        <AdminUserProjectFilter key={path==='/admin/projects'?'list':'detail'} searchable={path!=='/admin/projects'} api={api} label="Phạm vi dự án" value={projectId || ''} onChange={id=>navigate(path,id)}/>
      </section>}
      {children}
    </main>
  </div>;
}
