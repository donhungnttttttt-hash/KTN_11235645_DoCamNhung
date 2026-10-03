import React, { useState } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttemptDialog } from './AttemptDialog';
import { AssignmentDialog } from './AssignmentDialog';
import { CycleDecisionDialog } from './CycleDecisionDialog';
import { executionApi } from '../../services/api/execution';

vi.mock('../../services/api/execution', () => ({ executionApi: {
  attempts: vi.fn(), assignments: vi.fn(), record: vi.fn(),
} }));
const empty = { items: [], page: 0, totalItems: 0, totalPages: 0 };
const run = { id: 9, caseNo: 'TC-01', titleVi: 'Đăng nhập', version: 0,
  assigneeUserId: 'tester', assigneeMembershipId: 1, defaultBuildId: 3, resultCode: 'OK' };
const props = { projectId: 1, run, builds: [{ id: 3, versionLabel: '1.0', platform: 'iOS' }],
  members: [], active: true, currentUserId: 'tester', onSaved: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  executionApi.attempts.mockResolvedValue(empty);
  executionApi.assignments.mockResolvedValue([]);
});

it.each([['result', AttemptDialog], ['assignment', AssignmentDialog], ['decision', CycleDecisionDialog]])('keeps keyboard focus in %s and returns it on Escape', async (_name, Component) => {
  function Page() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Mở</button><button>Nền trang</button>
      {open && <Component {...props} onClose={() => setOpen(false)} />}</>;
  }
  const user = userEvent.setup(); render(<Page />);
  await user.click(screen.getByText('Mở'));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Đóng' })).toHaveFocus();
  await user.tab({ shift: true }); expect(dialog.contains(document.activeElement)).toBe(true);
  await user.tab(); expect(within(dialog).getByRole('button', { name: 'Đóng' })).toHaveFocus();
  await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText('Mở')).toHaveFocus();
});

it('retries history independently, preserves the result draft and clears stale page data', async () => {
  executionApi.attempts.mockRejectedValueOnce(new Error('Lịch sử mất kết nối'))
    .mockResolvedValueOnce({ ...empty, totalItems: 2, totalPages: 2,
      items: [{ id: 1, attemptNo: 7, resultCode: 'OK', reason: 'Dòng trang đầu' }] })
    .mockRejectedValueOnce(new Error('Trang sau mất kết nối'))
    .mockResolvedValueOnce({ ...empty, page: 1, totalItems: 2, totalPages: 2,
      items: [{ id: 2, attemptNo: 6, resultCode: 'P', reason: 'Dòng trang sau' }] });
  const user = userEvent.setup(); render(<AttemptDialog {...props} onClose={vi.fn()} />);
  await screen.findByText('Lịch sử mất kết nối');
  await user.type(screen.getByLabelText('Kết quả thực tế'), 'Bản nháp đang nhập');
  await user.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByText(/Dòng trang đầu/);
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Tiếp', exact: true }));
  await screen.findByText('Trang sau mất kết nối');
  expect(screen.queryByText(/Dòng trang đầu/)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByText(/Dòng trang sau/);
  expect(screen.getByLabelText('Kết quả thực tế')).toHaveValue('Bản nháp đang nhập');
  expect(executionApi.record).not.toHaveBeenCalled();
});

it('prevents editing and Escape while a result is saving, then restores controls', async () => {
  let resolve;
  executionApi.record.mockReturnValue(new Promise(done => { resolve = done; }));
  const close = vi.fn(), user = userEvent.setup();
  render(<AttemptDialog {...props} onClose={close} />);
  await user.type(screen.getByLabelText('Kết quả thực tế'), 'Không mở được trang');
  await user.click(screen.getByRole('button', { name: 'Ghi kết quả' }));
  expect(screen.getByLabelText('Kết quả')).toBeDisabled();
  expect(screen.getByLabelText('Kết quả thực tế')).toBeDisabled();
  await user.keyboard('{Escape}'); expect(close).not.toHaveBeenCalled();
  await act(async () => resolve({ id: 55, attemptNo: 2, resultCode: 'NG' }));
  expect(screen.getByLabelText('Kết quả')).toBeEnabled();
  expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu lần chạy #2');
});
