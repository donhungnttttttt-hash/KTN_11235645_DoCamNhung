// Authorized business addition only. Does not start/restart an app, migrate, or seed test data into tms.
const fs=require('node:fs'),path=require('node:path');
const {LocalApi}=require('../../scripts/demo/local-api.cjs');
const {findCentralProject}=require('../../scripts/demo/central-project.cjs');
const {parseConfig,query}=require('../../scripts/database/mysql-client.cjs');
const root=path.resolve(__dirname,'../..'),file=path.join(__dirname,'spider-plus-project.json');
async function run(){let logged=false;const api=new LocalApi('http://127.0.0.1:8080');try{
 if(fs.existsSync(file))throw Error('Project journal exists; reconcile before any repeat');
 const c=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
 if(c.TMS_DB_NAME!=='tms'||c.TMS_MYSQL_PORT!=='3307'||query('SELECT DATABASE()',c)[0]!=='tms')throw Error('Main native target mismatch');
 const version=query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1',c)[0];if(version!=='30')throw Error('Expected existing V30 runtime only');
 const ready=await fetch('http://127.0.0.1:8080/actuator/health/readiness',{redirect:'error'});if(ready.status!==200)throw Error('Existing runtime not ready');
 let credentials={username:c.TMS_BOOTSTRAP_USERNAME,password:c.TMS_BOOTSTRAP_PASSWORD};
 if(process.argv[2]==='--documented-demo-admin'){
  const documented=fs.readFileSync(path.join(root,'docs/database/demo-v22.md'),'utf8');
  const username=documented.match(/Admin demo V20 \*\*`([^`]+)`/),password=documented.match(/mật khẩu ban đầu `([^`]+)`/);
  if(!username||!password)throw Error('Documented local demo administrator unavailable');
  credentials={username:username[1],password:password[1]};
 }
 await api.write('POST','/auth/login',credentials);logged=true;
 const me=await api.get('/me');if(!me.roles.includes('ADMIN'))throw Error('Existing ADMIN required');
 if(await findCentralProject(api,'SPIDER-PLUS'))throw Error('SPIDER-PLUS already exists without this journal; nothing overwritten');
 const candidates=[];for(let page=0;;page++){
  const result=await api.get('/admin/users?role=PM&enabled=true&page='+page+'&size=100');candidates.push(...result.items.filter(user=>user.role==='PM'&&user.enabled));if((page+1)*100>=result.totalElements)break;
 }
 candidates.sort((a,b)=>(a.memberships?.length||0)-(b.memberships?.length||0)||a.username.localeCompare(b.username));
 const pm=candidates[0];if(!pm)throw Error('No active PM account; no account fabricated');
 const state={state:'PENDING',authorizedUserDecision:'User19/10 permits choosing an existing PM and adding Spider Plus',origin:api.origin,code:'SPIDER-PLUS',pmUserId:pm.id,pmUsername:pm.username,pmPreviouslyUnassigned:!(pm.memberships?.length),startedAt:new Date().toISOString(),mainMigrationApplied:false};
 fs.writeFileSync(file,JSON.stringify(state,null,2)+'\n',{flag:'wx'});
 const description='Spider Plus hỗ trợ kiểm tra và quản lý các hạng mục tại công trường xây dựng, từ bản vẽ, shiteki đến điện, cốt thép và độ rọi. Dự án kiểm thử tập trung vào ứng dụng Flutter sau đợt cải tiến giao diện và chức năng. System Test dựa trên bộ test case do SHIFT cung cấp; SYP thực hiện kiểm thử trên iPad, iPhone, máy tính bảng và điện thoại Android. Mỗi Feature là một đợt kiểm thử độc lập.';
 const project=await api.write('POST','/admin/projects',{project:{code:'SPIDER-PLUS',name:'Spider Plus',description,timezone:'Asia/Ho_Chi_Minh'},members:[{userId:pm.id,projectRole:'PM'}],devices:[]});
 state.projectId=project.id;fs.writeFileSync(file,JSON.stringify(state,null,2)+'\n');
 const members=await api.get('/admin/projects/'+project.id+'/members');if(!members.some(member=>member.userId===pm.id&&member.projectRole==='PM'))throw Error('PM membership readback failed');
 const loaded=await api.get('/projects/'+project.id);if(loaded.code!=='SPIDER-PLUS')throw Error('Project readback mismatch');
 state.state='READY';state.verifiedAt=new Date().toISOString();state.flywayVersionAfter=query('SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1',c)[0];
 fs.writeFileSync(file,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({projectId:project.id,code:project.code,pmUsername:pm.username,pmPreviouslyUnassigned:state.pmPreviouslyUnassigned,verified:true,mainMigrationApplied:false}));
 }finally{if(logged)await api.write('POST','/auth/logout');}}
run().catch(error=>{console.error('Spider Plus creation stopped: '+error.message);process.exitCode=1;});
