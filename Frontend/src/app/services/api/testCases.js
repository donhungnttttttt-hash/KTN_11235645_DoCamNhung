import { apiRequest } from './client';

async function writeWithCsrf(path, body, method = 'POST') {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, {
    method,
    headers: { [csrf.headerName]: csrf.token },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export const testCasesApi = {
  listDocuments: (projectId, {page=0,keyword=''}={}) => apiRequest(`/projects/${projectId}/test-documents?${new URLSearchParams({page:String(page),size:'20',keyword})}`),
  getDocument: (projectId,id) => apiRequest(`/projects/${projectId}/test-documents/${id}`),
  updateDocumentResult: (projectId,id,rowId,data) => writeWithCsrf(`/projects/${projectId}/test-documents/${id}/rows/${rowId}/result`,data,'PUT'),
  documentResultHistory: (projectId,id,rowId,before=0) => apiRequest(`/projects/${projectId}/test-documents/${id}/rows/${rowId}/result-history?before=${before}`),
  exportDocument: (projectId,id,original=false) => apiRequest(`/projects/${projectId}/test-documents/${id}/export?original=${original}`, {responseType:'blob'}),
  // Suites
  listSuites: (projectId) => apiRequest(`/projects/${projectId}/test-suites`),
  createSuite: (projectId, data) => writeWithCsrf(`/projects/${projectId}/test-suites`, data, 'POST'),
  updateSuite: (projectId, id, data) => writeWithCsrf(`/projects/${projectId}/test-suites/${id}`, data, 'PATCH'),
  archiveSuite: (projectId, id) => writeWithCsrf(`/projects/${projectId}/test-suites/${id}`, null, 'DELETE'),

  // Cases
  listCases: (projectId, suiteId, {page=0,keyword=''}={}) => {
    const params = new URLSearchParams({page:String(page),size:'20',keyword});
    if (suiteId) params.set('suiteId',suiteId);
    const query = `?${params}`;
    return apiRequest(`/projects/${projectId}/test-cases${query}`);
  },
  getCase: (projectId, id) => apiRequest(`/projects/${projectId}/test-cases/${id}`),
  getRevision: (projectId, id, revisionId) => apiRequest(`/projects/${projectId}/test-cases/${id}/revisions/${revisionId}`),
  createCase: (projectId, data) => writeWithCsrf(`/projects/${projectId}/test-cases`, data, 'POST'),
  addRevision: (projectId, id, data) => writeWithCsrf(`/projects/${projectId}/test-cases/${id}/revisions`, data, 'POST'),
  approveRevision: (projectId, id, revisionId) => writeWithCsrf(`/projects/${projectId}/test-cases/${id}/revisions/${revisionId}/approve`, null, 'POST'),
  archiveCase: (projectId, id) => writeWithCsrf(`/projects/${projectId}/test-cases/${id}/archive`, null, 'POST'),

  // Import preview & commit
  importTemplate: (projectId) => apiRequest(`/projects/${projectId}/import-previews/template`, { responseType: 'blob' }),
  createImportPreview: async (projectId, file) => {
    const csrf = await apiRequest('/auth/csrf');
    const body = new FormData();
    body.append('file', file);
    return apiRequest(`/projects/${projectId}/import-previews`, {method:'POST', body, headers:{[csrf.headerName]:csrf.token}});
  },
  getImportPreview: (projectId, id) => apiRequest(`/projects/${projectId}/import-previews/${id}`),
  commitImportPreview: (projectId, id) => writeWithCsrf(`/projects/${projectId}/import-previews/${id}/commit`, null, 'POST'),
};

