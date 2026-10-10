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
 providers:o=>aiRequest('/ai/providers',o),
 models:(provider,connectionId,o)=>aiRequest(`/ai/providers/${encodeURIComponent(provider)}/models${connectionId?`?connectionId=${encodeURIComponent(connectionId)}`:''}`,o),
 authorize:(body,o)=>write('/ai/providers/CHATGPT/authorizations','POST',body,o),
 authorization:(id,o)=>aiRequest(`/ai/providers/CHATGPT/authorizations/${encodeURIComponent(id)}`,o),
 cancelAuthorization:(id,o)=>write(`/ai/providers/CHATGPT/authorizations/${encodeURIComponent(id)}`,'DELETE',null,o),
 probe:(id,body,o)=>write(`/ai/providers/CHATGPT/connections/${encodeURIComponent(id)}/probes`,'POST',body,o),
 disconnect:(id,version,o)=>write(`/ai/providers/CHATGPT/connections/${encodeURIComponent(id)}?expectedVersion=${version}`,'DELETE',null,o),
 chatCreate:(body,o)=>write('/ai/chats','POST',body,o),
 chatList:(before=0,o)=>aiRequest(`/ai/chats?before=${before}`,o),
 chatGet:(id,before=0,o)=>aiRequest(`/ai/chats/${id}?before=${before}`,o),
 chatSend:(id,body,o)=>write(`/ai/chats/${id}/messages`,'POST',body,o),
};
