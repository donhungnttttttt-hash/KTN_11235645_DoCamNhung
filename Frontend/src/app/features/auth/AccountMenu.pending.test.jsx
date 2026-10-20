import React from 'react';
import {act,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {AuthProvider} from './AuthProvider';
import {AccountMenu} from './AccountMenu';

const profile=()=>({id:'pm-1',username:'pm.test',displayName:'PM nội bộ',roles:['PM'],permissions:['profile:read','users:create'],sessionExpiresAt:new Date(Date.now()+1800000).toISOString()});

it('blocks delegated account creation until a pending logout fails',async()=>{
 let rejectLogout;
 const api={me:vi.fn().mockResolvedValue(profile()),logout:vi.fn(()=>new Promise((_,reject)=>{rejectLogout=reject;}))};
 const user=userEvent.setup();
 render(<AuthProvider api={api}><AccountMenu/></AuthProvider>);
 await user.click(await screen.findByRole('button',{name:'Tài khoản: PM nội bộ'}));
 await user.click(screen.getByRole('button',{name:'Đăng xuất'}));
 const create=screen.getByRole('button',{name:'Tạo tài khoản Tester'});
 expect(screen.getByRole('button',{name:'Đang đăng xuất…'})).toBeDisabled();
 expect(create).toBeDisabled();
 await user.click(create);
 expect(screen.queryByRole('dialog',{name:'Tạo tài khoản Tester'})).toBeNull();
 await act(async()=>rejectLogout(new Error('Chưa thể đăng xuất.')));
 expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể đăng xuất.');
 expect(screen.getByRole('button',{name:'Tạo tài khoản Tester'})).toBeEnabled();
 await user.click(screen.getByRole('button',{name:'Tạo tài khoản Tester'}));
 expect(screen.getByRole('dialog',{name:'Tạo tài khoản Tester'})).toBeVisible();
});
