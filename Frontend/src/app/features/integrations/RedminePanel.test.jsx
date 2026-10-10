import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RedminePanel } from './RedminePanel';
import { redmineApi } from '../../services/api/redmine';
vi.mock('../../services/api/redmine',()=>({redmineApi:{state:vi.fn(),publish:vi.fn(),reconcile:vi.fn(),retry:vi.fn()}}));
const base={configured:true,canManage:true,sourceVersion:2,binding:null,deliveries:[],attempts:[],mapping:{statuses:{open:1,closed:10}}};
const props={projectId:1,bug:{id:7,version:2},writable:true};
beforeEach(()=>{vi.resetAllMocks();redmineApi.state.mockResolvedValue(base);});
async function open(){fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));await screen.findByText('Chưa công bố');}
it('loads only when opened and shows missing configuration without a publish action',async()=>{
  redmineApi.state.mockResolvedValue({...base,configured:false});render(<RedminePanel {...props}/>);expect(redmineApi.state).not.toHaveBeenCalled();await open();
  expect(screen.getByText('Dự án chưa được liên kết với Redmine.')).toBeVisible();expect(screen.queryByRole('button',{name:'Công bố lên Redmine'})).not.toBeInTheDocument();
});
it('keeps a failed publication draft and reuses its request key',async()=>{
  redmineApi.publish.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce({...base,deliveries:[{id:5,status:'QUEUED',version:0}]});
  render(<RedminePanel {...props}/>);await open();fireEvent.change(screen.getByLabelText('Lý do công bố hoặc đối chiếu'),{target:{value:'Đã duyệt thông tin'}});
  fireEvent.click(screen.getByRole('button',{name:'Công bố lên Redmine'}));await screen.findByText('Mất kết nối');
  expect(screen.getByLabelText('Lý do công bố hoặc đối chiếu')).toHaveValue('Đã duyệt thông tin');fireEvent.click(screen.getByRole('button',{name:'Công bố lên Redmine'}));
  await screen.findByText('Đang chờ gửi');expect(redmineApi.publish.mock.calls[0][2]).toEqual(redmineApi.publish.mock.calls[1][2]);
  expect(redmineApi.publish).toHaveBeenCalledWith(1,7,expect.objectContaining({expectedVersion:2,reason:'Đã duyệt thông tin'}));
});
it('members can view the external link but cannot publish or retry',async()=>{
  redmineApi.state.mockResolvedValue({...base,canManage:false,binding:{externalIssueId:42,url:'http://127.0.0.1:3080/issues/42'},deliveries:[{id:5,status:'FAILED',version:2}]});
  render(<RedminePanel {...props}/>);fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));
  expect(await screen.findByRole('link',{name:'Redmine #42'})).toHaveAttribute('rel','noreferrer');expect(screen.queryByLabelText('Lý do công bố hoặc đối chiếu')).not.toBeInTheDocument();
});
it('uncertain delivery offers reconciliation and never blind publication',async()=>{
  redmineApi.state.mockResolvedValue({...base,binding:{},deliveries:[{id:5,status:'UNCERTAIN',version:2}]});redmineApi.reconcile.mockResolvedValue({...base,deliveries:[{id:6,status:'QUEUED'}]});
  render(<RedminePanel {...props}/>);fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));await screen.findByText('Chưa rõ kết quả');
  expect(screen.queryByRole('button',{name:'Công bố lên Redmine'})).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('Lý do công bố hoặc đối chiếu'),{target:{value:'Kiểm tra ticket'}});fireEvent.click(screen.getByRole('button',{name:'Đối chiếu Redmine'}));
  await waitFor(()=>expect(redmineApi.reconcile).toHaveBeenCalled());expect(redmineApi.publish).not.toHaveBeenCalled();
});
it('requires explicit conflict review before sending the observed fingerprint',async()=>{
  const observed={subject:'Tiêu đề phía ngoài',description:'<img src=x>',statusId:10,priorityId:2};
  redmineApi.state.mockResolvedValue({...base,binding:{externalIssueId:42,observedFingerprint:'a'.repeat(64),observedPayload:observed,deliveredPayload:{...observed,statusId:1}},deliveries:[{id:5,status:'CONFLICT'}]});
  redmineApi.publish.mockResolvedValue({...base,deliveries:[{id:6,status:'QUEUED'}]});
  const {container}=render(<RedminePanel {...props}/>);fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));await screen.findByText('Có thay đổi cần đối chiếu');
  fireEvent.change(screen.getByLabelText('Lý do công bố hoặc đối chiếu'),{target:{value:'Giữ dữ liệu TMS đã duyệt'}});
  expect(screen.getByRole('button',{name:'Công bố bản TMS đã duyệt'})).toBeDisabled();fireEvent.click(screen.getByLabelText('Đã xem thay đổi trên Redmine'));
  fireEvent.click(screen.getByRole('button',{name:'Công bố bản TMS đã duyệt'}));await waitFor(()=>expect(redmineApi.publish).toHaveBeenCalledWith(1,7,expect.objectContaining({observedFingerprint:'a'.repeat(64)})));expect(container.querySelector('img')).toBeNull();
});
it('does not retain another project’s response after navigation',async()=>{
  let resolveOld;redmineApi.state.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValueOnce({...base,canManage:false});
  const {rerender}=render(<RedminePanel {...props}/>);fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));
  await waitFor(()=>expect(redmineApi.state).toHaveBeenCalledWith(1,7));rerender(<RedminePanel {...props} projectId={2}/>);await screen.findByText('Chưa công bố');resolveOld({...base,binding:{externalIssueId:99,url:'https://wrong.example'}});
  await waitFor(()=>expect(redmineApi.state).toHaveBeenCalledWith(2,7));expect(screen.queryByRole('link',{name:'Redmine #99'})).not.toBeInTheDocument();
});
it('loads a failed state again and keeps the draft through a version conflict',async()=>{
  redmineApi.state.mockRejectedValueOnce(new Error('Không có quyền xem')).mockResolvedValue(base);
  redmineApi.publish.mockRejectedValue(Object.assign(new Error('Bản ghi thay đổi'),{status:409}));
  render(<RedminePanel {...props}/>);fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));await screen.findByText('Không có quyền xem');
  expect(screen.queryByText('Chưa công bố')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Tải lại Redmine'}));await screen.findByText('Chưa công bố');
  fireEvent.change(screen.getByLabelText('Lý do công bố hoặc đối chiếu'),{target:{value:'Bản nháp PM'}});fireEvent.click(screen.getByRole('button',{name:'Công bố lên Redmine'}));await screen.findByText('Bản ghi thay đổi');expect(screen.getByRole('button',{name:'Công bố lên Redmine'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Tải lại Redmine'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Công bố lên Redmine'})).toBeEnabled());expect(screen.getByLabelText('Lý do công bố hoặc đối chiếu')).toHaveValue('Bản nháp PM');
});
it('retries a definitive failure using the delivery version and shows history',async()=>{
  redmineApi.state.mockResolvedValue({...base,deliveries:[{id:8,status:'FAILED',version:6,errorCode:'REMOTE_AUTH'}],attempts:[{id:1,attemptNo:1,outcome:'FAILED',occurredAt:'2026-09-30T02:00:00Z'}]});
  redmineApi.retry.mockResolvedValue({...base,deliveries:[{id:8,status:'RETRY_WAIT'}]});render(<RedminePanel {...props}/>);fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));await screen.findByText('Gửi thất bại');
  expect(screen.getByText(/Redmine từ chối quyền truy cập/)).toBeVisible();fireEvent.click(screen.getByText(/Lịch sử gửi/));expect(screen.getByText(/Lần 1/)).toBeVisible();
  fireEvent.change(screen.getByLabelText('Lý do công bố hoặc đối chiếu'),{target:{value:'Đã sửa quyền kết nối'}});fireEvent.click(screen.getByRole('button',{name:'Thử lại lần gửi'}));await screen.findByText('Chờ thử lại');expect(redmineApi.retry).toHaveBeenCalledWith(1,8,{expectedVersion:6,reason:'Đã sửa quyền kết nối'});
});
it('archive is read-only and shows local changes not yet published',async()=>{
  redmineApi.state.mockResolvedValue({...base,binding:{deliveredSourceVersion:1},deliveries:[{id:1,status:'DELIVERED'}]});render(<RedminePanel {...props} writable={false}/>);fireEvent.click(screen.getByText('Công bố và đối chiếu Redmine'));await screen.findByText('Đã đối chiếu khớp');
  expect(screen.getByText(/Bug có thay đổi trong TMS/)).toBeVisible();expect(screen.queryByLabelText('Lý do công bố hoặc đối chiếu')).not.toBeInTheDocument();
});
