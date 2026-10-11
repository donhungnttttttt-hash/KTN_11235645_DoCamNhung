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
