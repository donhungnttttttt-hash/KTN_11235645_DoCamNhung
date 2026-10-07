import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Footer } from "../components/Footer";
import { useDialogFocus } from '../hooks/useDialogFocus';
import "../styles/app-shell.css";
import { useProject } from '../features/projects/ProjectProvider';

export function MainLayout({ activeRoute, navigate, children }) {
  const {currentProject}=useProject() || {};
  const documentRoute = /^\/tests\/documents\/[1-9]\d*$/.test(activeRoute.split('?')[0]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useDialogFocus(() => setMobileOpen(false), false, mobileOpen);
  useEffect(() => {
    setMobileOpen(false);
  }, [activeRoute]);

  return (
    <div
      className={`app-shell ${documentRoute ? "document-focus" : ""} ${collapsed && !mobileOpen ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
    >
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
        <main id="main-viewport" className="flex-1">
          {currentProject?.archived && <div className="app-archived-project" role="status"><strong>Dự án đã lưu trữ · Chỉ đọc</strong><span>Bạn có thể xem lịch sử và xuất dữ liệu. Liên hệ Admin nếu cần mở lại dự án để tiếp tục công việc.</span></div>}
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
