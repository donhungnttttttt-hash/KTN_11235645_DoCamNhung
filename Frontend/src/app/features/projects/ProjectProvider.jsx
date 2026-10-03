import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from "react";
import { projectsApi } from "../../services/api/projects";
import { useAuth } from "../auth/AuthProvider";

const ProjectContext = createContext(null);

export function useProject() {
  return useContext(ProjectContext);
}

export function ProjectProvider({ children }) {
  const { status, user } = useAuth();
  const generation = useRef(0);
  const selectionKey = `tms_selected_project_${user?.id || 'anonymous'}`;
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshProjects = useCallback(async (preferredId) => {
    const request = ++generation.current;
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const data = await projectsApi.list();
      if (request !== generation.current) return;
      setProjects(data);
      
      const storedId = preferredId != null ? String(preferredId) : localStorage.getItem(selectionKey);
      let selected = data.find(p => String(p.id) === storedId);
      
      if (!selected && data.length > 0) {
        selected = data[0];
      }
      
      setCurrentProject(selected || null);
      if (selected) localStorage.setItem(selectionKey, String(selected.id));
      setError("");
    } catch (err) {
      if (request !== generation.current) return;
      setProjects([]); setCurrentProject(null);
      setError(err.message || "Không thể tải danh sách dự án");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [status, selectionKey]);

  useEffect(() => {
    refreshProjects();
    return () => { generation.current++; };
  }, [refreshProjects]);

  const selectProject = useCallback((projectId) => {
    const selected = projects.find(p => String(p.id) === String(projectId));
    if (selected) {
      setCurrentProject(selected);
      localStorage.setItem(selectionKey, String(selected.id));
    }
  }, [projects, selectionKey]);

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      selectProject,
      refreshProjects,
      loading,
      error
    }}>
      {children}
    </ProjectContext.Provider>
  );
}
