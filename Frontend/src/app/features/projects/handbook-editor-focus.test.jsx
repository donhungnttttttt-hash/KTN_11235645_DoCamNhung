import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {act,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {HandbookPanel} from './HandbookPanel';
import {projectsApi} from '../../services/api/projects';
vi.mock('../../services/api/projects',()=>({projectsApi:{listHandbook:vi.fn(),getHandbook:vi.fn(),createHandbook:vi.fn(),addRevision:vi.fn()}}));
const item={id:1,name:'Hướng dẫn',currentRevision:{id:2,revisionNo:1,contentHtml:'Nội dung cũ'}};
beforeEach(()=>{vi.resetAllMocks();projectsApi.listHandbook.mockResolvedValue([item]);projectsApi.getHandbook.mockResolvedValue({...item,history:[]});});
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
