import React, { useId, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useProject } from "./ProjectProvider";
import { useAuth } from "../auth/AuthProvider";


export function ProjectSelector() {
  const projectContext = useProject();
  const projects = projectContext?.projects || [];
  const currentProject = projectContext?.currentProject || null;
  const selectProject = projectContext?.selectProject || (() => {});
  const loading = projectContext?.loading || false;
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);

  const triggerRef = useRef(null);
  const menuId = useId();
  function closeMenu() { setOpen(false); triggerRef.current?.focus(); }

  const canCreateProject = hasRole?.("ADMIN") || false;

  if (!projectContext) {
    return (
      <div className="project-selector-container">
        <span style={{ fontSize: "14px", color: "var(--text-secondary, #94a3b8)" }}>
          Dự án: <strong>Mặc định</strong>
        </span>
      </div>
    );
  }

  if (loading && !currentProject) {
    return <div className="project-selector-loading">Đang tải...</div>;
  }

  return (
    <div className="project-selector-container"
      onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); closeMenu(); } }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      {projectContext.error && <span role="alert">{projectContext.error} <button onClick={() => projectContext.refreshProjects()}>Thử lại</button></span>}
      <button 
        className="project-selector-btn"
        ref={triggerRef}
        title={currentProject?.name || 'Chọn dự án'}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <span>Dự án: <strong>{currentProject?.name || "Chưa chọn"}{currentProject?.archived ? ' · Đã lưu trữ' : ''}</strong></span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <>
          <div className="project-selector-backdrop" onClick={closeMenu} />
          <div id={menuId} className="project-selector-menu" role="group" aria-label="Chọn dự án">
            {projects.length === 0 ? (
              <div className="project-selector-empty">Không có dự án nào</div>
            ) : (
              <ul className="project-selector-list">
                {projects.map(p => (
                  <li key={p.id}>
                    <button
                      className={currentProject?.id === p.id ? "active" : ""}
                      aria-current={currentProject?.id === p.id ? 'true' : undefined}
                      onClick={() => {
                        selectProject(p.id);
                        closeMenu();
                      }}
                    >
                      {p.name}{p.archived ? ' · Đã lưu trữ' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            
            {canCreateProject && (
              <div className="project-selector-footer">
                <button 
                  className="project-selector-create-btn"
                  onClick={() => {
                    closeMenu();
                    window.location.hash='/admin/projects';
                  }}
                >
                  <Plus size={16} />
                  <span>Tạo dự án</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
