import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {MemberPicker} from './AdminProjectForm';

it('requests only globally unassigned candidates and keeps server totals when searching',async()=>{
 const api={users:vi.fn().mockResolvedValue({items:[{id:'free',displayName:'Cẩm Nhung',username:'nhung',role:'TESTER'}],totalElements:41})};
 render(<MemberPicker value={[]} onChange={vi.fn()} api={api}/>);
 await screen.findByText('Cẩm Nhung');
 expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({unassignedOnly:true,enabled:true,page:0,size:20}),expect.anything());
 expect(screen.getByText(/41 người/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Người sau'}));
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({page:1,unassignedOnly:true}),expect.anything()));
 fireEvent.change(screen.getByLabelText('Tìm tài khoản đang hoạt động'),{target:{value:'NHUNG cam'}});
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({page:0,keyword:'NHUNG cam',unassignedOnly:true}),expect.anything()));
});
