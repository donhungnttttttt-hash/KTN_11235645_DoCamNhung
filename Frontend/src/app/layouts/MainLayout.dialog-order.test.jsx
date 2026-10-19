import React from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {MainLayout} from './MainLayout';

vi.mock('../features/projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Dự án A',projectRole:'PM'},projects:[]})}));
vi.mock('../features/auth/AuthProvider',()=>({
 useAuth:()=>({status:'authenticated',user:{id:'pm',username:'pm',displayName:'PM được cấp quyền',roles:['PM'],permissions:['users:create']},hasRole:role=>role==='PM',can:permission=>permission==='users:create'}),
 initials:()=> 'PM',roleLabels:{PM:'Quản lý dự án'},
}));

async function openHeaderDialogOverDrawer(){
 const user=userEvent.setup();
 render(<MainLayout activeRoute="/dashboard" navigate={vi.fn()}><h1>Tổng quan</h1></MainLayout>);
 await user.click(screen.getByRole('button',{name:'Mở menu dự án'}));
 expect(screen.getByRole('dialog',{name:'Menu dự án'})).toBeVisible();
 // The header remains pointer-accessible above the navigation backdrop.
 await user.click(screen.getByRole('button',{name:'Tài khoản: PM được cấp quyền'}));
 await user.click(screen.getByRole('button',{name:'Tạo tài khoản Tester'}));
 return {user,dialog:screen.getByRole('dialog',{name:'Tạo tài khoản Tester'})};
}

it('keeps keyboard focus in an account dialog opened above the navigation drawer',async()=>{
 const {user,dialog}=await openHeaderDialogOverDrawer();
 await user.tab();
 expect(dialog).toContainElement(document.activeElement);
});

it('dismisses the visible account dialog before the navigation drawer on Escape',async()=>{
 const {user}=await openHeaderDialogOverDrawer();
 await user.keyboard('{Escape}');
 expect(screen.queryByRole('dialog',{name:'Tạo tài khoản Tester'})).not.toBeInTheDocument();
});
