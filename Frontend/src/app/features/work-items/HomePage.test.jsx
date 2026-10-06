import React from 'react';
import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';

it('shows the saved milestone deadline and avoids filters for unavailable activity types',()=>{
  render(<HomePage issues={[]} activities={[]} activitySource="created" navigate={vi.fn()} statusCounts={[]}
    milestoneCounts={[{id:42,name:'Release',dueOn:'2026-10-20',total:2,done:1}]}/>);
  expect(screen.getByText('Hạn phát hành: 20/10/2026')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Hiển thị',exact:true})).toBeNull();
});

it('opens milestone work using the server ID instead of its editable name',async()=>{
  const navigate=vi.fn(),user=userEvent.setup();
  render(<HomePage issues={[]} activities={[]} navigate={navigate} statusCounts={[]}
    milestoneCounts={[{id:42,name:'Phát hành & iPad',total:2,done:1}]}/>);
  await user.click(screen.getByRole('button',{name:/Phát hành & iPad/}));
  expect(navigate).toHaveBeenCalledWith('/board/list?milestone=42');
});

it('offers real navigation without a favorite control that cannot persist', async () => {
  const navigate=vi.fn(),user=userEvent.setup();
  render(<HomePage issues={[{id:'DEMO-1',title:'Công việc demo',status:'open'}]}
    activities={[{id:1,issueId:'DEMO-1',user:'Tester',text:'',kind:'created',status:'open',timestamp:'2026-10-04T00:00:00Z'}]}
    navigate={navigate} statusCounts={[]} milestoneCounts={[]}/>);
  expect(screen.queryByRole('button',{name:/Yêu thích/})).toBeNull();
  await user.click(screen.getByRole('button',{name:'Bình luận DEMO-1'}));
  expect(navigate).toHaveBeenCalledWith('/board/issue/DEMO-1');
});

it('uses the current QA activity label while retaining generic BUG labels and all-item totals', () => {
  render(<HomePage
    issues={[
      { id: 'QA-8', typeCode: 'QA', title: 'QA question', status: 'resolved', statusLabel: 'Đã trả lời' },
      { id: 'BUG-7', typeCode: 'BUG', title: 'BUG title', status: 'resolved' },
    ]}
    activities={[
      { id: 1, issueId: 'QA-8', user: 'Dev', kind: 'created', status: 'resolved', minutes: 1 },
      { id: 2, issueId: 'BUG-7', user: 'Dev', kind: 'created', status: 'resolved', minutes: 2 },
    ]}
    activitySource="created" navigate={vi.fn()}
    statusCounts={[{ status: 'resolved', count: 40 }, { status: 'closed', count: 60 }]}
    milestoneCounts={[]}
  />);
  const qaActivity = screen.getByRole('button', { name: 'QA-8 QA question' }).closest('article');
  const bugActivity = screen.getByRole('button', { name: 'BUG-7 BUG title' }).closest('article');
  expect(within(qaActivity).getByText('[ Trạng thái: Đã trả lời ]')).toBeVisible();
  expect(within(bugActivity).getByText('[ Trạng thái: Đã xử lý ]')).toBeVisible();
  const summary = screen.getByRole('complementary');
  expect(within(summary).getByText('60/100 công việc hoàn thành · 60%')).toBeVisible();
  expect(within(summary).getByRole('button', { name: 'Đã xử lý 40' })).toBeVisible();
  expect(within(summary).queryByText('Đã trả lời')).toBeNull();
});

it('retains the historical activity status when the current QA status differs', () => {
  render(<HomePage
    issues={[{ id: 'QA-8', typeCode: 'QA', title: 'QA question', status: 'resolved', statusLabel: 'Đã trả lời' }]}
    activities={[{ id: 1, issueId: 'QA-8', user: 'Tester', kind: 'updated', status: 'open', minutes: 2 }]}
    navigate={vi.fn()} statusCounts={[]} milestoneCounts={[]}
  />);
  const activity = screen.getByRole('button', { name: 'QA-8 QA question' }).closest('article');
  expect(within(activity).getByText('[ Trạng thái: Chưa xử lý ]')).toBeVisible();
  expect(within(activity).queryByText(/Đã trả lời/)).toBeNull();
});

it('falls back to the generic activity label when no current typed label is available', () => {
  render(<HomePage
    issues={[{ id: 'QA-8', typeCode: 'QA', title: 'QA question', status: 'resolved', statusLabel: '' }]}
    activities={[{ id: 1, issueId: 'QA-8', user: 'Tester', kind: 'created', status: 'resolved', minutes: 2 }]}
    navigate={vi.fn()} statusCounts={[]} milestoneCounts={[]}
  />);
  const activity = screen.getByRole('button', { name: 'QA-8 QA question' }).closest('article');
  expect(within(activity).getByText('[ Trạng thái: Đã xử lý ]')).toBeVisible();
});
