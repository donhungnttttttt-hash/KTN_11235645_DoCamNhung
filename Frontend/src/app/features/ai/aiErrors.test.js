import {it,expect} from 'vitest';
import {aiError} from './aiErrors';
import {purposeLabel} from './aiLabels';
it('distinguishes app-plan, API and local quota from per-user chat and per-project draft caps',()=>{
 expect(aiError('AI_QUOTA_EXHAUSTED','CHATGPT')).toContain('Ứng dụng đã chạm giới hạn sử dụng gói ChatGPT');expect(aiError('AI_QUOTA_EXHAUSTED','CHATGPT')).not.toContain('hết số dư API');expect(aiError('AI_QUOTA_EXHAUSTED','OPENAI_API')).toContain('thanh toán API riêng');expect(aiError('AI_QUOTA_EXHAUSTED','OLLAMA')).toContain('Model local');expect(aiError('AI_DAILY_LIMIT','OPENAI_API',true)).toContain('Bạn đã đạt giới hạn chat');expect(aiError('AI_DAILY_LIMIT')).toContain('Dự án');
});
it('discloses no arbitrary provider diagnostics and shows customer task labels for saved scope',()=>{
 expect(aiError('<script>private-secret</script>')).not.toContain('private-secret');expect(aiError('AI_RECONNECT_REQUIRED')).toContain('đăng nhập lại');expect(purposeLabel('ADMIN_PROJECT_REVIEW')).toBe('Rà soát dự án');expect(purposeLabel('PM_PROGRESS_REPORT')).toBe('Soạn báo cáo tiến độ');expect(purposeLabel('PM_ASSIGNMENT_SUGGESTION')).toBe('Gợi ý phân công file');expect(purposeLabel('TESTER_WORK_REPORT')).toBe('Tổng hợp công việc của tôi');expect(purposeLabel('TESTER_BUG_DRAFT')).toBe('Hoàn thiện mô tả bug');expect(purposeLabel('DEV_TICKET_REVIEW')).toBe('Rà soát ticket được giao');expect(purposeLabel('raw-internal-enum')).toBe('Tác vụ dự án');
});
