const {test}=require('node:test');const assert=require('node:assert/strict');
const {createCentralProject,ensureDemoMember,findCentralProject}=require('./central-project.cjs');
test('central create names members explicitly and does not silently add admin',async()=>{
 let call;const api={write:async(...args)=>{call=args;return {id:7};}};
 await createCentralProject(api,{code:'DEMO',name:'Demo'},[{id:'pm'},{id:'tester'}]);
 assert.equal(call[1],'/admin/projects');assert.deepEqual(call[2].project,{code:'DEMO',name:'Demo'});assert.deepEqual(call[2].members,[{userId:'pm',projectRole:'PM'},{userId:'tester',projectRole:'TESTER'}]);
});
test('existing initial membership is adopted without duplicate mutation; missing legacy member is added centrally',async()=>{
 const writes=[];const api={get:async()=>[{userId:'pm',membershipId:1,projectRole:'PM'}],write:async(...args)=>{writes.push(args);return {membershipId:2};}};
 assert.equal((await ensureDemoMember(api,7,{id:'pm'},'PM')).membershipId,1);assert.equal(writes.length,0);
 await ensureDemoMember(api,7,{id:'tester'},'TESTER');assert.equal(writes[0][1],'/admin/projects/7/members/tester');
});
test('existing project safety search uses central visibility and exact code',async()=>{
 const api={get:async route=>{assert.match(route,/^\/admin\/projects\?/);return {items:[{code:'DEMO-X'},{code:'DEMO',id:3}],totalElements:2};}};
 assert.equal((await findCentralProject(api,'DEMO')).id,3);
});
