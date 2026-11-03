import React from 'react';
import {render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {test,expect,vi} from 'vitest';
import {UserCreateDialog} from './UserCreateDialog';

async function fill(user){
 await user.type(screen.getByLabelText('ID đăng nhập'),'syp_user005');
 await user.type(screen.getByLabelText('Tên'),'Người kiểm thử');
 await user.type(screen.getByLabelText('Mật khẩu'),'Fixture-only-2026!');
}
test('defaults to ordinary user and sends flags without role',async()=>{
 const user=userEvent.setup(),api={createUser:vi.fn().mockResolvedValue({})},saved=vi.fn();
 render(<UserCreateDialog api={api} onSaved={saved} onCancel={vi.fn()}/>);await fill(user);
 expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Lưu tài khoản'}));
 await waitFor(()=>expect(saved).toHaveBeenCalled());
 expect(api.createUser).toHaveBeenCalledWith({username:'syp_user005',displayName:'Người kiểm thử',password:'Fixture-only-2026!',isProjectAdmin:false,isGuest:false});
});
test('both flags show popup, preserve draft, and allow correcting then saving',async()=>{
 const user=userEvent.setup(),api={createUser:vi.fn().mockResolvedValue({})};
 render(<UserCreateDialog api={api} onSaved={vi.fn()} onCancel={vi.fn()}/>);await fill(user);
 await user.click(screen.getByRole('checkbox',{name:'Admin'}));await user.click(screen.getByRole('checkbox',{name:'Khách'}));
 await user.click(screen.getByRole('button',{name:'Lưu tài khoản'}));
 const warning=screen.getByRole('dialog',{name:'Không thể chọn đồng thời Admin và Khách'});
 expect(api.createUser).not.toHaveBeenCalled();await user.click(within(warning).getByRole('button',{name:'Chọn lại'}));
 expect(screen.getByLabelText('ID đăng nhập')).toHaveValue('syp_user005');
 await user.click(screen.getByRole('checkbox',{name:'Admin'}));await user.click(screen.getByRole('button',{name:'Lưu tài khoản'}));
 await waitFor(()=>expect(api.createUser).toHaveBeenCalledWith(expect.objectContaining({isProjectAdmin:false,isGuest:true})));
});
test('delegated project administrator sees no privileged flags',async()=>{
 const user=userEvent.setup(),api={createUser:vi.fn().mockResolvedValue({})};
 render(<UserCreateDialog ordinaryOnly api={api} onSaved={vi.fn()} onCancel={vi.fn()}/>);await fill(user);
 expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Lưu tài khoản'}));
 await waitFor(()=>expect(api.createUser).toHaveBeenCalledWith(expect.objectContaining({isProjectAdmin:false,isGuest:false})));
});
