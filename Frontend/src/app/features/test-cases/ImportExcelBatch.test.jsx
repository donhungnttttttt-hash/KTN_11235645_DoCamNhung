import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExcelDialog } from './ImportExcelDialog';
import { testCasesApi } from '../../services/api/testCases';

vi.mock('../../services/api/testCases', () => ({ testCasesApi: { createImportPreview: vi.fn(), commitImportPreview: vi.fn(), importTemplate: vi.fn() } }));
const preview = (id, extra = {}) => ({ id, status: 'PREVIEW', totalRows: 1, validRows: 1, errorRows: 0, rows: [], ...extra });
const files = () => [new File(['a'], 'a.xlsx'), new File(['b'], 'b.xlsx')];
beforeEach(() => vi.resetAllMocks());
async function start() {
  const user = userEvent.setup(), onSuccess = vi.fn(), onClose = vi.fn();
  const view = render(<ImportExcelDialog projectId={1} onSuccess={onSuccess} onClose={onClose} />);
  await user.upload(screen.getByLabelText('Chọn tệp Excel'), files());
  await user.click(screen.getByRole('button', { name: /Xem trước kết quả/ }));
  return { user, onSuccess, onClose, view };
}
it('previews all selected files and waits for explicit batch confirmation', async () => {
  testCasesApi.createImportPreview.mockResolvedValueOnce(preview(1)).mockResolvedValueOnce(preview(2));
  testCasesApi.commitImportPreview.mockImplementation((p, id) => Promise.resolve({ id, status: 'COMMITTED' }));
  const { user, onSuccess } = await start();
  await waitFor(() => expect(testCasesApi.createImportPreview).toHaveBeenCalledTimes(2));
  expect(testCasesApi.commitImportPreview).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: /Xác nhận nhập 2 file/ }));
  expect(await screen.findByText('Đã nhập 2/2 file.')).toBeVisible();
  expect(onSuccess).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Hoàn tất' }));
  expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ documents: [{ id: 1, status: 'COMMITTED' }, { id: 2, status: 'COMMITTED' }] }));
});
it('preserves successful files and retries only a failed commit', async () => {
  testCasesApi.createImportPreview.mockResolvedValueOnce(preview(1)).mockResolvedValueOnce(preview(2));
  testCasesApi.commitImportPreview.mockResolvedValueOnce({ id: 1, status: 'COMMITTED' }).mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce({ id: 2, status: 'COMMITTED' });
  const { user, onSuccess } = await start();
  await user.click(await screen.findByRole('button', { name: /Xác nhận nhập 2 file/ }));
  expect(await screen.findByText('Mất kết nối')).toBeVisible();
  await user.click(screen.getByRole('button', { name: /Xác nhận nhập 1 file/ }));
  expect(await screen.findByText('Đã nhập 2/2 file.')).toBeVisible();
  expect(testCasesApi.commitImportPreview.mock.calls.map(x => x[1])).toEqual([1, 2, 2]);
  expect(onSuccess).not.toHaveBeenCalled();
});
it('keeps file errors visible while valid files can be imported', async () => {
  testCasesApi.createImportPreview.mockResolvedValueOnce(preview(1)).mockRejectedValueOnce(new Error('Sai mẫu Excel'));
  testCasesApi.commitImportPreview.mockResolvedValue({ id: 1, status: 'COMMITTED' });
  const { user } = await start();
  expect(await screen.findByText('Sai mẫu Excel')).toBeVisible();
  await user.click(screen.getByRole('button', { name: /Xác nhận nhập 1 file/ }));
  expect(await screen.findByText('Đã nhập 1/2 file.')).toBeVisible();
  expect(testCasesApi.commitImportPreview).toHaveBeenCalledTimes(1);
});
it('stops the queue when the dialog is unmounted', async () => {
  let resolve;
  testCasesApi.createImportPreview.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const { view, onSuccess } = await start();
  view.unmount(); await act(async () => resolve(preview(1)));
  expect(testCasesApi.createImportPreview).toHaveBeenCalledTimes(1);
  expect(onSuccess).not.toHaveBeenCalled();
});
it('replaces an invalid file after partial success and leaves successful files alone', async () => {
  testCasesApi.createImportPreview.mockResolvedValueOnce(preview(1)).mockResolvedValueOnce(preview(2, { errorRows: 1, validRows: 0 })).mockResolvedValueOnce(preview(3));
  testCasesApi.commitImportPreview.mockImplementation((p, id) => Promise.resolve({ id, status: 'COMMITTED' }));
  const { user } = await start();
  await user.click(await screen.findByRole('button', { name: /Xác nhận nhập 1 file/ }));
  expect(await screen.findByText('Đã nhập 1/2 file.')).toBeVisible();
  await user.upload(screen.getByLabelText('Thay file b.xlsx'), new File(['fixed'], 'fixed.xlsx'));
  await user.click(screen.getByRole('button', { name: 'Thử lại file chưa xem trước' }));
  await user.click(await screen.findByRole('button', { name: /Xác nhận nhập 1 file/ }));
  expect(await screen.findByText('Đã nhập 2/2 file.')).toBeVisible();
  expect(testCasesApi.commitImportPreview.mock.calls.map(x => x[1])).toEqual([1, 3]);
});
it('does not recommit a previously imported workbook and allows inspecting each file', async () => {
  testCasesApi.createImportPreview.mockResolvedValueOnce(preview(1, { status: 'COMMITTED', fileName: 'a.xlsx' })).mockResolvedValueOnce(preview(2, { fileName: 'b.xlsx', rows: [{ rowNumber: 2, valid: true, titleVi: 'Case B' }] }));
  const { user } = await start();
  await user.click(await screen.findByRole('button', { name: /b.xlsx.*1 dòng hợp lệ/ }));
  expect(screen.getByText('Case B')).toBeVisible();
  expect(screen.getByText('Đã có trong thư viện')).toBeVisible();
  testCasesApi.commitImportPreview.mockResolvedValue({ id: 2, status: 'COMMITTED' });
  await user.click(screen.getByRole('button', { name: /Xác nhận nhập 1 file/ }));
  await waitFor(() => expect(testCasesApi.commitImportPreview).toHaveBeenCalledExactlyOnceWith(1, 2));
});
it('stops committing further files after authorization is revoked', async () => {
  testCasesApi.createImportPreview.mockResolvedValueOnce(preview(1)).mockResolvedValueOnce(preview(2));
  testCasesApi.commitImportPreview.mockRejectedValue(Object.assign(new Error('Không còn quyền'), { status: 403 }));
  const { user } = await start();
  await user.click(await screen.findByRole('button', { name: /Xác nhận nhập 2 file/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Không còn quyền');
  expect(testCasesApi.commitImportPreview).toHaveBeenCalledTimes(1);
});
it('limits batch size before making a request', async () => {
  const user=userEvent.setup();
  render(<ImportExcelDialog projectId={1} onSuccess={vi.fn()} onClose={vi.fn()} />);
  await user.upload(screen.getByLabelText('Chọn tệp Excel'), Array.from({ length: 21 }, (_, i) => new File(['x'], `${i}.xlsx`)));
  await user.click(screen.getByRole('button', { name: /Xem trước kết quả/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('tối đa 20');
  expect(testCasesApi.createImportPreview).not.toHaveBeenCalled();
});
it('resets the dialog and stops pending requests when the project changes', async () => {
  let resolve;
  testCasesApi.createImportPreview.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const { view, onSuccess, onClose } = await start();
  view.rerender(<ImportExcelDialog projectId={2} onSuccess={onSuccess} onClose={onClose} />);
  await act(async () => resolve(preview(1)));
  expect(screen.getByLabelText('Chọn tệp Excel').files).toHaveLength(0);
  expect(screen.queryByText('a.xlsx')).not.toBeInTheDocument();
  expect(testCasesApi.createImportPreview).toHaveBeenCalledTimes(1);
});
