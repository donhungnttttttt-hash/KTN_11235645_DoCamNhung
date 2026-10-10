import React from 'react';
import {render,screen,fireEvent,act} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {TableScroll} from './TableScroll';

afterEach(()=>vi.unstubAllGlobals());
const table=<table><thead><tr><th>Mã</th></tr></thead><tbody><tr><td>DEMO-01</td></tr></tbody></table>;

it('provides a named keyboard focus target without replacing table semantics',()=>{
  render(<TableScroll label="Danh sách công việc">{table}</TableScroll>);
  const region=screen.getByRole('region',{name:'Danh sách công việc'});
  expect(region).toHaveAttribute('tabindex','0');
  region.focus();expect(region).toHaveFocus();
  expect(screen.getByRole('columnheader',{name:'Mã'})).toBeInTheDocument();
  expect(screen.queryByText(/Kéo thanh cuộn ngang/)).not.toBeInTheDocument();
});

it('shows horizontal scrolling guidance only while columns overflow and updates on resize',()=>{
  let notify;const disconnect=vi.fn();
  vi.stubGlobal('ResizeObserver',class {constructor(callback){notify=callback;}observe(){}disconnect(){disconnect();}});
  const view=render(<TableScroll label="Kho máy">{table}</TableScroll>);
  const region=screen.getByRole('region',{name:'Kho máy'});
  Object.defineProperties(region,{clientWidth:{configurable:true,value:300},scrollWidth:{configurable:true,value:900}});
  act(()=>notify());
  const hint=screen.getByText(/Kéo thanh cuộn ngang/);
  expect(region.getAttribute('aria-describedby')).toBe(hint.id);
  Object.defineProperty(region,'clientWidth',{value:1000});
  act(()=>notify());expect(screen.queryByText(/Kéo thanh cuộn ngang/)).not.toBeInTheDocument();
  view.unmount();expect(disconnect).toHaveBeenCalled();
});

it('retains working row actions inside the scroll region',()=>{
  const open=vi.fn();render(<TableScroll label="Thiết bị"><table><tbody><tr><td><button onClick={open}>Sửa máy</button></td></tr></tbody></table></TableScroll>);
  fireEvent.click(screen.getByRole('button',{name:'Sửa máy'}));expect(open).toHaveBeenCalledOnce();
});
