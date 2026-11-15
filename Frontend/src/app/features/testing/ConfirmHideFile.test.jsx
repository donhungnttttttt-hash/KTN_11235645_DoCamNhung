import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {ConfirmHideFile} from './ConfirmHideFile';
afterEach(cleanup);
it('cancel and confirm are independent and busy blocks both',()=>{
 const cancel=vi.fn(),confirm=vi.fn();const props={document:{fileName:'cases.xlsx'},onCancel:cancel,onConfirm:confirm};
 const view=render(<ConfirmHideFile {...props}/>);expect(screen.getByRole('dialog')).toHaveTextContent('cases.xlsx');fireEvent.click(screen.getByText('Hủy'));expect(cancel).toHaveBeenCalledOnce();expect(confirm).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Xác nhận'));expect(confirm).toHaveBeenCalledOnce();view.rerender(<ConfirmHideFile {...props} busy/>);expect(screen.getByText('Hủy')).toBeDisabled();
});
