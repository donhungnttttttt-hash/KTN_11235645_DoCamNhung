import { apiRequest } from './client';
const item = (p, id) => `/projects/${p}/work-items/${id}`;
async function write(path, body) {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, { method: 'POST', headers: { [csrf.headerName]: csrf.token }, body: JSON.stringify(body) });
}
export const redmineApi = {
  configuration: p => apiRequest(`/projects/${p}/integrations/redmine`),
  state: (p, id) => apiRequest(`${item(p, id)}/redmine`),
  publish: (p, id, body) => write(`${item(p, id)}/redmine-deliveries`, body),
  reconcile: (p, id, body) => write(`${item(p, id)}/redmine-reconciliations`, body),
  retry: (p, id, body) => write(`/projects/${p}/redmine-deliveries/${id}/retry`, body),
};
