import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {WorkBoardPage} from './WorkBoardPage';
import {featureIssuesApi} from '../services/api/featureIssues';

// FR04 replaces generic Task/batch/run routes with Feature-owned Bug/QA. Test the active entry.
const state=vi.hoisted(()=>({project:null,role:'PM'}));
vi.mock('../features/projects/ProjectProvider',()=>({useProject:()=>({currentProject:state.project})}));
vi.mock('../features/auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role===state.role})}));
vi.mock('../services/api/features',()=>({featuresApi:{list:vi.fn().mockResolvedValue({items:[{id:8,name:'Vòng A'}],totalPages:1})}}));
vi.mock('../services/api/featureIssues',()=>({featureIssuesApi:{list:vi.fn()}}));
const items=[{id:7,key:'P-7',title:'Lỗi đăng nhập',type:'BUG',status:'open',featureName:'Vòng A'},
 {id:9,key:'P-9',title:'Câu hỏi nguồn',type:'QA',status:'open',featureName:'Vòng A'}];
beforeEach(()=>{vi.clearAllMocks();state.project={id:1,projectRole:'PM',archived:false};state.role='PM';featureIssuesApi.list.mockResolvedValue({items,totalItems:21,totalPages:2});});

it('shows both Bug and QA, and keeps separate Kanban and list views',async()=>{
 const navigate=vi.fn(),view=render(<WorkBoardPage activeRoute="/board" navigate={navigate}/>);
 expect(await screen.findByText('Lỗi đăng nhập')).toBeVisible();expect(screen.getByText('Câu hỏi nguồn')).toBeVisible();
 expect(screen.getByLabelText('Bảng trạng thái Bug và QA')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Danh sách',exact:true}));expect(navigate.mock.lastCall[0]).toMatch(/^\/board\/list\?/);
 view.rerender(<WorkBoardPage activeRoute="/board/list" navigate={navigate}/>);
 expect(screen.getByRole('table')).toBeVisible();expect(screen.queryByLabelText('Bảng trạng thái Bug và QA')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Kanban',exact:true}));expect(navigate.mock.lastCall[0]).not.toContain('view=list');
});
it('filters Bug/QA by Feature and sends paging to the server',async()=>{
 render(<WorkBoardPage activeRoute="/board/list" navigate={vi.fn()}/>);await screen.findByText('Lỗi đăng nhập');
 fireEvent.change(screen.getByLabelText('Feature'),{target:{value:'8'}});fireEvent.change(screen.getByLabelText('Loại'),{target:{value:'QA'}});
 fireEvent.change(screen.getByLabelText('Tìm Issue'),{target:{value:'NHUNG cam'}});
 await waitFor(()=>expect(featureIssuesApi.list.mock.lastCall[1]).toMatchObject({featureId:'8',type:'QA',keyword:'NHUNG cam',page:0}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Tiếp',exact:true})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Tiếp',exact:true}));await waitFor(()=>expect(featureIssuesApi.list.mock.lastCall[1].page).toBe(1));
 expect(screen.queryByRole('option',{name:'Công việc'})).toBeNull();
});
it('opens the canonical issue identity and carries source list filters',async()=>{
 const navigate=vi.fn();render(<WorkBoardPage activeRoute="/board/list?featureId=8&keyword=nguon" navigate={navigate}/>);
 fireEvent.click(await screen.findByRole('button',{name:'P-7'}));
 expect(navigate.mock.lastCall[0]).toMatch(/^\/board\/issue\/7\?/);
 const query=new URLSearchParams(navigate.mock.lastCall[0].split('?')[1]);expect(query.get('featureId')).toBe('8');expect(query.get('keyword')).toBe('nguon');expect(query.get('view')).toBe('list');
});
it('offers only the defined monkey creation point in error management',async()=>{
 const view=render(<WorkBoardPage activeRoute="/issues" navigate={vi.fn()}/>);await screen.findByText('Lỗi đăng nhập');
 expect(screen.getByRole('button',{name:'Ghi lỗi monkey'})).toBeEnabled();expect(screen.queryByRole('button',{name:'Thêm công việc'})).toBeNull();
 view.rerender(<WorkBoardPage activeRoute="/board" navigate={vi.fn()}/>);expect(screen.queryByRole('button',{name:'Ghi lỗi monkey'})).toBeNull();
});
it.each([{role:'TESTER',archived:false,allowed:true},{role:'DEV',archived:false,allowed:false},{role:'PM',archived:true,allowed:false},{role:'ADMIN',archived:false,allowed:true}])('respects active project creation rights %j',async({role,archived,allowed})=>{
 state.role=role;state.project={id:1,projectRole:role==='ADMIN'?null:role,archived};render(<WorkBoardPage activeRoute="/issues" navigate={vi.fn()}/>);
 await screen.findByText('Lỗi đăng nhập');expect(!!screen.queryByRole('button',{name:'Ghi lỗi monkey'})).toBe(allowed);
});
it('requires a selected project without fetching issue data',()=>{
 state.project=null;render(<WorkBoardPage activeRoute="/board" navigate={vi.fn()}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Chọn dự án');expect(featureIssuesApi.list).not.toHaveBeenCalled();
});
it('explains retired generic creation and opens the actual testing entry',()=>{
 const navigate=vi.fn();render(<WorkBoardPage activeRoute="/board/new?view=list" navigate={navigate}/>);
 expect(screen.getByText(/Dùng nút Issue ở case/)).toBeVisible();expect(screen.queryByRole('form')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Mở Quản lý kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/board/testing?projectId=1');expect(featureIssuesApi.list).not.toHaveBeenCalled();
});
it('shows load failure and retries without rendering invented cards',async()=>{
 featureIssuesApi.list.mockRejectedValueOnce(new Error('Không tải được Issue'));
 render(<WorkBoardPage activeRoute="/board/list" navigate={vi.fn()}/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được Issue');expect(screen.queryByText('Lỗi đăng nhập')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Tải lại',exact:true}));expect(await screen.findByText('Lỗi đăng nhập')).toBeVisible();expect(featureIssuesApi.list).toHaveBeenCalledTimes(2);
});
