import React,{useState} from 'react';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {InitialDevicePicker} from './InitialDevicePicker';

it('hands all selected machines to one active project PM and never offers member allocation',async()=>{
 const changed=vi.fn();
 const members=[{userId:'pm',projectRole:'PM',displayName:'PM dự án',username:'pm'},{userId:'tester',projectRole:'TESTER',displayName:'Tester',username:'tester'},{userId:'disabled',projectRole:'PM',displayName:'Đã khóa',enabled:false},{userId:'inactive',projectRole:'PM',displayName:'Đã gỡ',active:false}];
 const api={assets:vi.fn().mockResolvedValue({items:[{id:8,assetCode:'IP-08',model:'iPad',version:2},{id:9,assetCode:'IP-09',model:'iPad',version:4}],totalElements:2})};
 function Fixture(){const [value,setValue]=useState([]);return <InitialDevicePicker api={api} members={members} value={value} onChange={v=>{setValue(v);changed(v);}}/>;}
 render(<Fixture/>);
 fireEvent.click(await screen.findByLabelText('IP-08 · iPad'));
 const recipient=screen.getByLabelText('Người nhận chung');
 expect(within(recipient).queryByRole('option',{name:/Tester/})).toBeNull();
 expect(within(recipient).queryByRole('option',{name:/Đã khóa|Đã gỡ/})).toBeNull();
 fireEvent.change(recipient,{target:{value:'pm'}});
 fireEvent.click(screen.getByLabelText('IP-09 · iPad'));
 expect(changed).toHaveBeenLastCalledWith([expect.objectContaining({assetId:8,recipientUserId:'pm'}),expect.objectContaining({assetId:9,recipientUserId:'pm'})]);
 expect(screen.queryByLabelText('Người nhận IP-08')).toBeNull();
 expect(screen.queryByLabelText('Người nhận IP-09')).toBeNull();
 expect(screen.getByLabelText('Ghi chú bàn giao IP-09')).toBeInTheDocument();
});
