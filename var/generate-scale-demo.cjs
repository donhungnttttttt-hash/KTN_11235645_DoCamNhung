const fs=require('node:fs');const crypto=require('node:crypto');
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
let sql=`-- LOCAL DEMO ONLY. Public password @test1234; unique PBKDF2 salt per user.
-- Additive V22; no workbook, result, bug or real personal/asset identifiers.
-- Collision or missing enabled demo administrator rolls back all inserted rows.
START TRANSACTION;
SET @lab_now=UTC_TIMESTAMP(6);
SET @lab_admin=(SELECT id FROM identity_users WHERE username='syp.demo.admin' AND role_code='ADMIN' AND enabled=TRUE);
`;
const users=[];
for(const [role,count]of[['PM',3],['DEV',20],['TESTER',77]])for(let n=1;n<=count;n++) {
 const short=role.toLowerCase(),suffix=String(n).padStart(2,'0');
 const project=role==='PM'?n:role==='DEV'?(n<=7?1:n<=14?2:3):(n<=26?1:n<=52?2:3);
 const salt=crypto.randomBytes(16),key=crypto.pbkdf2Sync('@test1234',salt,310000,32,'sha256');
 users.push({username:`syp.lab.${short}${suffix}`,display:`[Demo22] ${role==='TESTER'?'Tester':role==='DEV'?'Dev':'PM'} ${suffix}`,role,project,hash:'{pbkdf2-v5_8}'+Buffer.concat([salt,key]).toString('hex')});
}
sql+='INSERT INTO identity_users(id,username,display_name,password_hash,role_code,enabled,can_create_users,created_at) VALUES\n'+users.map(u=>`(UUID(),${q(u.username)},${q(u.display)},${q(u.hash)},${q(u.role)},TRUE,FALSE,@lab_now)`).join(',\n')+';\n';
const projects=[{code:'SYP-LAB-22-IOS',name:'[Demo22] Kiểm thử iPad và iPhone',logical:[['IPAD','iPad','iPadOS'],['IPHONE','iPhone','iOS']],platform:'iOS'},
{code:'SYP-LAB-22-TABLET',name:'[Demo22] Kiểm thử tablet Android',logical:[['TABLET','Tablet Android','Android']],platform:'Android'},
{code:'SYP-LAB-22-PHONE',name:'[Demo22] Kiểm thử smartphone Android',logical:[['PHONE','Smartphone Android','Android']],platform:'Android'}];
projects.forEach((p,i)=>{
 const v='@lab_p'+(i+1);
 sql+=`INSERT INTO projects(code,name,description,created_at,created_by,updated_at,updated_by) VALUES(${q(p.code)},${q(p.name)},'Dữ liệu DEMO V22, không phải dự án khách hàng. PM nhập file test case để thực hành.',@lab_now,@lab_admin,@lab_now,@lab_admin);
SET ${v}=LAST_INSERT_ID();
INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at)
SELECT ${v},id,role_code,@lab_now,@lab_now FROM identity_users WHERE username IN (${users.filter(u=>u.project===i+1).map(u=>q(u.username)).join(',')});
INSERT INTO environments(project_id,code,name,description,created_at,updated_at) VALUES(${v},'QA','QA demo','Môi trường kiểm thử giả lập V22',@lab_now,@lab_now);
INSERT INTO builds(project_id,version_label,build_number,platform,notes,released_at,created_at,updated_at) VALUES
(${v},'1.0.0','LAB-1',${q(p.platform)},'Build DEMO ban đầu',DATE(@lab_now),@lab_now,@lab_now),
(${v},'1.0.1','LAB-2',${q(p.platform)},'Build DEMO kiểm thử lại',DATE(@lab_now),@lab_now,@lab_now);
INSERT INTO categories(project_id,code,name,created_at,updated_at) VALUES(${v},'FUNCTIONAL','Chức năng',@lab_now,@lab_now),(${v},'UI','Giao diện',@lab_now,@lab_now);
INSERT INTO devices(project_id,code,name,model,os_name,os_version,created_at,updated_at) VALUES
${p.logical.map(([code,name,os])=>`(${v},${q(code)},${q(name+' đa phiên bản')},${q(name)},${q(os)},'Đa phiên bản',@lab_now,@lab_now)`).join(',\n')};
INSERT INTO milestones(project_id,code,name,starts_on,due_on,created_at,updated_at) VALUES(${v},'LAB-RELEASE','Mốc kiểm thử DEMO',DATE(@lab_now),DATE_ADD(DATE(@lab_now),INTERVAL 30 DAY),@lab_now,@lab_now);
INSERT INTO test_cycles(project_id,code,name,milestone_id,created_at,created_by)
SELECT ${v},'LAB-C1','Đợt kiểm thử DEMO',m.id,@lab_now,u.id FROM milestones m JOIN project_memberships u ON u.project_id=m.project_id AND u.project_role='PM' WHERE m.project_id=${v} AND m.code='LAB-RELEASE';
INSERT INTO cycle_configurations(project_id,cycle_id,environment_id,device_id,default_build_id,created_at)
SELECT ${v},c.id,e.id,d.id,b.id,@lab_now FROM test_cycles c JOIN environments e ON e.project_id=c.project_id AND e.code='QA' JOIN devices d ON d.project_id=c.project_id JOIN builds b ON b.project_id=c.project_id AND b.build_number='LAB-1' WHERE c.project_id=${v} AND c.code='LAB-C1';
`;
});
const families=[
{group:'IPAD',type:'IPAD',os:'iPadOS',versions:['16.6','17.5.1','18.0'],models:[['Apple iPad (8th generation)','128 GB'],['Apple iPad (9th generation)','256 GB'],['Apple iPad Air (4th generation)','64 GB']],connection:'Wi-Fi',color:'Bạc',project:1,start:1},
{group:'IPHONE',type:'IPHONE',os:'iOS',versions:['16.6','17.5.1','18.0'],models:[['Apple iPhone 11','128 GB'],['Apple iPhone 12','128 GB'],['Apple iPhone 13','256 GB']],connection:'Wi-Fi / cellular; SIM demo chưa kích hoạt',color:'Đen',project:1,start:7},
{group:'TABLET',type:'ANDROID',os:'Android',versions:['12','13','14'],models:[['Samsung Galaxy Tab S8','128 GB'],['Samsung Galaxy Tab S8+','128 GB'],['Samsung Galaxy Tab S8 Ultra','128 GB']],connection:'Wi-Fi',color:'Graphite',project:2,start:27},
{group:'PHONE',type:'ANDROID',os:'Android',versions:['12','13','14'],models:[['Samsung Galaxy S21 5G','128 GB'],['Samsung Galaxy S21+ 5G','128 GB'],['Samsung Galaxy S21 Ultra 5G','128 GB']],connection:'Wi-Fi / 5G; SIM demo chưa kích hoạt',color:'Xám/đen giả lập',project:3,start:53}
];
const assets=[];
for(const f of families)for(let n=1;n<=30;n++) {
 const suffix=String(n).padStart(2,'0'),[model,storage]=f.models[Math.floor((n-1)/10)],version=f.versions[(n-1)%3];
 const condition=n<=26?'AVAILABLE':n<=29?'MAINTENANCE':'RETIRED';
 const recipient=n<=6?'syp.lab.tester'+String(f.start+n-1).padStart(2,'0'):'';
 const conditionNote=condition==='MAINTENANCE'?'Đang bảo trì DEMO: kiểm tra pin và cổng sạc':condition==='RETIRED'?'Ngừng dùng DEMO: máy dành kiểm thử trạng thái lưu trữ':'Máy DEMO sẵn sàng kiểm thử';
 assets.push({group:f.group,code:`SYP-LAB-22-${f.group}-${suffix}`,type:f.type,model,serial:`DEMO22-${f.group}-${suffix}`,os:f.os,version,condition,storage,recipient,project:recipient?projects[f.project-1].code:'',pvar:'@lab_p'+f.project,
 notes:`DEMO — thông tin tài sản giả lập, không phải kiểm kê máy thật. Nhóm: ${f.group==='TABLET'?'Tablet Android':f.group==='PHONE'?'Smartphone Android':f.group}. Bộ nhớ: ${storage}. Màu: ${f.color}. Kết nối: ${f.connection}. Phụ kiện: cáp sạc, ốp bảo vệ. Vị trí: ${recipient?'Đã bàn giao cho Tester demo':condition==='MAINTENANCE'?'Khu bảo trì':condition==='RETIRED'?'Kho lưu trữ':'Kho QA, kệ '+f.group+'-'+Math.ceil(n/10)}. ${conditionNote}. Phiên bản OS là ảnh chụp cấu hình test giả lập, không phải khuyến nghị cập nhật.`});
}
sql+='INSERT INTO device_assets(asset_code,type,model,serial,os_name,os_version,condition_code,notes,created_at,created_by,updated_at,updated_by) VALUES\n'+assets.map(a=>`(${[a.code,a.type,a.model,a.serial,a.os,a.version,a.condition,a.notes].map(q).join(',')},@lab_now,@lab_admin,@lab_now,@lab_admin)`).join(',\n')+';\n';
for(const a of assets.filter(a=>a.recipient))sql+=`INSERT INTO device_allocations(asset_id,project_id,recipient_membership_id,assigned_at,assigned_by,expected_return_on,handover_note)
SELECT d.id,${a.pvar},m.id,@lab_now,@lab_admin,DATE_ADD(DATE(@lab_now),INTERVAL 14 DAY),'Bàn giao DEMO V22: đủ cáp sạc và ốp; không phải bàn giao tài sản thật' FROM device_assets d JOIN identity_users u ON u.username=${q(a.recipient)} JOIN project_memberships m ON m.user_id=u.id AND m.project_id=${a.pvar} AND m.project_role='TESTER' AND m.active=TRUE WHERE d.asset_code=${q(a.code)};
`;
sql+=`INSERT INTO identity_audit(id,actor_id,subject_id,event_code,request_id,occurred_at) SELECT UUID(),@lab_admin,id,'DEMO_SEED','flyway-v22-local',@lab_now FROM identity_users WHERE username LIKE 'syp.lab.%';
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) SELECT id,@lab_admin,'PROJECT',id,'DEMO_SEED',@lab_now FROM projects WHERE id IN (@lab_p1,@lab_p2,@lab_p3);
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) SELECT project_id,@lab_admin,'MEMBERSHIP',id,'DEMO_SEED',@lab_now FROM project_memberships WHERE project_id IN (@lab_p1,@lab_p2,@lab_p3);
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) SELECT NULL,@lab_admin,'DEVICE_ASSET',id,'DEMO_SEED',@lab_now FROM device_assets WHERE asset_code LIKE 'SYP-LAB-22-%';
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at) SELECT project_id,@lab_admin,'DEVICE_ALLOCATION',id,'DEMO_SEED',@lab_now FROM device_allocations WHERE project_id IN (@lab_p1,@lab_p2,@lab_p3);
COMMIT;
`;
fs.writeFileSync('Backend/src/main/resources/db/demo/V22__local_scale_demo_data.sql',sql,{flag:'wx'});
const csv=rows=>'\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
fs.writeFileSync('docs/database/demo-v22-users.csv',csv([['Username','Display name','Role','Project'],...users.map(u=>[u.username,u.display,u.role,projects[u.project-1].code])]),{flag:'wx'});
fs.writeFileSync('docs/database/demo-v22-devices.csv',csv([['Asset code','Group','Type','Model','Serial (DEMO)','OS','OS version','Condition','Storage','Recipient','Project','Notes'],...assets.map(a=>[a.code,a.group,a.type,a.model,a.serial,a.os,a.version,a.condition,a.storage,a.recipient,a.project,a.notes])]),{flag:'wx'});
console.log('Generated additive V22 and demo manifests: 100 users, 120 assets, 3 projects, 24 allocations.');
