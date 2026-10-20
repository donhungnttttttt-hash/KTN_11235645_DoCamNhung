import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {TestingFeaturesPage} from './TestingFeaturesPage';
import {featuresApi} from '../../services/api/features';
vi.mock('../../services/api/features',()=>({featuresApi:{list:vi.fn(),create:vi.fn(),archive:vi.fn(),restore:vi.fn(),update:vi.fn()}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role==='ADMIN'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Dự án thử',projectRole:'PM'}})}));
afterEach(()=>vi.unstubAllEnvs());
beforeEach(()=>{vi.resetAllMocks();featuresApi.list.mockResolvedValue({items:[{id:21,name:'Kiểm thử tháng10',environment:'Server riêng',description:'Đợt kiểm thử',createdAt:'2026-10-18T17:30:00Z',version:0,caseCount:5,testedCaseCount:3}],totalItems:1,totalPages:1});});
test('opens the chosen test round from project Features',async()=>{
  const open=vi.fn();render(<TestingFeaturesPage projectId={1} onOpenFeature={open}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Kiểm thử tháng10'}));
  expect(open).toHaveBeenCalledWith(21);
});
test('keeps Feature fields when saving fails',async()=>{
  featuresApi.create.mockRejectedValue(new Error('Mạng chưa ổn định'));
  render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Tạo Feature'}));
  fireEvent.change(screen.getByLabelText('Tên Feature'),{target:{value:'Đợt đang nhập'}});
  fireEvent.change(screen.getByLabelText('Môi trường / server'),{target:{value:'Server tự do'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu Feature'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Mạng chưa ổn định');
  expect(screen.getByLabelText('Tên Feature')).toHaveValue('Đợt đang nhập');expect(screen.getByLabelText('Môi trường / server')).toHaveValue('Server tự do');
});
test('shows measurable Feature progress without marking a nearly finished scope complete',async()=>{
 featuresApi.list.mockResolvedValue({items:[{id:21,name:'Gần hoàn tất',version:0,caseCount:200,testedCaseCount:199}],totalItems:1,totalPages:1});
 render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
 const progress=await screen.findByRole('progressbar',{name:'Tiến độ Gần hoàn tất'});
 expect(progress).toHaveAttribute('aria-valuenow','199');expect(progress).toHaveAttribute('aria-valuemax','200');
 expect(progress).toHaveAttribute('aria-valuetext','199/200 case · 99.5%');
 expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
});

test('applies combined server filters from page zero and clears them together',async()=>{
 const original={id:21,name:'Feature ban đầu',version:0,caseCount:5,testedCaseCount:3};
 featuresApi.list.mockImplementation(async(p,filters)=>filters.createdFrom
  ? {items:[{...original,id:99,name:'Feature ngày đã chọn'}],totalItems:1,totalPages:1}
  : {items:[original],totalItems:41,totalPages:3});
 render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
 await screen.findByRole('button',{name:'Feature ban đầu'});
 fireEvent.click(screen.getByRole('button',{name:'Trang sau'}));
 await screen.findByText('Trang 2/3');
 const calls=featuresApi.list.mock.calls.length;
 fireEvent.change(screen.getByLabelText('Tìm Feature'),{target:{value:'Server thử'}});
 fireEvent.change(screen.getByLabelText('Tạo từ ngày'),{target:{value:'2026-10-01'}});
 fireEvent.change(screen.getByLabelText('Đến hết ngày'),{target:{value:'2026-10-19'}});
 fireEvent.change(screen.getByLabelText('Sắp xếp'),{target:{value:'name-asc'}});
 fireEvent.click(screen.getByLabelText('Đã lưu trữ'));
 expect(featuresApi.list).toHaveBeenCalledTimes(calls);
 fireEvent.click(screen.getByRole('button',{name:'Áp dụng'}));
 expect(await screen.findByRole('button',{name:'Feature ngày đã chọn'})).toBeVisible();
 expect(featuresApi.list).toHaveBeenLastCalledWith(1,{page:0,keyword:'Server thử',archived:true,createdFrom:'2026-10-01',createdTo:'2026-10-19',sort:'name-asc'});
 expect(screen.getByText('Trang 1/1')).toBeVisible();
 expect(screen.getByRole('button',{name:'Khôi phục'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
 expect(await screen.findByRole('button',{name:'Feature ban đầu'})).toBeVisible();
 expect(screen.getByLabelText('Tìm Feature')).toHaveValue('');
 expect(screen.getByLabelText('Tạo từ ngày')).toHaveValue('');
 expect(screen.getByLabelText('Đến hết ngày')).toHaveValue('');
 expect(screen.getByLabelText('Đã lưu trữ')).not.toBeChecked();
 expect(screen.getByLabelText('Sắp xếp')).toHaveValue('created-desc');
 expect(screen.getByText('Trang 1/3')).toBeVisible();
});

test('rejects a reversed date range without requesting or replacing the visible list',async()=>{
 render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
 await screen.findByRole('button',{name:'Kiểm thử tháng10'});
 fireEvent.change(screen.getByLabelText('Tạo từ ngày'),{target:{value:'2026-10-19'}});
 fireEvent.change(screen.getByLabelText('Đến hết ngày'),{target:{value:'2026-10-01'}});
 fireEvent.click(screen.getByRole('button',{name:'Áp dụng'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Ngày bắt đầu không được sau ngày kết thúc');
 expect(screen.getByLabelText('Tạo từ ngày')).toHaveFocus();
 expect(featuresApi.list).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('button',{name:'Kiểm thử tháng10'})).toBeVisible();
});

test('shows the creation timestamp in Vietnam time to match the date filter',async()=>{
 render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
 expect(await screen.findByText(/19\/10\/2026/)).toHaveTextContent('00:30');
});

test('treats the actual timezone-less UTC backend timestamp as UTC',async()=>{
 vi.stubEnv('TZ','Asia/Ho_Chi_Minh');
 featuresApi.list.mockResolvedValue({items:[{id:21,name:'Ngày UTC',createdAt:'2026-10-18T17:30:00.000000',caseCount:0,testedCaseCount:0}],totalItems:1,totalPages:1});
 render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
 expect(await screen.findByText(/19\/10\/2026/)).toHaveTextContent('00:30');
});

test('keeps pagination locked while archiving and reloads the same applied page',async()=>{
 let finishArchive;
 featuresApi.archive.mockImplementation(()=>new Promise(resolve=>{finishArchive=resolve;}));
 featuresApi.list.mockResolvedValue({items:[{id:21,name:'Feature đang lưu trữ',version:0,caseCount:0,testedCaseCount:0}],totalItems:60,totalPages:3});
 render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
 await screen.findByRole('button',{name:'Feature đang lưu trữ'});
 fireEvent.click(screen.getByRole('button',{name:'Trang sau'}));
 await screen.findByText('Trang 2/3');
 fireEvent.click(screen.getByRole('button',{name:'Lưu trữ'}));
 expect(screen.getByRole('button',{name:'Trang trước'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Trang sau'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Trang sau'}));
 expect(featuresApi.list).toHaveBeenCalledTimes(2);
 finishArchive({});
 await waitFor(()=>expect(featuresApi.list).toHaveBeenCalledTimes(3));
 expect(featuresApi.list).toHaveBeenLastCalledWith(1,{page:1,keyword:'',archived:false,createdFrom:'',createdTo:'',sort:'created-desc'});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Trang sau'})).toBeEnabled());
 expect(screen.getByText('Trang 2/3')).toBeVisible();
});
