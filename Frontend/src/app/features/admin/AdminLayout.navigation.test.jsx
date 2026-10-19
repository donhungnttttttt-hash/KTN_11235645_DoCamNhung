import React,{useState} from 'react';
import {act,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AdminLayout} from './AdminLayout';
import {AdminFormDialog} from './AdminFormDialog';

vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({user:{displayName:'Admin hệ thống'},logout:vi.fn()})}));
let compact=false,listeners;
const media={get matches(){return compact;},addEventListener:(_type,listener)=>listeners.add(listener),removeEventListener:(_type,listener)=>listeners.delete(listener)};
function resize(value){act(()=>{compact=value;listeners.forEach(listener=>listener({matches:value}));});}
beforeEach(()=>{compact=false;listeners=new Set();vi.stubGlobal('matchMedia',vi.fn(()=>media));window.history.replaceState(null,'','#/admin');});
afterEach(()=>vi.unstubAllGlobals());
const mount=(props={})=>render(<AdminLayout path="/admin" navigate={vi.fn()} {...props}><h1>Tổng quan hệ thống</h1><label>Bộ lọc thử<input/></label></AdminLayout>);

it('collapses and expands desktop navigation while keeping every destination named and active',async()=>{
 const user=userEvent.setup();mount();
 await user.click(screen.getByRole('button',{name:'Thu gọn menu quản trị'}));
 expect(screen.getByRole('button',{name:'Mở rộng menu quản trị'})).toHaveAttribute('aria-expanded','false');
 const nav=screen.getByRole('navigation',{name:'Quản trị'});
 expect(within(nav).getAllByRole('link')).toHaveLength(6);
 expect(within(nav).getByRole('link',{name:'Tổng quan'})).toHaveAttribute('aria-current','page');
 await user.click(screen.getByRole('button',{name:'Mở rộng menu quản trị'}));
 expect(screen.getByRole('button',{name:'Thu gọn menu quản trị'})).toHaveAttribute('aria-expanded','true');
});

it('opens a named mobile drawer, keeps all six destinations and traps focus until Escape restores the opener',async()=>{
 compact=true;const user=userEvent.setup();mount();
 expect(screen.queryByRole('navigation',{name:'Quản trị'})).toBeNull();
 const opener=screen.getByRole('button',{name:'Mở menu quản trị'});await user.click(opener);
 const drawer=screen.getByRole('dialog',{name:'Menu quản trị'});
 expect(within(drawer).getAllByRole('link')).toHaveLength(6);
 expect(within(drawer).getAllByRole('link').filter(link=>link.getAttribute('aria-current')==='page')).toHaveLength(1);
 expect(within(drawer).getByRole('button',{name:'Đóng menu quản trị'})).toHaveFocus();
 expect(screen.getByRole('main',{hidden:true})).toHaveAttribute('inert');
 expect(opener.closest('header')).toHaveAttribute('inert');
 await user.tab({shift:true});expect(within(drawer).getByRole('link',{name:'Không gian dự án'})).toHaveFocus();
 await user.tab();expect(within(drawer).getByRole('button',{name:'Đóng menu quản trị'})).toHaveFocus();
 await user.keyboard('{Escape}');
 expect(screen.queryByRole('dialog')).toBeNull();expect(opener).toHaveFocus();
 expect(screen.getByRole('main')).not.toHaveAttribute('inert');
});

it.each(['backdrop','link'])('closes mobile navigation using %s without leaving the background inert',async action=>{
 compact=true;const user=userEvent.setup();mount();
 const opener=screen.getByRole('button',{name:'Mở menu quản trị'});await user.click(opener);
 if(action==='backdrop')await user.click(screen.getByRole('button',{name:'Đóng nền menu quản trị'}));
 else await user.click(within(screen.getByRole('dialog',{name:'Menu quản trị'})).getByRole('link',{name:'Người dùng'}));
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('main')).not.toHaveAttribute('inert');expect(opener).toHaveFocus();
 if(action==='link')expect(window.location.hash).toBe('#/admin/users');
});

it('leaves mobile modal mode after resizing to desktop and restores a usable desktop control',async()=>{
 compact=true;const user=userEvent.setup();mount();await user.click(screen.getByRole('button',{name:'Mở menu quản trị'}));
 resize(false);
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('navigation',{name:'Quản trị'})).toBeVisible();
 expect(screen.getByRole('main')).not.toHaveAttribute('inert');expect(screen.getByRole('button',{name:'Thu gọn menu quản trị'})).toHaveFocus();
});

it('resets and focuses main on path navigation while preserving query or project-filter focus and scrolling',async()=>{
 const user=userEvent.setup();const view=mount();const main=screen.getByRole('main');
 await user.click(screen.getByLabelText('Bộ lọc thử'));main.scrollTop=180;
 view.rerender(<AdminLayout path="/admin" projectId="2" navigate={vi.fn()}><h1>Tổng quan hệ thống</h1><label>Bộ lọc thử<input/></label></AdminLayout>);
 expect(screen.getByLabelText('Bộ lọc thử')).toHaveFocus();expect(main.scrollTop).toBe(180);
 view.rerender(<AdminLayout path="/admin/users" navigate={vi.fn()}><h1>Người dùng</h1></AdminLayout>);
 expect(main.scrollTop).toBe(0);expect(main).toHaveFocus();
});

it('keeps an editor dialog usable and returns focus within the independently scrolling main',async()=>{
 function Page(){const [editing,setEditing]=useState(false);return <AdminLayout path="/admin" navigate={vi.fn()}><button onClick={()=>setEditing(true)}>Mở editor</button>{editing&&<AdminFormDialog title="Sửa thông tin" onClose={()=>setEditing(false)}><label>Nội dung đang sửa<input/></label><button onClick={()=>setEditing(false)}>Hủy editor</button></AdminFormDialog>}</AdminLayout>;}
 const user=userEvent.setup();render(<Page/>);const opener=screen.getByRole('button',{name:'Mở editor'});await user.click(opener);
 await user.type(screen.getByLabelText('Nội dung đang sửa'),'Nháp');
 await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).toBeNull();expect(opener).toHaveFocus();
});
