import React, { useState } from "react";
import { X } from "lucide-react";
import { projectsApi } from "../../services/api/projects";
import { useProject } from "./ProjectProvider";
import { useDialogFocus } from '../../hooks/useDialogFocus';

export function CreateProjectDialog({ onClose }) {
  const { refreshProjects } = useProject();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    timezone: "Asia/Ho_Chi_Minh"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogFocus(onClose, loading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const newProject = await projectsApi.create(formData);
      await refreshProjects(newProject.id);
      onClose();
    } catch (err) {
      setError(err.message || "Không thể tạo dự án");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="dialog-overlay">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Tạo dự án mới" className="dialog-content">
        <div className="dialog-header">
          <h2>Tạo dự án mới</h2>
          <button aria-label="Đóng" disabled={loading} className="dialog-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="dialog-form">
          {error && <div role="alert" className="dialog-error">{error}</div>}
          <fieldset disabled={loading} className="min-w-0">
          <div className="form-group">
            <label htmlFor="code">Mã dự án *</label>
            <input 
              id="code" 
              name="code" 
              value={formData.code} 
              onChange={handleChange} 
              required 
              maxLength={32}
              placeholder="Vd: PRJ-01"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Tên dự án *</label>
            <input 
              id="name" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              maxLength={100}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Mô tả</label>
            <textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleChange}
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="timezone">Múi giờ *</label>
            <select 
              id="timezone" 
              name="timezone" 
              value={formData.timezone} 
              onChange={handleChange} 
              required
            >
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Đang xử lý..." : "Tạo dự án"}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
