const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const owner='donhungnttttttt-hash',repo='KTN_11235645_DoCamNhung';
function git(...args){return execFileSync('rtk',['proxy','git',...args],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();}
async function main(){
 const remote=git('remote','get-url','origin');
 if(remote!==`https://github.com/${owner}/${repo}.git`)throw Error('Unexpected repository origin');
 const credentials=execFileSync('rtk',['proxy','git','credential','fill'],{input:`protocol=https\nhost=github.com\npath=${owner}/${repo}.git\n\n`,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:20000,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}});
 const token=credentials.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);
 if(!token)throw Error('GitHub credential is unavailable');
 async function request(path,method='GET',body){
  const response=await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'TMS-PR-creation','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`GitHub request failed: ${response.status} ${method} ${path}`);
  return response.json();
 }
 const action=process.argv[2]||'inspect';
 const open=await request(`/pulls?state=open&head=${owner}:system-design&base=develop`);
 if(action==='inspect'){console.log(JSON.stringify(open.map(p=>({number:p.number,title:p.title,url:p.html_url,head:p.head.ref,base:p.base.ref,draft:p.draft})),null,2));return;}
 if(action!=='create')throw Error('Unsupported action');
 const body=fs.readFileSync('var/ai-pr-body.md','utf8');
 const payload={title:'feat: tích hợp TMS, quản trị, luồng kiểm thử và trợ lý AI theo vai trò',body};
 const created=open.length?await request(`/pulls/${open[0].number}`,'PATCH',payload):await request('/pulls','POST',{...payload,head:'system-design',base:'develop',draft:false});
 const verified=await request(`/pulls/${created.number}`);
 if(verified.base.ref!=='develop'||verified.head.ref!=='system-design'||verified.state!=='open'||verified.head.sha!==git('rev-parse','origin/system-design'))throw Error('Created PR verification failed');
 const result={number:verified.number,url:verified.html_url,title:verified.title,base:verified.base.ref,head:verified.head.ref,sha:verified.head.sha,state:verified.state,draft:verified.draft,mergeable:verified.mergeable,mergeableState:verified.mergeable_state};
 fs.writeFileSync('var/system-design-pr-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message?.startsWith('GitHub request')||e.message?.startsWith('Unexpected')?e.message:'PR operation failed; credential output was suppressed.');process.exitCode=1;});
