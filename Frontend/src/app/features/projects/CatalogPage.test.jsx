import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CatalogPage } from './CatalogPage';
import { projectsApi } from '../../services/api/projects';
let project;
vi.mock('./ProjectProvider',()=>({useProject:()=>({currentProject:project})}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:()=>false})}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listCatalog:vi.fn(),archiveCatalog:vi.fn(),createCatalog:vi.fn(),updateCatalog:vi.fn()}}));
beforeEach(()=>{vi.resetAllMocks();project={id:1,name:'Dự án A',projectRole:'PM'};projectsApi.listCatalog.mockResolvedValue([]);});
it('creates a catalog from the visible form and keeps the draft after a save error',async()=>{
  projectsApi.createCatalog.mockRejectedValueOnce(new Error('Mã đã tồn tại')).mockResolvedValue({id:1});
  render(<CatalogPage/>);await screen.findByText('Chưa có dữ liệu');fireEvent.click(screen.getByRole('button',{name:'Thêm mới'}));
  fireEvent.change(screen.getByLabelText('Mã'),{target:{value:'QA'}});fireEvent.change(screen.getByLabelText('Tên'),{target:{value:'Môi trường QA'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu danh mục'}));await screen.findByText('Mã đã tồn tại');expect(screen.getByLabelText('Tên')).toHaveValue('Môi trường QA');
  fireEvent.click(screen.getByRole('button',{name:'Lưu danh mục'}));await waitFor(()=>expect(projectsApi.createCatalog).toHaveBeenCalledTimes(2));
  expect(projectsApi.createCatalog).toHaveBeenLastCalledWith(1,'environments',{code:'QA',name:'Môi trường QA',description:''});
});
it('edits a catalog with optimistic version and reloads after cancelling a conflict',async()=>{
  projectsApi.listCatalog.mockResolvedValue([{id:4,code:'QA',name:'Tên cũ',description:'Mô tả',version:6,active:true}]);projectsApi.updateCatalog.mockRejectedValueOnce(new Error('Phiên bản cũ')).mockResolvedValue({});
  render(<CatalogPage/>);fireEvent.click(await screen.findByRole('button',{name:'Sửa',exact:true}));expect(screen.getByLabelText('Mã')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Tên'),{target:{value:'Tên mới'}});fireEvent.click(screen.getByRole('button',{name:'Lưu danh mục'}));await screen.findByText('Phiên bản cũ');
  expect(projectsApi.updateCatalog).toHaveBeenCalledWith(1,'environments',4,{name:'Tên mới',description:'Mô tả',expectedVersion:6});
  fireEvent.click(screen.getByText('Hủy'));await waitFor(()=>expect(projectsApi.listCatalog).toHaveBeenCalledTimes(2));
});
it('creates a build with dates and preserves optional empty dates as null',async()=>{
  projectsApi.createCatalog.mockResolvedValue({});render(<CatalogPage/>);fireEvent.click(screen.getByRole('button',{name:'Bản build',exact:true}));await screen.findByText('Chưa có dữ liệu');fireEvent.click(screen.getByRole('button',{name:'Thêm mới'}));
  fireEvent.change(screen.getByLabelText('Nền tảng'),{target:{value:'WEB'}});fireEvent.change(screen.getByLabelText('Phiên bản'),{target:{value:'1.0'}});fireEvent.click(screen.getByRole('button',{name:'Lưu danh mục'}));
  await waitFor(()=>expect(projectsApi.createCatalog).toHaveBeenCalledWith(1,'builds',{platform:'WEB',versionLabel:'1.0',buildNumber:'',notes:'',releasedAt:null}));
});
it('clears an existing build date explicitly instead of silently preserving it',async()=>{
  projectsApi.listCatalog.mockImplementation((_,kind)=>Promise.resolve(kind==='builds'?[{id:8,platform:'WEB',versionLabel:'1.0',buildNumber:'1',notes:'',releasedAt:'2026-09-30',version:3}]:[]));projectsApi.updateCatalog.mockResolvedValue({});
  render(<CatalogPage/>);fireEvent.click(screen.getByRole('button',{name:'Bản build',exact:true}));fireEvent.click(await screen.findByRole('button',{name:'Sửa',exact:true}));fireEvent.change(screen.getByLabelText('Ngày phát hành'),{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'Lưu danh mục'}));
  await waitFor(()=>expect(projectsApi.updateCatalog).toHaveBeenCalledWith(1,'builds',8,expect.objectContaining({releasedAt:null,clearDates:['releasedAt'],expectedVersion:3})));
});
it('ignores data from a previous project while its request completes late',async()=>{
  let resolveOld;projectsApi.listCatalog.mockReturnValueOnce(new Promise(resolve=>{resolveOld=resolve;}));
  const view=render(<CatalogPage/>);project={id:2,name:'Dự án B',projectRole:'PM'};
  projectsApi.listCatalog.mockResolvedValue([{id:2,code:'B',name:'Môi trường B',active:true}]);view.rerender(<CatalogPage/>);
  await screen.findByText('Môi trường B');
  await act(async()=>resolveOld([{id:1,code:'A',name:'Môi trường A',active:true}]));
  expect(screen.queryByText('Môi trường A')).not.toBeInTheDocument();expect(screen.getByText('Môi trường B')).toBeVisible();
});
it('retries failed loading and only reloads after archive succeeds',async()=>{
  projectsApi.listCatalog.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValue([{id:4,code:'QA',name:'QA',active:true,version:2}]);
  vi.spyOn(window,'confirm').mockReturnValue(true);projectsApi.archiveCatalog.mockResolvedValue();
  render(<CatalogPage/>);fireEvent.click(await screen.findByRole('button',{name:'Thử lại'}));
  fireEvent.click(await screen.findByRole('button',{name:'Lưu trữ'}));
  await waitFor(()=>expect(projectsApi.archiveCatalog).toHaveBeenCalledWith(1,'environments',4,2));
  await waitFor(()=>expect(projectsApi.listCatalog).toHaveBeenCalledTimes(3));
});
it('keeps tester read-only and shows an empty-project state',async()=>{
  project={id:1,name:'Dự án A',projectRole:'TESTER'};projectsApi.listCatalog.mockResolvedValue([{id:4,code:'QA',name:'Môi trường QA',active:true}]);
  const view=render(<CatalogPage/>);await screen.findByText('Môi trường QA');expect(screen.queryByRole('button',{name:'Lưu trữ'})).not.toBeInTheDocument();
  project=null;view.rerender(<CatalogPage/>);expect(screen.getByText('Vui lòng chọn một dự án.')).toBeVisible();
});
it.each([
  ['Bản build','builds',{id:9,platform:'WEB',versionLabel:'Build kiểm chứng',buildNumber:'123',releasedAt:'2026-09-30'},'Build kiểm chứng'],
  ['Thiết bị','devices',{id:9,code:'PHONE',name:'Thiết bị kiểm chứng',osName:'Android',osVersion:'15'},'Thiết bị kiểm chứng'],
  ['Danh mục','categories',{id:9,code:'CAT',name:'Danh mục kiểm chứng'},'Danh mục kiểm chứng'],
  ['Mốc phát hành','milestones',{id:9,code:'R1',name:'Mốc đã lưu trữ',startsOn:'2026-09-01',dueOn:'2026-09-30',archived:true},'Mốc đã lưu trữ'],
])('uses the API fields for %s and keeps archive state',async(label,kind,row,name)=>{
  projectsApi.listCatalog.mockImplementation((_,type)=>Promise.resolve(type===kind?[row]:[]));
  render(<CatalogPage/>);fireEvent.click(screen.getByRole('button',{name:label,exact:true}));await screen.findByText(name);
  expect(projectsApi.listCatalog).toHaveBeenLastCalledWith(1,kind);
  if(row.archived)expect(screen.queryByRole('button',{name:'Lưu trữ'})).not.toBeInTheDocument();
});
it('does not send a cancelled archive and reports a failed archive without claiming success',async()=>{
  projectsApi.listCatalog.mockResolvedValue([{id:4,code:'QA',name:'Môi trường QA'}]);
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);projectsApi.archiveCatalog.mockRejectedValue(new Error('Không có quyền'));
  render(<CatalogPage/>);fireEvent.click(await screen.findByRole('button',{name:'Lưu trữ'}));expect(projectsApi.archiveCatalog).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Lưu trữ'}));await screen.findByRole('alert');
  expect(screen.getByText('Không có quyền')).toBeVisible();expect(projectsApi.listCatalog).toHaveBeenCalledTimes(1);
});
it('ignores a previous catalog tab response and safely renders stored markup',async()=>{
  let resolveOld;projectsApi.listCatalog.mockReturnValueOnce(new Promise(resolve=>{resolveOld=resolve;}));
  const text='<img src=x onerror=alert(1)>';
  projectsApi.listCatalog.mockResolvedValue([{id:9,code:'DEVICE',name:text}]);
  const {container}=render(<CatalogPage/>);fireEvent.click(screen.getByRole('button',{name:'Thiết bị'}));await screen.findByText(text);
  await act(async()=>resolveOld([{id:4,code:'OLD',name:'Môi trường cũ'}]));
  expect(screen.queryByText('Môi trường cũ')).not.toBeInTheDocument();expect(container.querySelector('img')).toBeNull();
});
