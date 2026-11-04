import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {act,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {HandbookPanel} from './HandbookPanel';
import {projectsApi} from '../../services/api/projects';
vi.mock('../../services/api/projects',()=>({projectsApi:{listHandbook:vi.fn(),getHandbook:vi.fn(),createHandbook:vi.fn(),addRevision:vi.fn()}}));
const item={id:1,name:'Hướng dẫn',currentRevision:{id:2,revisionNo:1,contentHtml:'Nội dung cũ'}};
async function editDraft(){
 render(<HandbookPanel projectId={1} canEdit/>);
 fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn · v1'}));
 fireEvent.click(await screen.findByRole('button',{name:'Thêm phiên bản'}));
 fireEvent.change(screen.getByLabelText('Nội dung'),{target:{value:'Nháp của B'}});
}
beforeEach(()=>{vi.resetAllMocks();projectsApi.listHandbook.mockResolvedValue([item]);projectsApi.getHandbook.mockResolvedValue({...item,history:[]});});
it('twoEditorsPreserveWinningRevisionAndLosingDraft until deliberate reload and explicit save',async()=>{
 const winning={...item,currentRevision:{id:3,revisionNo:2,contentHtml:'<script>winning text</script>'},history:[]};
 projectsApi.addRevision.mockRejectedValueOnce(Object.assign(new Error('Dữ liệu đã thay đổi. Tải lại để đối chiếu trước khi lưu.'),{status:409})).mockResolvedValueOnce({});
 await editDraft();fireEvent.click(screen.getByRole('button',{name:'Lưu tài liệu'}));
 await screen.findByRole('alert');expect(screen.getByLabelText('Nội dung')).toHaveValue('Nháp của B');
 expect(projectsApi.getHandbook).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Lưu tài liệu'})).toBeDisabled();
 projectsApi.getHandbook.mockResolvedValueOnce(winning);
 fireEvent.click(screen.getByRole('button',{name:'Tải phiên bản hiện tại để đối chiếu'}));
 expect(await screen.findByText('Phiên bản hiện tại: 2')).toBeVisible();
 expect(screen.getByText(winning.currentRevision.contentHtml)).toBeVisible();expect(document.querySelector('script')).toBeNull();
 expect(screen.getByLabelText('Nội dung')).toHaveValue('Nháp của B');expect(projectsApi.addRevision).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Lưu tài liệu'}));
 await screen.findByText('Đã lưu tài liệu.');
 expect(projectsApi.addRevision.mock.calls.map(call=>call[2])).toEqual([
  {contentHtml:'Nháp của B',visibility:'INTERNAL',expectedCurrentRevisionId:2},
  {contentHtml:'Nháp của B',visibility:'INTERNAL',expectedCurrentRevisionId:3}
 ]);
});
it.each([403,404,500])('retains draft and stale-write protection after explicit reload HTTP %s fails',async status=>{
 projectsApi.addRevision.mockRejectedValue(Object.assign(new Error('Conflict'),{status:409}));
 await editDraft();fireEvent.click(screen.getByRole('button',{name:'Lưu tài liệu'}));await screen.findByText('Conflict');
 projectsApi.getHandbook.mockRejectedValueOnce(Object.assign(new Error('Không đọc được phiên bản hiện tại'),{status}));
 fireEvent.click(screen.getByRole('button',{name:'Tải phiên bản hiện tại để đối chiếu'}));
 await screen.findByText('Không đọc được phiên bản hiện tại');
 expect(screen.getByLabelText('Nội dung')).toHaveValue('Nháp của B');expect(screen.getByRole('button',{name:'Lưu tài liệu'})).toBeDisabled();
 expect(projectsApi.addRevision).toHaveBeenCalledTimes(1);
});
it('retains draft and prevents appending when an explicit reload discovers an archived document',async()=>{
 await editDraft();projectsApi.getHandbook.mockResolvedValueOnce({...item,archived:true,history:[]});
 fireEvent.click(screen.getByRole('button',{name:'Tải phiên bản hiện tại để đối chiếu'}));
 await screen.findByText('Tài liệu đã lưu trữ. Bản nháp được giữ để tham khảo.');
 expect(screen.getByLabelText('Nội dung')).toHaveValue('Nháp của B');expect(screen.getByRole('button',{name:'Lưu tài liệu'})).toBeDisabled();
 expect(projectsApi.addRevision).not.toHaveBeenCalled();
});
it('retains draft during a deliberate read and never submits when the read finishes',async()=>{
 let finish;await editDraft();projectsApi.getHandbook.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 fireEvent.click(screen.getByRole('button',{name:'Tải phiên bản hiện tại để đối chiếu'}));
 expect(screen.getByRole('button',{name:'Lưu tài liệu'})).toBeDisabled();
 await act(async()=>finish({...item,currentRevision:{id:4,revisionNo:3,contentHtml:'Other text'},history:[]}));
 expect(screen.getByLabelText('Nội dung')).toHaveValue('Nháp của B');expect(projectsApi.addRevision).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Lưu tài liệu'})).toBeEnabled();
});
it('preserves an open draft when edit permission disappears and prevents explicit submit',async()=>{
 const view=render(<HandbookPanel projectId={1} canEdit/>);
 fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn · v1'}));fireEvent.click(await screen.findByRole('button',{name:'Thêm phiên bản'}));
 fireEvent.change(screen.getByLabelText('Nội dung'),{target:{value:'Draft after revoke'}});
 view.rerender(<HandbookPanel projectId={1} canEdit={false}/>);
 expect(screen.getByLabelText('Nội dung')).toHaveValue('Draft after revoke');expect(screen.getByRole('button',{name:'Lưu tài liệu'})).toBeDisabled();
 fireEvent.submit(screen.getByLabelText('Nội dung').closest('form'));expect(projectsApi.addRevision).not.toHaveBeenCalled();
});
it('keeps text and keyboard focus after HTTP 403 rejects an open editor save',async()=>{
 projectsApi.addRevision.mockRejectedValue(Object.assign(new Error('Bạn không còn quyền sửa'),{status:403}));await editDraft();
 const save=screen.getByRole('button',{name:'Lưu tài liệu'});save.focus();fireEvent.click(save);
 await screen.findByText('Bạn không còn quyền sửa');expect(screen.getByLabelText('Nội dung')).toHaveValue('Nháp của B');
 expect(save).toHaveFocus();expect(screen.queryByText('Đã lưu tài liệu.')).toBeNull();
});
it('moves keyboard focus to revision text and restores its new trigger after cancelling',async()=>{
 render(<HandbookPanel projectId={1} canEdit/>);
 fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn · v1'}));fireEvent.click(await screen.findByRole('button',{name:'Thêm phiên bản'}));
 expect(screen.getByLabelText('Nội dung')).toHaveFocus();fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Thêm phiên bản'})).toHaveFocus());
});
it('returns focus to Add after cancelling a new handbook document',async()=>{
 render(<HandbookPanel projectId={1} canEdit/>);await screen.findByRole('button',{name:'Hướng dẫn · v1'});
 const add=screen.getByRole('button',{name:'Thêm tài liệu'});fireEvent.click(add);expect(screen.getByLabelText('Mã tài liệu')).toHaveFocus();
 const cancel=screen.getByRole('button',{name:'Hủy'});cancel.focus();fireEvent.click(cancel);
 await waitFor(()=>expect(add).toHaveFocus());expect(add).toBeEnabled();
});
it.each(['new','revision'])('waits for the %s save and reload before returning focus to enabled Add',async mode=>{
 let save,reload;projectsApi[mode==='new'?'createHandbook':'addRevision'].mockReturnValue(new Promise(resolve=>{save=resolve;}));
 projectsApi.listHandbook.mockResolvedValueOnce([item]).mockReturnValueOnce(new Promise(resolve=>{reload=resolve;}));
 render(<HandbookPanel projectId={1} canEdit/>);await screen.findByRole('button',{name:'Hướng dẫn · v1'});
 if(mode==='new'){fireEvent.click(screen.getByRole('button',{name:'Thêm tài liệu'}));fireEvent.change(screen.getByLabelText('Mã tài liệu'),{target:{value:'NEW'}});fireEvent.change(screen.getByLabelText('Tên tài liệu'),{target:{value:'Tài liệu mới'}});}
 else{fireEvent.click(screen.getByRole('button',{name:'Hướng dẫn · v1'}));fireEvent.click(await screen.findByRole('button',{name:'Thêm phiên bản'}));}
 fireEvent.change(screen.getByLabelText('Nội dung'),{target:{value:'Nội dung đã sửa'}});const submit=screen.getByRole('button',{name:'Lưu tài liệu'});submit.focus();fireEvent.click(submit);
 expect(submit).toBeDisabled();await act(async()=>save({}));
 expect(screen.getByRole('button',{name:'Thêm tài liệu'})).not.toHaveFocus();await act(async()=>reload([item]));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Thêm tài liệu'})).toHaveFocus());expect(screen.getByRole('button',{name:'Thêm tài liệu'})).toBeEnabled();
});
it.each(['save','reload'])('does not take focus moved during handbook %s or an unrelated project read',async phase=>{
 let finish,reload;projectsApi.createHandbook.mockReturnValue(new Promise(resolve=>{finish=resolve;}));projectsApi.listHandbook.mockResolvedValueOnce([item]).mockReturnValueOnce(new Promise(resolve=>{reload=resolve;}));
 const view=render(<><input aria-label="Công việc khác"/><HandbookPanel projectId={1} canEdit/></>);await screen.findByRole('button',{name:'Hướng dẫn · v1'});
 fireEvent.click(screen.getByRole('button',{name:'Thêm tài liệu'}));fireEvent.change(screen.getByLabelText('Mã tài liệu'),{target:{value:'NEW'}});fireEvent.change(screen.getByLabelText('Tên tài liệu'),{target:{value:'Tài liệu mới'}});fireEvent.change(screen.getByLabelText('Nội dung'),{target:{value:'Nội dung'}});
 const submit=screen.getByRole('button',{name:'Lưu tài liệu'});submit.focus();fireEvent.click(submit);
 const other=screen.getByLabelText('Công việc khác');if(phase==='save')other.focus();await act(async()=>finish({}));await screen.findByText('Đã lưu tài liệu.');
 if(phase==='reload')other.focus();await act(async()=>reload([item]));expect(other).toHaveFocus();
 view.rerender(<><input aria-label="Công việc khác"/><HandbookPanel projectId={2} canEdit/></>);await screen.findByRole('button',{name:'Hướng dẫn · v1'});expect(other).toHaveFocus();
});
it('falls back to Add rather than another document revision button when selection changes',async()=>{
 const second={...item,id:3,name:'Tài liệu khác'};projectsApi.listHandbook.mockResolvedValue([item,second]);projectsApi.getHandbook.mockImplementation(async(project,id)=>({...((id===3)?second:item),history:[]}));
 render(<HandbookPanel projectId={1} canEdit/>);fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn · v1'}));fireEvent.click(await screen.findByRole('button',{name:'Thêm phiên bản'}));
 fireEvent.click(screen.getByRole('button',{name:'Tài liệu khác · v1'}));await screen.findByRole('heading',{name:'Tài liệu khác'});
 const cancel=screen.getByRole('button',{name:'Hủy'});cancel.focus();fireEvent.click(cancel);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Thêm tài liệu'})).toHaveFocus());expect(screen.getByRole('button',{name:'Thêm phiên bản'})).not.toHaveFocus();
});
