import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect, test, vi} from 'vitest';
import {AdminUserProjectFilter} from './AdminUserProjectFilter';
import {AdminProjectDropdown} from './AdminProjectDropdown';

afterEach(()=>vi.unstubAllGlobals());

function rect(top,bottom){return {top,bottom,left:0,right:300,width:300,height:bottom-top,x:0,y:top};}
function scrollport(element,top,bottom,initial,contentHeight){
 let value=initial;
 Object.defineProperties(element,{clientHeight:{configurable:true,value:bottom-top},clientTop:{configurable:true,value:0},scrollHeight:{configurable:true,value:contentHeight},scrollTop:{configurable:true,get:()=>value,set:next=>{value=Math.max(0,Math.min(contentHeight-(bottom-top),next));}}});
 vi.spyOn(element,'getBoundingClientRect').mockImplementation(()=>rect(top,bottom));
}
function popupBounds(trigger,popup){
 const anchor=trigger.getBoundingClientRect(),height=parseFloat(popup.style.maxHeight);
 const top=popup.classList.contains('is-above')?anchor.top-6-height:anchor.bottom+6;
 return {top,bottom:top+height,height};
}
const standalone=()=> <AdminProjectDropdown label="Dự án giới hạn" emptyLabel="Tất cả dự án" value="1" selectedLabel="AA · Alpha" onChange={vi.fn()} search="" onSearch={vi.fn()} state={{data:{items:[{id:1,code:'AA',name:'Alpha'}]},loading:false,error:null}} onReset={vi.fn()}/>;

test('keeps the search and usable project choices inside the main scrollport in a short viewport',async()=>{
 vi.stubGlobal('visualViewport',{offsetTop:0,height:320,addEventListener:vi.fn(),removeEventListener:vi.fn()});
 render(<main data-testid="main-scrollport" style={{overflowY:'auto'}}>{standalone()}</main>);
 const main=screen.getByTestId('main-scrollport'),initial=103.467;
 scrollport(main,77.067,320,initial,1000);
 const trigger=screen.getByRole('button',{name:'Dự án giới hạn'});
 vi.spyOn(trigger,'getBoundingClientRect').mockImplementation(()=>rect(176.167-(main.scrollTop-initial),220.167-(main.scrollTop-initial)));
 fireEvent.click(trigger);
 const popup=screen.getByRole('dialog',{name:'Dự án giới hạn'}),bounds=popupBounds(trigger,popup);
 expect(bounds.top).toBeGreaterThanOrEqual(77.067);expect(bounds.bottom).toBeLessThanOrEqual(320);expect(bounds.height).toBeGreaterThanOrEqual(136);
 expect(screen.getByRole('combobox',{name:'Tìm dự án theo tên hoặc mã'})).toHaveFocus();
 const openedScroll=main.scrollTop;main.scrollTop-=10;fireEvent.scroll(main);
 expect(main.scrollTop).toBe(openedScroll-10); // Manual scrolling only remeasures; it must not move the anchor back.
});

test('intersects a nested scrollport with the viewport and leaves outer scroll position alone',()=>{
 vi.stubGlobal('visualViewport',{offsetTop:0,height:480,addEventListener:vi.fn(),removeEventListener:vi.fn()});
 render(<main data-testid="outer-scrollport" style={{overflowY:'auto'}}><div data-testid="inner-scrollport" style={{overflowY:'auto'}}>{standalone()}</div></main>);
 const outer=screen.getByTestId('outer-scrollport'),inner=screen.getByTestId('inner-scrollport');
 scrollport(outer,77,480,40,1000);scrollport(inner,100,380,80,900);
 const trigger=screen.getByRole('button',{name:'Dự án giới hạn'});
 vi.spyOn(trigger,'getBoundingClientRect').mockImplementation(()=>rect(220-(inner.scrollTop-80),264-(inner.scrollTop-80)));
 fireEvent.click(trigger);
 const bounds=popupBounds(trigger,screen.getByRole('dialog',{name:'Dự án giới hạn'}));
 expect(bounds.top).toBeGreaterThanOrEqual(100);expect(bounds.bottom).toBeLessThanOrEqual(380);expect(bounds.height).toBeGreaterThanOrEqual(136);
 expect(inner.scrollTop).toBeGreaterThan(80);expect(outer.scrollTop).toBe(40);
});

test('respects a parent scroll limit and remeasures a visual viewport resize without scrolling again',()=>{
 const viewport=new EventTarget();Object.assign(viewport,{offsetTop:0,height:320});vi.stubGlobal('visualViewport',viewport);
 render(<main data-testid="limited-scrollport" style={{overflowY:'auto'}}>{standalone()}</main>);
 const main=screen.getByTestId('limited-scrollport');scrollport(main,77,320,500,743);
 const trigger=screen.getByRole('button',{name:'Dự án giới hạn'});
 vi.spyOn(trigger,'getBoundingClientRect').mockImplementation(()=>rect(100-(main.scrollTop-500),144-(main.scrollTop-500)));
 fireEvent.click(trigger);expect(main.scrollTop).toBe(500);
 const popup=screen.getByRole('dialog',{name:'Dự án giới hạn'});expect(popupBounds(trigger,popup).bottom).toBeLessThanOrEqual(320);
 act(()=>{viewport.height=300;viewport.dispatchEvent(new Event('resize'));});
 expect(main.scrollTop).toBe(500);expect(popupBounds(trigger,popup).bottom).toBeLessThanOrEqual(300);
});

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
