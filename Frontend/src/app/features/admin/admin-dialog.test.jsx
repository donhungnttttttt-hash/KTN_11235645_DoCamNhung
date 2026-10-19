import React from 'react';
import {render, screen, within, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vitest';
import {AdminProjects} from './AdminProjects';
import {MemberPicker} from './AdminProjectForm';
import {InitialDevicePicker} from './InitialDevicePicker';

test('creating a project opens a named modal, keeps background scrolling locked and restores focus', async()=>{
 const user=userEvent.setup();
 const api={projects:vi.fn().mockResolvedValue({items:[],totalElements:0}),users:vi.fn().mockResolvedValue({items:[],totalElements:0})};
 render(<AdminProjects api={api}/>);
 const trigger=screen.getByRole('button',{name:'Tạo dự án mới'});
 await user.click(trigger);
 const dialog=screen.getByRole('dialog',{name:'Tạo dự án'});
 expect(dialog).toHaveAttribute('aria-modal','true');
 expect(within(dialog).getByLabelText('Mã dự án')).toBeInTheDocument();
 expect(document.body.style.overflow).toBe('hidden');
 await user.keyboard('{Escape}');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(trigger).toHaveFocus();
 expect(document.body.style.overflow).not.toBe('hidden');
});

test('bulk member selection preserves other pages and sends the role filter to the server',async()=>{
 const user=userEvent.setup();
 const api={users:vi.fn(async({page})=>({items:page?[{id:'dev',displayName:'Developer',role:'DEV'}]:[{id:'pm',displayName:'Manager',role:'PM'}],totalElements:21}))};
 function Picker(){const [value,setValue]=React.useState([]);return <MemberPicker value={value} onChange={setValue} api={api}/>;}
 render(<Picker/>);
 await screen.findByLabelText('Chọn Manager');
 await user.click(screen.getByLabelText('Chọn tất cả đang hiển thị · Thành viên'));
 await user.click(screen.getByRole('button',{name:'Người sau'}));
 await screen.findByLabelText('Chọn Developer');
 await user.click(screen.getByLabelText('Chọn tất cả đang hiển thị · Thành viên'));
 expect(screen.getByText('Đã chọn 2 người · 1 PM')).toBeInTheDocument();
 await user.click(screen.getByLabelText('Chọn tất cả đang hiển thị · Thành viên'));
 expect(screen.getByText('Đã chọn 1 người · 1 PM')).toBeInTheDocument();
 await user.selectOptions(screen.getByLabelText('Lọc vai trò tài khoản'),'PM');
 await screen.findByLabelText('Chọn Manager');
 expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({role:'PM',page:0}),expect.anything());
 expect(screen.getByLabelText('Chọn Manager')).toBeChecked();
});

test('bulk device selection retains handover drafts when display filters change',async()=>{
 const user=userEvent.setup();
 const api={assets:vi.fn().mockResolvedValue({items:[{id:1,assetCode:'IPAD-01',model:'iPad',version:3}],totalElements:1})};
 function Picker(){const [value,setValue]=React.useState([]);return <InitialDevicePicker value={value} onChange={setValue} api={api} members={[{userId:'tester',projectRole:'PM',displayName:'Tester',username:'tester'}]}/>;}
 render(<Picker/>);
 await screen.findByLabelText('IPAD-01 · iPad');
 await user.click(screen.getByLabelText('Chọn tất cả đang hiển thị · Máy sẵn sàng'));
 await user.selectOptions(screen.getByLabelText('Người nhận chung'),'tester');
 await user.type(screen.getByLabelText('Ghi chú bàn giao IPAD-01'),'Kiểm thử iPad');
 await user.selectOptions(screen.getByLabelText('Hiển thị · Máy sẵn sàng'),'unselected');
 expect(screen.queryByLabelText('IPAD-01 · iPad')).not.toBeInTheDocument();
 await user.selectOptions(screen.getByLabelText('Hiển thị · Máy sẵn sàng'),'');
 expect(screen.getByLabelText('IPAD-01 · iPad')).toBeChecked();
 expect(screen.getByLabelText('Ghi chú bàn giao IPAD-01')).toHaveValue('Kiểm thử iPad');
});

test('device controls stay together and prevent repeated paging or reload while refreshing',async()=>{
 const user=userEvent.setup();let finish;
 const page={items:[{id:1,assetCode:'IPAD-01',model:'iPad',version:3}],totalElements:21};
 const api={assets:vi.fn().mockResolvedValueOnce(page).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}))};
 render(<InitialDevicePicker value={[]} onChange={vi.fn()} api={api} members={[]}/>);
 await screen.findByLabelText('IPAD-01 · iPad');
 const controls=screen.getByRole('group',{name:'Điều khiển danh sách máy'});
 expect(within(controls).getByText('Trang 1 / 2')).toBeVisible();
 const refresh=within(controls).getByRole('button',{name:'Tải lại máy sẵn sàng'});
 const next=within(controls).getByRole('button',{name:'Máy sau'});
 await user.click(refresh);expect(refresh).toBeDisabled();expect(next).toBeDisabled();
 finish(page);await waitFor(()=>expect(refresh).toBeEnabled());expect(next).toBeEnabled();
});
