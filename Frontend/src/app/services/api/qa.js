import { apiRequest } from './client';

const base = p => `/projects/${p}/qa`;
const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null)).toString();
const readPage = (path, filters, options) => apiRequest(`${path}?${query(filters)}`, options);
async function write(path, body, method = 'POST') {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, { method, headers: { [csrf.headerName]: csrf.token }, body: JSON.stringify(body) });
}
// DTOs are passed unchanged; actor/status/generation are exclusively server authority.
export const qaApi = {
  create: (p, body) => write(base(p), body),
  list: (p, filters = {}, options) => readPage(base(p), filters, options),
  get: (p, id, options) => apiRequest(`${base(p)}/${id}`, options),
  assign: (p, id, body) => write(`${base(p)}/${id}/assignment`, body, 'PUT'),
  start: (p, id, body) => write(`${base(p)}/${id}/start`, body),
  requestInfo: (p, id, body) => write(`${base(p)}/${id}/request-info`, body),
  provideInfo: (p, id, body) => write(`${base(p)}/${id}/provide-info`, body),
  answer: (p, id, body) => write(`${base(p)}/${id}/answers`, body),
  confirm: (p, id, body) => write(`${base(p)}/${id}/confirmations`, body),
  close: (p, id, body) => write(`${base(p)}/${id}/close`, body),
  reopen: (p, id, body) => write(`${base(p)}/${id}/reopen`, body),
  answers: (p, id, filters = { page: 0, size: 20 }, options) => readPage(`${base(p)}/${id}/answers`, filters, options),
  confirmations: (p, id, filters = { page: 0, size: 20 }, options) => readPage(`${base(p)}/${id}/confirmations`, filters, options),
  handoff: (p, filters = {}, options) => readPage(`/projects/${p}/handoff-queue`, filters, options),
};
