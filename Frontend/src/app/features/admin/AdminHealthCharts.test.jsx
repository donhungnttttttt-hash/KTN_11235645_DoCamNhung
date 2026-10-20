import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';

const metrics = { total: 10, applicable: 10, tested: 6, ok: 3, ng: 1, pending: 1, na: 1, notRun: 4, executionPercent: 60, passPercent: 30 };
const project = id => ({ id, code: `P-${id}`, name: `Dự án ${id}`, metrics, activeMembers: 2, activePmCount: 1,
  pmNames: 'PM', archivedAt: null, heldDevices: 0, openBugs: 2, awaitingVerification: 1, overdueMilestones: 3, insufficientMilestoneData: 1 });
const overview = (projects = [project(1)], totalProjects = projects.length) => ({
  asOf: '2026-10-19T03:00:00Z', totalProjects, activeProjects: totalProjects, totalUsers: 2, enabledUsers: 2,
  openBugs: 8, awaitingVerification: 3, metrics, byRole: [], byProject: projects,
  attention: { overdueMilestones: [], overdueMilestoneCount: 4, withoutPm: [], awaitingVerification: [], insufficientMilestoneData: 2 },
});
const card = id => screen.findByRole('article', { name: `Sức khỏe dự án P-${id}` });

describe('Admin health charts', () => {
  test('the circular overview uses full-scope proportions and exposes every exact count', async () => {
    const data = overview();
    data.metrics = { ...metrics, total: 100, tested: 25, ok: 20, ng: 2, pending: 2, na: 1, notRun: 75, executionPercent: 25 };
    render(<AdminDashboard api={{ overview: vi.fn().mockResolvedValue(data) }} />);
    const overall = await screen.findByRole('region', { name: 'Sức khỏe toàn bộ dự án' });
    const chart = within(overall).getByRole('img', { name: 'Biểu đồ tròn kết quả kiểm thử' });
    expect(chart).toHaveAccessibleDescription('OK: 20 case (20%); NG: 2 case (2%); P: 2 case (2%); NA: 1 case (1%); Chưa chạy: 75 case (75%).');
    const okSlice = within(chart).getByText('OK: 20 case (20%)', { selector: 'title' }).parentElement;
    expect(okSlice).toHaveAttribute('pathLength', '100');
    expect(okSlice).toHaveAttribute('stroke-dasharray', '20 80');
    expect(within(overall).getByLabelText('Chưa chạy: 75 case')).toHaveTextContent('75%');
  });

  test('project columns use a common percentage scale with exact counts even for tiny or zero categories', async () => {
    const small = { ...project(1), metrics: { ...metrics, total: 200, tested: 1, ok: 1, ng: 0, pending: 0, na: 0, notRun: 199, executionPercent: 0.5 } };
    render(<AdminDashboard api={{ overview: vi.fn().mockResolvedValue(overview([small, project(2)])) }} />);
    const first = await card(1);
    const chart = within(first).getByRole('img', { name: 'Biểu đồ cột kết quả kiểm thử' });
    expect(chart).toHaveAccessibleDescription('OK: 1 case (0.5%); NG: 0 case (0%); P: 0 case (0%); NA: 0 case (0%); Chưa chạy: 199 case (99.5%).');
    const ok = within(chart).getByTitle('OK: 1 case (0.5%)').firstElementChild;
    const notRun = within(chart).getByTitle('Chưa chạy: 199 case (99.5%)').firstElementChild;
    expect(ok).toHaveStyle({ height: '0.5%' });
    expect(notRun).toHaveStyle({ height: '99.5%' });
    const zero = within(chart).getByTitle('NG: 0 case (0%)').firstElementChild;
    expect(zero).toHaveStyle({ height: '0%' });
    const otherChart = within(await card(2)).getByRole('img', { name: 'Biểu đồ cột kết quả kiểm thử' });
    expect(within(chart).getByText('100%')).toBeInTheDocument();
    expect(within(otherChart).getByText('100%')).toBeInTheDocument();
    expect(within(otherChart).getByTitle('OK: 3 case (30%)').firstElementChild).toHaveStyle({ height: '30%' });
  });

  test('all-one-result renders a complete circle and an empty total never draws a false distribution', async () => {
    const allOk = { ...metrics, total: 10, tested: 10, ok: 10, ng: 0, pending: 0, na: 0, notRun: 0, executionPercent: 100 };
    const data = { ...overview(), metrics: allOk };
    const view = render(<AdminDashboard api={{ overview: vi.fn().mockResolvedValue(data) }} />);
    const chart = await screen.findByRole('img', { name: 'Biểu đồ tròn kết quả kiểm thử' });
    expect(within(chart).getByText('OK: 10 case (100%)', { selector: 'title' }).parentElement).toHaveAttribute('stroke-dasharray', '100 0');
    view.unmount();
    const emptyMetrics = { total: 0, tested: 0, ok: 0, ng: 0, pending: 0, na: 0, notRun: 0, executionPercent: 0 };
    render(<AdminDashboard api={{ overview: vi.fn().mockResolvedValue({ ...overview(), metrics: emptyMetrics, byProject: [{ ...project(1), metrics: emptyMetrics }] }) }} />);
    const overall = await screen.findByRole('region', { name: 'Sức khỏe toàn bộ dự án' });
    expect(within(overall).queryByRole('img')).not.toBeInTheDocument();
    expect(within(await card(1)).queryByRole('img')).not.toBeInTheDocument();
    expect(within(overall).getByText('Chưa có case trong phạm vi kiểm thử.')).toBeVisible();
  });

  test('uses full-scope counts for the overall chart and factual indicators per project', async () => {
    const data = overview();
    data.metrics = { ...metrics, total: 100, tested: 25, ok: 20, ng: 2, pending: 2, na: 1, notRun: 75, executionPercent: 25, passPercent: 20 };
    render(<AdminDashboard api={{ overview: vi.fn().mockResolvedValue(data) }} />);
    const overall = await screen.findByRole('region', { name: 'Sức khỏe toàn bộ dự án' });
    expect(within(overall).getByText('Đã test 25/100 case')).toBeVisible();
    expect(within(overall).getByLabelText('OK: 20 case')).toBeVisible();
    expect(within(overall).getByLabelText('Chưa chạy: 75 case')).toBeVisible();
    expect(within(overall).getByLabelText('Bug chưa kết thúc: 8')).toBeVisible();
    expect(within(overall).getByLabelText('Mốc quá hạn: 4')).toBeVisible();
    const first = await card(1);
    expect(within(first).getByText('Đã test 6/10 case')).toBeVisible();
    expect(within(first).getByLabelText('Mốc quá hạn: 3')).toBeVisible();
    expect(within(first).getByText('1 mốc chưa đủ dữ liệu về hạn hoặc phạm vi.')).toBeVisible();
    expect(within(first).getByRole('link', { name: 'Xem dự án P-1' })).toHaveAttribute('href', '#/admin/projects/1');
  });

  test('loads beyond the ten-project overview and beyond one API page', async () => {
    const items = Array.from({ length: 101 }, (_, index) => project(index + 1));
    const api = {
      overview: vi.fn().mockResolvedValue(overview(items.slice(0, 10), 101)),
      projects: vi.fn(async ({ page, size }) => ({ items: items.slice(page * size, (page + 1) * size), page, size, totalElements: 101 })),
    };
    render(<AdminDashboard api={api} />);
    expect(await card(101)).toBeVisible();
    expect(screen.getAllByRole('article', { name: /^Sức khỏe dự án / })).toHaveLength(101);
    expect(api.projects).toHaveBeenNthCalledWith(1, { projectId: undefined, page: 0, size: 100 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(api.projects).toHaveBeenNthCalledWith(2, { projectId: undefined, page: 1, size: 100 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  test('keeps complete overview project data without a redundant request', async () => {
    const api = { overview: vi.fn().mockResolvedValue(overview()), projects: vi.fn() };
    render(<AdminDashboard api={api} />);
    expect(await card(1)).toBeVisible();
    expect(api.projects).not.toHaveBeenCalled();
  });

  test('failed project reads preserve the overall chart and provide a working retry', async () => {
    const api = { overview: vi.fn().mockResolvedValue(overview([project(1)], 2)),
      projects: vi.fn().mockRejectedValueOnce(new Error('Không tải được biểu đồ dự án'))
        .mockResolvedValueOnce({ items: [project(1), project(2)], page: 0, size: 100, totalElements: 2 }) };
    render(<AdminDashboard api={api} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không tải được biểu đồ dự án');
    expect(screen.getByRole('region', { name: 'Sức khỏe toàn bộ dự án' })).toBeVisible();
    expect(screen.queryByRole('article', { name: /^Sức khỏe dự án / })).not.toBeInTheDocument();
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Thử lại biểu đồ dự án' }));
    expect(await card(2)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('does not silently render partial charts when the next project page fails', async () => {
    const items = Array.from({ length: 100 }, (_, index) => project(index + 1));
    const api = { overview: vi.fn().mockResolvedValue(overview(items.slice(0, 10), 101)),
      projects: vi.fn().mockResolvedValueOnce({ items, page: 0, size: 100, totalElements: 101 }).mockRejectedValueOnce(new Error('Trang tiếp theo lỗi')) };
    render(<AdminDashboard api={api} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Trang tiếp theo lỗi');
    expect(screen.queryByRole('article', { name: /^Sức khỏe dự án / })).not.toBeInTheDocument();
  });

  test('a project selection discards late chart data from the previous scope', async () => {
    let resolveOld;
    const api = { overview: vi.fn().mockResolvedValueOnce(overview([project(1)], 2)).mockResolvedValueOnce(overview([project(9)])),
      projects: vi.fn(() => new Promise(resolve => { resolveOld = resolve; })) };
    const view = render(<AdminDashboard api={api} />);
    await waitFor(() => expect(api.projects).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status', { name: 'Đang tải biểu đồ dự án' })).toBeVisible();
    view.rerender(<AdminDashboard projectId="9" api={api} />);
    const selected = await card(9);
    expect(within(selected).getByRole('link', { name: 'Xem dự án P-9' })).toHaveAttribute('href', '#/admin/projects/9?projectId=9');
    await act(async () => resolveOld({ items: [project(1), project(2)], page: 0, size: 100, totalElements: 2 }));
    expect(screen.queryByRole('article', { name: 'Sức khỏe dự án P-2' })).not.toBeInTheDocument();
  });

  test('zero-case and archived projects remain visible without claiming completion', async () => {
    const archived = { ...project(2), archivedAt: '2026-10-01', metrics: { total: 0, tested: 0, ok: 0, ng: 0, pending: 0, na: 0, notRun: 0, executionPercent: 0 } };
    render(<AdminDashboard api={{ overview: vi.fn().mockResolvedValue(overview([archived])) }} />);
    const item = await card(2);
    expect(within(item).getByText('Đã lưu trữ')).toBeVisible();
    expect(within(item).getByText('Chưa có case trong phạm vi kiểm thử.')).toBeVisible();
    expect(within(item).queryByText(/100%/)).not.toBeInTheDocument();
  });

  test('empty projects has an explicit empty state under the overall chart', async () => {
    render(<AdminDashboard api={{ overview: vi.fn().mockResolvedValue(overview([], 0)) }} />);
    const region = await screen.findByRole('region', { name: 'Biểu đồ từng dự án' });
    expect(within(region).getByText('Chưa có dự án trong phạm vi đã chọn.')).toBeVisible();
  });

  test('changed pagination totals require retry rather than claiming all projects loaded', async () => {
    const items = Array.from({ length: 100 }, (_, index) => project(index + 1));
    const api = { overview: vi.fn().mockResolvedValue(overview(items.slice(0, 10), 101)),
      projects: vi.fn().mockResolvedValueOnce({ items, page: 0, size: 100, totalElements: 101 })
        .mockResolvedValueOnce({ items: [], page: 1, size: 100, totalElements: 100 }) };
    render(<AdminDashboard api={api} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Danh sách dự án đã thay đổi');
    expect(screen.queryByRole('article', { name: /^Sức khỏe dự án / })).not.toBeInTheDocument();
  });
});
