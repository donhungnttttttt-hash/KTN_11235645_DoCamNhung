import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {AdminAudit} from './AdminAudit';

it('searches audit words globally with inclusive Vietnam dates and resets the server page',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[],totalElements:0}),audit:vi.fn().mockResolvedValue({items:[{id:'p1',occurredAt:'2026-10-18T17:00:00Z',actorName:'Cẩm Nhung',entityType:'PROJECT',action:'CREATE'}],totalElements:41})};
 render(<AdminAudit api={api}/>);
 await screen.findByText('Cẩm Nhung');
 expect(screen.queryByLabelText('Loại sự kiện')).toBeNull();
 expect(screen.queryByLabelText('Múi giờ ngày lọc')).toBeNull();
 expect(screen.getByText('00:00:00 19/10/2026')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Trang sau'}));
 await waitFor(()=>expect(api.audit).toHaveBeenLastCalledWith(expect.objectContaining({page:1}),expect.anything()));
 fireEvent.change(screen.getByLabelText('Tìm người / dự án / đối tượng / thao tác'),{target:{value:'NHUNG cam'}});
 fireEvent.change(screen.getByLabelText('Từ ngày'),{target:{value:'2026-10-19'}});
 fireEvent.change(screen.getByLabelText('Đến hết ngày'),{target:{value:'2026-10-19'}});
 await waitFor(()=>expect(api.audit).toHaveBeenLastCalledWith({projectId:'',keyword:'NHUNG cam',from:'2026-10-19',through:'2026-10-19',page:0,size:20},expect.anything()));
});
