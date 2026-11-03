import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {TicketNotifications} from './TicketNotifications';
const notice={id:1,projectId:42,ticketId:7,ticketKey:'P-7',title:'Ticket question',message:'Bạn được phân công',actorName:'Lan',createdAt:'2026-11-03T01:00:00Z',readAt:null};
it('acknowledges before opening the scoped ticket and keeps the notice on retryable read failure',async()=>{
 const api={notifications:vi.fn().mockResolvedValue({items:[notice],unreadCount:1,totalItems:1}),readNotification:vi.fn().mockRejectedValueOnce(new Error('Chưa đọc được')).mockResolvedValue({id:1,readAt:'now'})};const navigate=vi.fn();
 render(<TicketNotifications api={api} navigate={navigate}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Thông báo Ticket (1 chưa đọc)'}));
 fireEvent.click(await screen.findByRole('button',{name:'Mở P-7 · Ticket question'}));expect(await screen.findByText('Chưa đọc được')).toBeInTheDocument();expect(navigate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Mở P-7 · Ticket question'}));await waitFor(()=>expect(navigate).toHaveBeenCalledWith('/board/issue/7?projectId=42&workspace=1'));
 expect(api.readNotification).toHaveBeenCalledWith(1,expect.anything());
});
it('purges a notification that is no longer accessible and does not open its private route',async()=>{
 const api={notifications:vi.fn().mockResolvedValue({items:[notice],unreadCount:1,totalItems:1}),readNotification:vi.fn().mockRejectedValue(Object.assign(new Error('Không còn quyền'),{status:404}))};const navigate=vi.fn();
 render(<TicketNotifications api={api} navigate={navigate}/>);fireEvent.click(await screen.findByRole('button',{name:'Thông báo Ticket (1 chưa đọc)'}));fireEvent.click(await screen.findByRole('button',{name:'Mở P-7 · Ticket question'}));await screen.findByText('Thông báo không còn truy cập được.');expect(screen.queryByText('Ticket question')).not.toBeInTheDocument();expect(navigate).not.toHaveBeenCalled();
});
