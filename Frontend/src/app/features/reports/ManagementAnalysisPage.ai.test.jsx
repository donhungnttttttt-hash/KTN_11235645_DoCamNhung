import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {ManagementAnalysisPage} from './ManagementAnalysisPage';

vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({status:'authenticated',user:{id:1,roles:['ADMIN']},hasRole:role=>role==='ADMIN'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:null})}));
vi.mock('../ai/AiConnections',()=>({useAiProviders:()=>({ready:true,selection:{provider:'OPENAI_API',model:'report-model'}})}));

const project={id:11,name:'Dự án kiểm thử',code:'TEST'};
const summary={project,feature:null,metrics:{total:0,tested:0,ok:0,ng:0,pending:0,na:0,notRun:0,executionPercent:0},features:[{id:42,name:'Đăng nhập',caseCount:0,testedCaseCount:0,progressPercent:0}],issues:[]};
let api;
beforeEach(()=>{api={summary:vi.fn().mockResolvedValue(summary),list:vi.fn().mockResolvedValue({items:[],totalPages:0}),preview:vi.fn(),create:vi.fn(),update:vi.fn()};});
async function mount(){render(<ManagementAnalysisPage project={project} api={api}/>);await screen.findByText('Chưa có case trong phạm vi này.');}
const input=()=>screen.getByLabelText('Nội dung Markdown');
const generate=()=>fireEvent.click(screen.getByRole('button',{name:'Tạo gợi ý AI'}));

it('puts generated content into an empty report draft and announces that it has not been saved',async()=>{
 api.preview.mockResolvedValue({state:'READY',draftId:8,markdown:'# Tổng hợp\n\nChưa có case.'});
 await mount();fireEvent.change(screen.getByLabelText('Tiêu đề báo cáo'),{target:{value:'Tiêu đề do tôi đặt'}});generate();
 await waitFor(()=>expect(input()).toHaveValue('# Tổng hợp\n\nChưa có case.'));
 expect(screen.getByRole('status',{name:'Kết quả tạo gợi ý AI'})).toHaveTextContent(/đã.*bản soạn.*chưa lưu/i);
 expect(screen.getByRole('button',{name:'Lưu báo cáo'})).toBeEnabled();
 expect(screen.getByLabelText('Tiêu đề báo cáo')).toHaveValue('Tiêu đề do tôi đặt');
 expect(api.create).not.toHaveBeenCalled();expect(api.update).not.toHaveBeenCalled();
});

it('keeps existing manual content until the user explicitly applies the generated proposal',async()=>{
 api.preview.mockResolvedValue({state:'READY',draftId:8,markdown:'# Đề xuất mới'});
 await mount();fireEvent.change(input(),{target:{value:'Nội dung tôi tự viết'}});generate();
 expect(await screen.findByRole('status',{name:'Kết quả tạo gợi ý AI'})).toHaveTextContent(/giữ nguyên/i);
 expect(input()).toHaveValue('Nội dung tôi tự viết');
 fireEvent.click(screen.getByRole('button',{name:'Đưa vào bản soạn'}));
 expect(input()).toHaveValue('# Đề xuất mới');expect(api.create).not.toHaveBeenCalled();
});

it('preserves text typed while AI is working and offers the result separately',async()=>{
 let finish;api.preview.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 await mount();generate();fireEvent.change(input(),{target:{value:'Tôi tiếp tục viết trong lúc chờ'}});
 await act(async()=>finish({state:'READY',draftId:8,markdown:'# AI trả về sau'}));
 expect(input()).toHaveValue('Tôi tiếp tục viết trong lúc chờ');
 expect(screen.getByRole('button',{name:'Đưa vào bản soạn'})).toBeEnabled();
 expect(screen.getByRole('status',{name:'Kết quả tạo gợi ý AI'})).toHaveTextContent(/giữ nguyên/i);
});

it('does not repopulate an editor the user changed and deliberately cleared during generation',async()=>{
 let finish;api.preview.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 await mount();generate();fireEvent.change(input(),{target:{value:'Nội dung thử'}});fireEvent.change(input(),{target:{value:''}});
 await act(async()=>finish({state:'READY',draftId:8,markdown:'# Gợi ý sau khi tôi đã xóa'}));
 expect(input()).toHaveValue('');expect(screen.getByRole('button',{name:'Đưa vào bản soạn'})).toBeEnabled();
});

it.each(['', '   \n '])('does not accept a completed proposal with empty content (%j)',async markdown=>{
 api.preview.mockResolvedValue({state:'READY',draftId:8,markdown});
 await mount();fireEvent.change(input(),{target:{value:'Bản nháp cần giữ'}});generate();
 expect(await screen.findByRole('alert')).toHaveTextContent(/không có nội dung/i);
 expect(input()).toHaveValue('Bản nháp cần giữ');
 expect(screen.queryByRole('button',{name:'Đưa vào bản soạn'})).toBeNull();
 expect(screen.getByRole('button',{name:'Tạo gợi ý AI'})).toBeEnabled();
 expect(api.create).not.toHaveBeenCalled();
});

it('keeps an unrecognized response retryable with the admitted request instead of throwing a property-access error',async()=>{
 api.preview.mockResolvedValueOnce(null).mockResolvedValueOnce({state:'READY',draftId:8,markdown:'# Kết quả xác nhận'});
 await mount();generate();
 expect(await screen.findByRole('alert')).toHaveTextContent(/chưa xác nhận/i);
 fireEvent.click(screen.getByRole('button',{name:'Kiểm tra gợi ý AI'}));
 await waitFor(()=>expect(input()).toHaveValue('# Kết quả xác nhận'));
 expect(api.preview.mock.calls[1][1]).toEqual(api.preview.mock.calls[0][1]);
});

it('keeps the same request after an unreadable successful HTTP response to avoid generating twice',async()=>{
 api.preview.mockRejectedValueOnce(Object.assign(new Error('Phản hồi dịch vụ không đúng định dạng.'),{status:200,code:'INVALID_RESPONSE'}))
  .mockResolvedValueOnce({state:'READY',draftId:8,markdown:'# Kết quả đã xác nhận'});
 await mount();generate();await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Kiểm tra gợi ý AI'}));
 await waitFor(()=>expect(input()).toHaveValue('# Kết quả đã xác nhận'));
 expect(api.preview.mock.calls[1][1]).toEqual(api.preview.mock.calls[0][1]);
});

it.each(['response','http'])('explains how to reduce the report scope when input is too large (%s)',async mode=>{
 if(mode==='response')api.preview.mockResolvedValue({state:'FAILED',failureCode:'AI_INPUT_TOO_LARGE'});
 else api.preview.mockRejectedValue(Object.assign(new Error('Chưa tạo được đề xuất AI. Bản đang sửa được giữ nguyên.'),{status:422,code:'AI_INPUT_TOO_LARGE'}));
 await mount();fireEvent.change(input(),{target:{value:'Bản nháp thủ công'}});generate();
 expect(await screen.findByRole('alert')).toHaveTextContent(/chọn.*Feature/i);
 expect(input()).toHaveValue('Bản nháp thủ công');expect(screen.getByLabelText('Phạm vi Feature')).toBeEnabled();
 expect(api.create).not.toHaveBeenCalled();
});

it('removes an older unaccepted proposal when the user starts a new generation',async()=>{
 let finish;api.preview.mockResolvedValueOnce({state:'READY',draftId:8,markdown:'# Gợi ý cũ'}).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 await mount();fireEvent.change(input(),{target:{value:'Bản đang sửa'}});generate();await screen.findByRole('button',{name:'Đưa vào bản soạn'});
 generate();expect(screen.queryByRole('button',{name:'Đưa vào bản soạn'})).toBeNull();
 expect(input()).toHaveValue('Bản đang sửa');
 await act(async()=>finish({state:'FAILED',failureCode:'AI_INVALID_RESPONSE'}));
 expect(screen.queryByRole('heading',{name:'Gợi ý cũ'})).toBeNull();expect(input()).toHaveValue('Bản đang sửa');
});

it.each(['response','http'])('explains provider payment rejection and retains the manual draft without automatically retrying (%s)',async mode=>{
 if(mode==='response')api.preview.mockResolvedValue({state:'FAILED',failureCode:'AI_PAYMENT_REQUIRED'});
 else api.preview.mockRejectedValue(Object.assign(new Error('private provider details'),{status:422,code:'AI_PAYMENT_REQUIRED'}));
 await mount();fireEvent.change(input(),{target:{value:'Bản nháp thủ công'}});generate();
 const alert=await screen.findByRole('alert');
 expect(alert).toHaveTextContent(/thanh toán.*hạn mức.*HTTP 402/i);
 expect(alert).toHaveTextContent(/tài khoản.*nhà cung cấp/i);
 expect(alert).not.toHaveTextContent(/private provider|nội dung và model/i);
 expect(input()).toHaveValue('Bản nháp thủ công');expect(screen.getByRole('button',{name:'Tạo gợi ý AI'})).toBeEnabled();
 expect(api.preview).toHaveBeenCalledTimes(1);expect(api.create).not.toHaveBeenCalled();expect(api.update).not.toHaveBeenCalled();
});

it.each(['response','http'])('distinguishes a failed AI generation from saving the editable report (%s)',async mode=>{
 if(mode==='response')api.preview.mockResolvedValue({state:'FAILED',failureCode:'AI_INVALID_RESPONSE'});
 else api.preview.mockRejectedValue(Object.assign(new Error('provider details'),{status:422,code:'AI_INVALID_RESPONSE'}));
 api.create.mockImplementation(async(projectId,body)=>({id:101,version:0,...body}));
 await mount();fireEvent.change(input(),{target:{value:'Báo cáo tôi tự viết và cần lưu.'}});generate();
 const alert=await screen.findByRole('alert');
 expect(alert).toHaveTextContent(/AI chưa trả về nội dung báo cáo hợp lệ/i);
 expect(alert).not.toHaveTextContent(/từ chối lưu|provider details/i);
 expect(input()).toHaveValue('Báo cáo tôi tự viết và cần lưu.');
 fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));
 expect(await screen.findByText('Đã lưu báo cáo.')).toBeVisible();
 expect(input()).toHaveValue('Báo cáo tôi tự viết và cần lưu.');
});
