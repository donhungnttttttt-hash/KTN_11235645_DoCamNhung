import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {AdminProjectDetail} from './AdminProjectDetail';
import {MemberPicker} from './AdminProjectForm';

vi.mock('./AdminProjects',()=>({AdminProjectDetail:()=> <h1>Project summary</h1>}));

const member={userId:'tester',displayName:'Lan',username:'lan',systemRole:'TESTER',projectRole:'TESTER',version:2};
function managementApi(){return {project:vi.fn().mockResolvedValue({id:7,name:'Project',version:1}),members:vi.fn().mockResolvedValue([member]),users:vi.fn().mockResolvedValue({items:[],totalElements:0})};}

it.each(['role','remove'])('announces and focuses a completed %s change only after its response',async action=>{
 let finish;
 const api=managementApi();
 api.setMember=vi.fn().mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 api.removeMember=vi.fn().mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 render(<AdminProjectDetail id="7" api={api}/>);
 const role=await screen.findByLabelText('Vai trò Lan');
 if(action==='role')fireEvent.change(role,{target:{value:'PM'}});
 const message=action==='role'?'Đã lưu vai trò của Lan.':'Đã gỡ Lan khỏi dự án.';
 fireEvent.click(screen.getByRole('button',{name:action==='role'?'Lưu vai trò Lan':'Gỡ Lan'}));
 expect(screen.getByText('Đang lưu thành viên…',{selector:'[role="status"]'})).toBeVisible();
 expect(screen.queryByText(message)).not.toBeInTheDocument();
 api.members.mockResolvedValue(action==='role'?[{...member,projectRole:'PM',version:3}]:[]);
 await act(async()=>finish({}));
 const notice=await screen.findByText(message);
 expect(notice).toHaveAttribute('role','status');
 await waitFor(()=>expect(notice.parentElement).toHaveFocus());
 if(action==='role')expect(api.setMember).toHaveBeenCalledWith('7','tester',{projectRole:'PM',expectedVersion:2});
 else expect(api.removeMember).toHaveBeenCalledWith('7','tester',2);
});

it.each(['role','remove'])('keeps role drafts and does not announce success when %s fails',async action=>{
 const api=managementApi();
 api.setMember=vi.fn().mockRejectedValue(new Error('Không lưu được thay đổi.'));
 api.removeMember=vi.fn().mockRejectedValue(new Error('Không lưu được thay đổi.'));
 render(<AdminProjectDetail id="7" api={api}/>);
 fireEvent.change(await screen.findByLabelText('Vai trò Lan'),{target:{value:'PM'}});
 fireEvent.click(screen.getByRole('button',{name:action==='role'?'Lưu vai trò Lan':'Gỡ Lan'}));
 await screen.findByText('Không lưu được thay đổi.');
 expect(await screen.findByLabelText('Vai trò Lan')).toHaveValue('PM');
 expect(screen.queryByText('Đã lưu vai trò của Lan.')).not.toBeInTheDocument();
 expect(screen.queryByText('Đã gỡ Lan khỏi dự án.')).not.toBeInTheDocument();
});

it('shows picker page position and names each removal while preserving selections on other pages',async()=>{
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
 const removeAlpha=screen.getByRole('button',{name:'Bỏ chọn Alpha'});
 expect(removeAlpha).toHaveTextContent('Bỏ chọn');
 fireEvent.click(removeAlpha);
 expect(screen.queryByRole('button',{name:'Bỏ chọn Alpha'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Bỏ chọn Beta'})).toBeInTheDocument();
 expect(screen.getByLabelText('Chọn Beta')).toBeChecked();
 expect(screen.getByRole('button',{name:'Người sau'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Người trước'}));
 await screen.findByText('Trang 1 / 2 · 21 người');
 expect(screen.getByLabelText('Chọn Alpha')).not.toBeChecked();
 expect(screen.getByRole('button',{name:'Bỏ chọn Beta'})).toBeInTheDocument();
});
