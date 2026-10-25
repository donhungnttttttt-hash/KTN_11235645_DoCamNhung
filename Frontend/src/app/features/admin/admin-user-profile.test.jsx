import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {AdminUsers} from './AdminUsers';

const auth=vi.hoisted(()=>({user:{id:'admin',username:'admin.local'},retry:vi.fn(),accountUpdated:vi.fn()}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>auth}));
const account={id:'tester',username:'tester.one',displayName:'Tester One',role:'TESTER',enabled:true,version:3,createdAt:'2026-10-25T00:00:00Z',memberships:[]};
function setup(row=account){
 const api={projects:vi.fn().mockResolvedValue({items:[],totalElements:0}),users:vi.fn().mockResolvedValue({items:[row],totalElements:1}),updateUser:vi.fn().mockResolvedValue({...row,version:4}),resetUserPassword:vi.fn().mockResolvedValue({...row,version:4})};
 render(<AdminUsers api={api}/>);return api;
}
async function edit(name='Tester One'){fireEvent.click(await screen.findByRole('button',{name:`Sửa thông tin ${name}`}));return screen.getByRole('dialog',{name:'Sửa thông tin tài khoản'});}
async function reset(name='Tester One'){fireEvent.click(await screen.findByRole('button',{name:`Đặt lại mật khẩu ${name}`}));return screen.getByRole('dialog',{name:'Đặt lại mật khẩu'});}
function change(label,value){fireEvent.change(screen.getByLabelText(label),{target:{value}});}
beforeEach(()=>{auth.retry.mockReset();auth.accountUpdated.mockReset();});

it('edits only changed profile fields with the current version and leaves roles read-only',async()=>{
 const api=setup();const dialog=await edit();
 expect(within(dialog).getByLabelText('Tên đăng nhập')).toHaveValue('tester.one');
 expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
 expect(within(dialog).getByText(/TESTER/)).toBeVisible();
 expect(within(dialog).getByRole('button',{name:'Lưu thông tin'})).toBeDisabled();
 change('Tên hiển thị','  Tester Updated  ');
 api.users.mockResolvedValue({items:[{...account,displayName:'Tester Updated',version:4}],totalElements:1});
 fireEvent.click(screen.getByRole('button',{name:'Lưu thông tin'}));
 await waitFor(()=>expect(api.updateUser).toHaveBeenCalledWith('tester',{displayName:'Tester Updated',expectedVersion:3}));
 expect(await screen.findByRole('status')).toHaveTextContent('Đã cập nhật thông tin');
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(auth.retry).not.toHaveBeenCalled();expect(auth.accountUpdated).not.toHaveBeenCalled();
});

it('normalizes a changed username and preserves the draft on duplicate errors',async()=>{
 const api=setup();api.updateUser.mockRejectedValueOnce(Object.assign(new Error('Tên đăng nhập đã được sử dụng.'),{status:409,code:'USERNAME_EXISTS'}));
 await edit();change('Tên đăng nhập','Tester.NEW');
 fireEvent.click(screen.getByRole('button',{name:'Lưu thông tin'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Tên đăng nhập đã được sử dụng');
 expect(screen.getByRole('alert')).toHaveFocus();expect(screen.getByLabelText('Tên đăng nhập')).toHaveValue('Tester.NEW');
 expect(screen.getByRole('button',{name:'Lưu thông tin'})).toBeEnabled();
 expect(api.updateUser).toHaveBeenCalledWith('tester',{username:'tester.new',expectedVersion:3});
});

it('blocks invalid and unchanged normalized names without issuing an update',async()=>{
 const api=setup();await edit();change('Tên đăng nhập','TESTER.ONE');change('Tên hiển thị',' Tester One ');
 expect(screen.getByRole('button',{name:'Lưu thông tin'})).toBeDisabled();
 change('Tên hiển thị','   ');fireEvent.submit(screen.getByRole('button',{name:'Lưu thông tin'}).closest('form'));
 expect(await screen.findByRole('alert')).toHaveTextContent('Tên hiển thị');expect(api.updateUser).not.toHaveBeenCalled();
 change('Tên hiển thị','Name');change('Tên đăng nhập','bad name');fireEvent.submit(screen.getByRole('button',{name:'Lưu thông tin'}).closest('form'));
 expect(screen.getByRole('alert')).toHaveTextContent('Tên đăng nhập');expect(api.updateUser).not.toHaveBeenCalled();
});

it('keeps stale drafts but requires closing and reloading before another save',async()=>{
 const api=setup();api.updateUser.mockRejectedValue(Object.assign(new Error('Phiên bản đã thay đổi.'),{status:409,code:'VERSION_CONFLICT'}));
 await edit();change('Tên hiển thị','Draft');fireEvent.click(screen.getByRole('button',{name:'Lưu thông tin'}));
 await screen.findByRole('alert');expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Draft');
 expect(screen.getByRole('button',{name:'Lưu thông tin'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Đóng và tải lại'}));
 expect(screen.getByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(api.users).toHaveBeenCalledTimes(2);expect(api.updateUser).toHaveBeenCalledTimes(1);
});

it('checks password confirmation and length, and sends the exact password only to reset',async()=>{
 const api=setup();await reset();
 expect(screen.getByLabelText('Mật khẩu mới')).toHaveAttribute('type','password');
 expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveAttribute('autocomplete','new-password');
 change('Mật khẩu mới','short');change('Nhập lại mật khẩu mới','short');
 fireEvent.submit(screen.getByRole('button',{name:'Lưu mật khẩu mới'}).closest('form'));
 expect(await screen.findByRole('alert')).toHaveTextContent('12–128');expect(api.resetUserPassword).not.toHaveBeenCalled();
 change('Mật khẩu mới','  long test secret  ');change('Nhập lại mật khẩu mới','different test secret');
 fireEvent.click(screen.getByRole('button',{name:'Lưu mật khẩu mới'}));
 expect(screen.getByRole('alert')).toHaveTextContent('không khớp');expect(api.resetUserPassword).not.toHaveBeenCalled();
 change('Nhập lại mật khẩu mới','  long test secret  ');fireEvent.click(screen.getByRole('button',{name:'Lưu mật khẩu mới'}));
 await waitFor(()=>expect(api.resetUserPassword).toHaveBeenCalledWith('tester',{newPassword:'  long test secret  ',expectedVersion:3}));
 await waitFor(()=>expect(screen.queryByLabelText('Mật khẩu mới')).not.toBeInTheDocument());
 expect(api.updateUser).not.toHaveBeenCalled();expect(screen.getByRole('status')).toHaveTextContent('Đã đặt lại mật khẩu');
});

it('prevents duplicate reset submissions and closing while the write is pending',async()=>{
 let finish;const api=setup();api.resetUserPassword.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 await reset();change('Mật khẩu mới','example-long-password');change('Nhập lại mật khẩu mới','example-long-password');
 const form=screen.getByRole('button',{name:'Lưu mật khẩu mới'}).closest('form');fireEvent.submit(form);fireEvent.submit(form);
 await waitFor(()=>expect(api.resetUserPassword).toHaveBeenCalledTimes(1));
 expect(screen.getByRole('button',{name:'Đang lưu…'})).toBeDisabled();expect(screen.getByRole('button',{name:'Đóng'})).toBeDisabled();
 await act(async()=>finish({...account,version:4}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('clears passwords after a failed write and when discarding and reopening a reset form',async()=>{
 const api=setup();api.resetUserPassword.mockRejectedValue(new Error('Mất kết nối.'));
 await reset();change('Mật khẩu mới','example-long-password');change('Nhập lại mật khẩu mới','example-long-password');fireEvent.click(screen.getByRole('button',{name:'Lưu mật khẩu mới'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');expect(screen.getByRole('alert')).toHaveFocus();
 expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveValue('');
 change('Mật khẩu mới','unsubmitted-password');fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
 fireEvent.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));await reset();expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');
});

it.each(['profile','password'])('reports a successful self %s update before refreshing the revoked session',async mode=>{
 const own={...account,id:'admin',username:'admin.local',displayName:'Admin Local',role:'ADMIN'},api=setup(own);
 if(mode==='profile'){await edit('Admin Local');change('Tên đăng nhập','admin.renamed');api.updateUser.mockResolvedValue({...own,username:'admin.renamed',version:4});}
 else {await reset('Admin Local');change('Mật khẩu mới','example-long-password');change('Nhập lại mật khẩu mới','example-long-password');}
 expect(screen.getByText(/Bạn sẽ cần đăng nhập lại/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:mode==='profile'?'Lưu thông tin':'Lưu mật khẩu mới'}));
 await waitFor(()=>expect(auth.retry).toHaveBeenCalledTimes(1));
 expect(auth.accountUpdated).toHaveBeenCalledWith(expect.objectContaining({id:'admin'}),expect.stringContaining('Đã'));
 expect(auth.accountUpdated.mock.invocationCallOrder[0]).toBeLessThan(auth.retry.mock.invocationCallOrder[0]);
 expect(api.users).toHaveBeenCalledTimes(1);
});

it('prevents duplicate profile submissions and keeps dirty fields when cancelling discard',async()=>{
 let finish;const api=setup();await edit();change('Tên hiển thị','Draft Name');
 fireEvent.click(screen.getByRole('button',{name:'Hủy'}));fireEvent.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));
 expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Draft Name');
 api.updateUser.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const form=screen.getByRole('button',{name:'Lưu thông tin'}).closest('form');fireEvent.submit(form);fireEvent.submit(form);
 expect(api.updateUser).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Đóng'})).toBeDisabled();
 await act(async()=>finish({...account,displayName:'Draft Name',version:4}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('requires account reload after a stale reset and does not retain the attempted password',async()=>{
 const api=setup();api.resetUserPassword.mockRejectedValue(Object.assign(new Error('Phiên bản đã thay đổi.'),{status:409,code:'VERSION_CONFLICT'}));
 await reset();change('Mật khẩu mới','example-long-password');change('Nhập lại mật khẩu mới','example-long-password');
 fireEvent.click(screen.getByRole('button',{name:'Lưu mật khẩu mới'}));await screen.findByRole('alert');
 expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');expect(screen.getByRole('button',{name:'Lưu mật khẩu mới'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Đóng và tải lại'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(api.users).toHaveBeenCalledTimes(2);
});
