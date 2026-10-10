-- LOCAL DEMO ONLY: application-local includes this location; release does not.
-- Public demo credentials: @test1234. Individually salted PBKDF2 hashes.
-- Reserved syp.demo.* / SYP-DEMO-* namespace. Fail on collisions, never overwrite.
-- DML only, one explicit transaction: a collision must not leave partial demo rows.
-- No test cases, workbook bytes, import batches, execution results or fake bugs.
START TRANSACTION;
SET @demo_now = UTC_TIMESTAMP(6);
SET @demo_admin = UUID();
SET @demo_pm = UUID();
SET @demo_t1 = UUID();
SET @demo_t2 = UUID();
SET @demo_dev = UUID();
INSERT INTO identity_users(id,username,display_name,password_hash,role_code,created_at) VALUES
(@demo_admin,'syp.demo.admin','[Demo] Quản trị tổng','{pbkdf2-v5_8}70a552ec55bcd210b83b2952d2ac3dda7e5298bfa8e552245d7a0c0db07187c11ff1d075ab825748f97ff1dac3820b50','ADMIN',@demo_now),
(@demo_pm,'syp.demo.pm','[Demo] Quản lý dự án','{pbkdf2-v5_8}a50e8b195e56d611f6702a9274d68b935756daad1d8a23cd2bca9b0ae35aa5c2855363b9637efed7b358e3925d22cb9a','PM',@demo_now),
(@demo_t1,'syp.demo.tester01','[Demo] Tester 01','{pbkdf2-v5_8}b7c81b7a5777e7767d4ecf987eee2933f847586b70e88feb3882135c534460884f9dbfd6d74ea7abec76fb2feaa8133b','TESTER',@demo_now),
(@demo_t2,'syp.demo.tester02','[Demo] Tester 02','{pbkdf2-v5_8}a41be18da41f3070e2d40dc4d6a4fd7573e625d3c57c426053f767ad43e346b6bb2ed13c6e87682a905ee5b14fe2b261','TESTER',@demo_now),
(@demo_dev,'syp.demo.dev','[Demo] Lập trình viên','{pbkdf2-v5_8}83d981ca2ea0e337cd2a31e24f125c8513b99080512bec58c268785a29efda30998909b3d0ed2de4a58ea876fe9103b6','DEV',@demo_now);

INSERT INTO projects(code,name,description,created_at,created_by,updated_at,updated_by) VALUES
('SYP-DEMO-20','[Demo] Kiểm thử ứng dụng iPad','Dự án thực hành PM → Tester → Dev → Retest. Dữ liệu demo V20.',@demo_now,@demo_admin,@demo_now,@demo_admin);
SET @demo_mobile = LAST_INSERT_ID();
INSERT INTO projects(code,name,description,created_at,created_by,updated_at,updated_by) VALUES
('SYP-DEMO-WEB-20','[Demo] Web trên Android','Dự án thứ hai để thực hành phân bổ nguồn lực và kiểm tra phạm vi quyền.',@demo_now,@demo_admin,@demo_now,@demo_admin);
SET @demo_web = LAST_INSERT_ID();
INSERT INTO project_memberships(project_id,user_id,project_role,created_at,updated_at) VALUES
(@demo_mobile,@demo_pm,'PM',@demo_now,@demo_now),(@demo_mobile,@demo_t1,'TESTER',@demo_now,@demo_now),
(@demo_mobile,@demo_t2,'TESTER',@demo_now,@demo_now),(@demo_mobile,@demo_dev,'DEV',@demo_now,@demo_now),
(@demo_web,@demo_pm,'PM',@demo_now,@demo_now),(@demo_web,@demo_t2,'TESTER',@demo_now,@demo_now),
(@demo_web,@demo_dev,'DEV',@demo_now,@demo_now);
SET @demo_pm_mobile = (SELECT id FROM project_memberships WHERE project_id=@demo_mobile AND user_id=@demo_pm);
SET @demo_pm_web = (SELECT id FROM project_memberships WHERE project_id=@demo_web AND user_id=@demo_pm);
SET @demo_t1_mobile = (SELECT id FROM project_memberships WHERE project_id=@demo_mobile AND user_id=@demo_t1);
SET @demo_t2_mobile = (SELECT id FROM project_memberships WHERE project_id=@demo_mobile AND user_id=@demo_t2);
SET @demo_t2_web = (SELECT id FROM project_memberships WHERE project_id=@demo_web AND user_id=@demo_t2);

INSERT INTO environments(project_id,code,name,description,created_at,updated_at) VALUES
(@demo_mobile,'QA','QA demo','Môi trường thực hành, không phải hệ thống khách hàng',@demo_now,@demo_now),
(@demo_web,'QA','QA demo','Môi trường thực hành, không phải hệ thống khách hàng',@demo_now,@demo_now);
INSERT INTO devices(project_id,code,name,model,os_name,os_version,created_at,updated_at) VALUES
(@demo_mobile,'IPAD','iPad demo','iPad','iPadOS','18',@demo_now,@demo_now),
(@demo_web,'ANDROID','Android demo','Android','Android','15',@demo_now,@demo_now);
INSERT INTO builds(project_id,version_label,build_number,platform,notes,released_at,created_at,updated_at) VALUES
(@demo_mobile,'1.0.0','DEMO-1','iOS','Build demo ban đầu',DATE(@demo_now),@demo_now,@demo_now),
(@demo_mobile,'1.0.1','DEMO-2','iOS','Build demo để thực hành xác minh bản sửa',DATE(@demo_now),@demo_now,@demo_now),
(@demo_web,'1.0.0','DEMO-1','Android','Build demo ban đầu',DATE(@demo_now),@demo_now,@demo_now),
(@demo_web,'1.0.1','DEMO-2','Android','Build demo để thực hành xác minh bản sửa',DATE(@demo_now),@demo_now,@demo_now);
INSERT INTO categories(project_id,code,name,created_at,updated_at) VALUES
(@demo_mobile,'FUNCTIONAL','Chức năng',@demo_now,@demo_now),(@demo_mobile,'UI','Giao diện',@demo_now,@demo_now),
(@demo_web,'FUNCTIONAL','Chức năng',@demo_now,@demo_now),(@demo_web,'UI','Giao diện',@demo_now,@demo_now);
INSERT INTO milestones(project_id,code,name,starts_on,due_on,created_at,updated_at) VALUES
(@demo_mobile,'DEMO-RELEASE','Mốc hoàn thành demo',DATE(@demo_now),DATE_ADD(DATE(@demo_now),INTERVAL 14 DAY),@demo_now,@demo_now),
(@demo_web,'DEMO-RELEASE','Mốc hoàn thành demo',DATE(@demo_now),DATE_ADD(DATE(@demo_now),INTERVAL 21 DAY),@demo_now,@demo_now);
INSERT INTO test_cycles(project_id,code,name,milestone_id,created_at,created_by)
SELECT project_id,'DEMO-C1','Đợt kiểm thử demo',id,@demo_now,IF(project_id=@demo_mobile,@demo_pm_mobile,@demo_pm_web)
FROM milestones WHERE project_id IN (@demo_mobile,@demo_web) AND code='DEMO-RELEASE';
INSERT INTO cycle_configurations(project_id,cycle_id,environment_id,device_id,default_build_id,created_at)
SELECT c.project_id,c.id,e.id,d.id,b.id,@demo_now FROM test_cycles c
JOIN environments e ON e.project_id=c.project_id AND e.code='QA'
JOIN devices d ON d.project_id=c.project_id
JOIN builds b ON b.project_id=c.project_id AND b.build_number='DEMO-1'
WHERE c.project_id IN (@demo_mobile,@demo_web) AND c.code='DEMO-C1';

INSERT INTO device_assets(asset_code,type,model,os_name,os_version,notes,created_at,created_by,updated_at,updated_by) VALUES
('SYP-DEMO-20-IPAD-01','IPAD','iPad','iPadOS','18','Máy DEMO, không phải tài sản thực',@demo_now,@demo_admin,@demo_now,@demo_admin),
('SYP-DEMO-20-IPAD-02','IPAD','iPad','iPadOS','18','Máy DEMO, không phải tài sản thực',@demo_now,@demo_admin,@demo_now,@demo_admin),
('SYP-DEMO-20-ANDROID-01','ANDROID','Android','Android','15','Máy DEMO, không phải tài sản thực',@demo_now,@demo_admin,@demo_now,@demo_admin),
('SYP-DEMO-20-IPHONE-01','IPHONE','iPhone','iOS','18','Máy DEMO dự phòng, chưa bàn giao',@demo_now,@demo_admin,@demo_now,@demo_admin);
INSERT INTO device_allocations(asset_id,project_id,recipient_membership_id,assigned_at,assigned_by,expected_return_on,handover_note)
SELECT id,IF(type='ANDROID',@demo_web,@demo_mobile),
CASE asset_code WHEN 'SYP-DEMO-20-IPAD-01' THEN @demo_t1_mobile WHEN 'SYP-DEMO-20-IPAD-02' THEN @demo_t2_mobile ELSE @demo_t2_web END,
@demo_now,@demo_admin,DATE_ADD(DATE(@demo_now),INTERVAL 30 DAY),'Phân bổ thiết bị DEMO ban đầu từ V20'
FROM device_assets WHERE asset_code IN ('SYP-DEMO-20-IPAD-01','SYP-DEMO-20-IPAD-02','SYP-DEMO-20-ANDROID-01');

INSERT INTO identity_audit(id,actor_id,subject_id,event_code,request_id,occurred_at)
SELECT UUID(),@demo_admin,id,'DEMO_SEED','flyway-v20-local',@demo_now FROM identity_users
WHERE id IN (@demo_admin,@demo_pm,@demo_t1,@demo_t2,@demo_dev);
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at)
SELECT id,@demo_admin,'PROJECT',id,'DEMO_SEED',@demo_now FROM projects WHERE id IN (@demo_mobile,@demo_web);
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at)
SELECT project_id,@demo_admin,'MEMBERSHIP',id,'DEMO_SEED',@demo_now FROM project_memberships WHERE project_id IN (@demo_mobile,@demo_web);
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at)
SELECT NULL,@demo_admin,'DEVICE_ASSET',id,'DEMO_SEED',@demo_now FROM device_assets WHERE asset_code LIKE 'SYP-DEMO-20-%';
INSERT INTO project_audit(project_id,actor_id,entity_type,entity_id,action,occurred_at)
SELECT project_id,@demo_admin,'DEVICE_ALLOCATION',id,'DEMO_SEED',@demo_now FROM device_allocations WHERE project_id IN (@demo_mobile,@demo_web);
COMMIT;
