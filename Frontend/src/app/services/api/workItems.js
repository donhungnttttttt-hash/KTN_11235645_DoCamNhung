import { apiRequest } from './client';
const base = projectId => `/projects/${projectId}/work-items`;
async function write(path, body, method = 'POST') {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, {
    method, headers: { [csrf.headerName]: csrf.token },
    ...(body == null ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  });
}
export const workItemsApi = {
  list: (p, filters = {}) => apiRequest(`${base(p)}?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))}`),
  metadata: p => apiRequest(`${base(p)}/metadata`),
  overview: p => apiRequest(`${base(p)}/overview`),
  source: (p, attemptId) => apiRequest(`${base(p)}/sources/${attemptId}`),
  get: (p, id) => apiRequest(`${base(p)}/${id}`),
  create: (p, body) => write(base(p), body),
  update: (p, id, body) => write(`${base(p)}/${id}`, body, 'PUT'),
  transition: (p, id, body) => write(`${base(p)}/${id}/transitions`, body),
  batch: (p, body) => write(`${base(p)}/batch-transitions`, body),
  link: (p, id, body) => write(`${base(p)}/${id}/execution-links`, body),
  history: (p, id, before = 0) => apiRequest(`${base(p)}/${id}/history?before=${before}`),
  comments: (p, id, before = 0) => apiRequest(`${base(p)}/${id}/comments?before=${before}`),
  comment: (p, id, body) => write(`${base(p)}/${id}/comments`, body),
  external: (p, id, body) => write(`${base(p)}/${id}/external-reference`, body, 'PUT'),
  clarify: (p, id, body) => write(`${base(p)}/${id}/clarifications`, body),
  attachments: (p, id) => apiRequest(`${base(p)}/${id}/attachments`),
  upload: (p, id, file) => { const body = new FormData(); body.append('file', file); return write(`${base(p)}/${id}/attachments`, body); },
  download: (p, id, attachment) => apiRequest(`${base(p)}/${id}/attachments/${encodeURIComponent(attachment)}/content`, { responseType: 'blob' }),
  removeAttachment: (p, id, attachment) => write(`${base(p)}/${id}/attachments/${encodeURIComponent(attachment)}`, null, 'DELETE'),
};
