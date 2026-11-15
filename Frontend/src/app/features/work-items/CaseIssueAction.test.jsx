import React from 'react';
import {act,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {CaseIssueAction} from './CaseIssueAction';
import userEvent from '@testing-library/user-event';

it('counts closed issues for this exact copied case and exposes a touch and keyboard preview',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[{id:7,key:'P-7',title:'Đã đóng',status:'closed'}],totalItems:1})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 const badge=await screen.findByRole('button',{name:'Ticket (1)'});
 fireEvent.click(badge);
 expect(screen.getByRole('button',{name:'P-7 · Đã đóng'})).toBeVisible();
 expect(api.list).toHaveBeenCalledWith(1,expect.objectContaining({featureId:2,documentId:3,rowId:4}),expect.anything());
 expect(api.list.mock.calls[0][1]).not.toHaveProperty('status');
 fireEvent.keyDown(screen.getByRole('region',{name:'Ticket của case'}),{key:'Escape'});
 expect(screen.queryByRole('region',{name:'Ticket của case'})).toBeNull();
 expect(badge).toHaveFocus();
});
it('closes a focus-opened preview with Escape while focus is still on the badge',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 const badge=await screen.findByRole('button',{name:'Ticket (0)'});fireEvent.focus(badge);
 expect(screen.getByRole('region',{name:'Ticket của case'})).toBeVisible();fireEvent.keyDown(badge,{key:'Escape'});
 expect(screen.queryByRole('region',{name:'Ticket của case'})).toBeNull();
});
it('retains the open case draft and disables sending after create permission changes',async()=>{
 const api={options:vi.fn().mockResolvedValue({assignees:[{membershipId:11,displayName:'Contact'}]}),list:vi.fn().mockResolvedValue({items:[],totalItems:0}),context:vi.fn().mockResolvedValue({title:'Icon',steps:'Mở',expectedResult:'Có icon'}),create:vi.fn()};
 const props={projectId:1,featureId:2,documentId:3,row:{rowId:4},api};const view=render(<CaseIssueAction {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Ticket (0)'}));
 fireEvent.click(screen.getByRole('button',{name:'Tạo Ticket từ case'}));
 const title=await screen.findByLabelText('Tiêu đề');fireEvent.change(title,{target:{value:'Nháp chưa gửi'}});
 view.rerender(<CaseIssueAction {...props} canCreate={false}/>);
 expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Nháp chưa gửi');expect(screen.getByRole('button',{name:'Lưu Ticket'})).toBeDisabled();expect(api.create).not.toHaveBeenCalled();
});
it('lets Tab enter the preview and continue to the next case control in logical order',async()=>{
 const user=userEvent.setup(),api={list:vi.fn().mockResolvedValue({items:[{id:7,key:'P-7',title:'Đã đóng',status:'closed'}],totalItems:1})};
 render(<><CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api} canCreate={false}/><button>Lịch sử Status kế tiếp</button></>);
 const trigger=await screen.findByRole('button',{name:'Ticket (1)'});trigger.focus();
 await user.tab();expect(screen.getByRole('button',{name:'P-7 · Đã đóng'})).toHaveFocus();
 await user.tab();expect(screen.getByRole('button',{name:'Lịch sử Status kế tiếp'})).toHaveFocus();expect(screen.queryByRole('region',{name:'Ticket của case'})).toBeNull();
});
it('guards closing a pending Ticket and lets the user keep a failed-save draft',async()=>{
 const user=userEvent.setup();let fail;
 const api={options:vi.fn().mockResolvedValue({assignees:[{membershipId:11,displayName:'Contact'}]}),list:vi.fn().mockResolvedValue({items:[],totalItems:0}),context:vi.fn().mockResolvedValue({title:'Icon',steps:'Mở',expectedResult:'Có icon'}),create:vi.fn(()=>new Promise((_resolve,reject)=>{fail=reject;}))};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);await user.click(await screen.findByRole('button',{name:'Ticket (0)'}));await user.click(screen.getByRole('button',{name:'Tạo Ticket từ case'}));await screen.findByDisplayValue('Icon');await user.type(screen.getByLabelText('Kết quả thực tế'),'Không hiển thị');
 for(const label of ['Tần suất tái hiện','Môi trường phát hiện','Thiết bị phát hiện'])await user.type(screen.getByLabelText(label),'Manual evidence');
 await screen.findByRole('option',{name:'Contact'});await user.selectOptions(screen.getByLabelText('Người phụ trách'),'11');await user.click(screen.getByRole('button',{name:'Lưu Ticket'}));
 await user.keyboard('{Escape}');expect(screen.getByRole('dialog',{name:'Tạo Ticket từ case'})).toBeInTheDocument();
 await act(async()=>fail(new Error('Mất kết nối')));await user.keyboard('{Escape}');await user.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));expect(screen.getByLabelText('Kết quả thực tế')).toHaveValue('Không hiển thị');
});

it('opens the empty issue list on click instead of unexpectedly opening a create form',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0}),context:vi.fn()};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Ticket (0)'}));
 expect(screen.getByRole('region',{name:'Ticket của case'})).toHaveTextContent('Chưa có Ticket gắn với case này.');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(api.context).not.toHaveBeenCalled();
});

it('anchors the preview to the right of the hovered button and follows table scroll',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api} canCreate={false}/>);
 const trigger=await screen.findByRole('button',{name:'Ticket (0)'});
 vi.spyOn(trigger,'getBoundingClientRect').mockReturnValue({left:100,right:180,top:120,bottom:152,width:80,height:32});
 fireEvent.mouseEnter(trigger);
 expect(screen.getByRole('region',{name:'Ticket của case'})).toHaveStyle({left:'188px',top:'120px'});
 trigger.getBoundingClientRect.mockReturnValue({left:50,right:130,top:90,bottom:122,width:80,height:32});
 fireEvent.scroll(document);
 expect(screen.getByRole('region',{name:'Ticket của case'})).toHaveStyle({left:'138px',top:'90px'});
 fireEvent.pointerDown(document.body);
 expect(screen.queryByRole('region',{name:'Ticket của case'})).not.toBeInTheDocument();
});

it('keeps the preview on the right even when the button is near the viewport edge',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api} canCreate={false}/>);
 const trigger=await screen.findByRole('button',{name:'Ticket (0)'});
 vi.spyOn(trigger,'getBoundingClientRect').mockReturnValue({left:window.innerWidth-90,right:window.innerWidth-10,top:window.innerHeight-40,bottom:window.innerHeight-8,width:80,height:32});
 fireEvent.mouseEnter(trigger);
 const preview=screen.getByRole('region',{name:'Ticket của case'});
 expect(parseFloat(preview.style.left)).toBe(window.innerWidth-2);
 expect(parseFloat(preview.style.top)+280).toBeLessThanOrEqual(window.innerHeight-8);
});

it('scrolls the case table enough to make space on the right instead of flipping the preview',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0})};
 render(<div className="td-grid-scroll" data-testid="grid"><CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/></div>);
 const trigger=await screen.findByRole('button',{name:'Ticket (0)'}),grid=screen.getByTestId('grid');
 vi.spyOn(trigger,'getBoundingClientRect').mockImplementation(()=>({left:window.innerWidth-90-grid.scrollLeft,right:window.innerWidth-10-grid.scrollLeft,top:120,bottom:152,width:80,height:32}));
 fireEvent.mouseEnter(trigger);
 const preview=screen.getByRole('region',{name:'Ticket của case'});
 expect(grid.scrollLeft).toBe(326);
 expect(parseFloat(preview.style.left)).toBe(trigger.getBoundingClientRect().right+8);
 expect(parseFloat(preview.style.left)+320).toBeLessThanOrEqual(window.innerWidth-8);
});

it('allows moving the pointer into the preview and closes after leaving both surfaces',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 const trigger=await screen.findByRole('button',{name:'Ticket (0)'});fireEvent.mouseEnter(trigger);
 const preview=screen.getByRole('region',{name:'Ticket của case'});fireEvent.mouseLeave(trigger);fireEvent.mouseEnter(preview);
 await act(()=>new Promise(resolve=>setTimeout(resolve,180)));
 expect(preview).toBeVisible();fireEvent.mouseLeave(preview);
 await waitFor(()=>expect(screen.queryByRole('region',{name:'Ticket của case'})).not.toBeInTheDocument());
});

it('retries an issue preview failure in place without opening the create form',async()=>{
 const api={list:vi.fn().mockRejectedValueOnce(new Error('Chưa tải được Ticket')).mockResolvedValue({items:[],totalItems:0})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api} canCreate={false}/>);
 fireEvent.mouseEnter(await screen.findByRole('button',{name:'Ticket (?)'}));
 fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));
 expect(await screen.findByText('Chưa có Ticket gắn với case này.')).toBeVisible();
 expect(screen.queryByRole('button',{name:'Tạo Ticket từ case'})).not.toBeInTheDocument();expect(api.list).toHaveBeenCalledTimes(2);
});
