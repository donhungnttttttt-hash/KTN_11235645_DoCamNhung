import React,{useState} from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,it,vi} from 'vitest';
import {UserCreateDialog} from './UserCreateDialog';
import {AdminProjectForm} from './AdminProjectForm';
import {DeviceAssetForm} from './DeviceAssetForm';
import {DeviceAllocationDialog} from './DeviceAllocationDialog';
import {DialogVisibilityContext} from '../auth/DialogVisibilityContext';

afterEach(()=>vi.restoreAllMocks());

const families=[
 ['account',UserCreateDialog,{},'Tên hiển thị'],
 ['project',AdminProjectForm,{api:{users:vi.fn().mockResolvedValue({items:[],totalElements:0})}},'Tên dự án'],
 ['asset',DeviceAssetForm,{},'Mã tài sản'],
 ['handover',DeviceAllocationDialog,{asset:{id:8,assetCode:'IP-08',version:2}},'Ghi chú bàn giao / thu hồi'],
];
function attemptClose(route){
 if(route==='Escape')fireEvent.keyDown(document,{key:'Escape'});
 else fireEvent.click(screen.getByRole('button',{name:route}));
}
it.each(families.flatMap(([name,Form,props,label])=>['Escape','Đóng','Hủy'].map(route=>({name,Form,props,label,route}))))('retains a dirty $name form after cancelling $route close',async({Form,props,label,route})=>{
 const close=vi.fn();
 render(<Form {...props} onCancel={close} onSaved={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText(label),{target:{value:'Nội dung chưa lưu'}});
 attemptClose(route);
 expect(close).not.toHaveBeenCalled();
 expect(screen.getByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Tiếp tục soạn'})).toHaveFocus();
 fireEvent.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));
 expect(screen.getByLabelText(label)).toHaveValue('Nội dung chưa lưu');
 attemptClose(route);fireEvent.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));
 expect(close).toHaveBeenCalledTimes(1);
});
it.each(families)('closes a pristine or exactly reverted %s form without a discard prompt',async(name,Form,props,label)=>{
 const close=vi.fn();
 render(<Form {...props} onCancel={close} onSaved={vi.fn()}/>);
 attemptClose('Hủy');expect(close).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByLabelText(label),{target:{value:'Tạm sửa'}});
 fireEvent.change(screen.getByLabelText(label),{target:{value:''}});
 attemptClose('Escape');expect(close).toHaveBeenCalledTimes(2);
 expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeNull();
});
it('guards selected project members even when text fields are unchanged',async()=>{
 const close=vi.fn();
 render(<AdminProjectForm api={{users:vi.fn().mockResolvedValue({items:[{id:3,displayName:'Manager',username:'manager',role:'PM'}],totalElements:1})}} onCancel={close} onSaved={vi.fn()}/>);
 fireEvent.click(await screen.findByLabelText('Chọn Manager'));
 attemptClose('Hủy');expect(close).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));
 expect(screen.getByLabelText('Chọn Manager')).toBeChecked();
});
it('blocks close while account creation is pending and lets success finish without discard confirmation',async()=>{
 let finish;const saved=vi.fn(),close=vi.fn();
 render(<UserCreateDialog api={{createUser:()=>new Promise(resolve=>{finish=resolve;})}} onCancel={close} onSaved={saved}/>);
 fireEvent.change(screen.getByLabelText('Tên hiển thị'),{target:{value:'Tester mới'}});
 fireEvent.change(screen.getByLabelText('Tên đăng nhập'),{target:{value:'tester.new'}});
 fireEvent.change(screen.getByLabelText('Mật khẩu'),{target:{value:'test-password-123'}});
 fireEvent.submit(screen.getByLabelText('Tên hiển thị').closest('form'));
 expect(screen.getByRole('button',{name:'Đóng'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Hủy'})).toBeDisabled();
 attemptClose('Escape');expect(close).not.toHaveBeenCalled();expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeNull();
 await act(async()=>finish({id:9}));expect(saved).toHaveBeenCalledWith('Tester mới');expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeNull();
});
it('returns focus to the opener only after explicitly discarding the dirty account form',async()=>{
 function Page(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Tạo Tester</button>{open&&<UserCreateDialog onSaved={()=>{}} onCancel={()=>setOpen(false)}/>}</>;}
 render(<Page/>);const opener=screen.getByRole('button',{name:'Tạo Tester'});opener.focus();fireEvent.click(opener);
 const field=screen.getByLabelText('Tên hiển thị');field.focus();fireEvent.change(field,{target:{value:'Nháp'}});
 attemptClose('Escape');expect(screen.getByRole('button',{name:'Tiếp tục soạn'})).toHaveFocus();
 attemptClose('Escape');expect(field).toHaveFocus();expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeNull();
 attemptClose('Escape');fireEvent.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(opener).toHaveFocus();
});
it('dismisses only the discard prompt while auth is locked and restores the retained draft on reauthentication',()=>{
 const close=vi.fn();
 function Retained({active}){return <div hidden={!active} inert={!active?'':undefined}><DialogVisibilityContext.Provider value={active}><UserCreateDialog onSaved={()=>{}} onCancel={close}/></DialogVisibilityContext.Provider></div>;}
 const view=render(<Retained active/>);
 fireEvent.change(screen.getByLabelText('Tên hiển thị'),{target:{value:'Nháp giữ qua đăng nhập'}});
 attemptClose('Escape');expect(screen.getByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeVisible();
 view.rerender(<Retained active={false}/>);attemptClose('Escape');expect(close).not.toHaveBeenCalled();
 expect(screen.queryByRole('dialog')).toBeNull();
 view.rerender(<Retained active/>);
 expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Nháp giữ qua đăng nhập');
 expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeNull();
 attemptClose('Escape');expect(screen.getByRole('button',{name:'Tiếp tục soạn'})).toHaveFocus();
});
it.each(['Tiếp tục soạn','Escape','Bỏ bản nháp'])('restores the right focus after %s when native inert blurs the parent field before confirmation mounts',async choice=>{
 const setAttribute=HTMLElement.prototype.setAttribute,focus=HTMLElement.prototype.focus;let blurredByInert=false;
 // jsdom does not implement native inert's synchronous focus eviction.
 vi.spyOn(HTMLElement.prototype,'setAttribute').mockImplementation(function(name,value){
  setAttribute.call(this,name,value);
  if(name==='inert'&&this.contains(document.activeElement)){blurredByInert=true;document.activeElement.blur();}
 });
 vi.spyOn(HTMLElement.prototype,'focus').mockImplementation(function(...args){
  if(!this.closest('[inert]'))focus.apply(this,args);
 });
 function Page(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Tạo Tester</button>{open&&<UserCreateDialog onSaved={()=>{}} onCancel={()=>setOpen(false)}/>}</>;}
 const user=userEvent.setup();render(<Page/>);
 const opener=screen.getByRole('button',{name:'Tạo Tester'});await user.click(opener);
 const field=screen.getByLabelText('Tên hiển thị');await user.type(field,'focus-draft');
 await user.keyboard('{Escape}');
 expect(blurredByInert).toBe(true);
 expect(screen.getByRole('button',{name:'Tiếp tục soạn'})).toHaveFocus();
 if(choice==='Escape')await user.keyboard('{Escape}');else await user.click(screen.getByRole('button',{name:choice}));
 expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeNull();
 if(choice==='Bỏ bản nháp'){expect(screen.queryByRole('dialog')).toBeNull();expect(opener).toHaveFocus();}
 else {expect(field).toHaveValue('focus-draft');expect(field).toHaveFocus();}
});
