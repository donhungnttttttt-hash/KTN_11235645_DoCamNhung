import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {AdminProjects} from './AdminProjects';
import {AdminFormDialog} from './AdminFormDialog';
import {ProjectDeviceAssignDialog} from '../projects/ProjectDeviceAssignDialog';
import {useDialogFocus} from '../../hooks/useDialogFocus';
const page=items=>({items,totalElements:items.length});
it('does not redirect away from a user-selected route when project creation completes after leaving the page',async()=>{
 let finish;const api={projects:vi.fn().mockResolvedValue(page([])),users:vi.fn().mockResolvedValue(page([{id:'pm',displayName:'Manager',username:'pm',role:'PM'}])),createProject:vi.fn().mockReturnValue(new Promise(resolve=>{finish=resolve;}))};
 const view=render(<AdminProjects api={api}/>);fireEvent.click(screen.getByText('Tạo dự án mới'));fireEvent.change(screen.getByLabelText('Mã dự án'),{target:{value:'AA'}});fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Alpha'}});fireEvent.click(await screen.findByLabelText('Chọn Manager'));fireEvent.click(screen.getByRole('button',{name:'Tạo dự án'}));await waitFor(()=>expect(api.createProject).toHaveBeenCalledTimes(1));
 view.unmount();window.location.hash='/admin/users';await act(async()=>finish({id:99}));expect(window.location.hash).toBe('#/admin/users');
});
it('does not offer a successfully handed-over asset again after a later asset fails',async()=>{
 const assets=[1,2,3].map(id=>({id,assetCode:`IP-${id}`,model:'iPad',version:0}));let firstSaved=false;
 const api={members:vi.fn().mockResolvedValue([{userId:'tester',displayName:'Tester',username:'tester',active:true,enabled:true}]),assets:vi.fn(()=>Promise.resolve(page(firstSaved?assets.slice(1):assets))),assignDevice:vi.fn(async input=>{if(input.assetId===1){firstSaved=true;return {};}throw Error('Conflict');})};
 render(<ProjectDeviceAssignDialog projectId={2} api={api} onChanged={vi.fn()} onClose={vi.fn()}/>);fireEvent.click(await screen.findByLabelText('IP-1 · iPad'));fireEvent.click(screen.getByLabelText('IP-2 · iPad'));fireEvent.click(screen.getByLabelText('IP-3 · iPad'));fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'tester'}});fireEvent.click(screen.getByText('Áp dụng cho 3 máy đã chọn'));fireEvent.change(screen.getByLabelText('Ghi chú bàn giao IP-3'),{target:{value:'Giữ bản nháp chưa gửi'}});fireEvent.click(screen.getByText('Bàn giao máy đã chọn'));await screen.findByText('IP-2: Conflict');
 await waitFor(()=>expect(api.assets).toHaveBeenCalledTimes(2));await waitFor(()=>expect(screen.queryByLabelText('IP-1 · iPad')).not.toBeInTheDocument());expect(screen.getByLabelText('Người nhận IP-2')).toHaveValue('tester');expect(screen.getByLabelText('Người nhận IP-3')).toHaveValue('tester');expect(screen.getByLabelText('Ghi chú bàn giao IP-3')).toHaveValue('Giữ bản nháp chưa gửi');expect(api.assignDevice).toHaveBeenCalledTimes(2);
 api.assignDevice.mockResolvedValue({});fireEvent.click(screen.getByText('Bàn giao máy đã chọn'));await waitFor(()=>expect(api.assignDevice).toHaveBeenCalledTimes(4));expect(api.assignDevice.mock.calls.map(([input])=>input.assetId)).toEqual([1,2,2,3]);expect(api.assignDevice).toHaveBeenLastCalledWith(expect.objectContaining({assetId:3,handoverNote:'Giữ bản nháp chưa gửi'}));
});
it('keeps Shift+Tab inside a form dialog when its initial focus is the heading',async()=>{
 const user=userEvent.setup();render(<><button>Nền trang</button><AdminFormDialog title="Hộp kiểm tra" onClose={vi.fn()}><button>Lưu</button></AdminFormDialog></>);expect(screen.getByRole('heading',{name:'Hộp kiểm tra'})).toHaveFocus();await user.tab({shift:true});expect(screen.getByText('Lưu')).toHaveFocus();
});
function AlertDialog(){const ref=useDialogFocus(()=>{});return <><button>Nền trang</button><section role="dialog" ref={ref} tabIndex={-1}><p role="alert" tabIndex={-1}>Đầu thông báo</p><button>Đầu</button><p role="alert" tabIndex={-1}>Giữa thông báo</p><button>Cuối</button><p role="alert" tabIndex={-1}>Cuối thông báo</p></section><button>Sau hộp</button></>;}
it('wraps reverse Tab from a focused alert before the first control and forward Tab after the last control',async()=>{
 const user=userEvent.setup();render(<AlertDialog/>);screen.getByText('Đầu thông báo').focus();await user.tab({shift:true});expect(screen.getByText('Cuối')).toHaveFocus();screen.getByText('Cuối thông báo').focus();await user.tab();expect(screen.getByText('Đầu')).toHaveFocus();
});
it('preserves natural traversal from a focused alert between sequential controls',async()=>{
 const user=userEvent.setup();render(<AlertDialog/>);screen.getByText('Giữa thông báo').focus();await user.tab({shift:true});expect(screen.getByText('Đầu')).toHaveFocus();screen.getByText('Giữa thông báo').focus();await user.tab();expect(screen.getByText('Cuối')).toHaveFocus();
});
