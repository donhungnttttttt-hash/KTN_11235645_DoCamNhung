import {apiRequest} from './client';
async function write(path,method,body){
 const csrf=await apiRequest('/auth/csrf');
 return apiRequest(path,{method,headers:{[csrf.headerName]:csrf.token},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
}
const versionQuery=profile=>new URLSearchParams({expectedVersion:profile.version,expectedAccountVersion:profile.accountVersion}).toString();
export const selfProfileApi={
 get:options=>apiRequest('/me/profile',options),
 update:input=>write('/me/profile','PUT',input),
 upload:(file,profile)=>{const data=new FormData();data.append('file',file);return write('/me/avatar?'+versionQuery(profile),'PUT',data);},
 removeAvatar:profile=>write('/me/avatar?'+versionQuery(profile),'DELETE'),
};
export const avatarUrl=profile=>`/api/v1/me/avatar?v=${encodeURIComponent(profile.version)}`;
