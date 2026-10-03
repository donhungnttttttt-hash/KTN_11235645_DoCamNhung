import React, { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDialogFocus } from './useDialogFocus';

function Dialog({ onClose, busy=false, empty=false }) {
  const ref=useDialogFocus(onClose,busy);
  return <div ref={ref} role="dialog" tabIndex={-1}>{!empty && <><button>Đầu</button><input aria-label="Nội dung"/><button disabled>Không chọn</button><button>Cuối</button></>}</div>;
}
it('traps Tab in both directions and returns focus to the opener on Escape',async()=>{
  const user=userEvent.setup();
  function Page(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Mở</button>{open && <Dialog onClose={()=>setOpen(false)}/>}</>;}
  render(<Page/>);await user.click(screen.getByText('Mở'));expect(screen.getByText('Đầu')).toHaveFocus();
  await user.tab({shift:true});expect(screen.getByText('Cuối')).toHaveFocus();await user.tab();expect(screen.getByText('Đầu')).toHaveFocus();await user.tab();expect(screen.getByLabelText('Nội dung')).toHaveFocus();
  await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByText('Mở')).toHaveFocus();
});
it('does not dismiss a busy dialog and focuses an empty dialog',()=>{
  const close=vi.fn();const view=render(<Dialog onClose={close} busy empty/>);fireEvent.keyDown(document,{key:'Escape'});expect(close).not.toHaveBeenCalled();fireEvent.keyDown(document,{key:'Tab'});expect(screen.getByRole('dialog')).toHaveFocus();view.rerender(<Dialog onClose={close} empty/>);fireEvent.keyDown(document,{key:'Escape'});expect(close).toHaveBeenCalledOnce();
});
