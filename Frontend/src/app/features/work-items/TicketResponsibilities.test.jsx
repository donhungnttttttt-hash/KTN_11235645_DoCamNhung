import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {TicketResponsibilities} from './TicketResponsibilities';
const data={canManage:true,members:[{membershipId:11,userId:'u',displayName:'Lan',projectRole:'USER',systemRole:'USER',duties:[],version:2}]};
it('saves both duties without changing roles, retains a conflict draft and explicitly reloads the member version',async()=>{
 const api={responsibilities:vi.fn().mockResolvedValueOnce(data).mockResolvedValue({...data,members:[{...data.members[0],version:3}]}),updateResponsibilities:vi.fn().mockRejectedValueOnce(new Error('Version conflict')).mockResolvedValue({...data.members[0],duties:['SPEC_REVIEWER','BUG_COORDINATOR'],version:4})};
 render(<TicketResponsibilities projectId={1} api={api}/>);
 fireEvent.click(await screen.findByLabelText('Lan · Xác nhận spec'));fireEvent.click(screen.getByLabelText('Lan · Điều phối Bug'));fireEvent.click(screen.getByRole('button',{name:'Lưu trách nhiệm Lan'}));
 expect(await screen.findByText(/Version conflict/)).toBeInTheDocument();expect(screen.getByLabelText('Lan · Điều phối Bug')).toBeChecked();
 fireEvent.click(screen.getByRole('button',{name:'Tải lại trách nhiệm'}));await waitFor(()=>expect(api.responsibilities).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByRole('button',{name:'Lưu trách nhiệm Lan'}));await waitFor(()=>expect(api.updateResponsibilities).toHaveBeenLastCalledWith(1,11,{duties:['SPEC_REVIEWER','BUG_COORDINATOR'],expectedVersion:3},expect.anything()));
 expect(await screen.findByText('Đã lưu trách nhiệm Lan.')).toBeInTheDocument();expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
it('shows responsibility data read only when manager capability is absent',async()=>{
 const api={responsibilities:vi.fn().mockResolvedValue({...data,canManage:false}),updateResponsibilities:vi.fn()};
 render(<TicketResponsibilities projectId={1} api={api}/>);await screen.findByText('Lan');expect(screen.queryByRole('button',{name:'Lưu trách nhiệm Lan'})).not.toBeInTheDocument();expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
