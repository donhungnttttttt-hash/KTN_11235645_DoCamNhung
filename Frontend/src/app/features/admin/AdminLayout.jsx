import React, { useEffect, useRef, useState } from 'react';
import { Home, FolderKanban, Users, TabletSmartphone, ScrollText, PanelsTopLeft, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { adminApi } from '../../services/api/admin';
import { AdminUserProjectFilter } from './AdminUserProjectFilter';
import { useChatLauncherSlot } from '../ai/ChatLauncherSlot';
import {useDialogFocus} from '../../hooks/useDialogFocus';

function useCompactAdminNavigation(){
  const query='(max-width: 768px)';
  const [compact,setCompact]=useState(()=>window.matchMedia?.(query).matches??window.innerWidth<=768);
  useEffect(()=>{
    const media=window.matchMedia?.(query);
    const changed=()=>setCompact(media?.matches??window.innerWidth<=768);
    changed();
    if(media?.addEventListener){media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);}
    window.addEventListener('resize',changed);return()=>window.removeEventListener('resize',changed);
  },[]);
  return compact;
}

export function AdminLayout({path,projectId,navigate,children,api=adminApi}) {
  const {user,logout}=useAuth();
  const registerChatSlot=useChatLauncherSlot();
  const [logoutError,setLogoutError]=useState('');const [busy,setBusy]=useState(false);
  const [collapsed,setCollapsed]=useState(false),[mobileOpen,setMobileOpen]=useState(false);
  const compact=useCompactAdminNavigation(),drawerOpen=compact&&mobileOpen;
  const mainRef=useRef(null),menuButton=useRef(null),collapseButton=useRef(null),wasDrawerOpen=useRef(false);
  const sidebarRef=useDialogFocus(()=>setMobileOpen(false),false,drawerOpen);
  const currentPath=path.split('?')[0],previousPath=useRef(currentPath);
  const projectsPage=currentPath.startsWith('/admin/projects');
  useEffect(()=>{if(!compact&&mobileOpen)setMobileOpen(false);},[compact,mobileOpen]);
  useEffect(()=>{
    if(wasDrawerOpen.current&&!drawerOpen)(compact?menuButton:collapseButton).current?.focus();
    wasDrawerOpen.current=drawerOpen;
  },[drawerOpen,compact]);
  useEffect(()=>{setMobileOpen(false);},[currentPath]);
  useEffect(()=>{
    if(previousPath.current===currentPath||drawerOpen)return;
    previousPath.current=currentPath;
    if(mainRef.current)mainRef.current.scrollTop=0;
    const modalOpen=[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(dialog=>!dialog.closest('[hidden],[inert]'));
    if(!modalOpen)mainRef.current?.focus({preventScroll:true});
  },[currentPath,drawerOpen]);
  async function signOut() {setBusy(true);setLogoutError('');try{await logout();}catch(error){setLogoutError(error.message);}finally{setBusy(false);}}
  return <div className={`admin-shell${collapsed&&!compact?' admin-shell-collapsed':''}`}>
    <a className="admin-skip" href="#admin-main" onClick={event=>{event.preventDefault();mainRef.current?.focus({preventScroll:true});}}>Đến nội dung</a>
    <header className="admin-header" inert={drawerOpen?'':undefined}><div>{compact&&<button ref={menuButton} type="button" className="admin-navigation-toggle" aria-label="Mở menu quản trị" aria-controls="admin-navigation" aria-expanded={drawerOpen} onClick={()=>setMobileOpen(true)}><Menu size={20} aria-hidden="true"/></button>}<strong>TMS</strong><span>Quản trị hệ thống</span></div><div><span className="admin-current-user">{user.displayName}</span><button onClick={signOut} disabled={busy}>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button><div className="admin-chat-launcher-slot" ref={registerChatSlot}/></div></header>
    <aside ref={sidebarRef} id="admin-navigation" className="admin-sidebar" hidden={compact&&!drawerOpen} role={drawerOpen?'dialog':undefined} aria-modal={drawerOpen?'true':undefined} aria-label={drawerOpen?'Menu quản trị':'Điều hướng quản trị'} tabIndex={drawerOpen?-1:undefined}>
      <div className="admin-sidebar-controls"><span>Điều hướng quản trị</span>{compact?<button type="button" className="admin-navigation-toggle" aria-label="Đóng menu quản trị" onClick={()=>setMobileOpen(false)}><X size={20} aria-hidden="true"/></button>:<button ref={collapseButton} type="button" className="admin-navigation-toggle" aria-label={collapsed?'Mở rộng menu quản trị':'Thu gọn menu quản trị'} title={collapsed?'Mở rộng menu quản trị':'Thu gọn menu quản trị'} aria-expanded={!collapsed} aria-controls="admin-navigation" onClick={()=>setCollapsed(value=>!value)}>{collapsed?<PanelLeftOpen size={20} aria-hidden="true"/>:<PanelLeftClose size={20} aria-hidden="true"/>}</button>}</div>
      <nav aria-label="Quản trị">
        {[
          ['/admin', 'Tổng quan', Home, currentPath === '/admin'],
          ['/admin/projects', 'Dự án', FolderKanban, projectsPage],
          ['/admin/users', 'Người dùng', Users, currentPath === '/admin/users'],
          ['/admin/devices', 'Thiết bị', TabletSmartphone, currentPath === '/admin/devices'],
          ['/admin/audit', 'Nhật ký quản trị', ScrollText, currentPath === '/admin/audit'],
          ['/dashboard?workspace=1', 'Không gian dự án', PanelsTopLeft, false],
        ].map(([href, label, Icon, active]) => (
          <a key={href} href={`#${href}`} aria-label={label} title={collapsed&&!compact?label:undefined} aria-current={active ? 'page' : undefined} onClick={()=>setMobileOpen(false)}>
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="admin-sidebar-bottom"><strong>S+TMS</strong><small>Quản trị tập trung</small></div>
    </aside>
    {drawerOpen&&<button type="button" className="admin-navigation-backdrop" aria-label="Đóng nền menu quản trị" tabIndex={-1} onClick={()=>setMobileOpen(false)}/>}
    <main ref={mainRef} id="admin-main" className="admin-main" aria-label="Nội dung quản trị" tabIndex={-1} inert={drawerOpen?'':undefined}>
      {logoutError && <p role="alert">{logoutError}</p>}
      {projectsPage && <section className="admin-project-filter" aria-label="Lọc dự án">
        <AdminUserProjectFilter key={currentPath==='/admin/projects'?'list':'detail'} api={api} label="Phạm vi dự án" value={projectId || ''} onChange={id=>navigate(currentPath,id)}/>
      </section>}
      {children}
    </main>
  </div>;
}
