// Central Data Store for CATEST (SHIFT Inc Style Enterprise QA System)
window.CatStore = {
  activeRoute: '/dashboard',

  // Core Project Specifications
  project: {
    name: 'Flutter',
    company: 'SpiderPlus Co., Ltd.',
    user: 'Nguyen Xuan Nguyen Giap',
    phase: 'Chuẩn_iPad Merge Regression',
    testSpecName: 'Chuẩn_iPad Merge Regression Test',
    startDate: '07/08/2026',
    endDate: '10/08/2026',
    daysElapsed: 16,
    viewModeBadge: 'Chế độ xem · hết hạn 01/09/2027 09:00',
    
    // Exact Metrics from PDF Specification
    totalCases: 136,
    executedCases: 136,
    unexecutedCases: 0,
    progressPercent: 100,
    planProgressPercent: 100,
    unregisteredCases: 0,

    // Status breakdown
    okCount: 134,
    ngCount: 1,
    fixedCount: 1,
    pendingCount: 0,
    naCount: 0,

    // Issue summary
    totalIssues: 7,
    resolvedIssues: 6,
    remainingIssues: 1,
    defectRate: '5.15%',
    testIssuesCount: 0,

    // Sheet summary
    totalSheets: 14,
    executedSheets: 14,
    unexecutedSheets: 0,
    sheetProgressPercent: 100
  },

  // Team Members List (For Left Sidebar & Progress Detail)
  teamMembers: [
    { id: 1, name: 'Nguyễn Văn An', role: 'Leader' },
    { id: 2, name: 'Trần Thu Hà', role: 'Tester' },
    { id: 3, name: 'Lê Minh', role: 'Tester' },
    { id: 4, name: 'Phạm Hải', role: 'Tester' },
    { id: 5, name: 'Hoàng Lan', role: 'Tester' },
    { id: 6, name: 'Đỗ Quốc Bảo', role: 'Tester' },
    { id: 7, name: 'Vũ Thị Mai', role: 'Tester' },
    { id: 8, name: 'Bùi Anh Tuấn', role: 'Tester' }
  ],

  // Test Specification Items (For /tests screen - 24 rows)
  testSpecs: [
    { no: 504, name: '(Tablet)(Standard) Test Specification User Template', caseCount: 8, executed: 8, unexecuted: 0, ok: 8, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/09 16:30', updatedBy: 'Nguyễn Văn An', status: 'Hoàn thành' },
    { no: 505, name: '(Tablet)(Standard) Test Specification Comment Icon', caseCount: 7, executed: 7, unexecuted: 0, ok: 7, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/09 15:45', updatedBy: 'Trần Thu Hà', status: 'Hoàn thành' },
    { no: 506, name: '(Tablet)(Standard) Test Specification File Upload PDF', caseCount: 6, executed: 6, unexecuted: 0, ok: 5, fixed: 1, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/09 17:10', updatedBy: 'Lê Minh', status: 'Hoàn thành' },
    { no: 507, name: '(Tablet)(Standard) Test Specification CAD Book View', caseCount: 4, executed: 4, unexecuted: 0, ok: 4, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/08 14:20', updatedBy: 'Phạm Hải', status: 'Hoàn thành' },
    { no: 508, name: '(Tablet)(Standard) Test Specification Drawing List', caseCount: 4, executed: 4, unexecuted: 0, ok: 4, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/08 11:05', updatedBy: 'Hoàng Lan', status: 'Hoàn thành' },
    { no: 509, name: '(Tablet)(Standard) Test Specification Camera Blackboard', caseCount: 3, executed: 3, unexecuted: 0, ok: 3, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/08 16:50', updatedBy: 'Đỗ Quốc Bảo', status: 'Hoàn thành' },
    { no: 510, name: '(Tablet)(Standard) Test Specification Photo / Shooting', caseCount: 2, executed: 2, unexecuted: 0, ok: 1, fixed: 0, ng: 1, pending: 0, na: 0, updatedAt: '2026/08/09 18:00', updatedBy: 'Trần Thu Hà', status: 'Hoàn thành' },
    { no: 511, name: '(Tablet)(Standard) Test Specification Sync Failure Pattern', caseCount: 2, executed: 2, unexecuted: 0, ok: 2, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/07 10:15', updatedBy: 'Nguyễn Văn An', status: 'Hoàn thành' },
    { no: 512, name: '(Tablet)(Standard) Test Specification Freehand Drawing', caseCount: 1, executed: 1, unexecuted: 0, ok: 1, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/07 14:00', updatedBy: 'Lê Minh', status: 'Hoàn thành' },
    { no: 513, name: '(Tablet)(Standard) Test Specification Manufacturer Template', caseCount: 1, executed: 1, unexecuted: 0, ok: 1, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/07 15:30', updatedBy: 'Phạm Hải', status: 'Hoàn thành' },
    { no: 514, name: '(Tablet)(Standard) Test Specification Construction Photo', caseCount: 1, executed: 1, unexecuted: 0, ok: 1, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/07 16:40', updatedBy: 'Hoàng Lan', status: 'Hoàn thành' },
    { no: 515, name: '(Tablet)(Standard) Test Specification Undefined Module', caseCount: 4, executed: 4, unexecuted: 0, ok: 4, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/07 09:20', updatedBy: 'Đỗ Quốc Bảo', status: 'Hoàn thành' },
    { no: 516, name: '(Tablet)(Standard) Test Specification Security Authentication', caseCount: 12, executed: 12, unexecuted: 0, ok: 12, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/08 09:00', updatedBy: 'Vũ Thị Mai', status: 'Hoàn thành' },
    { no: 517, name: '(Tablet)(Standard) Test Specification Push Notification', caseCount: 15, executed: 15, unexecuted: 0, ok: 15, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/08 10:30', updatedBy: 'Bùi Anh Tuấn', status: 'Hoàn thành' },
    { no: 518, name: '(Tablet)(Standard) Test Specification Offline Sync Storage', caseCount: 10, executed: 10, unexecuted: 0, ok: 10, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/08 13:15', updatedBy: 'Nguyễn Văn An', status: 'Hoàn thành' },
    { no: 519, name: '(Tablet)(Standard) Test Specification Multi-device Scaling', caseCount: 8, executed: 8, unexecuted: 0, ok: 8, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/09 11:20', updatedBy: 'Trần Thu Hà', status: 'Hoàn thành' },
    { no: 520, name: '(Tablet)(Standard) Test Specification File Export PDF/CSV', caseCount: 14, executed: 14, unexecuted: 0, ok: 14, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/09 14:00', updatedBy: 'Lê Minh', status: 'Hoàn thành' },
    { no: 521, name: '(Tablet)(Standard) Test Specification User Permission Admin', caseCount: 11, executed: 11, unexecuted: 0, ok: 11, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/09 16:10', updatedBy: 'Phạm Hải', status: 'Hoàn thành' },
    { no: 522, name: '(Tablet)(Standard) Test Specification OCR Text Recognition', caseCount: 9, executed: 9, unexecuted: 0, ok: 9, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/10 09:45', updatedBy: 'Hoàng Lan', status: 'Hoàn thành' },
    { no: 523, name: '(Tablet)(Standard) Test Specification Payment Gateway Check', caseCount: 8, executed: 8, unexecuted: 0, ok: 8, fixed: 0, ng: 0, pending: 0, na: 0, updatedAt: '2026/08/10 10:15', updatedBy: 'Đỗ Quốc Bảo', status: 'Hoàn thành' }
  ],

  // Issue List (For /issues screen - 7 issues matching PDF)
  issues: [
    { id: 'SFLUTTER-5366', phase: 'Chuẩn_iPad Merge Regression', type: 'Lỗi', title: '[Đang xác nhận] Màn hình chụp ảnh bị lệch tỉ lệ khung hình khi xoay ngang iPad M4', assignee: 'Nguyễn Văn An', severity: 'Nghiêm trọng', updatedAt: '2026/08/09 17:45', status: 'Hoàn thành' },
    { id: 'SFLUTTER-5367', phase: 'Chuẩn_iPad Merge Regression', type: 'Lỗi', title: '[Danh sách chưa đồng bộ] Gửi dữ liệu thất bại 3 lần liên tiếp khi ngắt kết nối Wifi', assignee: 'Trần Thu Hà', severity: 'Cao', updatedAt: '2026/08/09 16:20', status: 'Hoàn thành' },
    { id: 'SFLUTTER-5370', phase: 'Chuẩn_iPad Merge Regression', type: 'Lỗi', title: '[Danh sách ảnh công trình] Icon thu nhỏ bị mờ trên màn hình Retina 120Hz', assignee: 'Lê Minh', severity: 'Trung bình', updatedAt: '2026/08/09 14:10', status: 'Hoàn thành' },
    { id: 'SFLUTTER-5378', phase: 'Chuẩn_iPad Merge Regression', type: 'Lỗi', title: '[Scale] Khung hiển thị khoảng cách bị tràn viền khi zoom 200%', assignee: 'Phạm Hải', severity: 'Thấp', updatedAt: '2026/08/08 18:30', status: 'Hoàn thành' },
    { id: 'SFLUTTER-5379', phase: 'Chuẩn_iPad Merge Regression', type: 'Lỗi', title: '[Camera icon] Nút bật đèn Flash bị ẩn khi chuyển đổi giữa camera trước và sau', assignee: 'Hoàng Lan', severity: 'Trung bình', updatedAt: '2026/08/08 15:50', status: 'Hoàn thành' },
    { id: 'SFLUTTER-5386', phase: 'Chuẩn_iPad Merge Regression', type: 'Lỗi', title: '[Upload PDF] Đơ thanh tiến trình ở 99% khi tải file lớn > 15MB', assignee: 'Đỗ Quốc Bảo', severity: 'Cao', updatedAt: '2026/08/08 11:40', status: 'Hoàn thành' },
    { id: 'SFLUTTER-5388', phase: 'Chuẩn_iPad Merge Regression', type: 'Lỗi', title: '[Tải tập tin] Màn hình bị đơ Spinner khi resume upload PDF 15MB sau khi ngắt mạng', assignee: 'Trần Thu Hà', severity: 'Nghiêm trọng', updatedAt: '2026/08/09 18:10', status: 'Chưa xử lý' }
  ],

  // Analysis Breakdown Data (For /analysis screen)
  analysisData: [
    { target: 'User Template', total: 8, executed: 8, issues: 0, rate: '0.00%', ok: 8, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Comment Icon', total: 7, executed: 7, issues: 0, rate: '0.00%', ok: 7, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'File Upload', total: 6, executed: 6, issues: 1, rate: '16.67%', ok: 5, ng: 0, fixed: 1, pending: 0, na: 0, unexecuted: 0 },
    { target: 'CAD Book View', total: 4, executed: 4, issues: 0, rate: '0.00%', ok: 4, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Drawing List', total: 4, executed: 4, issues: 0, rate: '0.00%', ok: 4, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Camera: Blackboard', total: 3, executed: 3, issues: 0, rate: '0.00%', ok: 3, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Photo / Shooting', total: 2, executed: 2, issues: 1, rate: '50.00%', ok: 1, ng: 1, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Sync Failure Pattern', total: 2, executed: 2, issues: 1, rate: '50.00%', ok: 2, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Freehand Drawing', total: 1, executed: 1, issues: 1, rate: '100.00%', ok: 1, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Manufacturer Template', total: 1, executed: 1, issues: 1, rate: '100.00%', ok: 1, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Construction Photo', total: 1, executed: 1, issues: 1, rate: '100.00%', ok: 1, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 },
    { target: 'Undefined Module', total: 4, executed: 4, issues: 0, rate: '0.00%', ok: 4, ng: 0, fixed: 0, pending: 0, na: 0, unexecuted: 0 }
  ],

  // Member Progress Detail (For /progress/detail screen - 50 members simulation)
  memberProgressList: [
    { id: 1, name: 'Nguyễn Văn An', progress: '100%', plan: 25, done: 25, remaining: 0, startDate: '2026/08/07', defectsFound: 2, d07: 8, d08: 8, d09: 9, d10: 0 },
    { id: 2, name: 'Trần Thu Hà', progress: '100%', plan: 30, done: 30, remaining: 0, startDate: '2026/08/07', defectsFound: 3, d07: 10, d08: 10, d09: 10, d10: 0 },
    { id: 3, name: 'Lê Minh', progress: '100%', plan: 28, done: 28, remaining: 0, startDate: '2026/08/07', defectsFound: 1, d07: 9, d08: 9, d09: 10, d10: 0 },
    { id: 4, name: 'Phạm Hải', progress: '100%', plan: 27, done: 27, remaining: 0, startDate: '2026/08/07', defectsFound: 1, d07: 9, d08: 9, d09: 9, d10: 0 },
    { id: 5, name: 'Hoàng Lan', progress: '100%', plan: 26, done: 26, remaining: 0, startDate: '2026/08/07', defectsFound: 0, d07: 8, d08: 9, d09: 9, d10: 0 }
  ]
};
