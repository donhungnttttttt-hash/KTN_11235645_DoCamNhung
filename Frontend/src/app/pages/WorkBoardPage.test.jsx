import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkBoardPage } from './WorkBoardPage';
import { workItemsApi } from '../services/api/workItems';
const shared=vi.hoisted(()=>({data:null,queries:vi.fn()}));
vi.mock('../features/work-items/ProjectData',async importOriginal=>({...await importOriginal(),useProjectData:()=>{
  const [query,set]=React.useState({page:0,size:50});
  const setQuery=React.useCallback(next=>set(old=>{const result=typeof next==='function'?next(old):next;shared.queries(result);return result;}),[]);
  return {...shared.data,query,setQuery};
}}));
vi.mock('../features/auth/AuthProvider',()=>({useAuth:()=>({user:{id:'pm',displayName:'PM'}})}));
vi.mock('../services/api/workItems',()=>({workItemsApi:{transition:vi.fn(),batch:vi.fn(),get:vi.fn(),create:vi.fn()}}));
vi.mock('../services/api/testCases',()=>({testCasesApi:{listCases:vi.fn().mockResolvedValue({items:[]})}}));
const issue={id:'DEMO-7',serverId:7,title:'Lỗi đăng nhập',type:'Lỗi',typeCode:'BUG',status:'open',version:0,assignee:'Tester',priority:'Trung bình',created:'2026-09-29',updated:'2026-09-29'};
beforeEach(()=>{vi.clearAllMocks();shared.data={projectId:1,issues:[issue],metadata:{types:[{id:'BUG',label:'Lỗi'},{id:'TASK',label:'Công việc'}],statuses:[{id:'open',label:'Chưa xử lý',color:'#ee8080'},{id:'ready',label:'Sẵn sàng xử lý',color:'#db78a0'},{id:'closed',label:'Hoàn thành',terminal:true}]},catalogs:{members:[{membershipId:8,displayName:'Tester',username:'tester'}],categories:[{id:9,name:'AUTH'}],milestones:[{id:10,name:'M1'}]},canTriage:true,writable:true,loading:false,error:'',refresh:vi.fn(),totalItems:51,totalPages:2,page:0};});
it('opens the same numeric bug from the list and carries backend filter/pagination state',()=>{
  const navigate=vi.fn();render(<WorkBoardPage activeRoute="/board/list" navigate={navigate}/>);
  fireEvent.click(screen.getByRole('button',{name:'DEMO-7'}));expect(navigate).toHaveBeenCalledWith('/board/issue/7?view=list');
  for(const [label,value] of [['Loại','TASK'],['Trạng thái','ready'],['Người phụ trách','8'],['Từ khóa','Lỗi & ảnh']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
  fireEvent.click(screen.getByRole('button',{name:'Tìm kiếm nâng cao'}));
  fireEvent.change(screen.getByLabelText('Danh mục'),{target:{value:'9'}});fireEvent.change(screen.getByLabelText('Mốc phát hành'),{target:{value:'10'}});
  expect(shared.queries).toHaveBeenLastCalledWith(expect.objectContaining({type:'TASK',status:'ready',assignee:'8',category:'9',milestone:'10',keyword:'Lỗi & ảnh',page:0}));
  fireEvent.click(screen.getByRole('button',{name:'Tiếp'}));expect(shared.queries).toHaveBeenLastCalledWith(expect.objectContaining({page:1}));
  fireEvent.click(screen.getByRole('button',{name:'Trước'}));fireEvent.click(screen.getByRole('button',{name:'Xóa điều kiện'}));expect(shared.queries).toHaveBeenLastCalledWith({page:0,size:50,type:''});
  fireEvent.click(screen.getByRole('button',{name:'Ẩn bộ lọc'}));expect(screen.queryByLabelText('Loại')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Hiện bộ lọc'}));
  fireEvent.click(screen.getByRole('button',{name:'Thêm công việc'}));expect(navigate).toHaveBeenLastCalledWith('/board/new?view=list');
});
it('locks the bug view to BUG and hides PM operations for a tester',()=>{
  shared.data.canTriage=false;const navigate=vi.fn();render(<WorkBoardPage activeRoute="/issues?status=ready&keyword=demo" navigate={navigate}/>);
  expect(screen.getByLabelText('Loại')).toBeDisabled();expect(shared.queries).toHaveBeenLastCalledWith(expect.objectContaining({type:'BUG',status:'ready',keyword:'demo'}));
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Lỗi đăng nhập'}));expect(navigate).toHaveBeenCalledWith('/board/issue/7?view=bugs');
});
it('a failed Kanban move keeps the card in its persisted column and never reports success',async()=>{
  workItemsApi.transition.mockRejectedValue(new Error('Không thể chuyển trạng thái'));
  render(<WorkBoardPage activeRoute="/board" navigate={()=>{}}/>);
  const open=screen.getByRole('region',{name:'Cột Chưa xử lý'}),ready=screen.getByRole('region',{name:'Cột Sẵn sàng xử lý'});
  fireEvent.drop(ready,{dataTransfer:{getData:()=> 'DEMO-7'}});
  fireEvent.change(screen.getByLabelText('Lý do chuyển trạng thái'),{target:{value:'Đủ thông tin'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận chuyển'}));
  await screen.findByText('Không thể chuyển trạng thái');expect(within(open).getByText('DEMO-7')).toBeVisible();expect(within(ready).queryByText('DEMO-7')).not.toBeInTheDocument();expect(shared.data.refresh).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Hủy'}));fireEvent.drop(screen.getByRole('region',{name:'Cột Hoàn thành'}),{dataTransfer:{getData:()=> 'DEMO-7'}});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('batch selection uses canonical IDs and refreshes only after all items save',async()=>{
  shared.data.issues=[issue,{...issue,id:'DEMO-8',serverId:8,title:'Lỗi ảnh',version:3}];workItemsApi.batch.mockResolvedValue([]);
  render(<WorkBoardPage activeRoute="/board/list" navigate={()=>{}}/>);
  fireEvent.click(screen.getByLabelText('Chọn DEMO-7'));fireEvent.click(screen.getByLabelText('Chọn DEMO-8'));
  expect(within(screen.getByLabelText('Trạng thái hàng loạt')).queryByText('Hoàn thành')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Cập nhật hàng loạt'}));fireEvent.change(screen.getByLabelText('Lý do chuyển trạng thái'),{target:{value:'Sẵn sàng'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận chuyển'}));
  await screen.findByText('Đã lưu thay đổi.');expect(workItemsApi.batch).toHaveBeenCalledWith(1,expect.objectContaining({items:[{id:7,expectedVersion:0},{id:8,expectedVersion:3}]}));expect(shared.data.refresh).toHaveBeenCalledOnce();
});
it('exposes loading/retry and requires a project without rendering sample cards',()=>{
  shared.data.projectId=null;const {rerender}=render(<WorkBoardPage activeRoute="/board" navigate={()=>{}}/>);expect(screen.getByText('Chọn một dự án để xem công việc.')).toBeVisible();
  shared.data.projectId=1;shared.data.loading=true;rerender(<WorkBoardPage activeRoute="/board" navigate={()=>{}}/>);expect(screen.getByText('Đang tải công việc…')).toBeVisible();expect(screen.queryByText('DEMO-7')).not.toBeInTheDocument();
  shared.data.loading=false;shared.data.error='Không có quyền';rerender(<WorkBoardPage activeRoute="/board" navigate={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));expect(shared.data.refresh).toHaveBeenCalledOnce();
});
it('new task navigation waits for the server identity and returns to the originating list',async()=>{
  workItemsApi.create.mockResolvedValue({id:12,key:'DEMO-12'});const navigate=vi.fn();
  render(<WorkBoardPage activeRoute="/board/new?view=list" navigate={navigate}/>);
  fireEvent.change(screen.getByLabelText('Loại công việc'),{target:{value:'TASK'}});fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'Việc mới'}});fireEvent.click(screen.getByRole('button',{name:'Tạo công việc'}));
  await waitFor(()=>expect(navigate).toHaveBeenCalledWith('/board/issue/12?view=list'));expect(shared.data.refresh).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Đóng hộp thoại'}));expect(navigate).toHaveBeenLastCalledWith('/board/list');
});
