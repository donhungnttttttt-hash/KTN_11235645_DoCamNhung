import React from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,test,vi} from 'vitest';
import {Modal} from './components';

test('expands and restores ticket without losing the mounted draft',async()=>{
 const user=userEvent.setup();
 render(<Modal title="Chi tiết công việc" drawer onClose={vi.fn()}><input aria-label="Ghi chú"/></Modal>);
 await user.type(screen.getByLabelText('Ghi chú'),'Đang đối chiếu');
 await user.click(screen.getByRole('button',{name:'Phóng to ticket'}));
 expect(screen.getByRole('dialog')).toHaveClass('is-expanded');
 expect(screen.getByLabelText('Ghi chú')).toHaveValue('Đang đối chiếu');
 await user.click(screen.getByRole('button',{name:'Thu nhỏ ticket'}));
 expect(screen.getByRole('dialog')).not.toHaveClass('is-expanded');
 expect(screen.getByLabelText('Ghi chú')).toHaveValue('Đang đối chiếu');
});

test('opens above a clipped document cell and returns focus to its trigger',async()=>{
 const user=userEvent.setup();
 function Cell(){const [open,setOpen]=React.useState(false);return <div data-testid="clipped-cell" style={{overflow:'hidden',width:130}}><button onClick={()=>setOpen(true)}>Issue trong case</button>{open&&<Modal title="Tạo Issue từ case" onClose={()=>setOpen(false)}><input aria-label="Nội dung Issue"/></Modal>}</div>;}
 render(<Cell/>);
 const trigger=screen.getByRole('button',{name:'Issue trong case'});await user.click(trigger);
 const dialog=screen.getByRole('dialog',{name:'Tạo Issue từ case'});
 expect(screen.getByTestId('clipped-cell')).not.toContainElement(dialog);
 await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();
});
