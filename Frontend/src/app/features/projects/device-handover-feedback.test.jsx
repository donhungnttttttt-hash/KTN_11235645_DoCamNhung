import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {ProjectDeviceAssignDialog} from './ProjectDeviceAssignDialog';

const assets=Array.from({length:20},(_,i)=>({id:i+1,assetCode:`IP-${i+1}`,model:'iPad',version:0}));
const members=[{userId:'tester',username:'tester',displayName:'Tester A',active:true,enabled:true}];
function fixture(assignDevice=vi.fn().mockResolvedValue({})){
 const api={members:vi.fn().mockResolvedValue(members),assets:vi.fn().mockResolvedValue({items:assets,totalElements:20}),assignDevice};
 const changed=vi.fn(),close=vi.fn();
 render(<ProjectDeviceAssignDialog projectId={2} api={api} onChanged={changed} onClose={close}/>);
 return {api,changed,close};
}
async function selectAll(){fireEvent.click(await screen.findByLabelText('Chọn tất cả đang hiển thị · Máy sẵn sàng'));}

it('explains missing recipients and directs the user to the required field instead of a silent disabled handover',async()=>{
 const {api}=fixture();await screen.findByText('IP-1 · iPad');await selectAll();
 const submit=screen.getByRole('button',{name:'Bàn giao máy đã chọn'});
 expect(submit).toBeEnabled();fireEvent.click(submit);
 expect(await screen.findByRole('alert')).toHaveTextContent('20 máy chưa có người nhận');
 expect(api.assignDevice).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Điền người nhận còn thiếu'}));
 expect(screen.getByLabelText('Người nhận IP-1')).toHaveFocus();
});

it('hands over twenty selected assets after explicitly applying one recipient, with immediate progress',async()=>{
 let finish;const assign=vi.fn().mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValue({});
 const {changed,close}=fixture(assign);await screen.findByText('IP-1 · iPad');await selectAll();
 fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'tester'}});
 fireEvent.click(screen.getByRole('button',{name:'Áp dụng cho 20 máy đã chọn'}));
 expect(screen.getByLabelText('Người nhận IP-20')).toHaveValue('tester');
 fireEvent.click(screen.getByRole('button',{name:'Bàn giao máy đã chọn'}));
 expect(screen.getByRole('button',{name:'Đang bàn giao…'})).toBeDisabled();
 expect(screen.getByRole('status')).toHaveTextContent('Đang bàn giao');
 await act(async()=>{finish({});});await waitFor(()=>expect(close).toHaveBeenCalledTimes(1));
 expect(assign).toHaveBeenCalledTimes(20);expect(changed).toHaveBeenCalledWith(20);
 expect(assign).toHaveBeenLastCalledWith(expect.objectContaining({assetId:20,recipientUserId:'tester',projectId:2}));
});

it('validates the complete batch before writing any assets when a later recipient is missing',async()=>{
 const {api}=fixture();fireEvent.click(await screen.findByLabelText('IP-1 · iPad'));fireEvent.click(screen.getByLabelText('IP-2 · iPad'));
 fireEvent.change(screen.getByLabelText('Người nhận IP-1'),{target:{value:'tester'}});
 fireEvent.submit(screen.getByRole('button',{name:'Bàn giao máy đã chọn'}).closest('form'));
 expect(await screen.findByRole('alert')).toHaveTextContent('1 máy chưa có người nhận');
 expect(api.assignDevice).not.toHaveBeenCalled();
});
