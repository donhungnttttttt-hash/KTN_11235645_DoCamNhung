import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vitest';
import {AdminUserProjectFilter} from './AdminUserProjectFilter';

const alpha={id:1,code:'AA',name:'Alpha'};
const beta={id:2,code:'BB',name:'Beta'};
const page=items=>({items,totalElements:items.length});
function Picker({api,onChange=()=>{}}) {
 const [value,setValue]=React.useState('1');
 return <><AdminUserProjectFilter api={api} value={value} onChange={id=>{setValue(id);onChange(id);}} label="Dự án cần hỗ trợ" emptyLabel="Chọn dự án"/><button>Tiếp tục</button></>;
}

test('search lives inside the dropdown, searches the server, and commits only the chosen project',async()=>{
 const user=userEvent.setup(),changed=vi.fn();
 const api={projects:vi.fn(async ({keyword})=>page(keyword?[beta]:[alpha]))};
 render(<Picker api={api} onChange={changed}/>);
 const trigger=screen.getByRole('button',{name:'Dự án cần hỗ trợ'});
 await waitFor(()=>expect(trigger).toHaveTextContent('AA · Alpha'));
 expect(screen.queryByLabelText('Tìm dự án theo tên hoặc mã')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Tìm dự án'})).not.toBeInTheDocument();
 await user.click(trigger);
 const popup=screen.getByRole('dialog',{name:'Dự án cần hỗ trợ'});
 const search=within(popup).getByRole('combobox',{name:'Tìm dự án theo tên hoặc mã'});
 expect(search).toHaveFocus();
 await user.type(search,'Beta');
 await screen.findByRole('option',{name:'BB · Beta'});
 expect(api.projects).toHaveBeenLastCalledWith({page:0,size:100,keyword:'Beta'},expect.anything());
 expect(trigger).toHaveTextContent('AA · Alpha');expect(changed).not.toHaveBeenCalled();
 await user.click(screen.getByRole('option',{name:'BB · Beta'}));
 expect(changed).toHaveBeenCalledWith('2');expect(trigger).toHaveTextContent('BB · Beta');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();
});

test('keyboard chooses a result and Escape, outside click and Tab dismiss without changing the selection',async()=>{
 const user=userEvent.setup(),changed=vi.fn();
 render(<Picker api={{projects:vi.fn().mockResolvedValue(page([alpha,beta]))}} onChange={changed}/>);
 const trigger=screen.getByRole('button',{name:'Dự án cần hỗ trợ'});
 await waitFor(()=>expect(trigger).toHaveTextContent('AA · Alpha'));
 trigger.focus();await user.keyboard('{ArrowDown}');
 await user.keyboard('{End}{Enter}');
 expect(changed).toHaveBeenCalledWith('2');expect(trigger).toHaveFocus();
 await user.click(trigger);await user.keyboard('{Escape}');
 expect(trigger).toHaveFocus();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 await user.click(trigger);await user.click(screen.getByRole('button',{name:'Tiếp tục'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 await user.click(trigger);await user.tab();
 expect(screen.getByRole('button',{name:'Tiếp tục'})).toHaveFocus();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(changed).toHaveBeenCalledTimes(1);
});

test('pending and stale searches cannot commit an old result; empty results and retry stay inside the dropdown',async()=>{
 const user=userEvent.setup(),changed=vi.fn();let finishOld;
 const api={projects:vi.fn(({keyword})=>{
  if(keyword==='old')return new Promise(resolve=>{finishOld=resolve;});
  if(keyword==='missing')return Promise.resolve(page([]));
  if(keyword==='error')return Promise.reject(new Error('Offline'));
  return Promise.resolve(page([alpha]));
 })};
 render(<Picker api={api} onChange={changed}/>);
 await user.click(screen.getByRole('button',{name:'Dự án cần hỗ trợ'}));
 const search=screen.getByRole('combobox');
 await screen.findByRole('option',{name:'AA · Alpha'});
 fireEvent.change(search,{target:{value:'old'}});await user.keyboard('{ArrowDown}{Enter}');
 expect(changed).not.toHaveBeenCalled();
 await waitFor(()=>expect(finishOld).toBeTypeOf('function'));
 fireEvent.change(search,{target:{value:'missing'}});
 await screen.findByText('Không tìm thấy dự án phù hợp.');
 await act(async()=>finishOld(page([beta])));
 expect(screen.queryByRole('option',{name:'BB · Beta'})).not.toBeInTheDocument();
 fireEvent.change(search,{target:{value:'error'}});await screen.findByText('Offline');
 api.projects.mockResolvedValue(page([beta]));await user.click(screen.getByRole('button',{name:'Thử lại'}));
 await user.click(await screen.findByRole('option',{name:'BB · Beta'}));expect(changed).toHaveBeenCalledWith('2');
});

test('non-searchable scope retains its native selector',async()=>{
 const changed=vi.fn();render(<AdminUserProjectFilter searchable={false} api={{projects:vi.fn().mockResolvedValue(page([alpha]))}} value="" onChange={changed}/>);
 await screen.findByRole('option',{name:'AA · Alpha'});
 await userEvent.setup().selectOptions(screen.getByLabelText('Dự án của người dùng'),'1');
 expect(changed).toHaveBeenCalledWith('1');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
