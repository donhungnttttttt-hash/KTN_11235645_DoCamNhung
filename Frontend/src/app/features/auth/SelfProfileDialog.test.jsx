import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,it,expect,vi} from 'vitest';
import {SelfProfileDialog} from './SelfProfileDialog';

const profile={id:'u1',username:'syp_user005',displayName:'Nguyễn An',role:'USER',email:'',phone:'',jobTitle:'',department:'',hasAvatar:false,version:0,accountVersion:2,createdAt:'2026-11-01T00:00:00Z'};
function setup(overrides={}){const api={get:vi.fn().mockResolvedValue(profile),update:vi.fn().mockImplementation(async data=>({...profile,...data,version:1})),upload:vi.fn().mockResolvedValue({...profile,hasAvatar:true,version:1}),removeAvatar:vi.fn().mockResolvedValue({...profile,version:2}),...overrides};const onSaved=vi.fn(),onCancel=vi.fn();render(<SelfProfileDialog api={api} onSaved={onSaved} onCancel={onCancel}/>);return {api,onSaved,onCancel,user:userEvent.setup()};}
describe('Self profile',()=>{
 it('edits own contact data, exposes ID/type as read-only and reports saved state',async()=>{
  const {api,user,onSaved}=setup();await screen.findByDisplayValue('Nguyễn An');expect(screen.getByLabelText('ID đăng nhập')).toHaveAttribute('readOnly');expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Tên'));await user.type(screen.getByLabelText('Tên'),'Tên mới');await user.type(screen.getByLabelText('Email'),'an@example.test');await user.click(screen.getByRole('button',{name:'Lưu thông tin'}));
  await screen.findByText('Đã lưu thông tin cá nhân.');expect(api.update).toHaveBeenCalledWith(expect.objectContaining({displayName:'Tên mới',email:'an@example.test',expectedVersion:0,expectedAccountVersion:2}));expect(onSaved).toHaveBeenCalled();
 });
 it('keeps draft on save failure and warns on closing dirty form',async()=>{
  const {user,api,onCancel}=setup({update:vi.fn().mockRejectedValue(new Error('Kết nối bị gián đoạn'))});await screen.findByDisplayValue('Nguyễn An');await user.type(screen.getByLabelText('Phòng ban'),'QA');await user.click(screen.getByRole('button',{name:'Lưu thông tin'}));await screen.findByText('Kết nối bị gián đoạn');expect(screen.getByLabelText('Phòng ban')).toHaveValue('QA');expect(api.update).toHaveBeenCalledTimes(1);await user.click(screen.getAllByRole('button',{name:'Đóng',exact:true})[0]);await screen.findByRole('dialog',{name:'Bỏ nội dung chưa lưu?'});expect(onCancel).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));expect(screen.getByLabelText('Phòng ban')).toHaveValue('QA');
 });
 it('avatar upload preserves text draft and uses new version for the following save',async()=>{
  const {user,api}=setup();await screen.findByDisplayValue('Nguyễn An');await user.type(screen.getByLabelText('Chức danh'),'Tester');const file=new File(['image'],'avatar.png',{type:'image/png'});await user.upload(screen.getByLabelText('Chọn ảnh đại diện'),file);await screen.findByText('Đã cập nhật ảnh đại diện.');expect(screen.getByLabelText('Chức danh')).toHaveValue('Tester');await user.click(screen.getByRole('button',{name:'Lưu thông tin'}));await waitFor(()=>expect(api.update).toHaveBeenCalledWith(expect.objectContaining({jobTitle:'Tester',expectedVersion:1})));
 });
 it('shows load retry and does not submit a conflicting stale draft again',async()=>{
  const get=vi.fn().mockRejectedValueOnce(new Error('Chưa tải được')).mockResolvedValue(profile),update=vi.fn().mockRejectedValue(Object.assign(new Error('Hồ sơ đã thay đổi'),{status:409}));const {user}=setup({get,update});await screen.findByText('Chưa tải được');await user.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByDisplayValue('Nguyễn An');await user.type(screen.getByLabelText('Phòng ban'),'QA');await user.click(screen.getByRole('button',{name:'Lưu thông tin'}));await screen.findByText('Hồ sơ đã thay đổi');expect(screen.getByRole('button',{name:'Lưu thông tin'})).toBeDisabled();expect(screen.getByLabelText('Phòng ban')).toHaveValue('QA');
 });
});
