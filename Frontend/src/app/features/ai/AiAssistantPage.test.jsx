import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
import {AiWorkspace} from './AiAssistantPage';
import {AiEditBuffer} from './AiEditBuffer';

const purposes=[{code:'TESTER_WORK_REPORT',label:'Tổng hợp công việc của tôi',target:'NONE'},{code:'TESTER_BUG_DRAFT',label:'Hoàn thiện mô tả bug',target:'TICKET'}];
const draft={id:4,projectId:1,purpose:'TESTER_WORK_REPORT',state:'READY',version:0,createdAt:'2026-10-10T00:00:00Z',expiresAt:'2026-10-17T00:00:00Z',content:{answer:{title:'Báo cáo của tôi',summary:'Đã thực hiện 3 lượt test.',observations:[{text:'Có một lỗi cần kiểm tra.',sourceRefs:['my-work']}],suggestedActions:[],missingInformation:['Chưa có bằng chứng video.']},sources:[{ref:'my-work',label:'Công việc của tôi',path:'/dashboard/actions',version:null}]}};
let api;
beforeEach(()=>{api={metadata:vi.fn().mockResolvedValue({enabled:true,role:'TESTER',retentionDays:7,purposes}),list:vi.fn().mockResolvedValue([]),targets:vi.fn().mockResolvedValue({items:[],hasMore:false}),generate:vi.fn().mockResolvedValue(draft),get:vi.fn().mockResolvedValue(draft),edit:vi.fn().mockResolvedValue({...draft,editedText:'Đã đối chiếu',version:1})};});
it('requires a project and does not call APIs without one',()=>{
 render(<AiWorkspace projectId={null} api={api}/>);expect(screen.getByText(/Chọn một dự án/)).toBeInTheDocument();expect(api.metadata).not.toHaveBeenCalled();
});
it('shows only server-granted tasks, generates persisted content and saves a separate edit',async()=>{
 render(<AiWorkspace projectId={1} api={api}/>);
 const generate=await screen.findByRole('button',{name:'Phân tích'});
 expect(screen.queryByRole('option',{name:'Rà soát dự án'})).toBeNull();
 fireEvent.click(generate);await screen.findByRole('heading',{name:'Báo cáo của tôi'});
 expect(api.generate.mock.calls[0][1]).toMatchObject({purpose:'TESTER_WORK_REPORT',targetId:null,requestKey:expect.any(String)});
 expect(screen.getByRole('link',{name:'Công việc của tôi'})).toHaveAttribute('href','#/dashboard/actions');
 fireEvent.change(screen.getByLabelText('Nội dung để sử dụng'),{target:{value:'Đã đối chiếu'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu chỉnh sửa'}));
 await waitFor(()=>expect(api.edit).toHaveBeenCalledWith(1,4,{text:'Đã đối chiếu',expectedVersion:0},expect.anything()));
 expect(await screen.findByText('Đã lưu chỉnh sửa.')).toBeInTheDocument();
});
it('retains the request key after a timeout and never starts a duplicate paid request on retry',async()=>{
 api.generate.mockRejectedValueOnce(Object.assign(new Error('Chậm'),{code:'TIMEOUT'}));
 render(<AiWorkspace projectId={1} api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Phân tích'}));
 fireEvent.click(await screen.findByRole('button',{name:'Kiểm tra lại yêu cầu'}));
 await screen.findByRole('heading',{name:'Báo cáo của tôi'});
 expect(api.generate).toHaveBeenCalledTimes(2);expect(api.generate.mock.calls[0][1]).toEqual(api.generate.mock.calls[1][1]);
});
it('requires an allowed target and explains an empty target list',async()=>{
 render(<AiWorkspace projectId={1} api={api}/>);await screen.findByRole('button',{name:'Phân tích'});
 fireEvent.change(screen.getByLabelText('Tác vụ AI'),{target:{value:'TESTER_BUG_DRAFT'}});
 await screen.findByText(/Chưa có file hoặc ticket phù hợp/);
 expect(screen.getByRole('button',{name:'Phân tích'})).toBeDisabled();
});
it('keeps saved drafts readable when generation is disabled and reads details from the server',async()=>{
 api.metadata.mockResolvedValue({enabled:false,role:'TESTER',retentionDays:7,purposes});api.list.mockResolvedValue([draft]);
 render(<AiWorkspace projectId={1} api={api}/>);
 expect(await screen.findByText(/AI chưa được bật/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Mở bản nháp.*Báo cáo của tôi/}));
 await screen.findByRole('heading',{name:'Báo cáo của tôi'});expect(api.get).toHaveBeenCalledWith(1,4,expect.anything());
 expect(screen.getByRole('button',{name:'Phân tích'})).toBeDisabled();
});
it('shows provider quota failure without invented generated content',async()=>{
 api.generate.mockResolvedValue({...draft,state:'FAILED',content:null,failureCode:'AI_QUOTA_EXHAUSTED'});
 render(<AiWorkspace projectId={1} api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Phân tích'}));
 expect(await screen.findByText(/hết số dư API/)).toBeInTheDocument();expect(screen.queryByLabelText('Nội dung để sử dụng')).toBeNull();
});
it('retains edited text on a save conflict',async()=>{
 api.edit.mockRejectedValue(Object.assign(new Error('Bản nháp đã thay đổi'),{status:409,code:'VERSION_CONFLICT'}));
 render(<AiWorkspace projectId={1} api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Phân tích'}));
 fireEvent.change(await screen.findByLabelText('Nội dung để sử dụng'),{target:{value:'Chưa được mất'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu chỉnh sửa'}));await screen.findByText(/Bản nháp đã thay đổi/);
 expect(screen.getByLabelText('Nội dung để sử dụng')).toHaveValue('Chưa được mất');
});
it('aborts old project work and does not display a late response',async()=>{
 let finish;api.generate.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const view=render(<AiWorkspace projectId={1} api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Phân tích'}));
 const signal=api.generate.mock.calls[0][2].signal;
 view.rerender(<AiWorkspace projectId={2} api={api}/>);await waitFor(()=>expect(api.metadata).toHaveBeenCalledWith(2,expect.anything()));
 expect(signal.aborted).toBe(true);await act(async()=>finish(draft));
 expect(screen.queryByRole('heading',{name:'Báo cáo của tôi'})).toBeNull();
});
it('preserves unsaved edits when opening another draft and switching project scope',async()=>{
 const second={...draft,id:5,content:{...draft.content,answer:{...draft.content.answer,title:'Bản thứ hai'}}};
 api.list.mockResolvedValue([draft,second]);api.get.mockImplementation(async(_p,id)=>id===4?draft:second);
 const view=render(<AiWorkspace projectId={1} api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Mở bản nháp Báo cáo của tôi'}));
 fireEvent.change(await screen.findByLabelText('Nội dung để sử dụng'),{target:{value:'Nội dung chưa lưu cần giữ'}});
 fireEvent.click(screen.getByRole('button',{name:'Mở bản nháp Bản thứ hai'}));await screen.findByRole('heading',{name:'Bản thứ hai'});
 fireEvent.click(screen.getByRole('button',{name:'Mở bản nháp Báo cáo của tôi'}));
 await waitFor(()=>expect(screen.getByLabelText('Nội dung để sử dụng')).toHaveValue('Nội dung chưa lưu cần giữ'));
 view.rerender(<AiWorkspace projectId={2} api={api}/>);await screen.findByRole('button',{name:'Phân tích'});
 view.rerender(<AiWorkspace projectId={1} api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Mở bản nháp Báo cáo của tôi'}));
 await waitFor(()=>expect(screen.getByLabelText('Nội dung để sử dụng')).toHaveValue('Nội dung chưa lưu cần giữ'));
});
it('keeps edits across page navigation but clears them for a different signed-in account',async()=>{
 api.list.mockResolvedValue([draft]);
 const shell=(owner,visible)=><AiEditBuffer key={owner}>{visible?<AiWorkspace projectId={1} api={api}/>:<p>Trang khác</p>}</AiEditBuffer>;
 const view=render(shell('tester-a',true));
 fireEvent.click(await screen.findByRole('button',{name:'Mở bản nháp Báo cáo của tôi'}));
 fireEvent.change(await screen.findByLabelText('Nội dung để sử dụng'),{target:{value:'Giữ khi đổi menu'}});
 view.rerender(shell('tester-a',false));view.rerender(shell('tester-a',true));
 fireEvent.click(await screen.findByRole('button',{name:'Mở bản nháp Báo cáo của tôi'}));
 await waitFor(()=>expect(screen.getByLabelText('Nội dung để sử dụng')).toHaveValue('Giữ khi đổi menu'));
 view.rerender(shell('tester-b',true));
 fireEvent.click(await screen.findByRole('button',{name:'Mở bản nháp Báo cáo của tôi'}));
 await waitFor(()=>expect(screen.getByLabelText('Nội dung để sử dụng')).not.toHaveValue('Giữ khi đổi menu'));
});
