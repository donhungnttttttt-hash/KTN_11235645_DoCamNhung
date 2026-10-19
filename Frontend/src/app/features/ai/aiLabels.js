// Reviewed server task labels; saved threads carry codes rather than display labels.
const purposes={
 PROJECT_CHAT:'Trao đổi dự án',
 ADMIN_PROJECT_REVIEW:'Rà soát dự án',
 PM_PROGRESS_REPORT:'Soạn báo cáo tiến độ',
 PM_ASSIGNMENT_SUGGESTION:'Gợi ý phân công file',
 TESTER_WORK_REPORT:'Tổng hợp công việc của tôi',
 TESTER_BUG_DRAFT:'Hoàn thiện mô tả bug',
 DEV_TICKET_REVIEW:'Rà soát ticket được giao',
};
export const purposeLabel=code=>purposes[code]||'Tác vụ dự án';
