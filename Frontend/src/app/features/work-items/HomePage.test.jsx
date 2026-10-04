import React from 'react';
import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
