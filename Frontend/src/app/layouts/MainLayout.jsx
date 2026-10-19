import React, { useEffect, useRef, useState } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Footer } from "../components/Footer";
import { useDialogFocus } from '../hooks/useDialogFocus';
import "../styles/app-shell.css";
import { useProject } from '../features/projects/ProjectProvider';
import { routeInfo } from '../routes/routeInfo';

export function MainLayout({ activeRoute, navigate, children }) {
  const {currentProject}=useProject() || {};
  const info = routeInfo(activeRoute);
  const documentRoute = info.isTesting && !info.invalidTestingContext && Boolean(info.testingDocumentId);
  const previousProject = useRef(currentProject?.id);
  const [resetRoute,setResetRoute] = useState(null);
  const explicitlyScoped = info.linkedProjectId === Number(currentProject?.id);
  const switchedDeepProject = Boolean(info.featureId && !explicitlyScoped && previousProject.current != null && currentProject?.id != null && previousProject.current !== currentProject.id);
  const mismatchedDeepProject = Boolean(info.featureId && info.linkedProjectId && currentProject?.id && Number(currentProject.id) !== info.linkedProjectId);
  useEffect(() => {
    if (switchedDeepProject) {
      setResetRoute(activeRoute);
      navigate(`/board/testing?projectId=${currentProject.id}`);
    } else if (resetRoute && resetRoute !== activeRoute) setResetRoute(null);
    previousProject.current = currentProject?.id;
  }, [currentProject?.id, switchedDeepProject, activeRoute, resetRoute, navigate]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef(null);
  const routePath = activeRoute.split('?')[0];
  const previousPath = useRef(routePath);
  const sidebarRef = useDialogFocus(() => setMobileOpen(false), false, mobileOpen);
  useEffect(() => {
    setMobileOpen(false);
  }, [activeRoute]);
  useEffect(() => {
    if (previousPath.current === routePath || mobileOpen) return;
    previousPath.current = routePath;
    // A deep link can open a dialog. Its focus takes precedence over the page.
    if (!document.querySelector('[role="dialog"][aria-modal="true"]')) {
      mainRef.current?.focus({preventScroll:true});
    }
  }, [routePath, mobileOpen]);

  return (
    <div
      className={`app-shell ${documentRoute ? "document-focus" : ""} ${collapsed && !mobileOpen ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
    >
      <a className="app-skip-link" href="#main-viewport" onClick={event => {
        event.preventDefault();
        mainRef.current?.focus({preventScroll:true});
        mainRef.current?.scrollIntoView?.({block:'start',behavior:'auto'});
      }}>Đến nội dung chính</a>
      <Header
        navigate={navigate}
        menuOpen={mobileOpen}
        onOpenMenu={() => setMobileOpen(value => !value)}
      />
      <Sidebar
        activeRoute={activeRoute}
        navigate={navigate}
        collapsed={collapsed && !mobileOpen}
        panelRef={sidebarRef}
        overlayOpen={mobileOpen}
        onToggle={() => setCollapsed(!collapsed)}
        onClose={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          className="app-sidebar-backdrop"
          aria-label="Đóng menu dự án"
          tabIndex={-1}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="app-workspace" inert={mobileOpen ? '' : undefined}>
        <main ref={mainRef} id="main-viewport" className="flex-1" tabIndex={-1} aria-label="Nội dung chính">
          {currentProject?.archived && <div className="app-archived-project" role="status"><strong>Dự án đã lưu trữ · Chỉ đọc</strong><span>Bạn có thể xem lịch sử và xuất dữ liệu. Liên hệ Admin nếu cần mở lại dự án để tiếp tục công việc.</span></div>}
          {switchedDeepProject || mismatchedDeepProject || resetRoute === activeRoute ? <p role="status">Đang đổi phạm vi dự án…</p> : children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
