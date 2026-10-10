import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useProject } from '../projects/ProjectProvider';
import { projectsApi } from '../../services/api/projects';
import { workItemsApi } from '../../services/api/workItems';

const ProjectDataContext = createContext(null);
export const typeLabels = { BUG: 'Lỗi', REQUEST: 'Yêu cầu', TASK: 'Công việc', IMPROVEMENT: 'Cải tiến', QA: 'QA' };
export const priorityLabels = { HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };
export function presentItem(item, metadata = {}) {
  return { ...item, serverId: item.id, id: item.key, typeCode: item.type, type: item.typeLabel || typeLabels[item.type] || item.type,
    statusLabel: item.statusLabel || metadata.statusesByType?.[item.type]?.find(status => status.id === item.status)?.label,
    priorityCode: item.priority, priority: priorityLabels[item.priority], versionLabel: item.buildLabel || '',
    created: item.createdAt?.slice(0, 10) || '', updated: item.updatedAt?.slice(0, 10) || '',
    assignee: item.assignee || 'Chưa phân công', category: item.category || '', milestone: item.milestone || '' };
}
export function ProjectDataProvider({ children }) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const generation = useRef(0);
  const [state, setState] = useState({ projectId: null, items: [], metadata: null, catalogs: {}, error: '', loading: true });
  const [query, setQuery] = useState({ page: 0, size: 50 });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => { setQuery({ page: 0, size: 50 }); }, [projectId]);
  useEffect(() => {
    const request = ++generation.current;
    if (!projectId) { setState({ projectId, items: [], metadata: null, catalogs: {}, loading: false, error: '' }); return; }
    setState(previous => ({ ...previous, loading: true, error: '' }));
    Promise.all([
      workItemsApi.list(projectId, query), workItemsApi.metadata(projectId),
      projectsApi.listMembers(projectId),
      ...['categories', 'milestones', 'builds', 'environments', 'devices'].map(kind => projectsApi.listCatalog(projectId, kind)),
    ]).then(([page, metadata, members, categories, milestones, builds, environments, devices]) => {
      if (request !== generation.current) return;
      setState({ projectId, ...page, items: page.items.map(item => presentItem(item, metadata)), metadata,
        catalogs: { members, categories, milestones, builds, environments, devices, statusesByType: metadata.statusesByType }, loading: false, error: '' });
    }).catch(error => { if (request === generation.current) setState(previous => ({ ...previous, projectId, items: [], error: error.message, loading: false })); });
    return () => { generation.current++; };
  }, [projectId, query, revision]);
  const current = state.projectId === projectId ? state : { items: [], metadata: null, catalogs: {}, loading: !!projectId, error: '' };
  return <ProjectDataContext.Provider value={{ ...current, projectId, issues: current.items, query, setQuery, refresh,
    canTriage: current.metadata?.canTriage === true && !currentProject?.archived,
    canCreateQa: current.metadata?.canCreateQa === true && !current.loading && !current.error && !currentProject?.archived,
    writable: !!projectId && !currentProject?.archived }}>{children}</ProjectDataContext.Provider>;
}
export function useProjectData() { return useContext(ProjectDataContext); }
