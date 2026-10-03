import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RetestPanel } from './RetestPanel';
import { RetestResult } from './RetestResult';
import { CoverageEditor } from './CoverageEditor';
import { RetestQueuePage } from './RetestQueuePage';
import { useProject } from '../projects/ProjectProvider';
import { retestApi } from '../../services/api/retest';
import { workItemsApi } from '../../services/api/workItems';
vi.mock('../../services/api/retest',()=>({retestApi:{summary:vi.fn(),candidates:vi.fn(),coverage:vi.fn(),create:vi.fn(),request:vi.fn(),submit:vi.fn(),close:vi.fn(),reopen:vi.fn(),queue:vi.fn()}}));
vi.mock('../../services/api/workItems',()=>({workItemsApi:{attachments:vi.fn()}}));
vi.mock('../projects/ProjectProvider',()=>({useProject:vi.fn()}));
const item={id:4,runItemId:9,cycleId:2,caseNo:'TC-1',titleVi:'Đăng nhập',runVersion:1,assigneeMembershipId:8,assigneeName:'Lan',environmentId:1,deviceId:2,environmentName:'QA',deviceName:'Windows',verdict:null};
const summary={bugId:7,bugVersion:3,status:'resolved',fixedBuildId:3,coverage:{id:5},items:[item],passedCount:0,totalCount:1,canClose:false,requests:[],decisions:[],otherOpenBugs:[]};
const request={id:11,bugId:7,bugKey:'DEMO-7',bugTitle:'Màn trắng',bugVersion:3,version:0,verificationScope:'BUG_ONLY',status:'OPEN',canSubmit:true,current:true,buildLabel:'1.1',environmentName:'QA',deviceName:'Windows',items:[item],results:[]};
beforeEach(()=>{vi.resetAllMocks();retestApi.summary.mockResolvedValue(summary);workItemsApi.attachments.mockResolvedValue([]);retestApi.request.mockResolvedValue(request);useProject.mockReturnValue({currentProject:{id:1,name:'Dự án thử',archived:false}});});
it('shows missing coverage and keeps PM-only controls away from testers',async()=>{
 render(<RetestPanel projectId={1} bug={{id:7,version:3,status:'resolved'}} canManage={false} writable onChanged={vi.fn()}/>);
 await screen.findByText('0 / 1 mục đạt');expect(screen.getByText(/không đổi kết quả NG/)).toBeVisible();expect(screen.queryByRole('button',{name:'Xác nhận phạm vi'})).not.toBeInTheDocument();
});
it('PM selects full coverage, retries a failed save without losing reason, and refreshes parent',async()=>{
 const changed=vi.fn();retestApi.candidates.mockResolvedValue({items:[{...item,id:9,cycleName:'C1'}],totalItems:1,page:0,totalPages:1});retestApi.coverage.mockRejectedValueOnce(new Error('Lỗi mạng')).mockResolvedValueOnce(summary);
 render(<RetestPanel projectId={1} bug={{id:7,version:3}} canManage writable onChanged={changed}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Chọn toàn bộ phạm vi retest'}));await screen.findByLabelText('Lý do xác nhận phạm vi');
 fireEvent.change(screen.getByLabelText('Lý do xác nhận phạm vi'),{target:{value:'Đủ cấu hình ảnh hưởng'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận phạm vi'}));await screen.findByText('Lỗi mạng');
 expect(screen.getByLabelText('Lý do xác nhận phạm vi')).toHaveValue('Đủ cấu hình ảnh hưởng');fireEvent.click(screen.getByRole('button',{name:'Xác nhận phạm vi'}));
 await waitFor(()=>expect(changed).toHaveBeenCalled());expect(retestApi.coverage).toHaveBeenLastCalledWith(1,7,{runItemIds:[9],reason:'Đủ cấu hình ảnh hưởng',expectedVersion:3});
});
it('creates a request for the selected configuration and prevents closing incomplete coverage',async()=>{
 retestApi.create.mockResolvedValue(request);
 render(<RetestPanel projectId={1} bug={{id:7,version:3}} canManage writable onChanged={vi.fn()}/>);
 fireEvent.click(await screen.findByText('Phân công yêu cầu kiểm thử lại'));fireEvent.click(screen.getByRole('checkbox',{name:'Chọn TC-1 QA Windows'}));
 fireEvent.change(screen.getByLabelText('Phạm vi thực hiện'),{target:{value:'FULL_CASE'}});fireEvent.change(screen.getByLabelText('Hướng dẫn retest'),{target:{value:'Chạy toàn bộ case trên build mới'}});
 fireEvent.click(screen.getByRole('button',{name:'Tạo yêu cầu retest'}));await waitFor(()=>expect(retestApi.create).toHaveBeenCalledWith(1,7,expect.objectContaining({coverageRevisionId:5,coverageItemIds:[4],verificationScope:'FULL_CASE',assigneeMembershipId:8})));
 fireEvent.click(screen.getByText('Ghi nhận quyết định đóng lỗi'));expect(screen.getByRole('button',{name:'Xác nhận đóng lỗi'})).toBeDisabled();
});
it('requires exception evidence/source and then supports reopening a terminal bug',async()=>{
 workItemsApi.attachments.mockResolvedValue([{id:'file-1',name:'Kết luận.pdf'}]);retestApi.close.mockResolvedValue(summary);const changed=vi.fn();
 const view=render(<RetestPanel projectId={1} bug={{id:7,version:3}} canManage writable onChanged={changed}/>);
 fireEvent.click(await screen.findByText('Ghi nhận quyết định đóng lỗi'));fireEvent.change(screen.getByLabelText('Lý do kết thúc'),{target:{value:'UNREPRODUCIBLE'}});
 fireEvent.change(screen.getByLabelText('Nội dung quyết định'),{target:{value:'Không tái hiện đủ cấu hình'}});fireEvent.change(screen.getByLabelText('Chứng cứ quyết định'),{target:{value:'file-1'}});fireEvent.change(screen.getByLabelText('Nguồn xác nhận quyết định'),{target:{value:'PM xác nhận 29/09'}});
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận đóng lỗi'}));await waitFor(()=>expect(retestApi.close).toHaveBeenCalledWith(1,7,expect.objectContaining({kind:'UNREPRODUCIBLE',evidenceAttachmentId:'file-1',sourceReference:'PM xác nhận 29/09'})));
 view.unmount();retestApi.summary.mockResolvedValue({...summary,status:'closed',decisions:[{id:1,actor:'PM',kind:'FIXED',reason:'Đủ phạm vi',sourceReference:'Biên bản'}]});retestApi.reopen.mockResolvedValue(summary);
 render(<RetestPanel projectId={1} bug={{id:7,version:4}} canManage writable onChanged={changed}/>);
 fireEvent.click(await screen.findByText('Mở lại lỗi',{selector:'summary'}));fireEvent.change(screen.getByLabelText('Lý do mở lại'),{target:{value:'Bug tái phát'}});fireEvent.click(screen.getByRole('button',{name:'Mở lại lỗi'}));
 await waitFor(()=>expect(retestApi.reopen).toHaveBeenCalledWith(1,7,expect.objectContaining({reason:'Bug tái phát'})));
});
it('shows related open bugs and submitted history without granting tester write rights',async()=>{
 retestApi.summary.mockResolvedValue({...summary,requests:[request],otherOpenBugs:[{id:8,key:'DEMO-8'}]});
 retestApi.request.mockResolvedValue({...request,verificationScope:'FULL_CASE',current:false,canSubmit:false,status:'SUBMITTED',results:[{coverageItemId:4,verdict:'PASS',actualResult:'Đã kiểm tra đầy đủ',executionAttemptId:23}]});
 render(<RetestPanel projectId={1} bug={{id:7,version:3}} writable canManage={false} onChanged={vi.fn()}/>);
 expect(await screen.findByText(/Cùng lượt kiểm thử còn lỗi khác/)).toBeVisible();fireEvent.click(screen.getByRole('button',{name:/#11/}));
 await screen.findByText('Đã kiểm tra đầy đủ');expect(screen.getByText('Lần chạy mới #23')).toBeVisible();expect(screen.queryByRole('button',{name:'Lưu kết quả retest'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Đóng yêu cầu'}));expect(screen.queryByLabelText('Chi tiết kiểm thử lại')).not.toBeInTheDocument();
});
it('retries a request network failure with the same key and chosen evidence',async()=>{
 workItemsApi.attachments.mockResolvedValue([{id:'file-1',name:'Ảnh lỗi.png'}]);retestApi.submit.mockRejectedValueOnce(new Error('Không có kết nối')).mockResolvedValueOnce(request);
 const saved=vi.fn();render(<RetestResult projectId={1} requestId={11} writable onSaved={saved} onClose={vi.fn()}/>);
 fireEvent.change(await screen.findByLabelText('Kết quả TC-1'),{target:{value:'FAIL'}});fireEvent.change(screen.getByLabelText('Thực tế TC-1'),{target:{value:'Vẫn còn lỗi'}});fireEvent.change(screen.getByLabelText('Chứng cứ TC-1'),{target:{value:'file-1'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả retest'}));await screen.findByText('Không có kết nối');fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả retest'}));
 await waitFor(()=>expect(saved).toHaveBeenCalled());expect(retestApi.submit.mock.calls[0][2]).toEqual(retestApi.submit.mock.calls[1][2]);
 expect(retestApi.submit.mock.calls[0][2].results[0]).toMatchObject({verdict:'FAIL',evidenceAttachmentId:'file-1'});
});
it('coverage search preserves selections across pages and exposes retry/clear',async()=>{
 retestApi.candidates.mockRejectedValueOnce(new Error('Không tải được case')).mockResolvedValue({items:[{...item,id:9,cycleName:'C1'}],totalItems:51,totalPages:2,page:0});
 const save=vi.fn();render(<CoverageEditor projectId={1} items={[]} busy={false} onSubmit={save}/>);
 await screen.findByText('Không tải được case');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('TC-1');
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Tiếp'}));await waitFor(()=>expect(retestApi.candidates).toHaveBeenLastCalledWith(1,1,''));
 expect(screen.getByRole('checkbox')).toBeChecked();fireEvent.click(screen.getByRole('button',{name:'Bỏ chọn tất cả'}));expect(screen.getByRole('button',{name:'Xác nhận phạm vi'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Tìm case cho phạm vi'),{target:{value:'đăng nhập'}});await waitFor(()=>expect(retestApi.candidates).toHaveBeenLastCalledWith(1,0,'đăng nhập'));
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.change(screen.getByLabelText('Lý do xác nhận phạm vi'),{target:{value:'Bao gồm thiết bị này'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận phạm vi'}));expect(save).toHaveBeenCalledWith({runItemIds:[9],reason:'Bao gồm thiết bị này'});
});
it('queue supports mine/status filters, paging, request details and empty state',async()=>{
 const navigate=vi.fn();retestApi.queue.mockResolvedValue({items:[request],page:0,totalItems:51,totalPages:2});
 render(<RetestQueuePage navigate={navigate}/>);fireEvent.click(await screen.findByRole('button',{name:'DEMO-7 · Yêu cầu #11'}));await screen.findByLabelText('Thực tế TC-1');
 fireEvent.click(screen.getByRole('checkbox',{name:'Được phân công cho tôi'}));await waitFor(()=>expect(retestApi.queue).toHaveBeenLastCalledWith(1,0,false,'OPEN'));
 fireEvent.change(screen.getByLabelText('Trạng thái'),{target:{value:'CANCELLED'}});await waitFor(()=>expect(retestApi.queue).toHaveBeenLastCalledWith(1,0,false,'CANCELLED'));
 fireEvent.click(screen.getByRole('button',{name:'Tiếp'}));await waitFor(()=>expect(retestApi.queue).toHaveBeenLastCalledWith(1,1,false,'CANCELLED'));
 retestApi.queue.mockResolvedValue({items:[],page:1,totalItems:0,totalPages:0});fireEvent.click(screen.getByRole('button',{name:'Tải lại'}));await screen.findByText('Chưa có yêu cầu phù hợp bộ lọc.');
 expect(screen.queryByRole('navigation',{name:'Quản lý kiểm thử'})).not.toBeInTheDocument();
});
it('queue retries failed loading and has no requests without a selected project',async()=>{
 retestApi.queue.mockRejectedValueOnce(new Error('Mất kết nối hàng chờ')).mockResolvedValue({items:[],page:0,totalItems:0,totalPages:0});
 const view=render(<RetestQueuePage navigate={vi.fn()}/>);await screen.findByText('Mất kết nối hàng chờ');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('Chưa có yêu cầu phù hợp bộ lọc.');
 view.unmount();useProject.mockReturnValue({currentProject:null});render(<RetestQueuePage navigate={vi.fn()}/>);expect(screen.getByText('Chọn dự án để xem hàng chờ kiểm thử lại.')).toBeVisible();
});
it('recovers summary and request load failures without stale forms',async()=>{
 retestApi.summary.mockRejectedValueOnce(new Error('Lỗi tải phạm vi')).mockResolvedValue(summary);
 const view=render(<RetestPanel projectId={1} bug={{id:7,version:3}} canManage writable onChanged={vi.fn()}/>);await screen.findByText('Lỗi tải phạm vi');fireEvent.click(screen.getByRole('button',{name:'Tải lại retest'}));await screen.findByText('0 / 1 mục đạt');view.unmount();
 retestApi.request.mockRejectedValueOnce(new Error('Lỗi tải yêu cầu')).mockResolvedValue({...request,canSubmit:false});
 render(<RetestResult projectId={1} requestId={11} writable onSaved={vi.fn()} onClose={vi.fn()}/>);await screen.findByText('Lỗi tải yêu cầu');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('Chỉ người đang được phân công mới được ghi kết quả.');
});
it('preserves results after a conflict and uses an explicitly reloaded version',async()=>{
 retestApi.submit.mockRejectedValueOnce(Object.assign(new Error('Dữ liệu đã thay đổi'),{status:409})).mockResolvedValueOnce({...request,status:'SUBMITTED',canSubmit:false});
 render(<RetestResult projectId={1} requestId={11} writable onSaved={vi.fn()} onClose={vi.fn()}/>);
 fireEvent.change(await screen.findByLabelText('Kết quả TC-1'),{target:{value:'PASS'}});fireEvent.change(screen.getByLabelText('Thực tế TC-1'),{target:{value:'Đã vào được trang chủ'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả retest'}));await screen.findByText('Dữ liệu đã thay đổi');
 expect(screen.getByLabelText('Thực tế TC-1')).toHaveValue('Đã vào được trang chủ');expect(screen.getByRole('button',{name:'Lưu kết quả retest'})).toBeDisabled();
 retestApi.request.mockResolvedValue({...request,bugVersion:4});fireEvent.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu kết quả retest'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Lưu kết quả retest'}));
 await waitFor(()=>expect(retestApi.submit).toHaveBeenLastCalledWith(1,11,expect.objectContaining({expectedBugVersion:4,results:[expect.objectContaining({verdict:'PASS',actualResult:'Đã vào được trang chủ'})]})));
});
