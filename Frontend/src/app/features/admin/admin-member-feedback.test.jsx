import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {AdminProjectDetail} from './AdminProjectDetail';
import {MemberPicker} from './AdminProjectForm';

vi.mock('./AdminProjects',()=>({AdminProjectDetail:()=> <h1>Project summary</h1>}));

const member={userId:'tester',displayName:'Lan',username:'lan',systemRole:'TESTER',projectRole:'TESTER',version:2};
function managementApi(){return {project:vi.fn().mockResolvedValue({id:7,name:'Project',version:1}),members:vi.fn().mockResolvedValue([member]),users:vi.fn().mockResolvedValue({items:[],totalElements:0})};}

it('announces and focuses a completed member removal only after its response',async()=>{
 let finish;
 const api=managementApi();
 api.removeMember=vi.fn().mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 render(<AdminProjectDetail id="7" api={api}/>);
 const message='Đã gỡ Lan khỏi dự án.';
 fireEvent.click(await screen.findByRole('button',{name:'Gỡ Lan'}));
 expect(screen.getByText('Đang lưu thành viên…',{selector:'[role="status"]'})).toBeVisible();
 expect(screen.queryByText(message)).not.toBeInTheDocument();
 api.members.mockResolvedValue([]);
 await act(async()=>finish({}));
 const notice=await screen.findByText(message);
 expect(notice).toHaveAttribute('role','status');
 await waitFor(()=>expect(notice.parentElement).toHaveFocus());
 expect(api.removeMember).toHaveBeenCalledWith('7','tester',2);
});

it('keeps the displayed member and role without announcing success when removal fails',async()=>{
 const api=managementApi();
 api.removeMember=vi.fn().mockRejectedValue(new Error('Không lưu được thay đổi.'));
 render(<AdminProjectDetail id="7" api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Gỡ Lan'}));
 await screen.findByText('Không lưu được thay đổi.');
 const row=await screen.findByRole('row',{name:/Lan · lan/});
 expect(within(row).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(within(row).getByRole('button',{name:'Gỡ Lan'})).toBeEnabled();
 expect(screen.queryByText('Đã lưu vai trò của Lan.')).not.toBeInTheDocument();
 expect(screen.queryByText('Đã gỡ Lan khỏi dự án.')).not.toBeInTheDocument();
});

it('preserves selections across pages and removes them with checkboxes without a duplicate list',async()=>{
 const alpha={id:'alpha',displayName:'Alpha',username:'alpha',role:'TESTER'};
 const beta={id:'beta',displayName:'Beta',username:'beta',role:'TESTER'};
 const api={users:vi.fn(({page})=>Promise.resolve({items:page?[beta]:[alpha],totalElements:21}))};
 function Picker(){const [selected,setSelected]=React.useState([]);return <MemberPicker api={api} value={selected} onChange={setSelected}/>;}
 render(<Picker/>);
 await screen.findByText('Trang 1 / 2 · 21 người');
 fireEvent.click(screen.getByLabelText('Chọn Alpha'));
 fireEvent.click(screen.getByRole('button',{name:'Người sau'}));
 await screen.findByText('Trang 2 / 2 · 21 người');
 fireEvent.click(screen.getByLabelText('Chọn Beta'));
 expect(screen.queryByRole('button',{name:/Bỏ chọn/})).not.toBeInTheDocument();
 expect(screen.getByText('Đã chọn 2 người · 0 PM')).toBeInTheDocument();
 expect(screen.getByLabelText('Chọn Beta')).toBeChecked();
 expect(screen.getByRole('button',{name:'Người sau'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Người trước'}));
 await screen.findByText('Trang 1 / 2 · 21 người');
 expect(screen.getByLabelText('Chọn Alpha')).toBeChecked();
 fireEvent.click(screen.getByLabelText('Chọn Alpha'));
 expect(screen.getByText('Đã chọn 1 người · 0 PM')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Người sau'}));
 expect(await screen.findByLabelText('Chọn Beta')).toBeChecked();
});
