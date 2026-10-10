import { apiRequest } from './client';

async function write(path,body,method='POST') {
  const csrf=await apiRequest('/auth/csrf');
  return apiRequest(path,{method,headers:{[csrf.headerName]:csrf.token},...(body ? {body:JSON.stringify(body)} : {})});
}

function query(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key,value]) => { if (value != null && value !== '') params.set(key,value); });
  return params.size ? `?${params}` : '';
}
export const adminApi = {
  audit: (filters={},options)=>apiRequest('/admin/audit'+query(filters),options),
  statusReports: (id,filters={},admin=false,options)=>apiRequest((admin?'/admin':'')+'/projects/'+id+'/status-reports'+query(filters),options),
  createStatusReport: (id,input)=>write('/projects/'+id+'/status-reports',input),
  assets: (filters={},options)=>apiRequest('/admin/device-assets'+query(filters),options),
  asset: (id,options)=>apiRequest('/admin/device-assets/'+id,options),
  createAsset: input=>write('/admin/device-assets',input),
  updateAsset: (id,input)=>write('/admin/device-assets/'+id,input,'PATCH'),
  allocations: (filters={},options)=>apiRequest('/admin/device-allocations'+query(filters),options),
  assignDevice: input=>write('/admin/device-allocations',input),
  returnDevice: (id,input)=>write('/admin/device-allocations/'+id,input,'PATCH'),
  projectDevices: (id,filters={},options)=>apiRequest('/projects/'+id+'/device-allocations'+query(filters),options),
  overview: (projectId, options) => apiRequest(`/admin/overview${query({projectId})}`, options),
  projects: (filters = {}, options) => apiRequest(`/admin/projects${query(filters)}`, options),
  project: (id, options) => apiRequest(`/admin/projects/${encodeURIComponent(id)}`, options),
  archiveReadiness: (id,options)=>apiRequest(`/admin/projects/${encodeURIComponent(id)}/archive-readiness`,options),
  archiveProject: (id,input)=>write(`/admin/projects/${encodeURIComponent(id)}/archive`,input),
  reopenProject: (id,input)=>write(`/admin/projects/${encodeURIComponent(id)}/reopen`,input),
  lifecycleDecisions: (id,filters={},options)=>apiRequest(`/admin/projects/${encodeURIComponent(id)}/lifecycle-decisions${query(filters)}`,options),
  users: (filters={},options)=>apiRequest(`/admin/users${query(filters)}`,options),
  createUser: input=>write('/users',input),
  updateUser: (id,input)=>write(`/users/${encodeURIComponent(id)}`,input,'PATCH'),
  createProject: input=>write('/admin/projects',input),
  updateProject: (id,input)=>write(`/admin/projects/${id}`,input,'PATCH'),
  members: (id,options)=>apiRequest(`/admin/projects/${id}/members`,options),
  setMember: (id,user,input)=>write(`/admin/projects/${id}/members/${encodeURIComponent(user)}`,input,'PUT'),
  memberCandidate: (id,username)=>apiRequest(`/projects/${id}/member-candidate?username=${encodeURIComponent(username)}`),
  removeMember: (id,user,version)=>write(`/admin/projects/${id}/members/${encodeURIComponent(user)}?expectedVersion=${version}`,null,'DELETE'),
};
