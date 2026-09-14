export const initialProjectData = {
  name: 'Flutter',
  phase: 'Chuẩn_iPad Merge Regression',
  startDate: '2025/08/07',
  endDate: '2025/08/10',
  daysElapsed: 4,
  totalCases: 136,
  executedCases: 136,
  unexecutedCases: 0,
  progressPercent: 100,
  defectRate: '0.7%'
};

export const initialTeamMembers = [
  { id: 1, name: 'Nguyen Xuan Nguyen Giap', role: 'Tester' },
  { id: 2, name: 'Phan Quoc Khanh', role: 'Tester' },
  { id: 3, name: 'Đỗ Cẩm Nhung', role: 'QA Lead' },
  { id: 4, name: 'Le Hoang Nam', role: 'Developer' }
];

export const initialTestSpecs = [
  { no: 1, name: 'Bản đồ - Hiển thị pin địa điểm', caseCount: 12, executed: 12, unexecuted: 0, ok: 12, fixed: 0, ng: 0, pending: 0, updatedAt: '2025-08-09 16:30', updatedBy: 'Nguyen Giap', status: 'Hoàn thành' },
  { no: 2, name: 'Bản đồ - Thao tác zoom in / zoom out', caseCount: 8, executed: 8, unexecuted: 0, ok: 8, fixed: 0, ng: 0, pending: 0, updatedAt: '2025-08-09 17:10', updatedBy: 'Phan Khanh', status: 'Hoàn thành' },
  { no: 3, name: 'Chụp ảnh - Đổi chế độ camera trước/sau', caseCount: 15, executed: 15, unexecuted: 0, ok: 14, fixed: 1, ng: 0, pending: 0, updatedAt: '2025-08-10 09:20', updatedBy: 'Nguyen Giap', status: 'Hoàn thành' },
  { no: 4, name: 'Chụp ảnh - Tải nhiều ảnh cùng lúc', caseCount: 20, executed: 20, unexecuted: 0, ok: 19, fixed: 0, ng: 1, pending: 0, updatedAt: '2025-08-10 11:45', updatedBy: 'Do Cam Nhung', status: 'Cần sửa' },
  { no: 504, name: 'Chuẩn_iPad Merge Regression Test', caseCount: 4, executed: 4, unexecuted: 0, ok: 4, fixed: 0, ng: 0, pending: 0, updatedAt: '2025-08-10 14:00', updatedBy: 'Nguyen Giap', status: 'Hoàn thành' }
];

export const initialIssues = [
  { id: 'SFLUTTER-101', phase: 'System Test', type: 'Bug UI', title: 'Lỗi hiển thị icon camera bị lệch trên iPad Mini', assignee: 'Le Hoang Nam', severity: 'Nghiêm trọng', status: 'Chưa xử lý' },
  { id: 'SFLUTTER-102', phase: 'System Test', type: 'Bug Logic', title: 'Không lưu được trạng thái zoom bản đồ sau khi chọn pin', assignee: 'Le Hoang Nam', severity: 'Vừa', status: 'Đã sửa' }
];

export const initialMemberProgress = [
  { id: 1, name: 'Nguyen Xuan Nguyen Giap', d07: 25, d08: 30, d09: 20, d10: 15, total: 90 },
  { id: 2, name: 'Phan Quoc Khanh', d07: 10, d08: 15, d09: 12, d10: 9, total: 46 }
];

