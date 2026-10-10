import React, { StrictMode } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

// Keep the real App lifecycle (including any global wheel listeners); only omit API-driven content.
vi.mock('./app/layouts/MainLayout',()=>({MainLayout:({children})=><main>{children}</main>}));
vi.mock('./app/routes/AppRouter',()=>({AppRouter:({navigate,activeRoute})=><>
  <button onClick={()=>navigate('/tests')}>Đổi màn</button><span>{activeRoute}</span>
  <section aria-label="Nội dung trang"><p>Trang dài</p></section>
  <div role="dialog" aria-label="Hộp thoại" style={{maxHeight:200,overflow:'auto'}}><p>Nội dung dài</p></div>
  <div role="region" aria-label="Bảng dữ liệu" style={{maxHeight:200,overflow:'auto'}}><p>Nhiều dòng và cột</p></div>
  <aside aria-label="Menu"><p>Danh mục dài</p></aside>
</>}));
beforeEach(()=>{
  window.location.hash='#/dashboard';
  vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}});
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
});
afterEach(()=>vi.unstubAllGlobals());

it.each([
  ['region','Nội dung trang',0,120],
  ['dialog','Hộp thoại',0,120],
  ['region','Bảng dữ liệu',0,-120],
  ['region','Bảng dữ liệu',120,20],
  ['complementary','Menu',0,120],
])('leaves native wheel scrolling available in %s %s', (role,name,deltaX,deltaY)=>{
  render(<StrictMode><App/></StrictMode>);
  const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX,deltaY});
  fireEvent(screen.getByRole(role,{name}).querySelector('p'),event);
  expect(event.defaultPrevented).toBe(false);
});
it('keeps wheel and zoom gestures available after navigating and remounting',()=>{
  const view=render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Đổi màn'}));
  expect(screen.getByText('/tests')).toBeVisible();
  for(const ctrlKey of [false,true]){
    const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:100,ctrlKey});
    fireEvent(screen.getByRole('dialog'),event);expect(event.defaultPrevented).toBe(false);
  }
  view.unmount();render(<App/>);
  expect(fireEvent.wheel(screen.getByRole('dialog'),{deltaY:100,cancelable:true})).toBe(true);
});
it.each(['','#/design/home'])('keeps native scrolling when opening the default or legacy route %s',hash=>{
  window.location.hash=hash;render(<App/>);
  expect(screen.getByText('/dashboard')).toBeVisible();
  expect(fireEvent.wheel(screen.getByRole('dialog'),{deltaY:120,cancelable:true})).toBe(true);
});

it('updates the browser title after navigation and browser Back', () => {
  render(<App/>);
  expect(document.title).toBe('Tổng quan dự án · TMS');
  fireEvent.click(screen.getByRole('button', {name:'Đổi màn'}));
  expect(document.title).toBe('Thư viện test case · TMS');
  window.location.hash = '#/tests/cycles'; fireEvent(window, new Event('hashchange'));
  expect(document.title).toBe('Đợt kiểm thử · TMS');
});
