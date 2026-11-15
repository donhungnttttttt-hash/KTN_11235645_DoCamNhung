import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {ProjectHealthNotifications} from './ProjectHealthNotifications';
it('shows only supplied project alerts and marks read with server confirmation',async()=>{
 const api={list:vi.fn().mockResolvedValue({unreadCount:1,items:[{id:7,projectName:'Dự án A',message:'20 case NG',createdAt:'2026-11-15T00:00:00Z'}]}),read:vi.fn().mockResolvedValue({id:7})};
 render(<ProjectHealthNotifications api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Thông báo sức khỏe dự án (1 chưa đọc)'}));
 expect(await screen.findByText('20 case NG')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Đánh dấu đã đọc'}));
 await waitFor(()=>expect(api.read).toHaveBeenCalledWith(7));
});
