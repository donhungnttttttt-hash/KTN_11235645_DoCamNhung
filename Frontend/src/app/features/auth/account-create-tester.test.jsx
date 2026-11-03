import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {AccountMenu} from './AccountMenu';
import {adminApi} from '../../services/api/admin';

let delegated;
vi.mock('./AuthProvider',()=>({initials:()=> 'PM',roleLabels:{PM:'Quản lý dự án'},useAuth:()=>({user:{id:'pm',displayName:'PM nội bộ',username:'pm',roles:['PM']},can:permission=>delegated&&permission==='users:create',logout:vi.fn()})}));
vi.mock('../../services/api/admin',()=>({adminApi:{createUser:vi.fn()}}));
beforeEach(()=>{delegated=true;vi.clearAllMocks();});
function fill(){
 fireEvent.change(screen.getByLabelText('ID đăng nhập'),{target:{value:'tester.new'}});
 fireEvent.change(screen.getByLabelText('Tên'),{target:{value:'Tester mới'}});
 fireEvent.change(screen.getByLabelText('Mật khẩu'),{target:{value:'synthetic-long-password'}});
}
async function open(){render(<AccountMenu/>);fireEvent.click(screen.getByRole('button',{name:'Tài khoản: PM nội bộ'}));fireEvent.click(screen.getByRole('button',{name:'Tạo tài khoản'}));return screen.findByRole('dialog',{name:'Tạo tài khoản'});}

it('exposes delegated creation without an Admin route or privileged role choice',async()=>{
 adminApi.createUser.mockResolvedValue({id:'new'});
 const dialog=await open();
 expect(within(dialog).queryByLabelText('Vai trò tài khoản')).toBeNull();
 fill();fireEvent.click(within(dialog).getByRole('button',{name:'Lưu tài khoản'}));
 await waitFor(()=>expect(adminApi.createUser).toHaveBeenCalledWith({username:'tester.new',displayName:'Tester mới',password:'synthetic-long-password',isProjectAdmin:false,isGuest:false}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 expect(screen.getByRole('status')).toHaveTextContent('Đã tạo User thường Tester mới.');
 expect(screen.getByRole('button',{name:'Tài khoản: PM nội bộ'})).toHaveFocus();
});
it('keeps draft and focuses an inline server error; busy creation cannot repeat',async()=>{
 let fail;adminApi.createUser.mockReturnValue(new Promise((resolve,reject)=>{fail=reject;}));
 await open();fill();fireEvent.click(screen.getByRole('button',{name:'Lưu tài khoản'}));
 expect(screen.getByRole('button',{name:'Đang tạo…'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Đang tạo…'}));expect(adminApi.createUser).toHaveBeenCalledTimes(1);
 await act(async()=>fail(new Error('ID đăng nhập đã được sử dụng.')));
 expect(screen.getByRole('alert')).toHaveFocus();expect(screen.getByLabelText('Tên')).toHaveValue('Tester mới');
});
it('hides the entry without delegation and removes a pending editor when permission is revoked',async()=>{
 delegated=false;const view=render(<AccountMenu/>);fireEvent.click(screen.getByRole('button',{name:'Tài khoản: PM nội bộ'}));
 expect(screen.queryByRole('button',{name:'Tạo tài khoản'})).toBeNull();
 delegated=true;view.rerender(<AccountMenu/>);fireEvent.click(screen.getByRole('button',{name:'Tạo tài khoản'}));await screen.findByRole('dialog');
 delegated=false;view.rerender(<AccountMenu/>);expect(screen.queryByRole('dialog')).toBeNull();expect(adminApi.createUser).not.toHaveBeenCalled();
});
