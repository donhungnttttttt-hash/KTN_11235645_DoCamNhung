import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { FileWorkPage } from './FileWorkPage';
import { FileWorkDetail, qaContextUrl } from './FileWorkDetail';
import { fileWorkApi } from '../../services/api/fileWork';
import { executionApi } from '../../services/api/execution';
import { projectsApi } from '../../services/api/projects';
import { testCasesApi } from '../../services/api/testCases';
import { apiRequest } from '../../services/api/client';
import { workItemsApi } from '../../services/api/workItems';
import { documentDate } from '../test-cases/documentDownload';
const context = vi.hoisted(() => ({ currentProject: { id: 1, projectRole: 'PM', name: 'Project' } }));
vi.mock('../projects/ProjectProvider', () => ({ useProject: () => context }));
vi.mock('../../services/api/fileWork', async importOriginal => ({ ...await importOriginal(),fileWorkApi: Object.fromEntries(['preparation','metadata','list','detail','execution','eligibleAllocations','start','pause','resume','complete','cancel','assign','record','export','preview','create','history','sessions'].map(k => [k,vi.fn()])) }));
vi.mock('../../services/api/execution', () => ({ executionApi: Object.fromEntries(['cycles','cycle','configurations','attempts'].map(k => [k,vi.fn()])) }));
vi.mock('../../services/api/projects', () => ({ projectsApi: {listCatalog:vi.fn(),listMembers:vi.fn()} }));
vi.mock('../../services/api/workItems', () => ({ workItemsApi:{metadata:vi.fn(),list:vi.fn(),link:vi.fn()} }));
vi.mock('../../services/api/testCases', () => ({ testCasesApi: {listDocuments:vi.fn(),getDocument:vi.fn()} }));
vi.mock('../../services/api/client', async importOriginal => ({...await importOriginal(),apiRequest:vi.fn()}));
const page = items => ({items,totalItems:items.length,page:0,pageSize:20,totalPages:1});
const session = {id:9,version:2,buildId:6,allocationId:11,assetCode:'IPAD-01',state:'DOING',executorName:'Lan',capabilities:{canPause:true,canComplete:true}};
const group = {milestoneId:null,milestoneName:null,milestoneDueOn:null,startedAt:null,updatedAt:'2026-10-01T00:00:00Z',latestActivityAt:'2026-10-01T00:00:00Z',id:3,documentId:4,fileName:'test.xlsx',cycleId:5,cycleName:'Cycle',configurationId:7,version:8,state:'DOING',assignmentState:'CONSISTENT',assigneeName:'Lan',currentSessionId:9,selectedBuildId:6,capabilities:{canRecord:true,canExport:true}};
const row = {runItemId:10,revisionId:12,runVersion:4,caseNo:'TC-01',revisionNo:1,titleVi:'Pinned title',resultCode:'NOT_RUN',cells:['Pinned title','extra'],sourceCells:['Source title','extra']};
function detail(g=group,s=session,r=row) { fileWorkApi.detail.mockResolvedValue({group:g,items:[r],sessions:s?[s]:[]}); fileWorkApi.execution.mockResolvedValue({group:g,buildId:6,asOf:'2026-10-06T00:00:00Z',headers:['Title','Extra'],rows:[r]}); }
beforeEach(() => {vi.resetAllMocks(); context.currentProject={id:1,projectRole:'PM',name:'Project'};fileWorkApi.metadata.mockResolvedValue({canCreate:false,canViewMine:true,canReadAll:true,archived:false});workItemsApi.metadata.mockResolvedValue({canCreate:true,canCreateQa:true,membershipId:2});workItemsApi.list.mockResolvedValue(page([]));fileWorkApi.list.mockResolvedValue(page([]));detail();projectsApi.listCatalog.mockResolvedValue([{id:6,versionLabel:'B6'},{id:13,versionLabel:'B13'}]);projectsApi.listMembers.mockResolvedValue([]);fileWorkApi.eligibleAllocations.mockResolvedValue([]);fileWorkApi.history.mockResolvedValue({items:[],nextBefore:0});fileWorkApi.sessions.mockResolvedValue(page([session]));executionApi.attempts.mockResolvedValue(page([]));});
afterEach(cleanup);
describe('customer-facing file workflow', () => {
 it('shows server preparation counts to PM with links to missing steps',async()=>{
   fileWorkApi.metadata.mockResolvedValue({canCreate:true,canReadAll:true});
   fileWorkApi.preparation.mockResolvedValue({asOf:'2026-10-08T00:00:00Z',counts:{documents:0,approvedCases:0,testers:1,configuredDraftCycles:0,allocatedDevices:0,assignedGroups:0}});
   const navigate=vi.fn();render(<FileWorkPage navigate={navigate}/>);
   await screen.findByRole('heading',{name:'Chuẩn bị giao việc'});
   expect(await screen.findByText('Chưa có tài liệu được nhập')).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Nhập và duyệt test case'}));expect(navigate).toHaveBeenCalledWith('/tests');
 });
 it('provides a single-case view using the same save and history actions',async()=>{
   detail({...group,environmentName:'QA staging',deviceName:'iPad Pro',selectedBuildLabel:'Release 1.2'},session,row);
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);
   await screen.findByText(/QA staging/);
   fireEvent.click(screen.getByRole('button',{name:'Xem từng case'}));
   const card=await screen.findByRole('region',{name:'Case đang xem'});
   expect(card).toHaveTextContent('Pinned title');
   expect(screen.queryByRole('region',{name:'Case thực thi chính thức'})).toBeNull();
   fireEvent.click(screen.getByRole('button',{name:'OK · TC-01'}));
   await waitFor(()=>expect(fileWorkApi.record).toHaveBeenCalledWith(1,3,10,expect.objectContaining({resultCode:'OK',sessionId:9,buildId:6})));
 });
 it('keeps the selected case and layout after saving or refreshing the server projection',async()=>{
   const second={...row,runItemId:11,caseNo:'TC-02',titleVi:'Second case',cells:['Second case','extra']};
   fileWorkApi.execution.mockResolvedValue({group,buildId:6,asOf:'2026-10-06T00:00:00Z',headers:['Title','Extra'],rows:[row,second]});
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);
   fireEvent.click(await screen.findByRole('button',{name:'Xem từng case'}));
   fireEvent.click(screen.getByRole('button',{name:'Case tiếp'}));
   fireEvent.click(screen.getByRole('button',{name:'OK · TC-02'}));
   await waitFor(()=>expect(fileWorkApi.execution).toHaveBeenCalledTimes(2));
   expect(await screen.findByLabelText('Chọn case')).toHaveValue('11');
   fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));
   await waitFor(()=>expect(fileWorkApi.execution).toHaveBeenCalledTimes(3));
   expect(await screen.findByLabelText('Chọn case')).toHaveValue('11');
   expect(screen.queryByRole('region',{name:'Case thực thi chính thức'})).toBeNull();
 });
 it.each([false,true])('clears search filters without changing document scope or My work (%s)', async mine => {
   fileWorkApi.metadata.mockResolvedValue({canCreate:!mine,canViewMine:mine,canReadAll:true});
   projectsApi.listMembers.mockResolvedValue([{membershipId:21,displayName:'Lan',projectRole:'TESTER'}]);
   executionApi.cycles.mockResolvedValue(page([{id:5,name:'Cycle'}]));
   fileWorkApi.list.mockImplementation(async (_project,filters)=>page(filters.keyword || filters.state?[]:[group]));
   render(<FileWorkPage navigate={vi.fn()} documentId={4}/>);
   await screen.findByRole('button',{name:'test.xlsx'});
   await screen.findByRole('option',{name:'Lan'});
   fireEvent.change(screen.getByLabelText('Đợt theo dõi'),{target:{value:'5'}});
   fireEvent.change(screen.getByLabelText('Build theo dõi'),{target:{value:'13'}});
   if(!mine)fireEvent.change(screen.getByLabelText('Tester theo dõi'),{target:{value:'21'}});
   fireEvent.change(screen.getByLabelText('Tìm tên file'),{target:{value:'does-not-exist'}});
   fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:'COMPLETED'}});
   await screen.findByText('Không có file khớp với bộ lọc hiện tại.');
   expect(screen.queryByText(/Nhập và duyệt test case/)).toBeNull();
   fireEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
   await screen.findByRole('button',{name:'test.xlsx'});
   expect(screen.getByLabelText('Tìm tên file')).toHaveValue('');
   expect(screen.getByLabelText('Tìm tên file')).toHaveFocus();
   expect(screen.getByLabelText('Trạng thái')).toHaveValue('');
   expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({keyword:'',state:'',page:0,mine,documentId:4,assigneeMembershipId:undefined,cycleId:undefined,buildId:undefined}),expect.anything());
   if(mine)expect(screen.getByLabelText('Được giao cho tôi')).toBeChecked();
 });
 it('shows readable state labels but sends the canonical state to filtering', async () => {
   render(<FileWorkPage navigate={vi.fn()}/>);
   await screen.findByRole('option',{name:'Đang thực hiện'});
   fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:'DOING'}});
   await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({state:'DOING'}),expect.anything()));
 });
 it('can cancel file assignment without creating a group and reopen a clean draft', async () => {
   setupPm();render(<FileWorkPage navigate={vi.fn()}/>);
   fireEvent.click(await screen.findByRole('button',{name:'Giao file'}));
   fireEvent.change(screen.getByLabelText('Tìm tài liệu nguồn'),{target:{value:'draft-only'}});
   fireEvent.click(screen.getByRole('button',{name:'Hủy giao file'}));
   expect(screen.queryByLabelText('Tìm tài liệu nguồn')).toBeNull();
   expect(fileWorkApi.create).not.toHaveBeenCalled();
   fireEvent.click(screen.getByRole('button',{name:'Giao file'}));
   expect(screen.getByLabelText('Tìm tài liệu nguồn')).toHaveValue('');
 });
});
describe('final review file monitoring', () => {
 it('uses current read metadata for controls and omits another assignee while My work is enabled',async()=>{
   executionApi.cycles.mockResolvedValue(page([]));projectsApi.listMembers.mockResolvedValue([{membershipId:21,displayName:'Lan',projectRole:'TESTER'}]);
   render(<FileWorkPage navigate={vi.fn()}/>);await screen.findByRole('option',{name:'Lan'});
   expect(screen.getByLabelText('Tester theo dõi')).toBeDisabled();fireEvent.click(screen.getByLabelText('Được giao cho tôi'));
   fireEvent.change(screen.getByLabelText('Tester theo dõi'),{target:{value:'21'}});
   await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({mine:false,assigneeMembershipId:21,page:0}),expect.anything()));
   fireEvent.click(screen.getByLabelText('Được giao cho tôi'));
   await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({mine:true,assigneeMembershipId:undefined,page:0}),expect.anything()));
   fileWorkApi.metadata.mockResolvedValue({canReadAll:false,canViewMine:true});fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));
   await waitFor(()=>expect(screen.queryByLabelText('Tester theo dõi')).toBeNull());expect(screen.queryByRole('button',{name:'Giao file'})).toBeNull();
 });
 it('clears filters on project replacement and ignores delayed prior project catalogs and rows',async()=>{
   let oldCatalog,oldRows;executionApi.cycles.mockResolvedValue(page([]));
   projectsApi.listCatalog.mockImplementation(p=>p===1?new Promise(r=>{oldCatalog=r;}):Promise.resolve([{id:26,versionLabel:'P2 build',archived:true}]));
   fileWorkApi.list.mockImplementation((p,f)=>p===1?new Promise(r=>{oldRows=r;}):Promise.resolve(page([{...group,id:8,fileName:'P2.xlsx',selectedBuildId:26}])));
   const view=render(<FileWorkPage navigate={vi.fn()}/>);await waitFor(()=>expect(oldRows).toBeTypeOf('function'));
   context.currentProject={id:2,projectRole:'PM',name:'Second'};view.rerender(<FileWorkPage navigate={vi.fn()}/>);
   await screen.findByText('P2.xlsx');await screen.findByRole('option',{name:'P2 build · lưu trữ'});
   oldCatalog([{id:6,versionLabel:'OLD'}]);oldRows(page([{...group,fileName:'OLD.xlsx'}]));
   await waitFor(()=>expect(screen.queryByText('OLD.xlsx')).toBeNull());expect(screen.queryByRole('option',{name:'OLD'})).toBeNull();
   expect(screen.getByLabelText('Build theo dõi')).toHaveValue('');expect(fileWorkApi.list).toHaveBeenLastCalledWith(2,expect.objectContaining({page:0,buildId:undefined,cycleId:undefined}),expect.anything());
 });
 it('filters on the server, resets group pages and retains a selected cycle across selector pagination and document changes',async()=>{
   setupPm();executionApi.cycles.mockImplementation(async (p,index)=>({...page(index?[{id:8,name:'Older cycle'}]:[{id:5,name:'Cycle'}]),page:index,totalPages:2,totalItems:21}));
   fileWorkApi.list.mockImplementation(async (p,filters)=>({...page([group]),page:filters.page,totalPages:2,totalItems:21}));
   const view=render(<FileWorkPage navigate={vi.fn()} documentId={4}/>);
   await screen.findByRole('option',{name:'Lan'});fireEvent.change(screen.getByLabelText('Tester theo dõi'),{target:{value:'21'}});
   await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({assigneeMembershipId:21,page:0}),expect.anything()));
   fireEvent.click(screen.getByRole('button',{name:'Trang sau công việc'}));await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({page:1}),expect.anything()));
   fireEvent.change(screen.getByLabelText('Đợt theo dõi'),{target:{value:'5'}});
   await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({cycleId:5,page:0}),expect.anything()));
   fireEvent.click(screen.getByRole('button',{name:'Trang sau đợt lọc'}));await screen.findByRole('option',{name:'Older cycle'});
   expect(screen.getByLabelText('Đợt theo dõi')).toHaveValue('5');expect(screen.getByLabelText('Đợt theo dõi').selectedOptions[0].textContent).toBe('Cycle');
   fireEvent.change(screen.getByLabelText('Build theo dõi'),{target:{value:'13'}});
   await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({buildId:13,cycleId:5,assigneeMembershipId:21,page:0}),expect.anything()));
   fireEvent.click(screen.getByRole('button',{name:'Trang sau công việc'}));await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({page:1}),expect.anything()));
   view.rerender(<FileWorkPage navigate={vi.fn()} documentId={9}/>);
   await waitFor(()=>expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({documentId:9,page:0,buildId:13,cycleId:5}),expect.anything()));
 });
 it('renders selected-build rates, project-zone timestamps and date-only milestone deadlines including missing states',async()=>{
   context.currentProject.timezone='America/Los_Angeles';
   fileWorkApi.list.mockResolvedValue(page([
     {...group,counts:{executionRate:50,passRate:100,ok:1},milestoneId:4,milestoneName:'Release',milestoneDueOn:'2026-10-06',startedAt:'2026-10-06T01:00:00Z',updatedAt:'2026-10-06T00:00:00Z',latestActivityAt:'2026-10-06T03:00:00Z'},
     {...group,id:4,fileName:'empty.xlsx',selectedBuildId:13,counts:{executionRate:null,passRate:null},milestoneId:null,milestoneName:null,milestoneDueOn:null},
     {...group,id:5,fileName:'undated.xlsx',milestoneId:8,milestoneName:'Undated',milestoneDueOn:null}
   ]));
   render(<FileWorkPage navigate={vi.fn()}/>);await screen.findByText('test.xlsx');
   expect(screen.getByText('Thực thi: 50% · Đạt: 100%')).toBeTruthy();expect(screen.getAllByText('Thực thi: Không có mẫu số · Đạt: Không có mẫu số')).toHaveLength(2);
   expect(screen.getByText('Mốc: Release · Hạn: 06/10/2026')).toBeTruthy();expect(screen.getByText('Chưa có mốc kế hoạch')).toBeTruthy();expect(screen.getByText('Mốc: Undated · Chưa có hạn')).toBeTruthy();
   expect(screen.getByText('Bắt đầu phiên: '+documentDate('2026-10-06T01:00:00Z','America/Los_Angeles'))).toBeTruthy();
   expect(screen.getByText('Cập nhật nhóm: '+documentDate('2026-10-06T00:00:00Z','America/Los_Angeles'))).toBeTruthy();
   expect(screen.getByText('Hoạt động đã lưu: '+documentDate('2026-10-06T03:00:00Z','America/Los_Angeles'))).toBeTruthy();
   expect(screen.getByText('Môi trường chưa có tên · Thiết bị chưa có tên · Build 13')).toBeTruthy();
 });
 it('ignores old build-filter results and preserves server-current My work restriction',async()=>{
   let oldResolve;fileWorkApi.list.mockImplementation(async (p,f)=>f.buildId===6?new Promise(resolve=>{oldResolve=resolve;}):page([{...group,fileName:f.buildId===13?'current.xlsx':'initial.xlsx'}]));
   executionApi.cycles.mockResolvedValue(page([]));render(<FileWorkPage navigate={vi.fn()}/>);await screen.findByRole('option',{name:'B6'});
   fireEvent.change(screen.getByLabelText('Build theo dõi'),{target:{value:'6'}});await waitFor(()=>expect(oldResolve).toBeTypeOf('function'));
   fireEvent.change(screen.getByLabelText('Build theo dõi'),{target:{value:'13'}});await screen.findByText('current.xlsx');oldResolve(page([{...group,fileName:'stale.xlsx'}]));
   await waitFor(()=>expect(screen.queryByText('stale.xlsx')).toBeNull());expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({mine:true,buildId:13}),expect.anything());
 });
});
describe('final review archived execution recovery', () => {
 it.each(['DOING','PAUSED'])('lets server-authorized PM cancel %s even while execution and catalogs fail', async state => {
   detail({...group,state},{...session,state,capabilities:{canCancel:true}});
   fileWorkApi.execution.mockRejectedValue(new Error('Workbook unavailable'));
   projectsApi.listCatalog.mockRejectedValue(new Error('Catalog unavailable'));
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);
   fireEvent.click(await screen.findByRole('button',{name:'Hủy phiên'}));
   fireEvent.change(screen.getByLabelText('Lý do thao tác'),{target:{value:'Archived pinned build'}});
   fireEvent.click(screen.getByRole('button',{name:'Xác nhận thao tác'}));
   await waitFor(()=>expect(fileWorkApi.cancel).toHaveBeenCalledWith(1,9,expect.objectContaining({reason:'Archived pinned build',expectedVersion:2,expectedGroupVersion:8})));
   expect(fileWorkApi.record).not.toHaveBeenCalled();
 });
 it.each(['PM','TESTER'])('never grants recovery from client %s role without current session capability', async role => {
   context.currentProject.projectRole=role; detail(group,{...session,capabilities:{}});
   fileWorkApi.execution.mockRejectedValue(new Error('Workbook unavailable'));
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>); await screen.findByText('Workbook unavailable');
   expect(screen.queryByRole('button',{name:'Hủy phiên'})).toBeNull();expect(fileWorkApi.cancel).not.toHaveBeenCalled();
 });
 it('keeps archived selected build visible for history/export but absent from start choices',async()=>{
   detail({...group,state:'READY',currentSessionId:null,capabilities:{canStart:true,canExport:true}},null);
   projectsApi.listCatalog.mockResolvedValue([{id:6,versionLabel:'B6',archived:true},{id:13,versionLabel:'B13'}]);
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('Pinned title');
   expect(screen.getByLabelText('Build hiển thị')).toHaveValue('6');
   expect(screen.getByLabelText('Build hiển thị').selectedOptions[0].textContent).toMatch(/B6.*lưu trữ/);
   expect(Array.from(screen.getByLabelText('Build bắt đầu phiên').options).map(o=>o.value)).not.toContain('6');
   expect(screen.getByRole('button',{name:'OK · TC-01'})).toBeDisabled();
 });
});
describe('current file-work authority and canonical execution', () => {
 it('uses current metadata on an empty list instead of stale PM role', async () => {render(<FileWorkPage navigate={vi.fn()}/>);await waitFor(()=>expect(fileWorkApi.list).toHaveBeenCalledWith(1,expect.objectContaining({mine:true}),expect.anything()));expect(screen.queryByRole('button',{name:'Giao file'})).toBeNull();expect(await screen.findByText('Chưa có công việc theo file. Kiểm tra bộ lọc hoặc liên hệ PM để nhận phân công.')).toBeTruthy();});
 it('saves OK through the pinned session and refreshes the server projection', async () => {render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'OK · TC-01'}));await waitFor(()=>expect(fileWorkApi.record).toHaveBeenCalled());expect(fileWorkApi.record.mock.calls[0]).toEqual([1,3,10,expect.objectContaining({sessionId:9,expectedSessionVersion:2,buildId:6,resultCode:'OK',expectedVersion:4,requestKey:expect.any(String)})]);await waitFor(()=>expect(fileWorkApi.execution.mock.calls.length).toBeGreaterThan(1));});
 it('preserves NG draft and exact body/key on failed retry and refreshes on 409', async () => {fileWorkApi.record.mockRejectedValueOnce(Object.assign(new Error('Dữ liệu đã thay đổi'),{status:409})).mockResolvedValue({id:99});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'NG · TC-01'}));fireEvent.change(screen.getByLabelText('Kết quả thực tế'),{target:{value:'Crash on step 2'}});fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await screen.findByRole('alert');expect(screen.getByLabelText('Kết quả thực tế').value).toBe('Crash on step 2');await waitFor(()=>expect(fileWorkApi.execution.mock.calls.length).toBeGreaterThan(1));fireEvent.click(screen.getByRole('button',{name:'Thử lại nguyên lệnh'}));await waitFor(()=>expect(fileWorkApi.record).toHaveBeenCalledTimes(2));expect(fileWorkApi.record.mock.calls[1]).toEqual(fileWorkApi.record.mock.calls[0]);});
 it('cannot record an alternative selected build or synthesize NA', async () => {render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('Pinned title');fireEvent.change(screen.getByLabelText('Build hiển thị'),{target:{value:'13'}});await waitFor(()=>expect(fileWorkApi.execution).toHaveBeenCalledWith(1,3,13,expect.anything()));expect(screen.getByRole('button',{name:'OK · TC-01'}).disabled).toBe(true);expect(screen.queryByRole('button',{name:/^NA ·/})).toBeNull();expect(fileWorkApi.record).not.toHaveBeenCalled();});
 it('starts only using a real allocated machine and selected build', async () => {detail({...group,state:'READY',currentSessionId:null,capabilities:{canStart:true}},null);fileWorkApi.eligibleAllocations.mockResolvedValue([{allocationId:11,assetCode:'IPAD-01',type:'IPAD',model:'M1',osName:'iPadOS',osVersion:'18'}]);render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText(/IPAD-01/);fireEvent.change(screen.getByLabelText('Máy được cấp'),{target:{value:'11'}});fireEvent.click(screen.getByRole('button',{name:'Bắt đầu phiên'}));await waitFor(()=>expect(fileWorkApi.start).toHaveBeenCalledWith(1,3,expect.objectContaining({allocationId:11,buildId:6,expectedVersion:8})));});
 it('ignores stale list responses after a filter change and encodes literal search', async () => {let resolve;fileWorkApi.list.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue(page([{...group,fileName:'new.xlsx'}]));render(<FileWorkPage navigate={vi.fn()}/>);await waitFor(()=>expect(fileWorkApi.list).toHaveBeenCalled());fireEvent.change(screen.getByLabelText('Tìm tên file'),{target:{value:'%_新'}});await screen.findByText('new.xlsx');resolve(page([{...group,fileName:'old.xlsx'}]));await waitFor(()=>expect(screen.queryByText('old.xlsx')).toBeNull());expect(fileWorkApi.list).toHaveBeenLastCalledWith(1,expect.objectContaining({keyword:'%_新'}),expect.anything());});
 it('fails closed while metadata fails then retries current authority', async()=>{fileWorkApi.metadata.mockRejectedValueOnce(Object.assign(new Error('Forbidden'),{status:403}));render(<FileWorkPage navigate={vi.fn()}/>);await screen.findByRole('alert');expect(fileWorkApi.list).not.toHaveBeenCalled();expect(screen.queryByText('Giao file')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await waitFor(()=>expect(fileWorkApi.list).toHaveBeenCalled());});
 it('makes P reason mandatory and prevents duplicate submissions while busy', async()=>{let resolve;fileWorkApi.record.mockImplementation(()=>new Promise(r=>{resolve=r;}));render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'P · TC-01'}));fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await screen.findByText('P cần lý do.');expect(fileWorkApi.record).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText('Lý do kết quả'),{target:{value:'Waiting for network'}});fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));expect(fileWorkApi.record).toHaveBeenCalledTimes(1);expect(fileWorkApi.record.mock.calls[0][3]).toMatchObject({resultCode:'P',reason:'Waiting for network',buildId:6});resolve({id:22});await waitFor(()=>expect(screen.queryByRole('button',{name:'Lưu kết quả'})).toBeNull());});
 it('uses current caps for pause/resume/complete and sends both session/group versions', async()=>{render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Tạm dừng phiên'}));fireEvent.change(screen.getByLabelText('Lý do thao tác'),{target:{value:'Break'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận thao tác'}));await waitFor(()=>expect(fileWorkApi.pause).toHaveBeenCalledWith(1,9,expect.objectContaining({expectedVersion:2,expectedGroupVersion:8,reason:'Break'})));expect(screen.queryByRole('button',{name:'Tiếp tục phiên'})).toBeNull();});
 it('resumes the same paused session without allocation/build mutation', async()=>{detail({...group,state:'PAUSED'},{...session,state:'PAUSED',capabilities:{canResume:true}});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Tiếp tục phiên'}));await waitFor(()=>expect(fileWorkApi.resume).toHaveBeenCalledWith(1,9,expect.objectContaining({expectedVersion:2,expectedGroupVersion:8})));expect(fileWorkApi.resume.mock.calls[0][2]).not.toHaveProperty('buildId');expect(screen.queryByLabelText('Máy được cấp')).toBeNull();});
 it('requires PM cancel reason and preserves draft on stale conflict', async()=>{detail({...group,capabilities:{canCancel:true}},{...session,capabilities:{canCancel:true}});fileWorkApi.cancel.mockRejectedValue(Object.assign(new Error('VERSION_CONFLICT'),{status:409}));render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Hủy phiên'}));fireEvent.change(screen.getByLabelText('Lý do thao tác'),{target:{value:'Returned machine'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận thao tác'}));await screen.findByRole('alert');await screen.findByLabelText('Lý do thao tác');expect(screen.getByLabelText('Lý do thao tác').value).toBe('Returned machine');fireEvent.click(screen.getByRole('button',{name:'Thử lại nguyên lệnh'}));await waitFor(()=>expect(fileWorkApi.cancel).toHaveBeenCalledTimes(2));expect(fileWorkApi.cancel.mock.calls[1]).toEqual(fileWorkApi.cancel.mock.calls[0]);});
 it('reassigns every real run version from current detail', async()=>{detail({...group,state:'READY',currentSessionId:null,capabilities:{canAssign:true}},null);projectsApi.listMembers.mockResolvedValue([{membershipId:21,displayName:'New Tester',active:true,projectRole:'TESTER',systemRole:'TESTER'},{membershipId:22,displayName:'DEV Tester',active:true,projectRole:'TESTER',systemRole:'DEV'}]);render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Giao lại toàn nhóm'}));expect(screen.queryByRole('option',{name:'DEV Tester'})).toBeNull();fireEvent.change(screen.getByLabelText('Tester mới'),{target:{value:'21'}});fireEvent.change(screen.getByLabelText('Lý do thao tác'),{target:{value:'Cover absence'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận thao tác'}));await waitFor(()=>expect(fileWorkApi.assign).toHaveBeenCalledWith(1,3,expect.objectContaining({assigneeMembershipId:21,expectedVersion:8,runVersions:[{runItemId:10,expectedVersion:4}],reason:'Cover absence'})));});
 it('keeps source annotation separate and creates QA/BUG context only for pinned authoritative IDs', async()=>{const navigate=vi.fn();detail(group,session,{...row,resultCode:'NG',latestAttemptId:32,pendingBugLink:true});render(<FileWorkDetail groupId={3} navigate={navigate}/>);fireEvent.click(await screen.findByRole('button',{name:'Tạo QA · TC-01'}));expect(navigate).toHaveBeenLastCalledWith('/board/list?create=QA&documentId=4&groupId=3&runItemId=10&revisionId=12');fireEvent.click(screen.getByRole('button',{name:'Tạo BUG · TC-01'}));expect(navigate).toHaveBeenLastCalledWith('/board/new?attempt=32&documentId=4&groupId=3&runItemId=10&revisionId=12');fireEvent.click(screen.getByRole('button',{name:'Tài liệu và kết quả tham khảo'}));expect(navigate).toHaveBeenLastCalledWith('/tests/documents/4');fireEvent.click(screen.getByLabelText('Xem dữ liệu Excel gốc (chỉ đọc)'));expect(screen.getByText('Source title')).toBeTruthy();expect(screen.getByRole('button',{name:'OK · TC-01'}).disabled).toBe(true);expect(qaContextUrl(4,3,0,12)).toBeNull();});
 it('hides writes on excluded scope and shows official NA reason', async()=>{detail(group,session,{...row,excluded:true,resultCode:'NA',scopeReason:'Customer excludes'});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);expect((await screen.findByRole('button',{name:'NG · TC-01'})).disabled).toBe(true);expect(screen.getByText('NA · Customer excludes')).toBeTruthy();});
 it('does not allow stale group responses to leak across project change', async()=>{let resolve;fileWorkApi.detail.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const view=render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await waitFor(()=>expect(fileWorkApi.detail).toHaveBeenCalled());context.currentProject={id:2,name:'Other'};fileWorkApi.detail.mockResolvedValue({group:{...group,fileName:'other.xlsx'},items:[row],sessions:[session]});view.rerender(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('other.xlsx');resolve({group:{...group,fileName:'old.xlsx'},items:[row],sessions:[session]});await waitFor(()=>expect(screen.queryByText('old.xlsx')).toBeNull());});
 it('completes with current version and refreshes without treating response as current state',async()=>{fileWorkApi.complete.mockResolvedValue({id:9,state:'COMPLETED',version:1});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Hoàn thành phiên'}));fireEvent.click(screen.getByRole('button',{name:'Xác nhận thao tác'}));await waitFor(()=>expect(fileWorkApi.complete).toHaveBeenCalledWith(1,9,expect.objectContaining({expectedVersion:2,expectedGroupVersion:8})));await waitFor(()=>expect(fileWorkApi.execution.mock.calls.length).toBeGreaterThan(1));expect(await screen.findByText(/Đang thực hiện · Lan · máy IPAD-01/)).toBeTruthy();expect(screen.queryByText(/Đã hoàn thành · Lan · máy IPAD-01/)).toBeNull();});
 it('shows retryable group read errors and forbids recording until current projection loads',async()=>{fileWorkApi.execution.mockRejectedValueOnce(new Error('Read failed'));render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('Read failed');expect(screen.queryByRole('button',{name:'OK · TC-01'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByRole('button',{name:'OK · TC-01'});});
 it('reads older group/session history with server cursors/pages',async()=>{fileWorkApi.history.mockResolvedValue({items:[{id:80,action:'PAUSE',actorName:'Lan',reason:'Break'}],nextBefore:80});fileWorkApi.sessions.mockResolvedValue({...page([session]),totalItems:21,totalPages:2});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Lịch sử nhóm / phiên'}));await screen.findByText(/PAUSE · Lan · Break/);fireEvent.click(screen.getByRole('button',{name:'Sự kiện cũ hơn'}));await waitFor(()=>expect(fileWorkApi.history).toHaveBeenLastCalledWith(1,3,80));fireEvent.click(screen.getByRole('button',{name:'Trang sau phiên'}));await waitFor(()=>expect(fileWorkApi.sessions).toHaveBeenLastCalledWith(1,3,1));fireEvent.click(screen.getByRole('button',{name:'Sự kiện mới nhất'}));await waitFor(()=>expect(fileWorkApi.history).toHaveBeenLastCalledWith(1,3,0));});
 it('keeps attempt history read-only and retryable with immutable executor/machine snapshots',async()=>{executionApi.attempts.mockRejectedValueOnce(new Error('History failed')).mockResolvedValue({...page([{id:32,attemptNo:3,resultCode:'NG',buildId:6,actualResult:'Crash',fileWorkSessionId:9,executorName:'Renamed actor',contextSnapshot:JSON.stringify({executor:{displayName:'Historical actor'},physicalAsset:{assetCode:'PINNED-IPAD'},provenance:'FILE_SESSION'})}]),totalPages:2,totalItems:21});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Lịch sử · TC-01'}));await screen.findByText('History failed');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText(/Lần #3 · NG/);expect(screen.getByText(/Crash · Historical actor/)).toBeTruthy();expect(screen.getByText(/PINNED-IPAD · FILE_SESSION/)).toBeTruthy();expect(screen.queryByLabelText('Kết quả thực tế')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Trang sau lần chạy'}));await waitFor(()=>expect(executionApi.attempts).toHaveBeenLastCalledWith(1,10,1));fireEvent.click(screen.getByRole('button',{name:'Đóng case'}));expect(fileWorkApi.record).not.toHaveBeenCalled();});
 it('downloads actual execution bytes with server filename and revokes the blob URL',async()=>{URL.createObjectURL=vi.fn(()=> 'blob:execution');URL.revokeObjectURL=vi.fn();const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});fileWorkApi.export.mockResolvedValue(new Response('xlsx bytes',{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':"attachment; filename*=UTF-8''k%E1%BA%BFt.xlsx"}}));render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Tải kết quả thực thi XLSX'}));await waitFor(()=>expect(click).toHaveBeenCalledTimes(1));expect(click.mock.instances[0].download).toBe('kết.xlsx');expect(fileWorkApi.export).toHaveBeenCalledWith(1,3,6);await waitFor(()=>expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:execution'),{timeout:1600});});
 it('reports a failed export without offering a fake download',async()=>{fileWorkApi.export.mockRejectedValue(Object.assign(new Error('No export permission'),{status:403}));render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Tải kết quả thực thi XLSX'}));await screen.findByText('No export permission');});
 it('focuses linked server validation errors while preserving the NG draft',async()=>{fileWorkApi.record.mockRejectedValue(Object.assign(new Error('Validation failed'),{status:422,fieldErrors:[{field:'actualResult',message:'Describe the observed behavior'},{field:'evidenceReference',message:'Reference is invalid'}]}));render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'NG · TC-01'}));fireEvent.change(screen.getByLabelText('Kết quả thực tế'),{target:{value:'Crash'}});fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'actualResult: Describe the observed behavior'}));expect(document.activeElement).toBe(screen.getByLabelText('Kết quả thực tế'));expect(screen.getByLabelText('Kết quả thực tế').value).toBe('Crash');});
 it('locks other row/history and build actions while an attempt request is pending',async()=>{let resolve;fileWorkApi.record.mockImplementation(()=>new Promise(r=>{resolve=r;}));render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'NG · TC-01'}));fireEvent.change(screen.getByLabelText('Kết quả thực tế'),{target:{value:'Crash'}});fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));expect(screen.getByRole('button',{name:'Lịch sử · TC-01'})).toBeDisabled();expect(screen.getByRole('button',{name:'OK · TC-01'})).toBeDisabled();expect(screen.getByLabelText('Build hiển thị')).toBeDisabled();resolve({id:88});await waitFor(()=>expect(fileWorkApi.execution.mock.calls.length).toBeGreaterThan(1));});
});

describe('review fixes: independent BUG authority and immutable draft session context',()=>{
 it.each(['DOING','PAUSED'])('allows current PM BUG actions during %s even when file assignment/record caps are false',async state=>{
   detail({...group,state,capabilities:{canAssign:false,canRecord:false}}, {...session,state,capabilities:{canCancel:true}}, {...row,resultCode:'NG',latestAttemptId:32});
   const navigate=vi.fn();render(<FileWorkDetail groupId={3} navigate={navigate}/>);
   fireEvent.click(await screen.findByRole('button',{name:'Tạo BUG · TC-01'}));
   expect(workItemsApi.metadata).toHaveBeenCalledWith(1);expect(navigate).toHaveBeenCalledWith('/board/new?attempt=32&documentId=4&groupId=3&runItemId=10&revisionId=12');expect(screen.getByRole('button',{name:'Gắn BUG · TC-01'})).toBeEnabled();
 });
 it('allows a PAUSED Tester to link the selected-build current NG through work-item authority',async()=>{
   context.currentProject.projectRole='TESTER';detail({...group,state:'PAUSED',capabilities:{canRecord:false,canAssign:false}},{...session,state:'PAUSED',capabilities:{canResume:true}},{...row,resultCode:'NG',latestAttemptId:32});
   workItemsApi.list.mockResolvedValue(page([{id:44,key:'BUG-44',title:'Existing',version:6}]));
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Gắn BUG · TC-01'}));await screen.findByRole('option',{name:'BUG-44 · Existing'});fireEvent.change(screen.getByLabelText('Bug cần liên kết'),{target:{value:'44'}});fireEvent.click(screen.getByRole('button',{name:'Liên kết bug'}));await waitFor(()=>expect(workItemsApi.link).toHaveBeenCalledWith(1,44,{attemptId:32,expectedVersion:6}));
 });
 it.each(['DEV','revoked','archived','unavailable'])('fails closed for current %s authority despite stale PM/file write hints',async state=>{
   detail({...group,capabilities:{canRecord:true,canAssign:true}},session,{...row,resultCode:'NG',latestAttemptId:32});
   if(state==='DEV')workItemsApi.metadata.mockResolvedValue({canCreate:false});
   if(state==='revoked')workItemsApi.metadata.mockRejectedValue(Object.assign(new Error('Membership revoked'),{status:403}));
   if(state==='unavailable')fileWorkApi.metadata.mockRejectedValue(new Error('Metadata unavailable'));
   if(state==='archived')fileWorkApi.metadata.mockResolvedValue({archived:true});
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('Pinned title');await waitFor(()=>expect(workItemsApi.metadata).toHaveBeenCalled());expect(screen.queryByRole('button',{name:'Tạo BUG · TC-01'})).toBeNull();expect(screen.queryByRole('button',{name:'Gắn BUG · TC-01'})).toBeNull();
 });
 it('removes already-open BUG linking when current authority is revoked and keeps raw source locked',async()=>{
   detail(group,session,{...row,resultCode:'NG',latestAttemptId:32});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);
   fireEvent.click(await screen.findByRole('button',{name:'Gắn BUG · TC-01'}));await screen.findByText('Liên kết NG với bug đã có');workItemsApi.metadata.mockResolvedValue({canCreate:false});fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));await waitFor(()=>expect(screen.queryByText('Liên kết NG với bug đã có')).toBeNull());expect(workItemsApi.link).not.toHaveBeenCalled();
 });
 it('hides BUG mutations until both current authorities load and for raw source',async()=>{
   let resolve;workItemsApi.metadata.mockImplementation(()=>new Promise(r=>{resolve=r;}));detail(group,session,{...row,resultCode:'NG',latestAttemptId:32});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('Pinned title');expect(screen.queryByRole('button',{name:'Tạo BUG · TC-01'})).toBeNull();resolve({canCreate:true});await screen.findByRole('button',{name:'Tạo BUG · TC-01'});fireEvent.click(screen.getByLabelText('Xem dữ liệu Excel gốc (chỉ đọc)'));expect(screen.queryByRole('button',{name:'Tạo BUG · TC-01'})).toBeNull();expect(screen.queryByRole('button',{name:'Gắn BUG · TC-01'})).toBeNull();
 });
 it('uses the selected-build current NG attempt for BUG linking while the session pins another build',async()=>{
   const navigate=vi.fn();detail(group,session,{...row,resultCode:'NG',latestAttemptId:32});render(<FileWorkDetail groupId={3} navigate={navigate}/>);await screen.findByRole('button',{name:'Tạo BUG · TC-01'});fileWorkApi.execution.mockResolvedValue({group:{...group,capabilities:{canRecord:false}},buildId:13,headers:['Title','Extra'],rows:[{...row,resultCode:'NG',latestAttemptId:53}]});fireEvent.change(screen.getByLabelText('Build hiển thị'),{target:{value:'13'}});fireEvent.click(await screen.findByRole('button',{name:'Tạo BUG · TC-01'}));expect(navigate).toHaveBeenCalledWith('/board/new?attempt=53&documentId=4&groupId=3&runItemId=10&revisionId=12');expect(screen.getByRole('button',{name:'NG · TC-01'})).toBeDisabled();
 });
 it.each(['NG','P'])('retains an open %s draft with original pins and blocks writes after replacement until explicit reconfirmation',async result=>{
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:`${result} · TC-01`}));fireEvent.change(screen.getByLabelText(result==='NG'?'Kết quả thực tế':'Lý do kết quả'),{target:{value:'Observed on IPAD-01 / build 6'}});
   const replacement={...session,id:19,version:1,buildId:13,allocationId:23,assetId:24,assetCode:'IPAD-NEW'};
   const nextGroup={...group,currentSessionId:19,version:10,selectedBuildId:13};detail(nextGroup,replacement,row);fileWorkApi.execution.mockResolvedValue({group:nextGroup,buildId:13,headers:['Title','Extra'],rows:[row]});fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));await screen.findByRole('button',{name:'Xác nhận dùng phiên hiện hành cho bản nháp'});
   expect(screen.getByLabelText(result==='NG'?'Kết quả thực tế':'Lý do kết quả').value).toBe('Observed on IPAD-01 / build 6');expect(screen.getByRole('button',{name:'Lưu kết quả'})).toBeDisabled();expect(screen.getByText('Bản nháp: phiên #9 · máy IPAD-01 · build pin #6')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));expect(fileWorkApi.record).not.toHaveBeenCalled();
   fireEvent.click(screen.getByRole('button',{name:'Xác nhận dùng phiên hiện hành cho bản nháp'}));expect(fileWorkApi.record).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await waitFor(()=>expect(fileWorkApi.record).toHaveBeenCalledWith(1,3,10,expect.objectContaining({sessionId:19,expectedSessionVersion:1,buildId:13,resultCode:result})));
 });
 it('blocks an exact retry against a replaced session and resets the old request only after explicit context confirmation',async()=>{
   fileWorkApi.record.mockRejectedValueOnce(new Error('Network failed')).mockResolvedValue({id:90});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'NG · TC-01'}));fireEvent.change(screen.getByLabelText('Kết quả thực tế'),{target:{value:'Original crash'}});fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await screen.findByText('Network failed');const oldBody=fileWorkApi.record.mock.calls[0][3];
   detail({...group,currentSessionId:19},{...session,id:19,allocationId:23,assetId:24,assetCode:'IPAD-NEW'},row);fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));await screen.findByRole('button',{name:'Xác nhận dùng phiên hiện hành cho bản nháp'});expect(screen.getByRole('button',{name:'Thử lại nguyên lệnh'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Thử lại nguyên lệnh'}));expect(fileWorkApi.record).toHaveBeenCalledTimes(1);
   fireEvent.click(screen.getByRole('button',{name:'Xác nhận dùng phiên hiện hành cho bản nháp'}));fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await waitFor(()=>expect(fileWorkApi.record).toHaveBeenCalledTimes(2));expect(fileWorkApi.record.mock.calls[1][3].sessionId).toBe(19);expect(fileWorkApi.record.mock.calls[1][3].requestKey).not.toBe(oldBody.requestKey);
 });
 it('permits an explicit fresh command after version refresh within the same pinned session',async()=>{
   fileWorkApi.record.mockRejectedValueOnce(Object.assign(new Error('Stale run'),{status:409})).mockResolvedValue({id:91});render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'P · TC-01'}));fireEvent.change(screen.getByLabelText('Lý do kết quả'),{target:{value:'Waiting'}});detail(group,{...session,version:3},{...row,runVersion:5});fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await screen.findByText('Stale run');await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu kết quả'})).toBeEnabled());const old=fileWorkApi.record.mock.calls[0][3];fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả'}));await waitFor(()=>expect(fileWorkApi.record).toHaveBeenCalledTimes(2));const fresh=fileWorkApi.record.mock.calls[1][3];expect(fresh).toMatchObject({sessionId:9,buildId:6,expectedSessionVersion:3,expectedVersion:5,reason:'Waiting'});expect(fresh.requestKey).not.toBe(old.requestKey);
 });
});

function setupPm() {
 fileWorkApi.metadata.mockResolvedValue({canCreate:true,canViewMine:false,canReadAll:true});
 testCasesApi.listDocuments.mockResolvedValue({...page([{id:4,fileName:'source.xlsx'}]),totalPages:2,totalItems:21});
 testCasesApi.getDocument.mockResolvedValue({document:{id:4,fileName:'source.xlsx'},rows:[{rowId:1,caseNo:'TC-01',revisionId:12,approved:true,archived:false},{rowId:2,caseNo:'TC-02',revisionId:14,approved:false,archived:false},{rowId:3,caseNo:'TC-03',revisionId:15,approved:true,archived:true}]});
 executionApi.cycles.mockResolvedValue(page([{id:5,name:'Draft cycle',statusCode:'DRAFT'}]));executionApi.cycle.mockResolvedValue({id:5,version:2,statusCode:'DRAFT'});executionApi.configurations.mockResolvedValue([{id:7,environmentId:1,deviceId:2,defaultBuildId:6}]);projectsApi.listMembers.mockResolvedValue([{membershipId:21,displayName:'Lan',active:true,projectRole:'TESTER',systemRole:'TESTER'}]);
 fileWorkApi.preview.mockResolvedValue({valid:true,cycleVersion:2,selectedCount:1,errors:[]});fileWorkApi.create.mockResolvedValue({group});
}
async function selectScope() {
 fireEvent.click(await screen.findByRole('button',{name:'Giao file'}));await screen.findByRole('option',{name:'source.xlsx'});fireEvent.change(screen.getByLabelText('Tài liệu đã nhập'),{target:{value:'4'}});await screen.findByLabelText('Chọn TC-01 revision 12');fireEvent.click(screen.getByLabelText('Chọn TC-01 revision 12'));fireEvent.change(screen.getByLabelText('Đợt bản nháp'),{target:{value:'5'}});await screen.findByRole('option',{name:/Môi trường #1/});fireEvent.change(screen.getByLabelText('Cấu hình'),{target:{value:'7'}});fireEvent.change(screen.getByLabelText('Tester nhận file'),{target:{value:'21'}});
}
describe('current contextual QA authority',()=>{
 it.each(['PM','TESTER'])('allows granted %s QA navigation independently of session, record, assignment, BUG or NG',async role=>{
   context.currentProject.projectRole=role;
   workItemsApi.metadata.mockResolvedValue({canCreate:false,canCreateQa:true});
   detail({...group,state:'PAUSED',capabilities:{canRecord:false,canAssign:false}},{...session,state:'PAUSED',capabilities:{}},{...row,resultCode:'OK'});
   const navigate=vi.fn();render(<FileWorkDetail groupId={3} navigate={navigate}/>);
   fireEvent.click(await screen.findByRole('button',{name:'Tạo QA · TC-01'}));
   expect(navigate).toHaveBeenCalledWith('/board/list?create=QA&documentId=4&groupId=3&runItemId=10&revisionId=12');
   expect(screen.getByRole('button',{name:'OK · TC-01'})).toBeDisabled();
   expect(screen.queryByRole('button',{name:'Tạo BUG · TC-01'})).toBeNull();
   expect(fileWorkApi.record).not.toHaveBeenCalled();expect(fileWorkApi.create).not.toHaveBeenCalled();
 });
 it.each(['DEV','missing','truthy','archived','missing archive','work error','file error','detail error'])('hides QA creation under current %s despite stale role/file/BUG hints',async state=>{
   workItemsApi.metadata.mockResolvedValue({canCreate:true,canCreateQa:true});
   if(state==='DEV'){context.currentProject.projectRole='DEV';workItemsApi.metadata.mockResolvedValue({canCreate:true,canCreateQa:false});}
   if(state==='missing')workItemsApi.metadata.mockResolvedValue({canCreate:true});
   if(state==='truthy')workItemsApi.metadata.mockResolvedValue({canCreate:true,canCreateQa:'true'});
   if(state==='archived')fileWorkApi.metadata.mockResolvedValue({archived:true});
   if(state==='missing archive')fileWorkApi.metadata.mockResolvedValue({});
   if(state==='work error')workItemsApi.metadata.mockRejectedValue(new Error('Work read failed'));
   if(state==='file error')fileWorkApi.metadata.mockRejectedValue(new Error('File read failed'));
   if(state==='detail error')fileWorkApi.detail.mockRejectedValue(new Error('Detail read failed'));
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);
   if(state.endsWith('error'))await screen.findByRole('alert');else await screen.findByText('Pinned title');
   expect(screen.queryByRole('button',{name:'Tạo QA · TC-01'})).toBeNull();
 });
 it.each(['work','file'])('waits for current %s authority and hides immediately during refresh then revocation',async kind=>{
   let resolve;workItemsApi.metadata.mockResolvedValue({canCreate:false,canCreateQa:true});
   (kind==='work'?workItemsApi.metadata:fileWorkApi.metadata).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('Pinned title');
   expect(screen.queryByRole('button',{name:'Tạo QA · TC-01'})).toBeNull();
   resolve(kind==='work'?{canCreate:false,canCreateQa:true}:{archived:false});
   await screen.findByRole('button',{name:'Tạo QA · TC-01'});
   workItemsApi.metadata.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
   fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));
   expect(screen.queryByRole('button',{name:'Tạo QA · TC-01'})).toBeNull();
   resolve({canCreate:true,canCreateQa:false});await screen.findByText('Pinned title');
   expect(screen.queryByRole('button',{name:'Tạo QA · TC-01'})).toBeNull();
 });
 it('hides QA in raw source while preserving context helper/history and restores only the current grant',async()=>{
   workItemsApi.metadata.mockResolvedValue({canCreate:false,canCreateQa:true});
   render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByRole('button',{name:'Tạo QA · TC-01'});
   fireEvent.click(screen.getByLabelText('Xem dữ liệu Excel gốc (chỉ đọc)'));
   expect(screen.queryByRole('button',{name:'Tạo QA · TC-01'})).toBeNull();
   expect(screen.getByRole('button',{name:'Lịch sử · TC-01'})).toBeEnabled();
   expect(qaContextUrl(4,3,10,12)).toBe('/board/list?create=QA&documentId=4&groupId=3&runItemId=10&revisionId=12');
   fireEvent.click(screen.getByLabelText('Xem dữ liệu Excel gốc (chỉ đọc)'));expect(screen.getByRole('button',{name:'Tạo QA · TC-01'})).toBeVisible();
 });
 it('ignores an old project grant after current scope changes',async()=>{
   let finish;workItemsApi.metadata.mockImplementationOnce(()=>new Promise(r=>{finish=r;})).mockResolvedValue({canCreate:true,canCreateQa:false});
   const {rerender}=render(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);await screen.findByText('Pinned title');
   context.currentProject={id:2,projectRole:'PM',name:'Other'};rerender(<FileWorkDetail groupId={3} navigate={vi.fn()}/>);
   await waitFor(()=>expect(workItemsApi.metadata).toHaveBeenCalledWith(2));finish({canCreateQa:true});
   await screen.findByText('Pinned title');expect(screen.queryByRole('button',{name:'Tạo QA · TC-01'})).toBeNull();
 });
});
describe('PM pinned scope preview/create',()=>{
 it('shows excluded revisions, paginates source search and creates only a successful unchanged preview',async()=>{setupPm();const navigate=vi.fn();render(<FileWorkPage navigate={navigate}/>);await selectScope();expect(screen.getByLabelText('Chọn TC-02 revision 14').disabled).toBe(true);expect(screen.getByLabelText('Chọn TC-03 revision 15').disabled).toBe(true);expect(screen.getByRole('button',{name:'Tạo nhóm file'}).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Trang sau tài liệu'}));await waitFor(()=>expect(testCasesApi.listDocuments).toHaveBeenLastCalledWith(1,{page:1,keyword:''}));fireEvent.click(screen.getByRole('button',{name:'Kiểm tra trước khi giao'}));await screen.findByText(/Phạm vi hợp lệ/);fireEvent.click(screen.getByRole('button',{name:'Tạo nhóm file'}));await waitFor(()=>expect(fileWorkApi.create).toHaveBeenCalledWith(1,expect.objectContaining({documentId:4,cycleId:5,configurationId:7,revisionIds:[12],assigneeMembershipId:21,expectedCycleVersion:2,requestKey:expect.any(String)})));expect(navigate).toHaveBeenCalledWith('/tests/file-work/3');});
 it('invalidates preview when selected pins change and displays server conflicts',async()=>{setupPm();render(<FileWorkPage navigate={vi.fn()}/>);await selectScope();fireEvent.click(screen.getByRole('button',{name:'Kiểm tra trước khi giao'}));await screen.findByText(/Phạm vi hợp lệ/);fireEvent.click(screen.getByLabelText('Chọn TC-01 revision 12'));expect(screen.getByRole('button',{name:'Tạo nhóm file'}).disabled).toBe(true);fireEvent.click(screen.getByLabelText('Chọn TC-01 revision 12'));fileWorkApi.preview.mockResolvedValue({valid:false,selectedCount:1,errors:[{code:'DUPLICATE_SCOPE',message:'Run already exists'}]});fireEvent.click(screen.getByRole('button',{name:'Kiểm tra trước khi giao'}));await screen.findByText('DUPLICATE_SCOPE: Run already exists');expect(screen.getByRole('button',{name:'Tạo nhóm file'}).disabled).toBe(true);expect(fileWorkApi.create).not.toHaveBeenCalled();});
 it('retries failed create with an identical stable request key/body',async()=>{setupPm();fileWorkApi.create.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({group});render(<FileWorkPage navigate={vi.fn()}/>);await selectScope();fireEvent.click(screen.getByRole('button',{name:'Kiểm tra trước khi giao'}));await screen.findByText(/Phạm vi hợp lệ/);fireEvent.click(screen.getByRole('button',{name:'Tạo nhóm file'}));await screen.findByText('Connection lost');expect(screen.getByLabelText('Chọn TC-01 revision 12').checked).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Thử lại nguyên lệnh tạo'}));await waitFor(()=>expect(fileWorkApi.create).toHaveBeenCalledTimes(2));expect(fileWorkApi.create.mock.calls[1]).toEqual(fileWorkApi.create.mock.calls[0]);});
 it('retains the PM draft but locks writes when a refreshed metadata read fails',async()=>{setupPm();render(<FileWorkPage navigate={vi.fn()}/>);await selectScope();fileWorkApi.metadata.mockRejectedValue(new Error('Metadata unavailable'));fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));await screen.findByText('Metadata unavailable');expect(screen.getByLabelText('Chọn TC-01 revision 12').checked).toBe(true);expect(screen.getByRole('button',{name:'Kiểm tra trước khi giao'}).disabled).toBe(true);expect(fileWorkApi.preview).not.toHaveBeenCalled();});
 it('saves direct OK in React StrictMode with exactly one request',async()=>{render(<React.StrictMode><FileWorkDetail groupId={3} navigate={vi.fn()}/></React.StrictMode>);fireEvent.click(await screen.findByRole('button',{name:'OK · TC-01'}));await waitFor(()=>expect(fileWorkApi.record).toHaveBeenCalledTimes(1));await waitFor(()=>expect(screen.queryByRole('button',{name:'Lưu kết quả'})).toBeNull());});
});
describe('file API and download boundary',()=>{
 it('uses exact documented scoped paths, query encoding and CSRF writes',async()=>{const {fileWorkApi:api}=await vi.importActual('../../services/api/fileWork');apiRequest.mockResolvedValue({headerName:'X-CSRF-TOKEN',token:'test'});await api.list(1,{keyword:'%_新',mine:true,page:2});expect(apiRequest).toHaveBeenLastCalledWith('/projects/1/file-work-groups?page=2&size=20&keyword=%25_%E6%96%B0&mine=true',{});await api.record(1,3,10,{resultCode:'OK',requestKey:'stable_123'});expect(apiRequest).toHaveBeenLastCalledWith('/projects/1/file-work-groups/3/run-items/10/attempts',expect.objectContaining({method:'POST',headers:{'X-CSRF-TOKEN':'test'},body:'{"resultCode":"OK","requestKey":"stable_123"}'}));await api.export(1,3,6);expect(apiRequest).toHaveBeenLastCalledWith('/projects/1/file-work-groups/3/export?buildId=6',{responseType:'response'});});
 it('decodes UTF-8 filename and rejects non-XLSX or empty responses',async()=>{const {executionDownload}=await vi.importActual('../../services/api/fileWork');const response=new Response('bytes',{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':"attachment; filename*=UTF-8''k%E1%BA%BFt-qu%E1%BA%A3.xlsx"}});expect((await executionDownload(response)).fileName).toBe('kết-quả.xlsx');await expect(executionDownload(new Response('error',{headers:{'Content-Type':'text/html'}}))).rejects.toMatchObject({code:'INVALID_DOWNLOAD'});await expect(executionDownload(new Response('',{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}}))).rejects.toMatchObject({code:'EMPTY_DOWNLOAD'});});
 it('reads documented metadata/detail/session/allocation/execution paths',async()=>{const {fileWorkApi:api}=await vi.importActual('../../services/api/fileWork');const reads=[['metadata',[1],'/projects/1/file-work-groups/metadata',{}],['detail',[1,3],'/projects/1/file-work-groups/3',{}],['history',[1,3,80],'/projects/1/file-work-groups/3/history?before=80',undefined],['sessions',[1,3,2],'/projects/1/file-work-groups/3/sessions?page=2&size=20',undefined],['eligibleAllocations',[1,3],'/projects/1/file-work-groups/3/eligible-allocations',{}],['execution',[1,3,6],'/projects/1/file-work-groups/3/execution?buildId=6',{}]];for(const [name,args,path,options] of reads){await api[name](...args);expect(apiRequest).toHaveBeenLastCalledWith(...(options===undefined?[path]:[path,options]));}});
 it('writes documented scope/assignment/session transition paths with CSRF',async()=>{const {fileWorkApi:api}=await vi.importActual('../../services/api/fileWork');apiRequest.mockResolvedValue({headerName:'X-CSRF',token:'token'});const body={requestKey:'request_123',expectedVersion:3};for(const [name,args,path,method] of [['preview',[1,body],'/projects/1/file-work-groups/preview','POST'],['create',[1,body],'/projects/1/file-work-groups','POST'],['assign',[1,3,body],'/projects/1/file-work-groups/3/assignment','PUT'],['start',[1,3,body],'/projects/1/file-work-groups/3/sessions','POST'],...['pause','resume','complete','cancel'].map(action=>[action,[1,9,body],`/projects/1/file-work-sessions/9/${action}`,'POST'])]){await api[name](...args);expect(apiRequest).toHaveBeenLastCalledWith(path,{method,headers:{'X-CSRF':'token'},body:JSON.stringify(body)});}});
});
