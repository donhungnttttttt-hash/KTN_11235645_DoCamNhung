import {apiRequest,createApiClient} from './client';
const previewRequest=createApiClient({timeoutMs:35000});
const base=projectId=>`/projects/${encodeURIComponent(projectId)}/management-reports`;
async function write(path,method,body,options={},preview=false){
  const csrf=await apiRequest('/auth/csrf',options);
  return (preview?previewRequest:apiRequest)(path,{...options,method,headers:{[csrf.headerName]:csrf.token},body:JSON.stringify(body)});
}
export const managementReportsApi={
  summary:(projectId,{featureId}={},options)=>apiRequest(`${base(projectId)}/summary${featureId!=null&&featureId!==''?`?featureId=${encodeURIComponent(featureId)}`:''}`,options),
  list:(projectId,{page=0,size=20}={},options)=>apiRequest(`${base(projectId)}?${new URLSearchParams({page,size})}`,options),
  get:(projectId,id,options)=>apiRequest(`${base(projectId)}/${encodeURIComponent(id)}`,options),
  create:(projectId,body,options)=>write(base(projectId),'POST',body,options),
  update:(projectId,id,body,options)=>write(`${base(projectId)}/${encodeURIComponent(id)}`,'PUT',body,options),
  download:(projectId,id,options)=>apiRequest(`${base(projectId)}/${encodeURIComponent(id)}/download`,{...options,responseType:'download'}),
  preview:(projectId,body,options)=>write(`${base(projectId)}/preview`,'POST',body,options,true),
};
