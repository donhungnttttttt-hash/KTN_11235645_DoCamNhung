import {apiRequest} from './client';

const base=p=>`/projects/${p}`;
async function write(path,body,method='POST') {
  const csrf=await apiRequest('/auth/csrf');
  return apiRequest(path,{method,headers:{[csrf.headerName]:csrf.token},...(body?{body:JSON.stringify(body)}:{})});
}
export const featuresApi={
  list:(p,{page=0,keyword='',archived=false,createdFrom='',createdTo='',sort='created-desc'}={})=>apiRequest(`${base(p)}/features?${new URLSearchParams({page:String(page),size:'20',keyword,archived:String(archived),sort,...(createdFrom?{createdFrom}:{}),...(createdTo?{createdTo}:{})})}`),
  get:(p,f)=>apiRequest(`${base(p)}/features/${f}`),
  create:(p,input)=>write(`${base(p)}/features`,input),
  update:(p,f,input)=>write(`${base(p)}/features/${f}`,input,'PUT'),
  archive:(p,f,input)=>write(`${base(p)}/features/${f}/archive`,input),
  restore:(p,f,input)=>write(`${base(p)}/features/${f}/restore`,input),
  documents:(p,f,{page=0,keyword=''}={})=>apiRequest(`${base(p)}/features/${f}/documents?${new URLSearchParams({page:String(page),size:'20',keyword})}`),
  hideDocument:(p,f,d,input)=>write(`${base(p)}/features/${f}/documents/${d}/archive`,input),
  preview:async(p,f,file)=>{const csrf=await apiRequest('/auth/csrf');const body=new FormData();body.append('file',file);return apiRequest(`${base(p)}/features/${f}/import-previews`,{method:'POST',body,headers:{[csrf.headerName]:csrf.token}});},
  commit:(p,f,id)=>write(`${base(p)}/features/${f}/import-previews/${id}/commit`),
  assignments:(p,d)=>apiRequest(`${base(p)}/test-documents/${d}/assignments`),
  assign:(p,d,input)=>write(`${base(p)}/test-documents/${d}/assignments`,input,'PUT'),
  history:(p,d,before=0)=>apiRequest(`${base(p)}/test-documents/${d}/assignment-history?before=${before}`),
};
