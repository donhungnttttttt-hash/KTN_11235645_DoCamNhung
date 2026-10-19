import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {ProjectNotes} from './ProjectNotes';

const note={id:7,projectId:1,title:'Lịch trao đổi',body:'<img src=x onerror=alert(1)>',version:3,updatedAt:'2026-10-19T04:00:00Z'};
let api;
beforeEach(()=>{api={list:vi.fn().mockResolvedValue({items:[note],page:0,size:20,totalItems:1,totalPages:1}),create:vi.fn(),update:vi.fn(),remove:vi.fn()};});
const mount=(props={})=>render(<ProjectNotes projectId={1} canEdit api={api} {...props}/>);
it('lets members read literal content without write controls',async()=>{
 const view=mount({canEdit:false});await screen.findByRole('heading',{name:'Lịch trao đổi'});
 expect(screen.getByText(note.body)).toBeVisible();expect(view.container.querySelector('img')).toBeNull();
 expect(screen.queryByRole('button',{name:'Thêm Note'})).toBeNull();expect(screen.queryByRole('button',{name:/Sửa Note/})).toBeNull();
});
it('creates a Note after server confirmation and refreshes the list',async()=>{
 let finish;api.create.mockReturnValue(new Promise(resolve=>{finish=resolve;}));mount();await screen.findByText(note.body);
 fireEvent.click(screen.getByRole('button',{name:'Thêm Note'}));fireEvent.change(screen.getByLabelText('Tiêu đề Note'),{target:{value:'Họp tuần'}});fireEvent.change(screen.getByLabelText('Nội dung Note'),{target:{value:'Trao đổi kết quả'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));
 expect(screen.getByRole('button',{name:'Đang lưu…'})).toBeDisabled();expect(screen.queryByText('Đã lưu Note.')).toBeNull();
 await act(async()=>finish({...note,id:8,title:'Họp tuần',body:'Trao đổi kết quả',version:0}));await screen.findByText('Đã lưu Note.');
 expect(api.create).toHaveBeenCalledWith(1,{title:'Họp tuần',body:'Trao đổi kết quả'},expect.anything());expect(api.list).toHaveBeenCalledTimes(2);
});
it('keeps edited text and displayed version on conflict',async()=>{
 api.update.mockRejectedValue(new Error('Dữ liệu đã thay đổi.'));mount();fireEvent.click(await screen.findByRole('button',{name:'Sửa Note Lịch trao đổi'}));
 fireEvent.change(screen.getByLabelText('Nội dung Note'),{target:{value:'Nháp còn giữ'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));
 await screen.findByRole('alert');expect(screen.getByLabelText('Nội dung Note')).toHaveValue('Nháp còn giữ');
 expect(api.update).toHaveBeenCalledWith(1,7,{title:note.title,body:'Nháp còn giữ',expectedVersion:3},expect.anything());
 expect(screen.queryByText('Đã lưu Note.')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Hủy chỉnh sửa'}));expect(screen.queryByLabelText('Nội dung Note')).toBeNull();
});
it('uses the refreshed saved version for the next edit',async()=>{
 api.update.mockResolvedValue({...note,title:'Đã sửa',version:4});api.list.mockResolvedValueOnce({items:[note],page:0,size:20,totalItems:1,totalPages:1}).mockResolvedValue({items:[{...note,title:'Đã sửa',version:4}],page:0,size:20,totalItems:1,totalPages:1});
 mount();fireEvent.click(await screen.findByRole('button',{name:'Sửa Note Lịch trao đổi'}));fireEvent.change(screen.getByLabelText('Tiêu đề Note'),{target:{value:'Đã sửa'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));
 await screen.findByText('Đã lưu Note.');fireEvent.click(await screen.findByRole('button',{name:'Sửa Note Đã sửa'}));fireEvent.change(screen.getByLabelText('Nội dung Note'),{target:{value:'Lần tiếp'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));
 await waitFor(()=>expect(api.update).toHaveBeenLastCalledWith(1,7,{title:'Đã sửa',body:'Lần tiếp',expectedVersion:4},expect.anything()));
});
it('confirms deletion and preserves content when the server rejects it',async()=>{
 api.remove.mockRejectedValue(new Error('Phiên bản đã thay đổi'));mount();fireEvent.click(await screen.findByRole('button',{name:'Xóa Note Lịch trao đổi'}));
 expect(api.remove).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Giữ Note'}));expect(api.remove).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Xóa Note Lịch trao đổi'}));fireEvent.click(screen.getByRole('button',{name:'Xác nhận xóa Note'}));
 await screen.findByRole('alert');expect(screen.getByText(note.body)).toBeVisible();expect(api.remove).toHaveBeenCalledWith(1,7,3,expect.anything());
});
it('removes only after success and recovers an empty final page',async()=>{
 api.list.mockResolvedValueOnce({items:[note],page:0,size:20,totalItems:21,totalPages:2}).mockResolvedValueOnce({items:[note],page:1,size:20,totalItems:21,totalPages:2}).mockResolvedValueOnce({items:[],page:1,size:20,totalItems:20,totalPages:1}).mockResolvedValue({items:[{...note,title:'Trang trước'}],page:0,size:20,totalItems:20,totalPages:1});
 api.remove.mockResolvedValue(null);mount();fireEvent.click(await screen.findByRole('button',{name:'Trang Note sau'}));await waitFor(()=>expect(api.list).toHaveBeenCalledTimes(2));
 fireEvent.click(await screen.findByRole('button',{name:'Xóa Note Lịch trao đổi'}));fireEvent.click(screen.getByRole('button',{name:'Xác nhận xóa Note'}));
 await screen.findByText('Đã xóa Note.');await screen.findByRole('heading',{name:'Trang trước'});
});
it('retries list failures and explains an empty list',async()=>{
 api.list.mockRejectedValueOnce(new Error('Không tải được Note')).mockResolvedValue({items:[],page:0,size:20,totalItems:0,totalPages:0});mount();
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Tải lại Note'}));await screen.findByText('Chưa có Note trong dự án.');
});
it('ignores old project reads and pending saves after switching project',async()=>{
 let read,save;api.list.mockReturnValueOnce(new Promise(resolve=>{read=resolve;})).mockResolvedValue({items:[],page:0,size:20,totalItems:0,totalPages:0});
 const view=mount();view.rerender(<ProjectNotes projectId={2} canEdit api={api}/>);await screen.findByText('Chưa có Note trong dự án.');
 await act(async()=>read({items:[note],page:0,size:20,totalItems:1,totalPages:1}));expect(screen.queryByText(note.body)).toBeNull();
 api.create.mockReturnValue(new Promise(resolve=>{save=resolve;}));fireEvent.click(screen.getByRole('button',{name:'Thêm Note'}));fireEvent.change(screen.getByLabelText('Tiêu đề Note'),{target:{value:'B'}});fireEvent.change(screen.getByLabelText('Nội dung Note'),{target:{value:'Nháp B'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));
 view.rerender(<ProjectNotes projectId={3} canEdit api={api}/>);await screen.findByText('Chưa có Note trong dự án.');await act(async()=>save(note));expect(screen.queryByText('Đã lưu Note.')).toBeNull();expect(screen.queryByLabelText('Nội dung Note')).toBeNull();
});
it('hides editors immediately when write capability is lost',async()=>{
 const view=mount();fireEvent.click(await screen.findByRole('button',{name:'Sửa Note Lịch trao đổi'}));view.rerender(<ProjectNotes projectId={1} canEdit={false} api={api}/>);
 expect(screen.queryByLabelText('Nội dung Note')).toBeNull();expect(screen.queryByRole('button',{name:'Lưu Note'})).toBeNull();
});
it('compares the current Note before explicitly rebasing a retained conflict draft',async()=>{
 api.update.mockRejectedValueOnce(Object.assign(new Error('Note đã thay đổi.'),{status:409})).mockResolvedValue({});
 api.get=vi.fn().mockResolvedValue({...note,title:'Tiêu đề mới từ server',body:'Nội dung của người khác',version:4});
 mount();fireEvent.click(await screen.findByRole('button',{name:'Sửa Note Lịch trao đổi'}));
 fireEvent.change(screen.getByLabelText('Nội dung Note'),{target:{value:'Nháp riêng cần giữ'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));
 await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Lưu Note'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Đối chiếu bản mới của Note'}));
 await screen.findByText('Nội dung của người khác');expect(screen.getByLabelText('Nội dung Note')).toHaveValue('Nháp riêng cần giữ');
 expect(screen.getByRole('button',{name:'Lưu Note'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Đã đối chiếu, giữ nháp để lưu lại'}));fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));
 await waitFor(()=>expect(api.update).toHaveBeenLastCalledWith(1,7,{title:note.title,body:'Nháp riêng cần giữ',expectedVersion:4},expect.anything()));
});
it('retains a conflict draft when current Note loading fails and allows comparing again',async()=>{
 api.update.mockRejectedValue(Object.assign(new Error('Phiên bản đã thay đổi'),{status:409}));
 api.get=vi.fn().mockRejectedValueOnce(new Error('Không tải được bản mới')).mockResolvedValue({...note,body:'Bản mới nhất',version:5});
 mount();fireEvent.click(await screen.findByRole('button',{name:'Sửa Note Lịch trao đổi'}));
 fireEvent.change(screen.getByLabelText('Nội dung Note'),{target:{value:'Giữ nháp này'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Note'}));await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Đối chiếu bản mới của Note'}));await screen.findByText('Không tải được bản mới');
 expect(screen.getByLabelText('Nội dung Note')).toHaveValue('Giữ nháp này');expect(screen.getByRole('button',{name:'Lưu Note'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Đối chiếu bản mới của Note'}));await screen.findByText('Bản mới nhất');
});
