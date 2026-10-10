import {apiRequest,createApiClient} from './client';
const aiRequest=createApiClient({timeoutMs:35000});
const base=p=>`/projects/${encodeURIComponent(p)}/ai-drafts`;
async function write(path,method,body,options={}) {
 const csrf=await apiRequest('/auth/csrf',options);
 return aiRequest(path,{...options,method,headers:{[csrf.headerName]:csrf.token},body:JSON.stringify(body)});
}
export const aiApi={
 metadata:(p,o)=>apiRequest(`${base(p)}/metadata`,o),
 targets:(p,purpose,q='',o)=>apiRequest(`${base(p)}/targets?${new URLSearchParams({purpose,q})}`,o),
 list:(p,before=0,o)=>apiRequest(`${base(p)}?before=${before}`,o),
 get:(p,id,o)=>apiRequest(`${base(p)}/${id}`,o),
 generate:(p,body,o)=>write(base(p),'POST',body,o),
 edit:(p,id,body,o)=>write(`${base(p)}/${id}/text`,'PUT',body,o),
};
