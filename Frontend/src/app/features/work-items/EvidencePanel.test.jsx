import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EvidencePanel } from './EvidencePanel';
import { workItemsApi } from '../../services/api/workItems';
vi.mock('../../services/api/workItems',()=>({workItemsApi:{attachments:vi.fn(),upload:vi.fn(),download:vi.fn(),removeAttachment:vi.fn()}}));
const proof={id:'proof-1',name:'proof.png',size:1025,uploadedBy:8};
const props={projectId:1,workId:2,writable:true,canTriage:false,membershipId:8};
beforeEach(()=>{vi.resetAllMocks();workItemsApi.attachments.mockResolvedValue([]);});
afterEach(()=>vi.restoreAllMocks());
it('retains a failed upload for retry, then reads durable metadata and clears the selection',async()=>{
  workItemsApi.upload.mockRejectedValueOnce(new Error('Kho chứng cứ chưa sẵn sàng')).mockResolvedValueOnce(proof);
  render(<React.StrictMode><EvidencePanel {...props}/></React.StrictMode>);
  await screen.findByText('Chưa có chứng cứ.');
  const file=new File(['png bytes'],'proof.png',{type:'image/png'});
  fireEvent.change(screen.getByLabelText('Chọn chứng cứ'),{target:{files:[file]}});
  fireEvent.click(screen.getByRole('button',{name:'Tải chứng cứ lên'}));
  await screen.findByText('Kho chứng cứ chưa sẵn sàng');
  expect(screen.getByRole('button',{name:'Tải chứng cứ lên'})).toBeEnabled();
  workItemsApi.attachments.mockResolvedValue([proof]);
  fireEvent.click(screen.getByRole('button',{name:'Tải chứng cứ lên'}));
  await screen.findByRole('button',{name:'proof.png',exact:true});
  expect(workItemsApi.upload).toHaveBeenLastCalledWith(1,2,file);
  expect(screen.getByRole('button',{name:'Tải chứng cứ lên'})).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Đã lưu chứng cứ.');
});
it('does not send oversized files and permits retrying a failed list',async()=>{
  workItemsApi.attachments.mockRejectedValueOnce(new Error('Lỗi tải danh sách')).mockResolvedValueOnce([]);
  render(<EvidencePanel {...props}/>);
  await screen.findByText('Lỗi tải danh sách');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));
  await screen.findByText('Chưa có chứng cứ.');
  const file=new File(['x'],'huge.mp4');Object.defineProperty(file,'size',{value:20*1024*1024+1});
  fireEvent.change(screen.getByLabelText('Chọn chứng cứ'),{target:{files:[file]}});
  fireEvent.click(screen.getByRole('button',{name:'Tải chứng cứ lên'}));
  await screen.findByText('Chứng cứ tối đa 20 MiB mỗi tệp.');expect(workItemsApi.upload).not.toHaveBeenCalled();
});
it('keeps metadata after a failed removal and refreshes only after success',async()=>{
  workItemsApi.attachments.mockResolvedValue([proof]);workItemsApi.removeAttachment.mockRejectedValueOnce(new Error('Không thể gỡ')).mockResolvedValueOnce();
  render(<EvidencePanel {...props}/>);fireEvent.click(await screen.findByRole('button',{name:'Gỡ proof.png'}));
  await screen.findByText('Không thể gỡ');expect(screen.getByRole('button',{name:'proof.png',exact:true})).toBeVisible();
  workItemsApi.attachments.mockResolvedValue([]);fireEvent.click(screen.getByRole('button',{name:'Gỡ proof.png'}));
  await screen.findByText('Chưa có chứng cứ.');expect(workItemsApi.removeAttachment).toHaveBeenLastCalledWith(1,2,'proof-1');
});
it('authorizes download through the API, exposes errors, and hides removal for another uploader',async()=>{
  workItemsApi.attachments.mockResolvedValue([proof]);workItemsApi.download.mockRejectedValueOnce(new Error('Không có quyền')).mockResolvedValueOnce(new Blob(['content']));
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  URL.createObjectURL=vi.fn(()=> 'blob:proof');URL.revokeObjectURL=vi.fn();
  render(<EvidencePanel {...props} membershipId={9}/>);
  fireEvent.click(await screen.findByRole('button',{name:'proof.png',exact:true}));await screen.findByText('Không có quyền');
  expect(screen.queryByRole('button',{name:'Gỡ proof.png'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'proof.png',exact:true}));await waitFor(()=>expect(click).toHaveBeenCalledOnce());
  expect(workItemsApi.download).toHaveBeenLastCalledWith(1,2,'proof-1');
});
it('shows a read-only list for an archived project even for its PM',async()=>{
  workItemsApi.attachments.mockResolvedValue([proof]);render(<EvidencePanel {...props} writable={false} canTriage/>);
  await screen.findByRole('button',{name:'proof.png',exact:true});expect(screen.queryByLabelText('Chọn chứng cứ')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Gỡ proof.png'})).not.toBeInTheDocument();
});
