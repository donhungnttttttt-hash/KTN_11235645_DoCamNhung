#!/usr/bin/env node
// Additive local demo, using real identity/project/workflow APIs. No SQL writes.
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {LocalApi,Journal,validateBaseUrl}=require('./demo/local-api.cjs');
const root=path.resolve(__dirname,'..');
const origin=validateBaseUrl(process.env.TMS_DEMO_ORIGIN || 'http://127.0.0.1:8080');
const directory=path.join(root,'var/demo');
const projectCode='DEMO-PILOT';
const journal=new Journal(path.join(directory,'journal.json'),{schema:1,origin,projectCode});
const sessions=[];
const modules=[['AUTH','Đăng nhập và phân quyền'],['PROJECT','Cấu hình dự án'],['CASE','Thư viện test case'],['RUN','Thực thi kiểm thử'],['BUG','Bug và kiểm thử lại'],['REPORT','Báo cáo và xuất Excel']];
const scenarios=['Dữ liệu hợp lệ','Trường bắt buộc bị bỏ trống','Giới hạn độ dài','Tìm kiếm tiếng Việt','Phân trang','Lọc trạng thái','Kiểm tra quyền Tester','Kiểm tra quyền PM','Thay đổi đồng thời','Gửi lại sau lỗi mạng','Giữ dữ liệu khi lỗi','Hiển thị trạng thái rỗng','Điều hướng bàn phím','Giao diện màn hình nhỏ','Lịch sử thay đổi','Đối chiếu dữ liệu nguồn','Xử lý phiên hết hạn','Hiển thị múi giờ','Kiểm tra tệp đầu vào','Đọc dữ liệu sau tải lại'];
const bugStates=['open','progress','recheck','clarify','ready','planning','resolved','unreproducible','wontfix','closed','resolved','progress','ready','open','closed','resolved'];
const reason='Dữ liệu tổng hợp phục vụ demo nội bộ S11, không phải xác nhận từ khách hàng.';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function pages(api,route) {
  const all=[];let page=0;
  while(true){const data=await api.get(`${route}${route.includes('?')?'&':'?'}page=${page}&size=100`);all.push(...data.items);if(all.length >= (data.totalItems ?? data.totalElements))return all;page++;}
}
async function session(credentials) {
  const api=new LocalApi(origin);await api.write('POST','/auth/login',credentials);sessions.push(api);return api;
}
async function main() {
  fs.mkdirSync(directory,{recursive:true});
  const lock=path.join(directory,'seed.lock');
  const handle=fs.openSync(lock,'wx');
  try {
    const envFile=fs.existsSync(path.join(root,'.env.mysql.local'))?'.env.mysql.local':'.env';
    const env=Object.fromEntries(fs.readFileSync(path.join(root,envFile),'utf8').split(/\r?\n/).filter(l=>/^TMS_BOOTSTRAP_(USERNAME|PASSWORD)=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
    const admin=await session({username:env.TMS_BOOTSTRAP_USERNAME,password:env.TMS_BOOTSTRAP_PASSWORD});
    const me=await admin.get('/me');if(!me.roles.includes('ADMIN'))throw Error('Demo setup requires ADMIN.');
    // Refuse adopting an existing unrelated project when the local journal is absent.
    if(!journal.state.done.project && (await admin.get('/projects')).some(p=>p.code===projectCode))throw Error('DEMO-PILOT already exists without a confirmed journal; reconcile instead of overwriting.');
    const secretFile=path.join(root,'.env.demo.local');
    if(!fs.existsSync(secretFile))fs.writeFileSync(secretFile,JSON.stringify(Array.from({length:5},(_,i)=>({username:i===0?'demo.pilot.pm':`demo.pilot.tester${i}`,password:randomBytes(24).toString('base64url')})),null,2),{mode:0o600,flag:'wx'});
    const credentials=JSON.parse(fs.readFileSync(secretFile,'utf8'));
    const users=[];
    for(let i=0;i<credentials.length;i++)users.push(await journal.once(`user-${i}`,()=>admin.write('POST','/users',{...credentials[i],displayName:i===0?'DEMO · Quản lý dự án':`DEMO · Tester ${i}`,role:i===0?'PM':'TESTER'})));
    const project=await journal.once('project',()=>admin.write('POST','/projects',{code:projectCode,name:'DEMO · Kiểm thử phát hành 1.2',description:reason,timezone:'Asia/Ho_Chi_Minh'}));
    const base=`/projects/${project.id}`;
    const members=[];
    for(let i=0;i<users.length;i++)members.push(await journal.once(`member-${i}`,()=>admin.write('PUT',`${base}/members/${users[i].id}`,{projectRole:i===0?'PM':'TESTER'})));
    const pm=await session(credentials[0]);const testers=[];
    for(const c of credentials.slice(1))testers.push(await session(c));
    const post=(key,route,data,api=pm)=>journal.once(key,()=>api.write('POST',base+route,data));
    console.log('Preparing project catalogs, rules and handbook…');
    const envs=[];for(const [i,code] of ['QA','STAGING'].entries())envs.push(await post(`env-${i}`,'/catalogs/environments',{code,name:i===0?'QA nội bộ':'Staging giả lập',description:reason}));
    const devices=[];for(const [i,entry] of [['WEB','Chrome / Windows','PC','Windows','11'],['IPAD','iPad kiểm thử','TABLET','iPadOS','18']].entries())devices.push(await post(`device-${i}`,'/catalogs/devices',{code:entry[0],name:entry[1],deviceType:entry[2],osName:entry[3],osVersion:entry[4]}));
    const builds=[];for(let i=0;i<3;i++)builds.push(await post(`build-${i}`,'/catalogs/builds',{versionLabel:'1.2.0',buildNumber:String(160+i),platform:'DEMO',notes:reason}));
    const milestones=[];for(let i=0;i<3;i++)milestones.push(await post(`milestone-${i}`,'/catalogs/milestones',{code:`REL-${i+1}`,name:['Hồi quy 1.2.0','Kiểm thử bản sửa','Chuẩn bị 1.3.0'][i],startsOn:'2026-09-01',dueOn:['2026-09-30','2026-10-07','2026-10-21'][i]}));
    const categories=[];for(const [i,[code,name]] of modules.entries())categories.push(await post(`category-${i}`,'/catalogs/categories',{code,name}));
    const ruleset=await post('ruleset','/bug-rule-versions',{code:'INTERNAL_DEMO',name:'Quy tắc demo nội bộ'});
    const rule=await post('rule-version',`/bug-rule-versions/${ruleset.id}/versions`,{contentJson:JSON.stringify({schemaVersion:1,scope:'INTERNAL_DEMO',sourceReference:'ADR-006; dữ liệu pilot tổng hợp',titlePrefix:'[DEMO]',requiredFields:['title','steps','expectedResult','actualResult','buildId','environmentId','deviceId']})});
    await post('rule-publish',`/bug-rule-versions/${ruleset.id}/versions/${rule.id}/publish`,{expectedActiveVersionId:0});
    for(const [i,title] of ['Quy trình kiểm thử nội bộ','Quy tắc ghi nhận bug','Hướng dẫn retest và báo cáo'].entries())await post(`handbook-${i}`,'/handbook',{code:`GUIDE-${i+1}`,name:title,resourceType:'GUIDE',visibility:'INTERNAL',contentHtml:`${title}\n${reason}\nPM duyệt case và phân công. Tester ghi kết quả thật. Fix chưa phải đạt; PM chỉ đóng khi đủ phạm vi retest. Không ghi mật khẩu hoặc thông tin khách hàng vào chứng cứ.`});
    const cases=[];
    for(const [moduleIndex,[code,name]] of modules.entries()) {
      const suite=await post(`suite-${code}`,'/test-suites',{code,name,sortOrder:moduleIndex});
      for(let i=0;i<20;i++){
        const caseNo=`${code}-${String(i+1).padStart(3,'0')}`;
        const item=await post(`case-${caseNo}`,'/test-cases',{caseNo,suiteId:suite.id,titleVi:`${name} — ${scenarios[i]}`,preconditionsVi:'Đăng nhập bằng tài khoản demo được phân công; chọn đúng dự án DEMO.',stepsVi:`1. Mở chức năng ${name}.\n2. Chuẩn bị tình huống: ${scenarios[i]}.\n3. Thực hiện và đối chiếu dữ liệu sau tải lại.`,expectedVi:'Kết quả phù hợp quyền truy cập, dữ liệu được bảo toàn và thông báo tiếng Việt rõ ràng.',sourceReference:'Tình huống tổng hợp S11, không thay đặc tả khách hàng'});
        if(i<18)await post(`approve-${caseNo}`,`/test-cases/${item.id}/revisions/${item.currentRevisionId}/approve`);
        cases.push(item);
      }
      console.log(`Prepared ${code}: 20 cases.`);
    }
    // Pin approved revisions. Cycle 1 is completed; 2/3 expose mixed results; 4 remains a draft.
    const approved=cases.filter((_,i)=>i%20<18);
    const cycles=[];const bugs=[];
    for(let c=0;c<4;c++){
      const cycle=await post(`cycle-${c}`,'/test-cycles',{code:`DEMO-${c+1}`,name:['Hồi quy đã hoàn tất','Hồi quy Web và iPad','Kiểm thử bản sửa','Phạm vi đợt tiếp theo'][c],milestoneId:milestones[Math.min(c,2)].id});
      cycles.push(cycle);
      const cyclePath=`/test-cycles/${cycle.id}`;
      for(let configIndex=0;configIndex<2;configIndex++) {
        await journal.once(`config-${c}-${configIndex}`,async()=>{
          const current=await pm.get(base+cyclePath);
          return pm.write('POST',base+cyclePath+'/configurations',{environmentId:envs[configIndex].id,deviceId:devices[configIndex].id,buildId:builds[c===2?1:0].id,expectedVersion:current.version});
        });
        const configs=await pm.get(base+cyclePath+'/configurations');
        const config=configs.find(x=>x.deviceId===devices[configIndex].id);
        const count=c===0||c===3?20:40;
        for(let group=0;group<2;group++)await journal.once(`scope-${c}-${configIndex}-${group}`,async()=>{
          const current=await pm.get(base+cyclePath);
          const revisions=approved.slice(c*16+group*count/2,c*16+(group+1)*count/2).map(x=>x.currentRevisionId);
          return pm.write('POST',base+cyclePath+'/scope',{configurationId:config.id,revisionIds:revisions,assigneeMembershipId:members[1+(configIndex*2+group)].membershipId,expectedVersion:current.version});
        });
      }
      if(c===3)continue;
      await journal.once(`activate-${c}`,async()=>{const current=await pm.get(base+cyclePath);return pm.write('POST',base+cyclePath+'/activate',{expectedVersion:current.version});});
      const runs=await pages(pm,base+cyclePath+'/run-items');
      for(let i=0;i<runs.length;i++) {
        const run=runs[i], who=members.findIndex(m=>m.membershipId===run.assigneeMembershipId)-1;
        const tester=testers[who];if(!tester)throw Error('Demo assignee is not one of the scoped testers.');
        if(c>0&&i>=72)continue;
        if(c>0&&i>=68){await post(`na-${c}-${i}`,`/run-items/${run.id}/scope-decisions`,{excluded:true,reason:'Demo: tình huống không áp dụng cho cấu hình hiện hành.',expectedVersion:0});continue;}
        const resultCode=c===0?'OK':i<16?'NG':i<60?'OK':'P';
        const attempt=await post(`attempt-${c}-${i}`,`/run-items/${run.id}/attempts`,{resultCode,buildId:run.defaultBuildId,actualResult:resultCode==='NG'?`Demo: kết quả không khớp bước đối chiếu của ${run.caseNo}.`:'Demo: đã thực hiện các bước kiểm tra.',reason:resultCode==='P'?'Demo: chờ dữ liệu từ nhóm phụ trách.':reason,expectedVersion:0,requestKey:`demo-attempt-${c}-${i}`},tester);
        if(resultCode!=='NG')continue;
        const bug=await post(`bug-${c}-${i}`,'/work-items',{type:'BUG',title:`[DEMO] ${run.titleVi} — kết quả chưa khớp`,description:reason,priority:i%3===0?'HIGH':'MEDIUM',categoryId:categories[i%6].id,milestoneId:milestones[c-1].id,assigneeMembershipId:run.assigneeMembershipId,steps:run.stepsVi,expectedResult:run.expectedVi,actualResult:`Demo: không đạt bước đối chiếu của ${run.caseNo}.`,buildId:run.defaultBuildId,environmentId:run.environmentId,deviceId:run.deviceId,revisionId:run.revisionId,attemptId:attempt.id,requestKey:`demo-bug-${c}-${i}`});
        bugs.push(bug);
        const bugPath=`/work-items/${bug.id}`;
        const evidence=await journal.once(`evidence-${c}-${i}`,()=>tester.upload(base+bugPath+'/attachments','demo-placeholder.png',png,'image/png'));
        await post(`comment-${c}-${i}`,bugPath+'/comments',{body:`${reason}\nĐã liên kết ${run.caseNo}, lần chạy ${attempt.id}. Tệp ảnh là chứng cứ giả lập được ghi rõ để trình diễn.`,visibility:'INTERNAL',requestKey:`demo-comment-${c}-${i}`},tester);
        const status=bugStates[i];
        if(['unreproducible','wontfix'].includes(status)){
          await post(`closure-${c}-${i}`,bugPath+'/closure',{kind:status==='wontfix'?'WONTFIX':'UNREPRODUCIBLE',reason,evidenceAttachmentId:evidence.id,sourceReference:'PM demo xác nhận tình huống tổng hợp, không phải khách hàng.',expectedVersion:0});
        } else if(status!=='open') {
          await post(`transition-${c}-${i}`,bugPath+'/transitions',{status:status==='closed'?'resolved':status,reason,fixedBuildId:builds[2].id,expectedVersion:0});
          if(status==='resolved'||status==='closed') {
            const coverage=await post(`coverage-${c}-${i}`,bugPath+'/retest-coverage',{runItemIds:[run.id],reason:'PM demo xác định toàn bộ phạm vi cho bug của một lượt chạy.',expectedVersion:1});
            const coverageItem=coverage.items[0];
            const request=await post(`retest-${c}-${i}`,bugPath+'/retest-requests',{coverageRevisionId:coverage.coverage.id,coverageItemIds:[coverageItem.id],verificationScope:status==='closed'?'FULL_CASE':'BUG_ONLY',assigneeMembershipId:run.assigneeMembershipId,reason,expectedVersion:2,requestKey:`demo-retest-${c}-${i}`});
            if(i!==6){
              await post(`verification-${c}-${i}`,`/retest-requests/${request.id}/results`,{results:[{coverageItemId:coverageItem.id,verdict:i===10?'FAIL':'PASS',actualResult:i===10?'Demo: lỗi vẫn còn trên build sửa.':'Demo: đạt đủ phạm vi đã phân công.',evidenceAttachmentId:evidence.id,expectedRunVersion:1}],expectedVersion:0,expectedBugVersion:3,requestKey:`demo-verification-${c}-${i}`},tester);
              if(status==='closed')await journal.once(`closure-${c}-${i}`,async()=>{const current=await pm.get(base+bugPath);return pm.write('POST',base+bugPath+'/closure',{kind:'FIXED',reason:'PM demo xác nhận đã đạt toàn bộ phạm vi trên build sửa hiện hành.',expectedVersion:current.version});});
            }
          }
        }
      }
      if(c===0)await journal.once('cycle-close',async()=>{const current=await pm.get(base+cyclePath);return pm.write('POST',base+cyclePath+'/decisions',{action:'CLOSE',reason,expectedVersion:current.version});});
      console.log(`Prepared cycle ${c+1}: ${runs.length} run items.`);
    }
    for(let i=0;i<40;i++) {
      const item=await post(`task-${i}`,'/work-items',{type:['TASK','REQUEST','IMPROVEMENT'][i%3],title:`${['Rà soát','Bổ sung','Cải tiến'][i%3]} ${modules[i%6][1].toLowerCase()} — ${scenarios[i%20]}`,description:reason,priority:['HIGH','MEDIUM','LOW'][i%3],categoryId:categories[i%6].id,milestoneId:milestones[i%3].id,assigneeMembershipId:members[1+i%4].membershipId,requestKey:`demo-task-${i}`});
      if(i%6)await post(`task-status-${i}`,`/work-items/${item.id}/transitions`,{status:['open','progress','recheck','clarify','ready','planning'][i%6],reason,expectedVersion:0});
    }
    const summary=await pm.get(base+'/reports/summary');
    const workItems=await pages(pm,base+'/work-items');
    const stateCounts={};for(const w of workItems)stateCounts[w.status]=(stateCounts[w.status]||0)+1;
    const record={generatedAt:new Date().toISOString(),project:{id:project.id,code:projectCode,name:project.name},synthetic:true,counts:{users:users.length,members:members.length+1,suites:modules.length,cases:(await pages(pm,base+'/test-cases')).length,cycles:cycles.length,runItems:0,bugs:bugs.length,workItems:workItems.length},statusCounts:stateCounts,metrics:summary.metrics};
    for(const cycle of cycles)record.counts.runItems+=(await pm.get(`${base}/test-cycles/${cycle.id}/run-items?size=1`)).totalItems;
    if(record.counts.cases!==120||record.counts.runItems!==240||record.counts.bugs!==32||record.counts.workItems!==72||Object.keys(stateCounts).length!==10)throw Error('Demo verification count mismatch; inspect var/demo and API responses.');
    fs.writeFileSync(path.join(directory,'verification.json'),JSON.stringify(record,null,2)+'\n');
    const xlsx=await pm.request('GET',base+'/reports/export.xlsx',undefined,{},true);
    fs.writeFileSync(path.join(directory,'report.xlsx'),xlsx);
    console.log(JSON.stringify(record,null,2));
    console.log('PASS. Demo accounts stored only in ignored .env.demo.local. Re-running preserves confirmed steps.');
  } finally {
    for(const api of sessions)await api.write('POST','/auth/logout').catch(()=>{});
    fs.closeSync(handle);fs.unlinkSync(lock);
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
