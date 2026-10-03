import { apiRequest } from './client';
const base = p => `/projects/${p}`;
async function write(path, body) {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, { method: 'POST', headers: { [csrf.headerName]: csrf.token }, body: JSON.stringify(body) });
}
export const retestApi = {
  summary: (p, id) => apiRequest(`${base(p)}/work-items/${id}/retest`),
  candidates: (p, page = 0, keyword = '') => apiRequest(`${base(p)}/retest-candidates?${new URLSearchParams({ page, keyword })}`),
  coverage: (p, id, body) => write(`${base(p)}/work-items/${id}/retest-coverage`, body),
  create: (p, id, body) => write(`${base(p)}/work-items/${id}/retest-requests`, body),
  queue: (p, page = 0, mine = true, status = 'OPEN') => apiRequest(`${base(p)}/retest-requests?${new URLSearchParams({ page, mine, status })}`),
  request: (p, id) => apiRequest(`${base(p)}/retest-requests/${id}`),
  submit: (p, id, body) => write(`${base(p)}/retest-requests/${id}/results`, body),
  close: (p, id, body) => write(`${base(p)}/work-items/${id}/closure`, body),
  reopen: (p, id, body) => write(`${base(p)}/work-items/${id}/reopen`, body),
};
