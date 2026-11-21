import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {FeatureIssuesPage} from './FeatureIssuesPage';
import userEvent from '@testing-library/user-event';

it.each(['/board','/board/list','/issues'])('does not expose separate ticket responsibility setup on %s',async activeRoute=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0}),board:vi.fn().mockResolvedValue({columns:[],totalItems:0})},featureApi={list:vi.fn().mockResolvedValue({items:[],totalPages:0})};
 render(<FeatureIssuesPage projectId={1} activeRoute={activeRoute} api={api} featureApi={featureApi}/>);
 await waitFor(()=>expect(featureApi.list).toHaveBeenCalled());
 expect(screen.queryByRole('button',{name:'Trách nhiệm Ticket'})).not.toBeInTheDocument();
});

it('keeps list filters but removes them when switching to Kanban without hidden type or column restrictions',async()=>{
 const navigate=vi.fn(),api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0}),board:vi.fn().mockResolvedValue({columns:[],totalItems:0})},featureApi={list:vi.fn().mockResolvedValue({items:[{id:2,name:'Đợt kiểm thử A'}],totalPages:1})};
 const view=render(<FeatureIssuesPage projectId={1} activeRoute="/board/list?featureId=2&keyword=login&type=QA&column=verify" api={api} featureApi={featureApi} navigate={navigate}/>);
 await screen.findByRole('option',{name:'Đợt kiểm thử A'});
 expect(screen.getByLabelText('Loại')).toHaveValue('QA');expect(screen.getByLabelText('Trạng thái')).toHaveValue('verify');
 fireEvent.click(screen.getByRole('button',{name:'Kanban'}));
 const route=navigate.mock.lastCall[0],query=new URLSearchParams(route.split('?')[1]);
 expect(query.get('type')).toBeNull();expect(query.get('column')).toBeNull();expect(query.get('featureId')).toBe('2');expect(query.get('keyword')).toBe('login');
 view.rerender(<FeatureIssuesPage projectId={1} activeRoute={route} api={api} featureApi={featureApi} navigate={navigate}/>);
 expect(screen.queryByLabelText('Loại')).not.toBeInTheDocument();expect(screen.queryByLabelText('Trạng thái')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Tìm ticket')).toHaveValue('login');
 await waitFor(()=>expect(api.list.mock.lastCall[1]).toMatchObject({type:'',column:'converted',featureId:'2',keyword:'login',page:0}));
});

it('ignores a hidden type filter in a direct Kanban link while retaining visible column selection',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0}),board:vi.fn().mockResolvedValue({columns:[],totalItems:0})},featureApi={list:vi.fn().mockResolvedValue({items:[],totalPages:0})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/board?type=QA&column=verify" api={api} featureApi={featureApi}/>);
 await waitFor(()=>expect(api.list).toHaveBeenCalled());
 expect(api.list).toHaveBeenCalledWith(1,expect.objectContaining({type:'',column:'verify'}),expect.anything());expect(api.board.mock.lastCall[1].type).toBe('');
 expect(screen.queryByLabelText('Loại')).not.toBeInTheDocument();expect(screen.queryByLabelText('Trạng thái')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Xem tất cả cột'})).toBeInTheDocument();
});

it('opens creation for old deleted Monkey links without exposing the removed screen',async()=>{
 const api={list:vi.fn(),board:vi.fn(),restore:vi.fn()},featureApi={list:vi.fn().mockResolvedValue({items:[],totalPages:0})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/issues?deleted=true&page=1&keyword=Monkey" api={api} featureApi={featureApi} canCreate/>);
 expect(await screen.findByRole('heading',{name:'Thêm lỗi'})).toBeVisible();
 await waitFor(()=>expect(featureApi.list).toHaveBeenCalled());
 expect(screen.queryByRole('heading',{name:'Monkey đã xóa'})).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Hiển thị lỗi')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Khôi phục Monkey/})).not.toBeInTheDocument();
 expect(api.list).not.toHaveBeenCalled();expect(api.restore).not.toHaveBeenCalled();
});
it('ignores the retired deleted flag on board list links',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalPages:0,totalItems:0}),board:vi.fn().mockResolvedValue({columns:[],totalItems:0})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/board/list?deleted=true" api={api} featureApi={{list:async()=>({items:[],totalPages:0})}}/>);
 await waitFor(()=>expect(api.list).toHaveBeenCalledWith(1,expect.objectContaining({deleted:false}),expect.anything()));
 expect(screen.queryByLabelText('Hiển thị lỗi')).not.toBeInTheDocument();
});

it('discards a creation draft only after confirmation and unlocks its source',async()=>{
 const user=userEvent.setup(),api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})},featureApi={list:async()=>({items:[{id:1,name:'Đợt kiểm thử A'}],totalPages:1})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/issues" api={api} featureApi={featureApi} canCreate/>);
 await screen.findByRole('option',{name:'Đợt kiểm thử A'});
 await user.selectOptions(screen.getByLabelText('Nguồn phát hiện'),'monkey');
 await user.selectOptions(screen.getByLabelText('Đợt kiểm thử phát hiện lỗi'),'1');
 await user.type(screen.getByLabelText('Tiêu đề'),'Nháp');await user.click(screen.getByRole('button',{name:'Soạn lại / đổi nguồn'}));
 expect(screen.getByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByLabelText('Tiêu đề')).toHaveValue('');expect(screen.getByLabelText('Đợt kiểm thử phát hiện lỗi')).toBeEnabled();
});

it('replaces error management with a dedicated creation screen',async()=>{
 const api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:vi.fn().mockResolvedValue({items:[{id:1,key:'P-1',type:'BUG',title:'Bug title',featureName:'A',status:'open',boardColumn:'new'},{id:2,key:'P-2',type:'QA',title:'QA title',featureName:'B',status:'open',boardColumn:'new'}],totalItems:2,page:0,size:20,totalPages:1})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/issues" api={api} featureApi={{list:async()=>({items:[],totalPages:1})}} navigate={vi.fn()} canCreate/>);
 expect(await screen.findByRole('heading',{name:'Thêm lỗi'})).toBeInTheDocument();expect(screen.queryByText('Bug title')).not.toBeInTheDocument();expect(screen.queryByText('QA title')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Nguồn phát hiện')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Thêm công việc'})).toBeNull();
 expect(api.list).not.toHaveBeenCalled();
});
it('switches from the list to Kanban without retaining the list view flag',async()=>{
 const navigate=vi.fn();const api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/board/list" api={api} featureApi={{list:async()=>({items:[],totalPages:0})}} navigate={navigate}/>);
 fireEvent.click(screen.getByRole('button',{name:'Kanban'}));
 expect(navigate.mock.calls[0][0]).not.toContain('view=list');
 expect(navigate.mock.calls[0][0]).toMatch(/^\/board\?/);
});
it('restores server filters when browser navigation changes the linked list scope',async()=>{
 const api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})},featureApi={list:vi.fn().mockResolvedValue({items:[{id:1,name:'A'},{id:2,name:'B'}],totalPages:1})};
 const view=render(<FeatureIssuesPage projectId={1} activeRoute="/board/list?featureId=1&keyword=nhung" api={api} featureApi={featureApi}/>);
 await waitFor(()=>expect(screen.getByLabelText('Đợt kiểm thử')).toHaveValue('1'));
 view.rerender(<FeatureIssuesPage projectId={1} activeRoute="/board/list?featureId=2&keyword=cam&column=new" api={api} featureApi={featureApi}/>);
 await waitFor(()=>expect(api.list.mock.lastCall[1]).toMatchObject({featureId:'2',keyword:'cam',column:'new'}));
 expect(screen.getByLabelText('Đợt kiểm thử')).toHaveValue('2');expect(screen.getByLabelText('Tìm ticket')).toHaveValue('cam');
});
it('keeps project and changed filters in reloadable URLs and issue links',async()=>{
 const previous=window.location.href,navigate=vi.fn(),api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:vi.fn().mockResolvedValue({items:[{id:7,key:'A-7',type:'BUG',title:'Lỗi đăng nhập',status:'open',boardColumn:'new'}],totalItems:1,totalPages:1})},featureApi={list:vi.fn().mockResolvedValue({items:[],totalPages:0})};
 try{window.history.replaceState(null,'','#/board/list?projectId=42&workspace=1');render(<FeatureIssuesPage projectId={42} activeRoute="/board/list?projectId=42&workspace=1" api={api} featureApi={featureApi} navigate={navigate}/>);
 await screen.findByText('Lỗi đăng nhập');fireEvent.change(screen.getByLabelText('Tìm ticket'),{target:{value:'đăng nhập'}});
 const query=new URLSearchParams(window.location.hash.split('?')[1]);expect(query.get('projectId')).toBe('42');expect(query.get('keyword')).toBe('đăng nhập');expect(query.get('workspace')).toBe('1');
 fireEvent.click(await screen.findByRole('button',{name:'A-7'}));expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/board\/issue\/7\?/));expect(new URLSearchParams(navigate.mock.lastCall[0].split('?')[1]).get('projectId')).toBe('42');
 }finally{window.history.replaceState(null,'',previous);}
});
it('keeps a monkey draft attached to its Đợt kiểm thử until it is explicitly discarded',async()=>{
 const api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})},featureApi={list:async()=>({items:[{id:1,name:'Đợt kiểm thử A'},{id:2,name:'Đợt kiểm thử B'}],totalPages:1})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/issues" api={api} featureApi={featureApi} canCreate/>);await screen.findByRole('option',{name:'Đợt kiểm thử A'});fireEvent.change(screen.getByLabelText('Nguồn phát hiện'),{target:{value:'monkey'}});
 fireEvent.change(screen.getByLabelText('Đợt kiểm thử phát hiện lỗi'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'Nháp cho Đợt kiểm thử A'}});
 await waitFor(()=>expect(screen.getByLabelText('Đợt kiểm thử phát hiện lỗi')).toBeDisabled());expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Nháp cho Đợt kiểm thử A');
});

it('keeps empty Kanban columns discoverable and lets keyboard users reach the horizontal board',async()=>{
 const user=userEvent.setup(),api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:async()=>({items:[],totalItems:0,totalPages:0})},featureApi={list:async()=>({items:[],totalPages:0})};
 render(<FeatureIssuesPage projectId={1} api={api} featureApi={featureApi}/>);
 const board=await screen.findByRole('region',{name:'Bảng trạng thái Bug và QA'});
 const open=within(board).getByRole('region',{name:'Cột Chưa xử lý'});
 expect(await within(open).findByText('Chưa có Ticket')).toBeVisible();
 expect(within(open).getByLabelText('1 Ticket theo bộ lọc')).toBeVisible();
 expect(within(board).getAllByRole('region')).toHaveLength(10);
 screen.getByLabelText('Tìm ticket').focus();for(let i=0;i<8&&document.activeElement!==board;i++)await user.tab();
 expect(board).toHaveFocus();
});

it('groups real cards by status and keeps page counts distinct from the project total',async()=>{
 const api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:async()=>({items:[{id:7,key:'A-7',type:'BUG',title:'Lỗi đăng nhập',featureName:'Đăng nhập',assignee:'Tester A',status:'open',boardColumn:'new',canTransition:false},{id:8,key:'A-8',type:'QA',title:'Xác nhận thiết kế',featureName:'Thiết kế',status:'progress',boardColumn:'progress',canTransition:false}],totalItems:99,totalPages:5})};
 render(<FeatureIssuesPage projectId={1} api={api} featureApi={{list:async()=>({items:[],totalPages:0})}}/>);
 const open=await screen.findByRole('region',{name:'Cột Chưa xử lý'}),progress=screen.getByRole('region',{name:'Cột Đang xử lý'});
 expect(await within(open).findByRole('button',{name:'Lỗi đăng nhập'})).toBeVisible();
 expect(within(open).queryByRole('button',{name:'Xác nhận thiết kế'})).not.toBeInTheDocument();
 expect(within(progress).getByRole('button',{name:'Xác nhận thiết kế'})).toBeVisible();
 expect(within(open).getByLabelText('1 Ticket theo bộ lọc')).toBeVisible();
 expect(within(progress).getByLabelText('1 Ticket theo bộ lọc')).toBeVisible();
 expect(within(open).queryByRole('combobox')).not.toBeInTheDocument();
});

it('opens confirmation when a permitted card is dropped and preserves workspace filters',async()=>{
 const navigate=vi.fn(),api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:async()=>({items:[{id:7,key:'A-7',type:'BUG',title:'Lỗi đăng nhập',featureName:'Đăng nhập',status:'open',boardColumn:'new',canTransition:true,allowedTransitions:[{state:'IN_PROGRESS',columnId:'progress',label:'Đang xử lý'}]}],totalItems:1,totalPages:1})};
 render(<FeatureIssuesPage projectId={42} activeRoute="/board?workspace=1&keyword=login" navigate={navigate} api={api} featureApi={{list:async()=>({items:[],totalPages:0})}}/>);
 const destination=await screen.findByRole('region',{name:'Cột Đang xử lý'});
 fireEvent.drop(destination,{dataTransfer:{getData:()=> '7'}});
 expect(navigate).toHaveBeenCalledTimes(1);
 const [path,query]=navigate.mock.lastCall[0].split('?'),params=new URLSearchParams(query);
 expect(path).toBe('/board/issue/7');expect(params.get('projectId')).toBe('42');expect(params.get('workspace')).toBe('1');expect(params.get('keyword')).toBe('login');
});

it('rejects a card drop outside allowed status transitions with visible feedback',async()=>{
 const navigate=vi.fn(),api={board:vi.fn().mockResolvedValue({columns:[{id:'spec',count:0},{id:'new',count:1},{id:'progress',count:1},{id:'verify',count:0},{id:'processed',count:0},{id:'fixed',count:0},{id:'cannot_reproduce',count:0},{id:'wont_fix',count:0},{id:'unsupported',count:0}],legacyCount:0,totalItems:99}),options:vi.fn().mockResolvedValue({assignees:[]}),list:async()=>({items:[{id:7,key:'A-7',type:'BUG',title:'Lỗi đăng nhập',status:'open',boardColumn:'new',canTransition:true,allowedTransitions:[{state:'IN_PROGRESS',columnId:'progress',label:'Đang xử lý'}]}],totalItems:1,totalPages:1})};
 render(<FeatureIssuesPage projectId={1} navigate={navigate} api={api} featureApi={{list:async()=>({items:[],totalPages:0})}}/>);
 fireEvent.drop(await screen.findByRole('region',{name:'Cột Đóng – Đã sửa'}),{dataTransfer:{getData:()=> '7'}});
 expect(navigate).not.toHaveBeenCalled();expect(screen.getByRole('status')).toHaveTextContent('Bạn không có quyền chuyển Ticket sang trạng thái này.');
});

it('exposes incoming legacy status and clears it when choosing any canonical column without inventing Fixed',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0}),board:vi.fn().mockResolvedValue({columns:[],legacyCount:1,totalItems:1})},featureApi={list:vi.fn().mockResolvedValue({items:[],totalPages:0})};
 const view=render(<FeatureIssuesPage projectId={1} activeRoute="/board/list?status=closed" api={api} featureApi={featureApi}/>);
 expect(await screen.findByRole('button',{name:'Bỏ lọc trạng thái lịch sử'})).toBeInTheDocument();expect(api.list.mock.lastCall[1]).toMatchObject({status:'closed',column:''});
 fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:'new'}});await waitFor(()=>expect(api.list.mock.lastCall[1]).toMatchObject({column:'new',status:''}));
 expect(screen.queryByRole('button',{name:'Bỏ lọc trạng thái lịch sử'})).not.toBeInTheDocument();
 view.rerender(<FeatureIssuesPage projectId={1} activeRoute="/board/list?status=closed&page=0" api={api} featureApi={featureApi}/>);await screen.findByRole('button',{name:'Bỏ lọc trạng thái lịch sử'});
 fireEvent.click(screen.getByRole('button',{name:'Bỏ lọc trạng thái lịch sử'}));await waitFor(()=>expect(api.list.mock.lastCall[1]).toMatchObject({status:'',column:''}));expect(api.list.mock.calls.every(([,filter])=>filter.column!=='fixed')).toBe(true);
 view.rerender(<FeatureIssuesPage projectId={1} activeRoute="/board/list?status=resolved&column=progress" api={api} featureApi={featureApi}/>);await screen.findByRole('button',{name:'Bỏ lọc trạng thái lịch sử'});fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:''}});await waitFor(()=>expect(api.list.mock.lastCall[1]).toMatchObject({status:'',column:''}));
});
