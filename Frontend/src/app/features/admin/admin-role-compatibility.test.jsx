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

it('offers only compatible roles when editing existing project memberships',async()=>{
 const members=people.map(p=>({userId:p.id,displayName:p.displayName,username:p.username,systemRole:p.role,projectRole:p.role,version:3}));
 const api={project:vi.fn().mockResolvedValue({id:1,name:'Alpha',version:1}),members:vi.fn().mockResolvedValue(members),users:vi.fn().mockResolvedValue({items:[],totalElements:0})};
 render(<AdminProjectDetail id="1" api={api}/>);
 expect(optionValues(await screen.findByLabelText('Vai trò Manager'))).toEqual(['PM','TESTER','MEMBER']);
 expect(optionValues(screen.getByLabelText('Vai trò Tester'))).toEqual(['PM','TESTER','MEMBER']);
 expect(optionValues(screen.getByLabelText('Vai trò Developer'))).toEqual(['DEV']);
});

it('shows an incompatible legacy assignment explicitly until Admin chooses a compatible role',async()=>{
 const member={userId:'tester',displayName:'Tester',username:'tester',systemRole:'TESTER',projectRole:'DEV',version:3};
 const api={project:vi.fn().mockResolvedValue({id:1,name:'Alpha',version:1}),members:vi.fn().mockResolvedValue([member]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),setMember:vi.fn().mockResolvedValue({})};
 render(<AdminProjectDetail id="1" api={api}/>);
 const select=await screen.findByLabelText('Vai trò Tester');
 expect(select).toHaveValue('DEV');
 expect(within(select).getByRole('option',{name:'DEV · không phù hợp'})).toBeDisabled();
 expect(screen.getByText(/Vai trò hiện tại không phù hợp với tài khoản/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Lưu vai trò Tester'})).toBeDisabled();
 fireEvent.change(select,{target:{value:'TESTER'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu vai trò Tester'}));
 await waitFor(()=>expect(api.setMember).toHaveBeenCalledWith('1','tester',{projectRole:'TESTER',expectedVersion:3}));
});
