import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {AdminProjectForm} from './AdminProjectForm';
import {AdminProjectDetail} from './AdminProjectDetail';

vi.mock('./AdminProjects',()=>({AdminProjectDetail:()=> <h1>Project summary</h1>}));

const people=[
 {id:'pm',username:'pm',displayName:'Manager',role:'PM'},
 {id:'tester',username:'tester',displayName:'Tester',role:'TESTER'},
 {id:'dev',username:'dev',displayName:'Developer',role:'DEV'},
];
const optionValues=select=>within(select).getAllByRole('option').map(option=>option.value);

it('offers only account-compatible project roles while creating a project and submits a usable Dev',async()=>{
 const api={users:vi.fn().mockResolvedValue({items:people,totalElements:3}),createProject:vi.fn().mockResolvedValue({id:1})};
 render(<AdminProjectForm api={api} onSaved={vi.fn()}/>);
 for(const person of people)fireEvent.click(await screen.findByLabelText(`Chọn ${person.displayName}`));
 expect(optionValues(screen.getByLabelText('Vai trò Manager'))).toEqual(['PM','TESTER']);
 expect(optionValues(screen.getByLabelText('Vai trò Tester'))).toEqual(['PM','TESTER']);
 expect(optionValues(screen.getByLabelText('Vai trò Developer'))).toEqual(['DEV']);
 fireEvent.change(screen.getByLabelText('Mã dự án'),{target:{value:'AA'}});
 fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Alpha'}});
 fireEvent.click(screen.getByRole('button',{name:'Tạo dự án'}));
 await waitFor(()=>expect(api.createProject).toHaveBeenCalledWith(expect.objectContaining({members:[
  {userId:'pm',projectRole:'PM'},{userId:'tester',projectRole:'TESTER'},{userId:'dev',projectRole:'DEV'},
 ]})));
});

it('shows existing membership roles as text without role editing controls',async()=>{
 const members=[...people.map(p=>({userId:p.id,displayName:p.displayName,username:p.username,systemRole:p.role,projectRole:p.role,version:3})),
  {userId:'reader',displayName:'Reader',username:'reader',systemRole:'TESTER',projectRole:'MEMBER',version:1}];
 const api={project:vi.fn().mockResolvedValue({id:1,name:'Alpha',version:1}),members:vi.fn().mockResolvedValue(members),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),setMember:vi.fn()};
 render(<AdminProjectDetail id="1" api={api}/>);
 for(const member of members){
  const row=await screen.findByRole('row',{name:new RegExp(`${member.displayName} · ${member.username}`)});
  expect(within(row).queryByRole('combobox')).not.toBeInTheDocument();
  expect(within(row).getByRole('cell',{name:member.projectRole})).toBeVisible();
  expect(within(row).getByRole('button',{name:`Gỡ ${member.displayName}`})).toBeEnabled();
 }
 expect(screen.queryByRole('button',{name:/^Lưu vai trò/})).not.toBeInTheDocument();
 expect(api.setMember).not.toHaveBeenCalled();
});

it('displays a legacy membership role as stored without offering a role change',async()=>{
 const member={userId:'tester',displayName:'Tester',username:'tester',systemRole:'TESTER',projectRole:'DEV',version:3};
 const api={project:vi.fn().mockResolvedValue({id:1,name:'Alpha',version:1}),members:vi.fn().mockResolvedValue([member]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),setMember:vi.fn().mockResolvedValue({})};
 render(<AdminProjectDetail id="1" api={api}/>);
 const row=await screen.findByRole('row',{name:/Tester · tester/});
 expect(within(row).queryByRole('combobox')).not.toBeInTheDocument();
 expect(within(row).getByRole('cell',{name:'DEV'})).toBeVisible();
 expect(screen.queryByRole('button',{name:/^Lưu vai trò/})).not.toBeInTheDocument();
 expect(api.setMember).not.toHaveBeenCalled();
});
