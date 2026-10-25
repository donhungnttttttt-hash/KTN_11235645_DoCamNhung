import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {MemberPicker} from './AdminProjectForm';

it('hides current project members while keeping candidates from other projects selectable',async()=>{
 const member={id:'current',displayName:'Current member',username:'current',role:'TESTER'};
 const candidate={id:'other',displayName:'Other project member',username:'other',role:'TESTER',memberships:[{projectId:8,code:'OTHER',name:'Other project'}]};
 const api={users:vi.fn().mockResolvedValue({items:[member,candidate],totalElements:1})};
 const change=vi.fn();
 render(<MemberPicker projectId={7} existingUserIds={['current']} value={[]} onChange={change} api={api}/>);
 await screen.findByText('Other project member');
 expect(screen.queryByText('Current member')).not.toBeInTheDocument();
 expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({excludeProjectId:7,unassignedOnly:false}),expect.anything());
 fireEvent.click(screen.getByLabelText('Chọn Other project member'));
 expect(change).toHaveBeenCalledWith([expect.objectContaining({userId:'other'})]);
 expect(screen.getByText('Trang 1 / 1 · 1 người')).toBeInTheDocument();
});

it('keeps project exclusion through paging and filters and refreshes after membership changes',async()=>{
 const api={users:vi.fn().mockResolvedValue({items:[],totalElements:21})};
 const props={projectId:7,existingUserIds:['existing'],value:[],onChange:vi.fn(),api};
 const view=render(<MemberPicker {...props}/>);
 await screen.findByText('Trang 1 / 2 · 21 người');
 fireEvent.click(screen.getByRole('button',{name:'Người sau'}));
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({excludeProjectId:7,page:1}),expect.anything()));
 fireEvent.change(screen.getByLabelText('Lọc trạng thái dự án'),{target:{value:'assigned'}});
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({excludeProjectId:7,hasProject:true,page:0}),expect.anything()));
 const before=api.users.mock.calls.length;
 view.rerender(<MemberPicker {...props} existingUserIds={['existing','added']}/>);
 await waitFor(()=>expect(api.users.mock.calls.length).toBeGreaterThan(before));
});

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
