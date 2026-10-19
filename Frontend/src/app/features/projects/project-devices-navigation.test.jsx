import React from 'react';
import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {ProjectDevices} from './ProjectDevices';
it('explains the current physical PM handover without sending members to the retired test-device catalog',async()=>{
 const api={projectDevices:vi.fn().mockResolvedValue({items:[],totalElements:0})};const view=render(<ProjectDevices projectId={1} api={api}/>);
 expect(await screen.findByText('Dự án chưa được bàn giao máy.')).toBeVisible();expect(screen.getByText(/bàn giao cho PM/)).toHaveTextContent('PM tự phân phối nội bộ bên ngoài phần mềm');expect(view.container.querySelector('a[href*="settings/catalogs"]')).toBeNull();expect(screen.queryByRole('button',{name:'Bổ sung máy vào dự án'})).toBeNull();
});
it('keeps actual Admin inventory and handover actions when removing the obsolete catalog link',async()=>{
 const api={allocations:vi.fn().mockResolvedValue({items:[],totalElements:0})};render(<ProjectDevices projectId={1} api={api} admin/>);
 expect(await screen.findByText('Dự án chưa được bàn giao máy.')).toBeVisible();expect(screen.getByRole('link',{name:'Mở kho / nhập máy mới'})).toHaveAttribute('href','#/admin/devices');expect(screen.getByRole('button',{name:'Bổ sung máy vào dự án'})).toBeEnabled();
});
