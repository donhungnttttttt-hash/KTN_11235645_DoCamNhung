import React,{useState} from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {DeviceAllocationDialog} from './DeviceAllocationDialog';

it('closes project search on Escape while retaining the handover draft and its parent dialog',async()=>{
 const user=userEvent.setup();
 const api={projects:vi.fn().mockResolvedValue({items:[{id:2,code:'AA',name:'Alpha'}],totalElements:1}),assignDevice:vi.fn()};
 function Page(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Bàn giao máy</button>{open&&<DeviceAllocationDialog asset={{id:8,assetCode:'IP-08',version:2}} api={api} onSaved={vi.fn()} onCancel={()=>setOpen(false)}/>}</>;}
 render(<Page/>);
 await user.click(screen.getByRole('button',{name:'Bàn giao máy'}));
 await user.type(screen.getByLabelText('Ghi chú bàn giao / thu hồi'),'Nháp bàn giao còn giữ');
 await user.click(screen.getByLabelText('Dự án nhận máy'));
 await screen.findByRole('option',{name:'AA · Alpha'});
 await user.keyboard('{Escape}');
 expect(screen.getByRole('dialog',{name:'Bàn giao IP-08'})).toBeVisible();
 expect(screen.getByLabelText('Ghi chú bàn giao / thu hồi')).toHaveValue('Nháp bàn giao còn giữ');
 expect(screen.queryByRole('dialog',{name:'Dự án nhận máy'})).not.toBeInTheDocument();
 expect(api.assignDevice).not.toHaveBeenCalled();
 expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).not.toBeInTheDocument();
 await user.keyboard('{Escape}');
 expect(screen.getByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeVisible();
 expect(screen.getByLabelText('Ghi chú bàn giao / thu hồi')).toHaveValue('Nháp bàn giao còn giữ');
 await user.keyboard('{Escape}');
 expect(screen.queryByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).not.toBeInTheDocument();
 expect(screen.getByRole('dialog',{name:'Bàn giao IP-08'})).toBeVisible();
 await user.keyboard('{Escape}');
 await user.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));
 expect(screen.queryByRole('dialog',{name:'Bàn giao IP-08'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Bàn giao máy'})).toHaveFocus();
});
