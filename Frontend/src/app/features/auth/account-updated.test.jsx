import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {AuthProvider,useAuth} from './AuthProvider';
import {AuthBoundary} from './AuthBoundary';
import {ApiError} from '../../services/api/client';

const profile={id:'admin',username:'old.admin',displayName:'Old Admin',roles:['ADMIN'],permissions:['users:update'],sessionExpiresAt:new Date(Date.now()+1800000).toISOString()};
function UpdatedAccount(){
 const {accountUpdated,retry,user,logout}=useAuth();
 return <><p>{user.displayName}</p><button onClick={()=>{accountUpdated({id:'admin',username:'new.admin',displayName:'New Admin'},'Đã cập nhật tài khoản. Đăng nhập lại để tiếp tục.');void retry();}}>Saved</button><button onClick={logout}>Logout</button></>;
}
it('retains self-save success and the new username during reauthentication and clears notice after login',async()=>{
 const api={me:vi.fn().mockResolvedValueOnce(profile).mockRejectedValue(new ApiError('Hết phiên',{status:401})),login:vi.fn().mockResolvedValue({...profile,username:'new.admin',displayName:'New Admin'}),logout:vi.fn().mockResolvedValue(null)};
 render(<AuthProvider api={api}><AuthBoundary><UpdatedAccount/></AuthBoundary></AuthProvider>);
 fireEvent.click(await screen.findByRole('button',{name:'Saved'}));
 expect(await screen.findByRole('status')).toHaveTextContent('Đã cập nhật tài khoản');
 expect(screen.getByRole('heading',{name:'Đăng nhập lại'})).toBeVisible();
 expect(screen.getByLabelText('Tên đăng nhập')).toHaveValue('new.admin');
 fireEvent.change(screen.getByLabelText('Mật khẩu'),{target:{value:'new-synthetic-password'}});
 fireEvent.submit(screen.getByRole('form',{name:'Đăng nhập'}));
 await waitFor(()=>expect(screen.queryByRole('form',{name:'Đăng nhập'})).not.toBeInTheDocument());
 expect(screen.queryByText('Đã cập nhật tài khoản. Đăng nhập lại để tiếp tục.')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Logout'}));await screen.findByRole('heading',{name:'Chào mừng trở lại'});
 expect(screen.queryByText('Đã cập nhật tài khoản. Đăng nhập lại để tiếp tục.')).not.toBeInTheDocument();
 expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
});

it('keeps successful mutation separate from a later session verification network failure',async()=>{
 const api={me:vi.fn().mockResolvedValueOnce(profile).mockRejectedValue(new ApiError('Network'))};
 render(<AuthProvider api={api}><AuthBoundary><UpdatedAccount/></AuthBoundary></AuthProvider>);
 fireEvent.click(await screen.findByRole('button',{name:'Saved'}));
 expect(await screen.findByRole('heading',{name:'Chưa thể kết nối'})).toBeVisible();
 expect(screen.getByRole('status')).toHaveTextContent('Đã cập nhật tài khoản');
 expect(screen.getByRole('alert')).toHaveTextContent('Không thể xác nhận phiên đăng nhập');
});

it('updates the login username if another request expired the session before the save completed',async()=>{
 let auth;
 function Probe(){auth=useAuth();return <p>Profile loaded</p>;}
 const api={me:vi.fn().mockResolvedValueOnce(profile).mockRejectedValue(new ApiError('Hết phiên',{status:401}))};
 render(<AuthProvider api={api}><AuthBoundary><Probe/></AuthBoundary></AuthProvider>);
 await screen.findByText('Profile loaded');await act(async()=>auth.retry());
 expect(screen.getByLabelText('Tên đăng nhập')).toHaveValue('old.admin');
 act(()=>auth.accountUpdated({id:'admin',username:'new.admin',displayName:'New Admin'},'Đã cập nhật tài khoản.'));
 expect(screen.getByLabelText('Tên đăng nhập')).toHaveValue('new.admin');
});
