import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Footer } from "../components/Footer";
import "../styles/app-shell.css";

export function MainLayout({ activeRoute, navigate, children }) {
  const documentRoute = /^\/tests\/documents\/[1-9]\d*$/.test(activeRoute);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [phase, setPhase] = useState("Chuẩn_iPad Merge Regression");
  useEffect(() => {
    setMobileOpen(false);
  }, [activeRoute]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <div
      className={`app-shell ${documentRoute ? "document-focus" : ""} ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
    >
      <Header
        navigate={navigate}
        phase={phase}
        setPhase={setPhase}
        onOpenMenu={() => setMobileOpen(value => !value)}
      />
      <Sidebar
        activeRoute={activeRoute}
        navigate={navigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onClose={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          className="app-sidebar-backdrop"
          aria-label="Đóng menu dự án"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="app-workspace">
        <main id="main-viewport" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
