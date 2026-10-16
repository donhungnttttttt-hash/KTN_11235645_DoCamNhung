import React, { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDialogFocus } from './useDialogFocus';
import { Modal } from '../features/work-items/components';

function Dialog({ onClose, busy=false, empty=false }) {
  const ref=useDialogFocus(onClose,busy);
  return <div ref={ref} role="dialog" tabIndex={-1}>{!empty && <><button>Đầu</button><input aria-label="Nội dung"/><button disabled>Không chọn</button><button>Cuối</button></>}</div>;
}
it('a nonmodal AI chat does not disable the active modal keyboard controls',()=>{
 const close=vi.fn();
 render(<><Dialog onClose={close}/><section role="dialog" aria-modal="false" aria-label="AI chat"><button>Chat</button></section></>);
 fireEvent.keyDown(document,{key:'Escape'});
 expect(close).toHaveBeenCalledOnce();
});
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

it('only closes the topmost dialog when a nested flow is open', async () => {
  const parentClose = vi.fn(), childClose = vi.fn(), user = userEvent.setup();
  render(<><Dialog onClose={parentClose}/><Dialog onClose={childClose}/></>);
  await user.keyboard('{Escape}');
  expect(childClose).toHaveBeenCalledOnce();
  expect(parentClose).not.toHaveBeenCalled();
});

it('does not close the result dialog behind a work-item modal', async () => {
  const parentClose = vi.fn(), childClose = vi.fn(), user = userEvent.setup();
  render(<><Dialog onClose={parentClose}/><Modal title="Liên kết bug" onClose={childClose}><button>Lưu liên kết</button></Modal></>);
  await user.keyboard('{Escape}');
  expect(childClose).toHaveBeenCalledOnce();
  expect(parentClose).not.toHaveBeenCalled();
});

it('wraps to the visible summary instead of content inside a closed disclosure',async()=>{
 function Disclosure(){const ref=useDialogFocus(()=>{});return <section role="dialog" ref={ref} tabIndex={-1}><button>Đầu hộp thoại</button><details><summary>Lịch sử kiểm thử</summary><button>Nội dung đang ẩn</button></details></section>;}
 const user=userEvent.setup();render(<Disclosure/>);
 await user.tab({shift:true});expect(screen.getByText('Lịch sử kiểm thử')).toHaveFocus();
 await user.tab();expect(screen.getByRole('button',{name:'Đầu hộp thoại'})).toHaveFocus();
});
it('skips hidden and inert controls and an unavailable initial-focus target',async()=>{
 function HiddenControls(){const ref=useDialogFocus(()=>{});return <section role="dialog" ref={ref} tabIndex={-1}><button disabled data-dialog-initial-focus>Đang khóa</button><button>Đầu đang hiện</button><div hidden><button>Đang ẩn</button></div><div inert=""><button>Không tương tác</button></div><button>Cuối đang hiện</button><div style={{display:'none'}}><button>Ẩn bằng CSS</button></div></section>;}
 const user=userEvent.setup();render(<HiddenControls/>);
 expect(screen.getByRole('button',{name:'Đầu đang hiện'})).toHaveFocus();
 await user.tab({shift:true});expect(screen.getByRole('button',{name:'Cuối đang hiện'})).toHaveFocus();
});
