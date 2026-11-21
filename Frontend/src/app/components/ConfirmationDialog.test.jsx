import React,{useState} from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {ConfirmationDialog,useConfirmation} from './ConfirmationDialog';

function Question({scope=1,onAccepted}){
 const {ask,confirmation}=useConfirmation(scope);
 return <><button onClick={async()=>{if(await ask({title:'Xóa dữ liệu?',message:'Giữ lịch sử cũ.'}))onAccepted();}}>Xóa</button>{confirmation}</>;
}
it('cancels with Escape, traps Tab and returns focus without accepting',async()=>{
 const accepted=vi.fn();render(<Question onAccepted={accepted}/>);
 const trigger=screen.getByRole('button',{name:'Xóa'});trigger.focus();fireEvent.click(trigger);
 const dialog=screen.getByRole('dialog',{name:'Xóa dữ liệu?'});
 expect(within(dialog).getByRole('button',{name:'Hủy'})).toHaveFocus();
 const confirm=within(dialog).getByRole('button',{name:'Xác nhận'});confirm.focus();fireEvent.keyDown(document,{key:'Tab'});
 expect(within(dialog).getByRole('button',{name:'Đóng xác nhận'})).toHaveFocus();
 fireEvent.keyDown(document,{key:'Escape'});
 expect(screen.queryByRole('dialog')).toBeNull();expect(trigger).toHaveFocus();expect(accepted).not.toHaveBeenCalled();
 expect(document.body.style.overflow).not.toBe('hidden');
});
it('accepts once, and never runs a pending operation after its scope changes or unmounts',async()=>{
 const accepted=vi.fn();const view=render(<Question onAccepted={accepted}/>);
 fireEvent.click(screen.getByRole('button',{name:'Xóa'}));
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận'}));
 await waitFor(()=>expect(accepted).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByRole('button',{name:'Xóa'}));
 view.rerender(<Question scope={2} onAccepted={accepted}/>);
 await act(async()=>{});expect(screen.queryByRole('dialog')).toBeNull();expect(accepted).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Xóa'}));view.unmount();
 await act(async()=>{});expect(accepted).toHaveBeenCalledTimes(1);
});
it('blocks closing while saving and keeps Escape inside the topmost popup',()=>{
 const close=vi.fn(),cancel=vi.fn();
 function Nested(){const [open,setOpen]=useState(false);return <ConfirmationDialog title="Parent" onCancel={close}><button onClick={()=>setOpen(true)}>Open child</button>{open&&<ConfirmationDialog title="Child" busy onCancel={cancel}><p>Saving</p></ConfirmationDialog>}</ConfirmationDialog>;}
 render(<Nested/>);fireEvent.click(screen.getByRole('button',{name:'Open child'}));
 fireEvent.keyDown(document,{key:'Escape'});
 expect(close).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled();
 expect(within(screen.getByRole('dialog',{name:'Child'})).getByRole('button',{name:'Đóng xác nhận'})).toBeDisabled();
});
