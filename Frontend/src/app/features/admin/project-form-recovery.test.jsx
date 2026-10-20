import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {ApiError} from '../../services/api/client';
import {AdminProjectForm} from './AdminProjectForm';

const project={id:5,code:'AA',name:'Alpha',description:'Mô tả',timezone:'Asia/Ho_Chi_Minh',version:2};
const reloadName='Tải version hiện hành, giữ bản nháp';

it('keeps local required-field validation separate from version-conflict recovery',async()=>{
 const api={updateProject:vi.fn()},user=userEvent.setup();
 render(<AdminProjectForm project={project} api={api} onSaved={vi.fn()}/>);
 await user.clear(screen.getByLabelText('Tên dự án'));
 await user.click(screen.getByRole('button',{name:'Lưu dự án'}));
 expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra các trường bắt buộc');
 expect(screen.queryByRole('button',{name:reloadName})).toBeNull();
 expect(api.updateProject).not.toHaveBeenCalled();
});

it.each([{status:422,code:'INVALID_TIMEZONE'},{status:403,code:'FORBIDDEN'},{status:0,code:'NETWORK_ERROR'},{status:409,code:'ARCHIVED'}])('does not offer version recovery for $code',async failure=>{
 const api={updateProject:vi.fn().mockRejectedValue(new ApiError('Không thể lưu dự án.',failure))};
 render(<AdminProjectForm project={project} api={api} onSaved={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Lưu dự án'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu dự án.');
 expect(screen.queryByRole('button',{name:reloadName})).toBeNull();
});

it('retries failed conflict reads and focuses a success status without replacing or automatically saving the draft',async()=>{
 const saved=vi.fn(),api={
  updateProject:vi.fn().mockRejectedValueOnce(new ApiError('Phiên bản đã thay đổi.',{status:409,code:'VERSION_CONFLICT'})).mockResolvedValue({...project,version:7}),
  project:vi.fn().mockRejectedValueOnce(new Error('Chưa đọc được phiên bản.')).mockResolvedValue({...project,name:'Tên mới trên server',version:6}),
 };
 render(<AdminProjectForm project={project} api={api} onSaved={saved}/>);
 fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Tên đang soạn'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu dự án'}));
 await screen.findByText('Phiên bản đã thay đổi.');
 fireEvent.click(screen.getByRole('button',{name:reloadName}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Chưa đọc được phiên bản.');
 expect(screen.getByRole('button',{name:reloadName})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:reloadName}));
 const status=await screen.findByText(/Đã tải version hiện hành/);
 expect(status).toHaveAttribute('role','status');
 expect(status).toHaveFocus();
 expect(screen.queryByRole('alert')).toBeNull();
 expect(screen.queryByRole('button',{name:reloadName})).toBeNull();
 expect(screen.getByLabelText('Tên dự án')).toHaveValue('Tên đang soạn');
 expect(api.updateProject).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Lưu dự án'}));
 await waitFor(()=>expect(saved).toHaveBeenCalled());
 expect(api.updateProject).toHaveBeenLastCalledWith(5,{name:'Tên đang soạn',description:'Mô tả',timezone:'Asia/Ho_Chi_Minh',expectedVersion:6});
});
