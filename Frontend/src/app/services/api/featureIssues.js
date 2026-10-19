import {apiRequest} from './client';
const base=p=>`/projects/${p}/issues`;
const query=values=>new URLSearchParams(Object.entries(values).filter(([,v])=>v!==''&&v!=null));
async function write(path,body,method='POST',options={}) {
 const csrf=await apiRequest('/auth/csrf',options);
 return apiRequest(path,{...options,method,headers:{[csrf.headerName]:csrf.token},...(body==null?{}:{body:JSON.stringify(body)})});
}
export const featureIssuesApi={
 list:(p,filters={},options={})=>apiRequest(`${base(p)}?${query(filters)}`,options),
 context:(p,featureId,documentId,rowId,options={})=>apiRequest(`${base(p)}/context?${query({featureId,documentId,rowId})}`,options),
 get:(p,id,options={})=>apiRequest(`${base(p)}/${id}`,options),
 create:(p,body,options={})=>write(base(p),body,'POST',options),
 update:(p,id,body,options={})=>write(`${base(p)}/${id}`,body,'PUT',options),
 transition:(p,id,body,options={})=>write(`${base(p)}/${id}/status`,body,'PUT',options),
 remove:(p,id,expectedVersion,options={})=>write(`${base(p)}/${id}?expectedVersion=${expectedVersion}`,null,'DELETE',options),
 history:(p,id,options={})=>apiRequest(`${base(p)}/${id}/history`,options),
 comments:(p,id,options={})=>apiRequest(`${base(p)}/${id}/comments`,options),
 comment:(p,id,body,options={})=>write(`${base(p)}/${id}/comments`,body,'POST',options),
};
