import React, { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useProject } from "./ProjectProvider";
import { useAuth } from "../auth/AuthProvider";
import { CreateProjectDialog } from "./CreateProjectDialog";

export function ProjectSelector() {
  const projectContext = useProject();
  const projects = projectContext?.projects || [];
  const currentProject = projectContext?.currentProject || null;
  const selectProject = projectContext?.selectProject || (() => {});
  const loading = projectContext?.loading || false;
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
    <div className="project-selector-container">
      {projectContext.error && <span role="alert">{projectContext.error} <button onClick={() => projectContext.refreshProjects()}>Thử lại</button></span>}
      <button 
        className="project-selector-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>Dự án: <strong>{currentProject?.name || "Chưa chọn"}</strong></span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <>
          <div className="project-selector-backdrop" onClick={() => setOpen(false)} />
          <div className="project-selector-menu">
            {projects.length === 0 ? (
              <div className="project-selector-empty">Không có dự án nào</div>
            ) : (
              <ul className="project-selector-list">
                {projects.map(p => (
                  <li key={p.id}>
                    <button
                      className={currentProject?.id === p.id ? "active" : ""}
                      onClick={() => {
                        selectProject(p.id);
                        setOpen(false);
                      }}
                    >
                      {p.name}
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
                    setOpen(false);
                    setShowCreateDialog(true);
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

      {showCreateDialog && (
        <CreateProjectDialog onClose={() => setShowCreateDialog(false)} />
      )}
    </div>
  );
}
