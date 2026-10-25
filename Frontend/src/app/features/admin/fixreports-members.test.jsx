import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {MemberPicker} from './AdminProjectForm';

it('includes candidates assigned to other projects and keeps server totals when searching',async()=>{
 const api={users:vi.fn().mockResolvedValue({items:[{id:'free',displayName:'Cẩm Nhung',username:'nhung',role:'TESTER'}],totalElements:41})};
 render(<MemberPicker value={[]} onChange={vi.fn()} api={api}/>);
 await screen.findByText('Cẩm Nhung');
 expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({unassignedOnly:false,enabled:true,page:0,size:20}),expect.anything());
 expect(screen.getByText(/41 người/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Người sau'}));
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({page:1,unassignedOnly:false}),expect.anything()));
 fireEvent.change(screen.getByLabelText('Tìm tài khoản đang hoạt động'),{target:{value:'NHUNG cam'}});
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({page:0,keyword:'NHUNG cam',unassignedOnly:false}),expect.anything()));
});

it('filters project membership on the server and shows project names',async()=>{
 const person={id:'member',displayName:'Lan',username:'lan',role:'TESTER',memberships:[{projectId:7,code:'ABC',name:'Dự án Alpha'}]};
 const api={users:vi.fn().mockResolvedValue({items:[person],totalElements:41})};
 render(<MemberPicker value={[]} onChange={vi.fn()} api={api}/>);
 await screen.findByText(/Dự án Alpha/);
 fireEvent.click(screen.getByRole('button',{name:'Người sau'}));
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({page:1}),expect.anything()));
 fireEvent.change(screen.getByLabelText('Lọc trạng thái dự án'),{target:{value:'assigned'}});
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({hasProject:true,page:0}),expect.anything()));
 api.users.mockResolvedValue({items:[{...person,memberships:[]}],totalElements:1});
 fireEvent.change(screen.getByLabelText('Lọc trạng thái dự án'),{target:{value:'unassigned'}});
 await screen.findByText(/Chưa có dự án/,{selector:'small'});
 expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({hasProject:false,page:0}),expect.anything());
 fireEvent.change(screen.getByLabelText('Lọc trạng thái dự án'),{target:{value:''}});
 await waitFor(()=>expect(api.users.mock.lastCall[0].hasProject).toBeUndefined());
});
