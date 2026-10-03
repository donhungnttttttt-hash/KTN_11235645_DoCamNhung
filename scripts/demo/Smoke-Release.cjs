const fs=require('node:fs');
const path=require('node:path');
const {LocalApi}=require('./local-api.cjs');
const origin=process.env.TMS_DEMO_ORIGIN || 'http://127.0.0.1:8180';
const api=new LocalApi(origin);
(async()=>{
  const readiness=await fetch(origin+'/actuator/health/readiness',{redirect:'error'});
  if(readiness.status!==200 || (await readiness.json()).status!=='UP')throw Error('Release readiness failed');
  const anonymous=await fetch(origin+'/api/v1/projects',{redirect:'error'});
  if(anonymous.status!==401)throw Error('Anonymous project access is not denied');
  await api.write('POST','/auth/login',{username:process.env.TMS_BOOTSTRAP_USERNAME,password:process.env.TMS_BOOTSTRAP_PASSWORD});
  try {
    const me=await api.get('/me');
    const project=await api.write('POST','/projects',{code:'RELEASE-CHECK',name:'Kiểm tra gói bàn giao',timezone:'Asia/Ho_Chi_Minh'});
    const base=`/projects/${project.id}`;
    const suite=await api.write('POST',base+'/test-suites',{code:'SMOKE',name:'Luồng cơ bản'});
    const item=await api.write('POST',base+'/test-cases',{caseNo:'SMOKE-001',suiteId:suite.id,titleVi:'Đọc lại dữ liệu sau lưu',stepsVi:'Lưu và tải lại.',expectedVi:'Dữ liệu được lưu vào MySQL.'});
    await api.write('POST',`${base}/test-cases/${item.id}/revisions/${item.currentRevisionId}/approve`);
    const loaded=await api.get(base+'/test-cases');
    if(loaded.items.length!==1 || !loaded.items[0].approved)throw Error('Release case approval/readback failed');
    const report=await api.get(base+'/reports/summary');
    if(report.metrics.total!==0)throw Error('Unexpected report scope');
    await api.get('/system/status').then(()=>{throw Error('Diagnostic is exposed in release');},error=>{if(!/HTTP 403/.test(error.message))throw error;});
    const result={checkedAt:new Date().toISOString(),origin,profile:'release',ready:true,anonymousDenied:true,adminAuthenticated:me.roles.includes('ADMIN'),caseApprovedReadback:true,emptyReport:true,diagnosticDenied:true};
    fs.writeFileSync(path.join(__dirname,'../../scratch/release-smoke-result.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  } finally {await api.write('POST','/auth/logout');}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
