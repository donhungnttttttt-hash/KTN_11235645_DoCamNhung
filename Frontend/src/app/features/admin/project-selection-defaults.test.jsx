import React,{useState} from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {InitialDevicePicker} from './InitialDevicePicker';
import {MemberPicker} from '../projects/MemberPicker';
const pm=id=>({userId:id,projectRole:'PM',displayName:id,username:id});
const assets={assets:vi.fn().mockResolvedValue({items:[{id:1,assetCode:'DEVICE',model:'Tablet',version:3}],totalElements:1})};
function Devices({members,onChange}){const [value,setValue]=useState([]);return <InitialDevicePicker members={members} api={assets} value={value} onChange={v=>{setValue(v);onChange(v);}}/>;}
it('automatically assigns the only PM, updates changed PM and removes per-device forms',async()=>{
 const changed=vi.fn(),view=render(<Devices members={[pm('first'),{...pm('root'),systemRole:'ADMIN'}]} onChange={changed}/>);
 fireEvent.click(await screen.findByLabelText('DEVICE · Tablet'));
 expect(changed).toHaveBeenLastCalledWith([expect.objectContaining({recipientUserId:'first',expectedVersion:3})]);
 expect(screen.queryByLabelText('Người nhận chung')).toBeNull();expect(screen.queryByLabelText(/Ghi chú bàn giao/)).toBeNull();expect(screen.queryByLabelText(/Ngày dự kiến trả/)).toBeNull();
 view.rerender(<Devices members={[pm('second')]} onChange={changed}/>);
 await waitFor(()=>expect(changed).toHaveBeenLastCalledWith([expect.objectContaining({recipientUserId:'second'})]));
 view.rerender(<Devices members={[]} onChange={changed}/>);
 await waitFor(()=>expect(changed).toHaveBeenLastCalledWith([expect.objectContaining({recipientUserId:''})]));
});
it('requires choosing a common recipient when two PMs are eligible',async()=>{
 const changed=vi.fn();render(<Devices members={[pm('first'),pm('second')]} onChange={changed}/>);
 fireEvent.click(await screen.findByLabelText('DEVICE · Tablet'));
 expect(changed).toHaveBeenLastCalledWith([expect.objectContaining({recipientUserId:''})]);
 fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'second'}});
 expect(changed).toHaveBeenLastCalledWith([expect.objectContaining({recipientUserId:'second'})]);
});
it('excludes system admins from the candidate request, displayed choices and role filter',async()=>{
 const api={users:vi.fn().mockResolvedValue({items:[{id:'root',displayName:'Root account',role:'ADMIN'},{id:'pm',displayName:'Manager',role:'PM'}],totalElements:1})};
 render(<MemberPicker api={api} value={[]} onChange={vi.fn()}/>);await screen.findByText('Manager');
 expect(api.users).toHaveBeenCalledWith(expect.objectContaining({excludeSystemAdmins:true}),expect.anything());
 expect(screen.queryByText('Root account')).toBeNull();expect(screen.queryByRole('option',{name:'Admin tổng'})).toBeNull();expect(screen.getByText('Trang 1 / 1 · 1 người')).toBeVisible();
});
