import { apiRequest } from './client';
async function write(path, data, method = 'POST') {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, { method, headers: { [csrf.headerName]: csrf.token }, body: JSON.stringify(data) });
}
const base = p => `/projects/${p}`;
export const executionApi = {
  cycles: (p, page = 0) => apiRequest(`${base(p)}/test-cycles?page=${page}`),
  create: (p, data) => write(`${base(p)}/test-cycles`, data),
  cycle: (p, id) => apiRequest(`${base(p)}/test-cycles/${id}`),
  configurations: (p, id) => apiRequest(`${base(p)}/test-cycles/${id}/configurations`),
  configure: (p, id, data) => write(`${base(p)}/test-cycles/${id}/configurations`, data),
  scope: (p, id, data) => write(`${base(p)}/test-cycles/${id}/scope`, data),
  activate: (p, id, expectedVersion) => write(`${base(p)}/test-cycles/${id}/activate`, { expectedVersion }),
  decideCycle: (p, id, data) => write(`${base(p)}/test-cycles/${id}/decisions`, data),
  cycleDecisions: (p, id, page = 0) => apiRequest(`${base(p)}/test-cycles/${id}/decisions?page=${page}`),
  decideScope: (p, id, data) => write(`${base(p)}/run-items/${id}/scope-decisions`, data),
  scopeDecisions: (p, id, page = 0) => apiRequest(`${base(p)}/run-items/${id}/scope-decisions?page=${page}`),
  runs: (p, id, { page = 0, mine = false, pendingBug = false } = {}) => apiRequest(`${base(p)}/test-cycles/${id}/run-items?${new URLSearchParams({ page, mine, pendingBug })}`),
  run: (p, id) => apiRequest(`${base(p)}/run-items/${id}`),
  assign: (p, id, data) => write(`${base(p)}/run-items/${id}/assignment`, data, 'PUT'),
  assignments: (p, id) => apiRequest(`${base(p)}/run-items/${id}/assignments`),
  attempts: (p, id, page = 0) => apiRequest(`${base(p)}/run-items/${id}/attempts?page=${page}`),
  record: (p, id, data) => write(`${base(p)}/run-items/${id}/attempts`, data),
};
