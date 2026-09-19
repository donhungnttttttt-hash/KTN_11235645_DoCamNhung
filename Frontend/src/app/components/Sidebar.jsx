import React, { useEffect, useState } from "react";
import {
  Home,
  Columns3,
  FlaskConical,
  Bug,
  ChartGantt,
  ChartNoAxesCombined,
  Menu,
  X,
  ChevronDown,
  List,
} from "lucide-react";

const navigation = [
  { label: "Tổng quan", route: "/dashboard", icon: Home, id: "dashboard" },
  { label: "Bảng công việc", route: "/board", icon: Columns3, id: "board" },
  {
    label: "Quản lý kiểm thử",
    route: "/tests",
    icon: FlaskConical,
    id: "tests",
  },
  { label: "Quản lý lỗi", route: "/issues", icon: Bug, id: "issues" },
  {
    label: "Quản lý tiến độ",
    route: "/progress",
    icon: ChartGantt,
    id: "progress",
  },
  {
    label: "Tổng hợp & Phân tích",
    route: "/analysis",
    icon: ChartNoAxesCombined,
    id: "analysis",
  },
];

export function Sidebar({
  activeRoute,
  navigate,
  collapsed,
  onToggle,
  onClose,
}) {
  const path = activeRoute.split("?")[0];
  const active = path.split("/")[1];
  const [boardOpen, setBoardOpen] = useState(active === "board");
  const boardView =
    path === "/board/list" ||
    new URLSearchParams(activeRoute.split("?")[1] || "").get("view") === "list"
      ? "list"
      : "kanban";
  useEffect(() => {
    setBoardOpen(active === "board");
  }, [activeRoute, active]);
  return (
    <aside className="app-sidebar" aria-label="Menu dự án" data-lenis-prevent>
      <div className="app-sidebar-toggle">
        <button
          className="sidebar-desktop-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-expanded={!collapsed}
        >
          <Menu size={21} />
        </button>
        <button
          className="sidebar-mobile-close"
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <X size={21} />
        </button>
      </div>
      <nav aria-label="Điều hướng dự án">
        {navigation.map(({ label, route, icon: Icon, id }) =>
          id === "board" ? (
            <div key={id} className="app-nav-group">
              <button
                title={label}
                className={`app-nav-item ${active === id ? "active" : ""}`}
                aria-expanded={boardOpen && !collapsed}
                aria-controls="board-submenu"
                onClick={() => {
                  if (collapsed) {
                    onToggle();
                    setBoardOpen(true);
                  } else setBoardOpen((open) => !open);
                }}
              >
                <Icon size={21} strokeWidth={1.8} />
                <span>{label}</span>
                <ChevronDown
                  size={15}
                  className={`app-nav-chevron ${boardOpen ? "open" : ""}`}
                />
              </button>
              {boardOpen && (
                <div
                  id="board-submenu"
                  className="app-submenu"
                  role="group"
                  aria-label="Các mục Bảng công việc"
                >
                  {[
                    {
                      label: "Bảng Kanban",
                      route: "/board",
                      view: "kanban",
                      icon: Columns3,
                    },
                    {
                      label: "Danh sách",
                      route: "/board/list",
                      view: "list",
                      icon: List,
                    },
                  ].map(
                    ({
                      label: childLabel,
                      route: childRoute,
                      view,
                      icon: ChildIcon,
                    }) => (
                      <button
                        key={view}
                        aria-current={
                          active === "board" && boardView === view
                            ? "page"
                            : undefined
                        }
                        onClick={() => {
                          navigate(childRoute);
                          onClose();
                        }}
                      >
                        <ChildIcon size={15} />
                        <span>{childLabel}</span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              key={id}
              title={label}
              className={`app-nav-item ${active === id ? "active" : ""}`}
              aria-current={active === id ? "page" : undefined}
              onClick={() => {
                navigate(route);
                onClose();
              }}
            >
              <Icon size={21} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ),
        )}
      </nav>
      <div className="app-sidebar-bottom">
        <span>S+Flutter</span>
        <small>Quản lý dự án & kiểm thử</small>
      </div>
    </aside>
  );
}
