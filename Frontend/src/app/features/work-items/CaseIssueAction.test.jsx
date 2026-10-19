import React from 'react';
import {act,render,screen,fireEvent} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {CaseIssueAction} from './CaseIssueAction';
import userEvent from '@testing-library/user-event';

it('counts closed issues for this exact copied case and exposes a touch and keyboard preview',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[{id:7,key:'P-7',title:'Đã đóng',status:'closed'}],totalItems:1})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 const badge=await screen.findByRole('button',{name:'Issue (1)'});
 fireEvent.click(badge);
 expect(screen.getByRole('button',{name:'P-7 · Đã đóng'})).toBeVisible();
 expect(api.list).toHaveBeenCalledWith(1,expect.objectContaining({featureId:2,documentId:3,rowId:4}),expect.anything());
 expect(api.list.mock.calls[0][1]).not.toHaveProperty('status');
 fireEvent.keyDown(screen.getByRole('region',{name:'Issue của case'}),{key:'Escape'});
 expect(screen.queryByRole('region',{name:'Issue của case'})).toBeNull();
 expect(badge).toHaveFocus();
});
it('closes a focus-opened preview with Escape while focus is still on the badge',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0})};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 const badge=await screen.findByRole('button',{name:'Issue (0)'});fireEvent.focus(badge);
 expect(screen.getByRole('region',{name:'Issue của case'})).toBeVisible();fireEvent.keyDown(badge,{key:'Escape'});
 expect(screen.queryByRole('region',{name:'Issue của case'})).toBeNull();
});
it('retains the open case draft and disables sending after create permission changes',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0}),context:vi.fn().mockResolvedValue({title:'Icon',steps:'Mở',expectedResult:'Có icon'}),create:vi.fn()};
 const props={projectId:1,featureId:2,documentId:3,row:{rowId:4},api};const view=render(<CaseIssueAction {...props}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Issue (0)'}));
 const title=await screen.findByLabelText('Tiêu đề');fireEvent.change(title,{target:{value:'Nháp chưa gửi'}});
 view.rerender(<CaseIssueAction {...props} canCreate={false}/>);
 expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Nháp chưa gửi');expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeDisabled();expect(api.create).not.toHaveBeenCalled();
});
it('lets Tab enter the preview and continue to the next case control in logical order',async()=>{
 const user=userEvent.setup(),api={list:vi.fn().mockResolvedValue({items:[{id:7,key:'P-7',title:'Đã đóng',status:'closed'}],totalItems:1})};
 render(<><CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api} canCreate={false}/><button>Lịch sử Status kế tiếp</button></>);
 const trigger=await screen.findByRole('button',{name:'Issue (1)'});trigger.focus();
 await user.tab();expect(screen.getByRole('button',{name:'P-7 · Đã đóng'})).toHaveFocus();
 await user.tab();expect(screen.getByRole('button',{name:'Lịch sử Status kế tiếp'})).toHaveFocus();expect(screen.queryByRole('region',{name:'Issue của case'})).toBeNull();
});
it('guards closing a pending Issue and lets the user keep a failed-save draft',async()=>{
 const user=userEvent.setup();let fail;
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0}),context:vi.fn().mockResolvedValue({title:'Icon',steps:'Mở',expectedResult:'Có icon'}),create:vi.fn(()=>new Promise((_resolve,reject)=>{fail=reject;}))};
 render(<CaseIssueAction projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);await user.click(await screen.findByRole('button',{name:'Issue (0)'}));await screen.findByDisplayValue('Icon');await user.type(screen.getByLabelText('Kết quả thực tế'),'Không hiển thị');await user.click(screen.getByRole('button',{name:'Lưu Issue'}));
 await user.keyboard('{Escape}');expect(screen.getByRole('dialog',{name:'Tạo Issue từ case'})).toBeInTheDocument();
 await act(async()=>fail(new Error('Mất kết nối')));await user.keyboard('{Escape}');await user.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));expect(screen.getByLabelText('Kết quả thực tế')).toHaveValue('Không hiển thị');
});
