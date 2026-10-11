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
      
      const linkedId=new URLSearchParams(window.location.hash.split('?')[1]).get('projectId');
      const storedId = preferredId != null ? String(preferredId) : linkedId || localStorage.getItem(selectionKey);
      let selected = data.find(p => String(p.id) === storedId);
      
      if (!selected && linkedId && preferredId==null) {
        setCurrentProject(null);setError('Không tìm thấy dự án được mở hoặc bạn không còn quyền truy cập.');return;
      }
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

  useEffect(() => {
    const followLink=()=>{
      const nextId=new URLSearchParams(window.location.hash.split('?')[1]).get('projectId');
      if(nextId&&nextId!==String(currentProject?.id)){setCurrentProject(null);refreshProjects();}
    };
    window.addEventListener('hashchange',followLink);
    return()=>window.removeEventListener('hashchange',followLink);
  },[refreshProjects,currentProject?.id]);

  const selectProject = useCallback((projectId) => {
    const selected = projects.find(p => String(p.id) === String(projectId));
    if (selected) {
      generation.current++;setLoading(false);setError('');
      const [path,search]=window.location.hash.split('?');const params=new URLSearchParams(search);
      if(params.has('projectId')){params.delete('projectId');window.history.replaceState(null,'',path+(params.size?'?'+params.toString():''));}
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
