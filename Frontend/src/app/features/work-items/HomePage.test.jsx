import React from 'react';
import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';

it('offers real navigation without a favorite control that cannot persist', async () => {
  const navigate=vi.fn(),user=userEvent.setup();
  render(<HomePage issues={[{id:'DEMO-1',title:'Công việc demo',status:'open'}]}
    activities={[{id:1,issueId:'DEMO-1',user:'Tester',text:'',kind:'created',status:'open',timestamp:'2026-10-04T00:00:00Z'}]}
    navigate={navigate} statusCounts={[]} milestoneCounts={[]}/>);
  expect(screen.queryByRole('button',{name:/Yêu thích/})).toBeNull();
  await user.click(screen.getByRole('button',{name:'Bình luận DEMO-1'}));
  expect(navigate).toHaveBeenCalledWith('/board/issue/DEMO-1');
});
