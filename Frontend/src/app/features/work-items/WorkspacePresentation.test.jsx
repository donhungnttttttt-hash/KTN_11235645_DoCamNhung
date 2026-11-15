import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {FeatureIssuesPage} from './FeatureIssuesPage';
import {TicketActionComposer} from './TicketActionComposer';
import {ProjectInformation} from '../projects/ProjectInformation';
import {IssueCreatePage} from './IssueCreatePage';
import {FeatureIssueForm} from './FeatureIssueForm';

it('opens comment controls on demand and preserves a collapsed draft without submitting',async()=>{
 const api={responsibilities:vi.fn().mockResolvedValue({members:[],canManage:false}),action:vi.fn()};
 render(<TicketActionComposer projectId={1} item={{id:1,key:'P-1',version:1,canComment:true,allowedTransitions:[{state:'IN_PROGRESS',columnId:'progress'}]}} api={api}/>);
 expect(screen.queryByLabelText('Trạng thái mới')).not.toBeInTheDocument();
 fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 expect(screen.getByLabelText('Trạng thái mới')).toBeVisible();
 fireEvent.change(screen.getByLabelText('Ghi chú Ticket'),{target:{value:'Giữ bản nháp'}});
 fireEvent.click(screen.getByRole('button',{name:'Xem trước'}));
 expect(screen.getByRole('region',{name:'Xem trước bình luận'})).toHaveTextContent('Giữ bản nháp');
 fireEvent.click(screen.getByRole('button',{name:'Thu gọn bình luận'}));
 expect(screen.queryByLabelText('Trạng thái mới')).not.toBeInTheDocument();
 fireEvent.focus(screen.getByLabelText('Ghi chú Ticket'));
 expect(screen.getByLabelText('Ghi chú Ticket')).toHaveValue('Giữ bản nháp');expect(api.action).not.toHaveBeenCalled();
});

it('loads tickets for every Kanban column independently and appends the next page',async()=>{
 const api={board:vi.fn().mockResolvedValue({columns:[{id:'new',count:21},{id:'progress',count:1}],totalItems:22,legacyCount:0}),list:vi.fn(async(p,q)=>({items:q.column==='new'?[{id:q.page?21:1,key:q.page?'P-21':'P-1',title:q.page?'Trang tiếp theo':'Lỗi mới',type:'BUG',boardColumn:'new'}]:q.column==='progress'?[{id:2,key:'P-2',title:'Đang sửa lỗi',type:'BUG',boardColumn:'progress'}]:[],totalItems:q.column==='new'?21:q.column==='progress'?1:0,totalPages:q.column==='new'?2:1,page:q.page}))};
 render(<FeatureIssuesPage projectId={1} api={api} featureApi={{list:async()=>({items:[],totalPages:0})}}/>);
 expect(await screen.findByText('Đang sửa lỗi')).toBeVisible();
 const column=screen.getByRole('region',{name:'Cột Chưa xử lý'});
 fireEvent.click(within(column).getByRole('button',{name:/Tải thêm/}));
 expect(await within(column).findByText('Trang tiếp theo')).toBeVisible();expect(within(column).getByText('Lỗi mới')).toBeVisible();
 await waitFor(()=>expect(api.list).toHaveBeenCalledWith(1,expect.objectContaining({column:'new',page:1}),expect.anything()));
});

it('uses the error navigation for creation rather than a duplicate issue table',async()=>{
 const api={list:vi.fn(),board:vi.fn()};
 render(<FeatureIssuesPage projectId={13} activeRoute="/issues?workspace=1" canCreate api={api} featureApi={{list:async()=>({items:[{id:18,name:'Đăng nhập'}],totalPages:1})}}/>);
 expect(await screen.findByRole('heading',{name:'Thêm lỗi'})).toBeVisible();
 expect(screen.getByLabelText('Đợt kiểm thử phát hiện lỗi')).toBeVisible();expect(screen.queryByRole('table')).not.toBeInTheDocument();expect(api.list).not.toHaveBeenCalled();
});

it('includes the project brief, input/output and unconfirmed exit criteria for the November example',()=>{
 render(<ProjectInformation project={{id:13,code:'T11-15',name:'Test tháng 11 ngày 15',description:'[DỮ LIỆU MẪU] Kiểm thử Flutter'}}/>);
 for(const name of ['I. Giới thiệu','1. Bối cảnh','2. Nội dung công việc','3. Thông tin về khách hàng','II. Tài liệu input','III. Tài liệu output','IV. Tiêu chí hoàn thành (Exit Criteria)'])expect(screen.getByRole('heading',{name})).toBeVisible();
 expect(screen.getByText(/Chưa xác nhận nghiệm thu/)).toBeVisible();
});

it('loads all document pages and prefills the selected case without importing its current status',async()=>{
 const featureApi={list:async()=>({items:[{id:18,name:'Login'}],totalPages:1}),documents:vi.fn(async(p,f,q)=>({items:q.page?[{id:42,fileName:'Second.xlsx'}]:[{id:41,fileName:'First.xlsx'}],totalPages:2}))};
 const documentApi={getDocument:vi.fn().mockResolvedValue({rows:[{rowId:3545,caseId:1,sourceId:'A1',cells:['A1','1','Login']}]})};
 const api={context:vi.fn().mockResolvedValue({title:'Login',steps:'Step from case',environmentName:'UAT',testVersionName:'v2',resultVersion:5,revisionId:7}),options:vi.fn().mockResolvedValue({assignees:[]})};
 render(<IssueCreatePage projectId={13} activeRoute="/issues" navigate={vi.fn()} api={api} featureApi={featureApi} documentApi={documentApi} canCreate/>);
 await screen.findByRole('option',{name:'Login'});fireEvent.change(screen.getByLabelText('Đợt kiểm thử phát hiện lỗi'),{target:{value:'18'}});
 await screen.findByRole('option',{name:'Second.xlsx'});fireEvent.change(screen.getByLabelText('File test case'),{target:{value:'42'}});
 await screen.findByRole('option',{name:'A1 · Login'});fireEvent.change(screen.getByLabelText('Case tham chiếu'),{target:{value:'3545'}});
 await waitFor(()=>expect(screen.getByLabelText('Môi trường phát hiện')).toHaveValue('UAT'));expect(screen.getByLabelText('Version lúc phát hiện')).toHaveValue('v2');
 expect(screen.getByLabelText('Các bước thực hiện')).toHaveValue('Step from case');
 fireEvent.change(screen.getByLabelText('Các bước thực hiện'),{target:{value:'Adjusted step'}});
 expect(screen.getByLabelText('Case tham chiếu')).toBeDisabled();expect(screen.getByLabelText('Đợt kiểm thử phát hiện lỗi')).toBeDisabled();
 expect(api.context).toHaveBeenCalledWith(13,18,42,3545,expect.anything());
});

it('previews the complete structured draft and saves all editor sections with source concurrency fields',async()=>{
 const onSaved=vi.fn(),api={context:vi.fn().mockResolvedValue({title:'Login',steps:'Steps',preconditions:'Ready',expectedResult:'Expected',actualResult:'Observed',environmentName:'UAT',resultVersion:5,revisionId:7}),options:vi.fn().mockResolvedValue({assignees:[{membershipId:11,displayName:'Coordinator'}]}),create:vi.fn().mockResolvedValue({id:9})};
 render(<FeatureIssueForm projectId={13} featureId={18} documentId={41} row={{rowId:3545}} presentation="page" api={api} onSaved={onSaved}/>);
 await waitFor(()=>expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Login'));
 fireEvent.change(screen.getByLabelText('Tần suất tái hiện'),{target:{value:'3/3'}});fireEvent.change(screen.getByLabelText('Thiết bị phát hiện'),{target:{value:'iPad'}});
 fireEvent.change(screen.getByLabelText('Người phụ trách'),{target:{value:'11'}});
 fireEvent.click(screen.getByRole('button',{name:'Xem trước'}));expect(screen.getByRole('region',{name:'Xem trước Ticket'})).toHaveTextContent('Ready');expect(api.create).not.toHaveBeenCalled();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu Ticket'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Lưu Ticket'}));await waitFor(()=>expect(onSaved).toHaveBeenCalledWith({id:9}));
 expect(api.create.mock.lastCall[1]).toMatchObject({featureId:18,documentId:41,rowId:3545,sourceRevisionId:7,sourceResultVersion:5,preconditions:'Ready',steps:'Steps',expectedResult:'Expected',actualResult:'Observed',environment:'UAT',frequency:'3/3',device:'iPad',ticketState:'NEW'});
});

it('retries a failed next column page without removing previously loaded cards',async()=>{
 let failed=false;const api={board:async()=>({columns:[{id:'new',count:21}],totalItems:21}),list:vi.fn(async(p,q)=>{
  if(q.column==='new'&&q.page===1&&!failed){failed=true;throw Error('Mất kết nối trang tiếp theo');}
  return {items:q.column==='new'?[{id:q.page?21:1,key:`P-${q.page?21:1}`,title:q.page?'Next card':'First card',type:'BUG',boardColumn:'new'}]:[],totalPages:q.column==='new'?2:0,page:q.page,totalItems:q.column==='new'?21:0};
 })};
 render(<FeatureIssuesPage projectId={1} api={api} featureApi={{list:async()=>({items:[],totalPages:0})}}/>);
 await screen.findByText('First card');const column=screen.getByRole('region',{name:'Cột Chưa xử lý'});fireEvent.click(within(column).getByRole('button',{name:/Tải thêm/}));
 await screen.findByText(/Mất kết nối trang tiếp theo/);expect(screen.getByText('First card')).toBeVisible();fireEvent.click(within(column).getByRole('button',{name:'Thử lại'}));
 expect(await screen.findByText('Next card')).toBeVisible();expect(screen.getByText('First card')).toBeVisible();
});

it('shows all creation fields and blocks an incomplete Monkey with native validation',async()=>{
 const api={options:vi.fn().mockResolvedValue({assignees:[{membershipId:11,displayName:'Coordinator'}]}),create:vi.fn()};
 render(<FeatureIssueForm projectId={13} featureId={18} monkey presentation="page" api={api}/>);
 await screen.findByRole('option',{name:'Coordinator'});fireEvent.change(screen.getByLabelText('Người phụ trách'),{target:{value:'11'}});
 for(const [label,value]of [['Tiêu đề','Bug'],['Tần suất tái hiện','3/3'],['Môi trường phát hiện','UAT'],['Thiết bị phát hiện','iPad']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu Ticket'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Lưu Ticket'}));expect(screen.getByLabelText('Các bước thực hiện')).toBeInvalid();for(const label of ['Mô tả','Điều kiện tiên quyết','Các bước thực hiện','Kết quả mong đợi','Kết quả thực tế'])expect(screen.getByLabelText(label)).toBeVisible();expect(screen.queryByRole('group',{name:'Các phần nội dung Ticket'})).not.toBeInTheDocument();expect(api.create).not.toHaveBeenCalled();
});
