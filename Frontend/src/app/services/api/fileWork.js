import { apiRequest, ApiError } from './client';
const root = p => `/projects/${p}`;
const groups = p => `${root(p)}/file-work-groups`;
const query = values => new URLSearchParams(Object.entries(values).filter(([,v]) => v !== undefined && v !== null && v !== '').map(([k,v]) => [k,String(v)]));
async function write(path, body, method = 'POST') {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, {method,headers:{[csrf.headerName]:csrf.token},body:JSON.stringify(body)});
}
export const fileWorkApi = {
  inbox: (p,filters={},options={}) => apiRequest(`${root(p)}/action-inbox?${query({page:0,size:20,...filters})}`,options),
  preparation: (p, options={}) => apiRequest(`${groups(p)}/preparation`, options),
  metadata: (p, options={}) => apiRequest(`${groups(p)}/metadata`, options),
  list: (p, filters={}, options={}) => apiRequest(`${groups(p)}?${query({page:0,size:20,...filters})}`, options),
  detail: (p,id,options={}) => apiRequest(`${groups(p)}/${id}`,options),
  preview: (p,body) => write(`${groups(p)}/preview`,body),
  create: (p,body) => write(groups(p),body),
  assign: (p,id,body) => write(`${groups(p)}/${id}/assignment`,body,'PUT'),
  history: (p,id,before=0) => apiRequest(`${groups(p)}/${id}/history?${query({before})}`),
  sessions: (p,id,page=0) => apiRequest(`${groups(p)}/${id}/sessions?${query({page,size:20})}`),
  eligibleAllocations: (p,id,options={}) => apiRequest(`${groups(p)}/${id}/eligible-allocations`,options),
  start: (p,id,body) => write(`${groups(p)}/${id}/sessions`,body),
  pause: (p,id,body) => write(`${root(p)}/file-work-sessions/${id}/pause`,body),
  resume: (p,id,body) => write(`${root(p)}/file-work-sessions/${id}/resume`,body),
  complete: (p,id,body) => write(`${root(p)}/file-work-sessions/${id}/complete`,body),
  cancel: (p,id,body) => write(`${root(p)}/file-work-sessions/${id}/cancel`,body),
  execution: (p,id,buildId,options={}) => apiRequest(`${groups(p)}/${id}/execution?${query({buildId})}`,options),
  record: (p,id,run,body) => write(`${groups(p)}/${id}/run-items/${run}/attempts`,body),
  export: (p,id,buildId) => apiRequest(`${groups(p)}/${id}/export?${query({buildId})}`,{responseType:'response'}),
};
export async function executionDownload(response) {
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (!response?.ok || response.headers?.get('Content-Type')?.split(';')[0].trim() !== mime) throw new ApiError('Tệp kết quả không đúng định dạng XLSX.',{code:'INVALID_DOWNLOAD'});
  const blob = await response.blob();
  if (!blob.size) throw new ApiError('Tệp kết quả trống.',{code:'EMPTY_DOWNLOAD'});
  const disposition = response.headers.get('Content-Disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const ordinary = disposition.match(/filename="([^"]+)"/i);
  let name = ordinary?.[1] || 'execution.xlsx';
  if (encoded) { try { name = decodeURIComponent(encoded[1].trim()); } catch { throw new ApiError('Tên tệp kết quả không hợp lệ.',{code:'INVALID_DOWNLOAD'}); } }
  // Spring ContentDisposition may emit RFC2047 alongside filename*; prefer filename*.
  name = name.replace(/[\\/\u0000-\u001f]/g,'_');
  return {blob,fileName:name};
}
