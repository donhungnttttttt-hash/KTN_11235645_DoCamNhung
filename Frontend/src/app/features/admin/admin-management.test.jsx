import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {AdminProjectForm,MemberPicker} from './AdminProjectForm';
import {AdminUsers} from './AdminUsers';
import {AdminProjectDetail} from './AdminProjectDetail';
import {AdminUserProjectFilter} from './AdminUserProjectFilter';
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({user:{id:'admin'}})}));
vi.mock('./AdminProjects',()=>({AdminProjectDetail:()=> <h1>Project summary</h1>}));

describe('central project creation',()=>{
 it('requires explicit PM and retains draft when create fails',async()=>{
  const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),users:vi.fn().mockResolvedValue({items:[{id:'pm',displayName:'Manager',role:'PM'}],totalElements:1}),createProject:vi.fn().mockRejectedValue(new Error('Mã đã tồn tại'))};
  render(<AdminProjectForm api={api} onSaved={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Mã dự án'),{target:{value:'AA'}});
  fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Alpha'}});
  fireEvent.click(screen.getByRole('button',{name:'Tạo dự án'}));
  expect(api.createProject).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByLabelText('Chọn Manager'));
  fireEvent.click(screen.getByRole('button',{name:'Tạo dự án'}));
  await screen.findByText('Mã đã tồn tại');
  expect(screen.getByLabelText('Tên dự án').value).toBe('Alpha');
  await waitFor(()=>expect(api.createProject).toHaveBeenCalledWith(expect.objectContaining({members:[{userId:'pm',projectRole:'PM'}]})));
 });
});

it('shows unassigned users, prevents self-disable and sends versioned PM delegation',async()=>{
 const users=[{id:'admin',username:'admin',displayName:'Admin',role:'ADMIN',enabled:true,version:2,memberships:[]},{id:'pm',username:'pm',displayName:'Manager',role:'PM',enabled:true,version:4,canCreateUsers:false,memberships:[]}];
 const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),users:vi.fn().mockResolvedValue({items:users,totalElements:2}),updateUser:vi.fn().mockResolvedValue({})};
 render(<AdminUsers api={api}/>);
 await screen.findByText('Manager');
 expect(screen.getAllByRole('button',{name:'Khóa'})[0]).toBeDisabled();
 expect(screen.getAllByText('Chưa có dự án')).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'Cấp quyền tạo Tester'}));
 await waitFor(()=>expect(api.updateUser).toHaveBeenCalledWith('pm',{canCreateUsers:true,expectedVersion:4}));
 fireEvent.change(screen.getByLabelText('Vai trò'),{target:{value:'DEV'}});
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({role:'DEV',page:0}),expect.anything()));
});

it('preserves project edits on conflict and refreshes version before retry',async()=>{
 const project={id:1,code:'AA',name:'Old',description:'',timezone:'UTC',version:1};
 const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),updateProject:vi.fn().mockRejectedValueOnce(new Error('Conflict')).mockResolvedValueOnce({id:1}),project:vi.fn().mockResolvedValue({...project,version:2})};
 const onSaved=vi.fn();render(<AdminProjectForm project={project} api={api} onSaved={onSaved}/>);
 fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu dự án'}));await screen.findByText('Conflict');
 fireEvent.click(screen.getByRole('button',{name:'Tải version hiện hành, giữ bản nháp'}));
 await screen.findByText(/Đã tải version hiện hành/);expect(screen.getByLabelText('Tên dự án')).toHaveValue('Draft');
 fireEvent.click(screen.getByRole('button',{name:'Lưu dự án'}));
 await waitFor(()=>expect(api.updateProject).toHaveBeenLastCalledWith(1,expect.objectContaining({name:'Draft',expectedVersion:2})));
});

it('keeps a membership role draft after conflict and submits the displayed version',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),project:vi.fn().mockResolvedValue({id:1,name:'Project',version:1}),members:vi.fn().mockResolvedValue([{userId:'p',displayName:'Manager',username:'pm',systemRole:'PM',projectRole:'PM',version:3}]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),setMember:vi.fn().mockRejectedValue(new Error('LAST_PM'))};
 render(<AdminProjectDetail id="1" api={api}/>);
 fireEvent.change(await screen.findByLabelText('Vai trò Manager'),{target:{value:'TESTER'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu vai trò Manager'}));
 await screen.findByText('LAST_PM');
 expect(screen.getByLabelText('Vai trò Manager')).toHaveValue('TESTER');
 expect(api.setMember).toHaveBeenCalledWith('1','p',{projectRole:'TESTER',expectedVersion:3});
});

it('creates Dev accounts, keeps failed credentials in the form, then closes only on success',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),createUser:vi.fn().mockRejectedValueOnce(new Error('Duplicate')).mockResolvedValueOnce({id:'dev'})};
 render(<AdminUsers api={api}/>);fireEvent.click(screen.getByRole('button',{name:'Tạo tài khoản'}));
 for(const [label,value] of [['Tên đăng nhập','dev.new'],['Tên hiển thị','New Dev'],['Mật khẩu','a-long-example-password'],['Vai trò tài khoản','DEV']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu tài khoản'}));await screen.findByText('Duplicate');
 expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('New Dev');
 fireEvent.click(screen.getByRole('button',{name:'Lưu tài khoản'}));
 await waitFor(()=>expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument());
 expect(api.createUser).toHaveBeenCalledWith({username:'dev.new',displayName:'New Dev',password:'a-long-example-password',role:'DEV'});
 fireEvent.click(screen.getByRole('button',{name:'Tạo tài khoản'}));fireEvent.click(screen.getByRole('button',{name:'Hủy'}));expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
});

it('locks and unlocks with current versions, reports failures and resets paging on filters',async()=>{
 const account={id:'dev',username:'dev',displayName:'Developer',role:'DEV',enabled:true,version:2,memberships:[{projectId:1,code:'AA',projectRole:'DEV'}]};
 const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),users:vi.fn().mockResolvedValue({items:[account],totalElements:21}),updateUser:vi.fn().mockRejectedValueOnce(new Error('Conflict')).mockResolvedValueOnce({})};
 render(<AdminUsers api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Khóa'}));await screen.findByText('Conflict');
 fireEvent.click(screen.getByRole('button',{name:'Tải dữ liệu hiện hành'}));await screen.findByText('Developer');
 api.users.mockResolvedValue({items:[{...account,enabled:false,version:3}],totalElements:21});
 fireEvent.click(screen.getByRole('button',{name:'Khóa'}));await screen.findByRole('button',{name:'Mở khóa'});
 fireEvent.click(screen.getByRole('button',{name:'Mở khóa'}));await waitFor(()=>expect(api.updateUser).toHaveBeenLastCalledWith('dev',{enabled:true,expectedVersion:3}));
 fireEvent.click(await screen.findByRole('button',{name:'Trang sau'}));await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({page:1}),expect.anything()));
 fireEvent.click(await screen.findByRole('button',{name:'Trang trước'}));
 fireEvent.change(screen.getByLabelText('Tìm username hoặc tên'),{target:{value:'none'}});
 fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:'false'}});
 fireEvent.change(screen.getByLabelText('Dự án của người dùng'),{target:{value:'1'}});
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({keyword:'none',enabled:'false',projectId:'1',page:0}),expect.anything()));
});

it('preserves selected people across picker pages and restricts Dev to Dev role',async()=>{
 const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),users:vi.fn().mockResolvedValue({items:[{id:'d',username:'dev',displayName:'Developer',role:'DEV'},{id:'t',username:'tester',displayName:'Tester',role:'TESTER'}],totalElements:21})};
 function Picker(){const [value,setValue]=React.useState([]);return <MemberPicker api={api} value={value} onChange={setValue}/>;}
 render(<Picker/>);fireEvent.click(await screen.findByLabelText('Chọn Developer'));
 expect(screen.getByLabelText('Vai trò Developer').options).toHaveLength(1);
 fireEvent.click(screen.getByLabelText('Chọn Tester'));fireEvent.change(screen.getByLabelText('Vai trò Tester'),{target:{value:'PM'}});
 fireEvent.click(screen.getByRole('button',{name:'Người sau'}));await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({page:1}),expect.anything()));
 fireEvent.click(await screen.findByRole('button',{name:'Người trước'}));await screen.findByLabelText('Chọn Developer');
 fireEvent.click(screen.getByLabelText('Chọn Developer'));fireEvent.click(screen.getByRole('button',{name:'Bỏ chọn'}));
 expect(screen.getByText(/Đã chọn 0 người/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Tìm tài khoản đang hoạt động'),{target:{value:'search'}});
 await waitFor(()=>expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({keyword:'search',page:0}),expect.anything()));
});

it('restores an inactive member with its candidate version and supports removal',async()=>{
 const member={userId:'pm',displayName:'Manager',username:'pm',systemRole:'PM',projectRole:'PM',version:3};
 const api={projects:vi.fn().mockResolvedValue({items:[{id:1,code:"AA",name:"Project Alpha"}],totalElements:1}),project:vi.fn().mockResolvedValue({id:1,name:'Project',version:1}),members:vi.fn().mockResolvedValue([member]),users:vi.fn().mockResolvedValue({items:[{id:'d',username:'dev',displayName:'Developer',role:'DEV'}],totalElements:1}),memberCandidate:vi.fn().mockResolvedValue({membershipVersion:5}),setMember:vi.fn().mockResolvedValue({}),removeMember:vi.fn().mockResolvedValue({})};
 render(<AdminProjectDetail id="1" api={api}/>);
 fireEvent.click(await screen.findByLabelText('Chọn Developer'));fireEvent.click(screen.getByRole('button',{name:'Lưu thành viên đã chọn'}));
 await waitFor(()=>expect(api.setMember).toHaveBeenCalledWith('1','d',{projectRole:'DEV',expectedVersion:5}));
 fireEvent.change(await screen.findByLabelText('Vai trò Manager'),{target:{value:'TESTER'}});fireEvent.click(screen.getByRole('button',{name:'Lưu vai trò Manager'}));
 await waitFor(()=>expect(api.setMember).toHaveBeenCalledWith('1','pm',{projectRole:'TESTER',expectedVersion:3}));
 fireEvent.click(await screen.findByRole('button',{name:'Gỡ Manager'}));await waitFor(()=>expect(api.removeMember).toHaveBeenCalledWith('1','pm',3));
 fireEvent.click(await screen.findByRole('button',{name:'Sửa dự án'}));await screen.findByLabelText('Tên dự án');fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
});

it('selects named projects locally and retains the chosen label while paging the project chooser',async()=>{
 const api={projects:vi.fn(({page})=>Promise.resolve({items:page?[{id:2,code:'BB',name:'Beta'}]:[{id:1,code:'AA',name:'Alpha'}],totalElements:101}))};
 const changed=vi.fn();function Picker(){const [value,setValue]=React.useState('');return <AdminUserProjectFilter api={api} value={value} onChange={v=>{setValue(v);changed(v);}}/>;}
 window.location.hash='/admin/users';render(<Picker/>);
 const select=screen.getByLabelText('Dự án của người dùng');expect(select).toHaveValue('');
 await screen.findByRole('option',{name:'AA · Alpha'});fireEvent.change(select,{target:{value:'1'}});
 expect(changed).toHaveBeenLastCalledWith('1');expect(window.location.hash).toBe('#/admin/users');
 fireEvent.click(screen.getByRole('button',{name:'Dự án tiếp'}));await screen.findByRole('option',{name:'BB · Beta'});
 expect(select).toHaveValue('1');expect(screen.getByRole('option',{name:'AA · Alpha'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Dự án trước'}));await waitFor(()=>expect(api.projects).toHaveBeenLastCalledWith({page:0,size:100},expect.anything()));
 fireEvent.change(select,{target:{value:''}});expect(changed).toHaveBeenLastCalledWith('');
});

it('discards selected additions and role drafts when navigating to another project',async()=>{
 const api={project:vi.fn(id=>Promise.resolve({id,name:`Project ${id}`,version:1})),members:vi.fn().mockResolvedValue([{userId:'pm',displayName:'Manager',username:'pm',systemRole:'PM',projectRole:'PM',version:3}]),users:vi.fn().mockResolvedValue({items:[{id:'d',username:'dev',displayName:'Developer',role:'DEV'}],totalElements:1})};
 const view=render(<AdminProjectDetail id="1" api={api}/>);
 fireEvent.change(await screen.findByLabelText('Vai trò Manager'),{target:{value:'TESTER'}});
 fireEvent.click(await screen.findByLabelText('Chọn Developer'));
 expect(screen.getByRole('button',{name:'Lưu thành viên đã chọn'})).toBeEnabled();
 view.rerender(<AdminProjectDetail id="2" api={api}/>);
 await waitFor(()=>expect(api.members).toHaveBeenCalledWith('2',expect.anything()));
 expect(await screen.findByLabelText('Vai trò Manager')).toHaveValue('PM');
 expect(await screen.findByLabelText('Chọn Developer')).not.toBeChecked();
 expect(screen.getByRole('button',{name:'Lưu thành viên đã chọn'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Lưu vai trò Manager'})).toBeDisabled();
});

it('never labels a newly selected project with the previous project name while its lookup is pending',async()=>{
 let resolveSecond;
 const api={projects:vi.fn().mockResolvedValue({items:[],totalElements:0}),project:vi.fn(id=>String(id)==='1'?Promise.resolve({id:1,code:'AA',name:'Alpha'}):new Promise(resolve=>{resolveSecond=resolve;}))};
 const view=render(<AdminUserProjectFilter api={api} value="1" onChange={()=>{}}/>);
 await screen.findByRole('option',{name:'AA · Alpha'});
 view.rerender(<AdminUserProjectFilter api={api} value="2" onChange={()=>{}}/>);
 const select=screen.getByLabelText('Dự án của người dùng');
 expect(select).toHaveValue('2');
 expect(select.selectedOptions[0].textContent).toBe('Dự án #2');
 await waitFor(()=>expect(resolveSecond).toBeTypeOf('function'));
 resolveSecond({id:2,code:'BB',name:'Beta'});
 await screen.findByRole('option',{name:'BB · Beta'});
 expect(select.selectedOptions[0].textContent).toBe('BB · Beta');
});
