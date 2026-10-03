import { apiRequest } from './client';
const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null)).toString();
export const reportsApi = {
  summary: (projectId, filters = {}) => apiRequest(`/projects/${projectId}/reports/summary?${query(filters)}`),
  export: (projectId, filters = {}) => apiRequest(`/projects/${projectId}/reports/export.xlsx?${query(filters)}`, { responseType: 'blob' }),
};
