import React, { useEffect, useState } from 'react';
import {
  Home, Columns3, FlaskConical, Bug, ChartNoAxesCombined,
  Menu, X, ChevronDown, Settings, BookOpen,
  Users, SlidersHorizontal, FileCheck,
} from 'lucide-react';
import { useProject } from '../features/projects/ProjectProvider';
import { useAuth } from '../features/auth/AuthProvider';

const navigation = [
  { label: 'Tổng quan', route: '/dashboard', icon: Home, id: 'dashboard' },
  { label: 'Bảng công việc', route: '/board', icon: Columns3, id: 'board', children: [
    { label: 'Bảng trạng thái', route: '/board', icon: Columns3 },
    { label: 'Quản lý kiểm thử', route: '/board/testing', icon: FlaskConical },
  ] },
  { label: 'Quản lý lỗi', route: '/issues', icon: Bug, id: 'issues' },
  { label: 'Tổng hợp & Phân tích', route: '/analysis', icon: ChartNoAxesCombined, id: 'analysis' },
  { label: 'Thông tin chung', route: '/settings', icon: Settings, id: 'settings', children: [
    { label: 'Thông tin dự án', route: '/settings', icon: SlidersHorizontal },
    { label: 'Thành viên', route: '/settings/members', icon: Users },
    { label: 'Note', route: '/settings/notes', icon: BookOpen },
    { label: 'Quy tắc báo lỗi', route: '/settings/rules', icon: FileCheck },
    { label: 'Sổ tay dự án', route: '/settings/handbook', icon: BookOpen },
  ] },
];

function selectedPage(activeRoute) {
  const [path] = activeRoute.split('?');
  if (path === '/board/testing' || path.startsWith('/board/testing/')) return '/board/testing';
  if (path === '/board' || path.startsWith('/board/')) {
    return '/board';
  }
  if (path === '/tests/file-work' || /^\/tests\/file-work\/[1-9]\d*$/.test(path)) return '/tests/file-work';
  if (/^\/tests\/(?:cycles\/)?\d+$/.test(path)) return '/tests/cycles';
  if (path === '/tests/cases' || path.startsWith('/tests/documents/')) return '/tests';
  return path;
}

export function Sidebar({ activeRoute, navigate, collapsed, onToggle, onClose, panelRef, overlayOpen = false }) {
  const {currentProject} = useProject() || {}, auth = useAuth();
  const hasRole = role => auth?.hasRole?.(role) || auth?.user?.roles?.includes(role);
  const canAnalyze = hasRole('ADMIN') || (currentProject?.projectRole === 'PM' && !hasRole('DEV'));
  const active = activeRoute.split('?')[0].split('/')[1];
  const [openGroup, setOpenGroup] = useState(active);
  const selected = selectedPage(activeRoute);
  useEffect(() => { setOpenGroup(active); }, [activeRoute, active]);

  function openPage(route) {
    navigate(route);
    onClose?.();
  }

  return <aside ref={panelRef} id="project-navigation" className="app-sidebar" aria-label="Menu dự án"
    role={overlayOpen ? 'dialog' : undefined} aria-modal={overlayOpen ? 'true' : undefined} tabIndex={overlayOpen ? -1 : undefined}>
    <div className="app-sidebar-toggle">
      {!overlayOpen && <button className="sidebar-desktop-toggle" onClick={onToggle}
        aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} aria-expanded={!collapsed}>
        <Menu size={21} />
      </button>}
      {overlayOpen && <button className="sidebar-mobile-close" onClick={onClose} aria-label="Đóng menu"><X size={21} /></button>}
    </div>
    <nav aria-label="Điều hướng dự án">
      {navigation.filter(item=>item.id!=='analysis'||canAnalyze).map(({ label, route, icon: Icon, id, children }) => children ? (
        <div key={id} className="app-nav-group">
          <button title={label} className={'app-nav-item ' + (active === id ? 'active' : '')}
            aria-expanded={openGroup === id && !collapsed} aria-controls={id + '-submenu'}
            onClick={() => {
              if (collapsed) { onToggle(); setOpenGroup(id); }
              else setOpenGroup(open => open === id ? null : id);
            }}>
            <Icon size={21} strokeWidth={1.8} /><span>{label}</span>
            <ChevronDown size={15} className={'app-nav-chevron ' + (openGroup === id ? 'open' : '')} />
          </button>
          {openGroup === id && !collapsed && <div id={id + '-submenu'} className="app-submenu" role="group" aria-label={'Các mục ' + label}>
            {children.map(({ label: childLabel, route: childRoute, icon: ChildIcon }) => (
              <button key={childRoute} aria-current={selected === childRoute ? 'page' : undefined}
                onClick={() => openPage(childRoute)}>
                <ChildIcon size={15} /><span>{childLabel}</span>
              </button>
            ))}
          </div>}
        </div>
      ) : (
        <button key={id} title={label} className={'app-nav-item ' + (active === id ? 'active' : '')}
          aria-current={active === id ? 'page' : undefined} onClick={() => openPage(route)}>
          <Icon size={21} strokeWidth={1.8} /><span>{label}</span>
        </button>
      ))}
    </nav>
    <div className="app-sidebar-bottom"><span>S+TMS</span><small>Quản lý dự án & kiểm thử</small></div>
  </aside>;
}
