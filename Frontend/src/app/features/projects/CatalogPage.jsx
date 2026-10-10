import { canManageProjectWork } from './projectAccess';
import React, { useState, useEffect } from "react";
import { useProject } from "./ProjectProvider";
import { projectsApi } from "../../services/api/projects";
import { useAuth } from "../auth/AuthProvider";
import { Plus, Trash2 } from "lucide-react";
import "./projects.css";
import { CatalogEditor } from './CatalogEditor';

const CATALOG_TYPES = [
  { id: "environments", label: "Môi trường" },
  { id: "builds", label: "Bản build" },
  { id: "devices", label: "Thiết bị" },
  { id: "categories", label: "Danh mục" },
  { id: "milestones", label: "Mốc phát hành" }
];

export function CatalogPage() {
  const { currentProject } = useProject();
  if (!currentProject) return <div className="page-container"><p>Vui lòng chọn một dự án.</p></div>;
  return <ProjectCatalog key={currentProject.id} currentProject={currentProject}/>;
}

function ProjectCatalog({ currentProject }) {
  const { hasRole } = useAuth();
  const [activeType, setActiveType] = useState("environments");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [archiving, setArchiving] = useState(null);
  const [editor, setEditor] = useState(null);
  
  const canEdit = canManageProjectWork(currentProject, hasRole);

  useEffect(() => {
    let live = true;
    setItems([]);setLoading(true);setError("");
    projectsApi.listCatalog(currentProject.id, activeType)
      .then(data => { if (live) setItems(data); })
      .catch(err => { if (live) setError(err.message || "Không thể tải danh mục."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [currentProject.id, activeType, reload]);

  const handleArchive = async (item) => {
    if (!confirm("Bạn có chắc muốn lưu trữ mục này?")) return;
    setArchiving(item.id);setError("");
    try {
      await projectsApi.archiveCatalog(currentProject.id, activeType, item.id, item.version);
      setReload(value => value + 1);
    } catch (err) {
      setError(err.message || "Lưu trữ chưa thành công.");
    } finally { setArchiving(null); }
  };

  if (!currentProject) {
    return <div className="page-container"><p>Vui lòng chọn một dự án.</p></div>;
  }

  const renderTableHeaders = () => {
    switch (activeType) {
      case "environments":
        return <tr><th>Mã</th><th>Tên</th><th>Mô tả</th>{canEdit && <th>Thao tác</th>}</tr>;
      case "builds":
        return <tr><th>Nền tảng</th><th>Phiên bản</th><th>Số bản build</th><th>Ngày phát hành</th>{canEdit && <th>Thao tác</th>}</tr>;
      case "devices":
        return <tr><th>Mã</th><th>Tên</th><th>Hệ điều hành</th><th>Phiên bản OS</th>{canEdit && <th>Thao tác</th>}</tr>;
      case "categories":
        return <tr><th>Mã</th><th>Tên</th>{canEdit && <th>Thao tác</th>}</tr>;
      case "milestones":
        return <tr><th>Mã</th><th>Tên</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th>{canEdit && <th>Thao tác</th>}</tr>;
      default:
        return <tr><th>Tên</th>{canEdit && <th>Thao tác</th>}</tr>;
    }
  };

  const renderTableRows = () => {
    if (items.length === 0) {
      return <tr><td colSpan="5" className="text-center py-4">Chưa có dữ liệu</td></tr>;
    }

    return items.map(item => {
      let cells = [];
      switch (activeType) {
        case "environments":
          cells = [<td>{item.code}</td>, <td>{item.name}</td>, <td>{item.description}</td>];
          break;
        case "builds":
          cells = [<td>{item.platform}</td>, <td>{item.version_label || item.versionLabel}</td>, <td>{item.build_number || item.buildNumber}</td>, <td>{item.released_at || item.releasedAt}</td>];
          break;
        case "devices":
          cells = [<td>{item.code}</td>, <td>{item.name}</td>, <td>{item.os_name || item.osName}</td>, <td>{item.os_version || item.osVersion}</td>];
          break;
        case "categories":
          cells = [<td>{item.code}</td>, <td>{item.name}</td>];
          break;
        case "milestones":
          cells = [<td>{item.code}</td>, <td>{item.name}</td>, <td>{item.starts_on || item.startsOn}</td>, <td>{item.due_on || item.dueOn}</td>];
          break;
      }
      return (
        <tr key={item.id} className={item.archived || item.active === false ? "archived-row" : ""}>
          {cells.map((cell,index)=>React.cloneElement(cell,{key:index}))}
          {canEdit && (
            <td>
              <button className="btn-icon" disabled={archiving!==null || !!editor} onClick={() => setEditor({ item })}>Sửa</button>
              {item.active === false || item.archived ? <span>Đã lưu trữ</span> : (
                <button className="btn-icon text-danger" title="Lưu trữ" disabled={archiving!==null || !!editor} onClick={() => handleArchive(item)}>
                  <Trash2 size={16} />
                </button>
              )}
            </td>
          )}
        </tr>
      );
    });
  };

  return (
    <div className="page-container catalog-page">
      <header className="page-header flex justify-between align-center">
        <h1>Quản lý Danh mục: {currentProject.name}</h1>
        {canEdit && (
          <button className="btn btn-primary" disabled={archiving!==null || !!editor} onClick={() => setEditor({ item: null })}>
            <Plus size={16} className="mr-2" /> Thêm mới
          </button>
        )}
      </header>

      <div className="tabs">
        {CATALOG_TYPES.map(type => (
          <button 
            key={type.id} 
            className={`tab-btn ${activeType === type.id ? 'active' : ''}`}
            onClick={() => setActiveType(type.id)} disabled={archiving!==null || !!editor}
          >
            {type.label}
          </button>
        ))}
      </div>

      {editor && <CatalogEditor projectId={currentProject.id} kind={activeType} item={editor.item} onClose={() => {setEditor(null);setReload(value=>value+1);}} onSaved={() => {setEditor(null);setReload(value=>value+1);}} />}

      <div className="catalog-content mt-4">
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="text-danger" role="alert">{error} <button onClick={()=>setReload(value=>value+1)}>Thử lại</button></p>
        ) : (
          <div className="settings-table-scroll"><table className="data-table full-width">
            <thead>{renderTableHeaders()}</thead>
            <tbody>{renderTableRows()}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
