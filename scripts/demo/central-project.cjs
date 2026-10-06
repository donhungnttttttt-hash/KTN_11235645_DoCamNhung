// Explicit demo selections only; project creation never infers the caller as PM.
async function createCentralProject(api,input,users) {
 if(!users.length||users.some(u=>!u.id))throw Error('Explicit demo PM/member IDs are required.');
 return api.write('POST','/admin/projects',{project:input,members:users.map((u,i)=>({userId:u.id,projectRole:i===0?'PM':'TESTER'}))});
}
async function ensureDemoMember(api,projectId,user,role) {
 const members=await api.get(`/admin/projects/${projectId}/members`);
 const existing=members.find(m=>m.userId===user.id);
 if(existing) {
  if(existing.projectRole!==role)throw Error('Demo member role changed; reconcile the journal before continuing.');
  return existing;
 }
 const candidate=user.username?await api.get(`/projects/${projectId}/member-candidate?username=${encodeURIComponent(user.username)}`):null;
 return api.write('PUT',`/admin/projects/${projectId}/members/${encodeURIComponent(user.id)}`,{projectRole:role,expectedVersion:candidate?.membershipVersion??null});
}
async function findCentralProject(api,code) {
 for(let page=0;;page++) {
  const result=await api.get(`/admin/projects?keyword=${encodeURIComponent(code)}&page=${page}&size=100`);
  const found=result.items.find(p=>p.code===code);if(found)return found;
  if((page+1)*100>=result.totalElements)return null;
 }
}
module.exports={createCentralProject,ensureDemoMember,findCentralProject};
