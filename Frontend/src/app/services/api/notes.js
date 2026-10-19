import {apiRequest} from './client';

async function write(projectId,path,method,body,options={}) {
  const csrf=await apiRequest('/auth/csrf',options);
  return apiRequest(`/projects/${projectId}/notes${path}`,{...options,method,
    headers:{[csrf.headerName]:csrf.token},...(body?{body:JSON.stringify(body)}:{})});
}

export const notesApi={
  list:(projectId,{page=0,size=20}={},options)=>apiRequest(`/projects/${projectId}/notes?${new URLSearchParams({page,size})}`,options),
  get:(projectId,id,options)=>apiRequest(`/projects/${projectId}/notes/${id}`,options),
  create:(projectId,body,options)=>write(projectId,'','POST',body,options),
  update:(projectId,id,body,options)=>write(projectId,`/${id}`,'PUT',body,options),
  remove:(projectId,id,version,options)=>write(projectId,`/${id}?expectedVersion=${encodeURIComponent(version)}`,'DELETE',null,options),
};
