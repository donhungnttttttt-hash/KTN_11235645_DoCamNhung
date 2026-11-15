import {useGuestLanguage} from '../../i18n/GuestLanguage';
import React, { useId, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useProject } from "./ProjectProvider";
import { useAuth } from "../auth/AuthProvider";


export function ProjectSelector() {
 const {t}=useGuestLanguage();
  const projectContext = useProject();
  const projects = projectContext?.projects || [];
  const currentProject = projectContext?.currentProject || null;
  const selectProject = projectContext?.selectProject || (() => {});
  const loading = projectContext?.loading || false;
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [search,setSearch]=useState('');
  const choices=projects.filter(p=>`${p.name} ${p.code||''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  const triggerRef = useRef(null);
  const menuId = useId();
  function closeMenu() { setOpen(false); triggerRef.current?.focus(); }

  const canCreateProject = hasRole?.("ADMIN") || false;

  if (!projectContext) {
    return (
      <div className="project-selector-container">
        <span style={{ fontSize: "var(--text-body)", color: "var(--text-secondary, #94a3b8)" }}> {t("Dự án:")} <strong>{t("Mặc định")}</strong>
        </span>
      </div>
    );
  }

  if (loading && !currentProject) {
    return <div className="project-selector-loading">{t("Đang tải...")}</div>;
  }

  return (
    <div className="project-selector-container"
      onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); closeMenu(); } }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      {projectContext.error && <span role="alert">{t(projectContext.error)} <button onClick={() => projectContext.refreshProjects()}>{t("Thử lại")}</button></span>}
      <button
        className="project-selector-btn"
        ref={triggerRef}
        title={currentProject?.name || t("Chọn dự án")}
        onClick={() => {setSearch('');setOpen(!open);}}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <span>{t("Dự án:")} <strong>{currentProject?.name || t("Chưa chọn")}{currentProject?.archived ? t(" · Đã lưu trữ") : ''}</strong></span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <>
          <div className="project-selector-backdrop" onClick={closeMenu} />
          <div id={menuId} className="project-selector-menu" role="group" aria-label={t("Chọn dự án")}>
            <div className="project-selector-search"><input autoFocus type="search" aria-label={t("Tìm dự án")} placeholder={t("Tìm dự án…")} value={search} onChange={e=>setSearch(e.target.value)}/></div>
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
                  <span>{t("Tạo dự án")}</span>
                </button>
              </div>
            )}
            {choices.length === 0 ? (
              <div className="project-selector-empty">{t("Không có dự án nào")}</div>
            ) : (
              <ul className="project-selector-list">
                {choices.map(p => (
                  <li key={p.id}>
                    <button
                      className={currentProject?.id === p.id ? "active" : ""}
                      aria-current={currentProject?.id === p.id ? 'true' : undefined}
                      onClick={() => {
                        selectProject(p.id);
                        closeMenu();
                      }}
                    >
                      {p.name}{p.archived ? t(" · Đã lưu trữ") : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}


          </div>
        </>
      )}
    </div>
  );
}
