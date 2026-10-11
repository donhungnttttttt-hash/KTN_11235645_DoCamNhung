import React,{useState} from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,test} from 'vitest';
import {SelectionTable} from './SelectionTable';

test('filters names, selects only eligible visible rows, keeps hidden selections and shows mixed state',async()=>{
 const user=userEvent.setup();
 function Demo(){const [selected,setSelected]=useState(['elsewhere']);return <SelectionTable label="Người nhận" rows={[{id:'a',name:'Alpha'},{id:'b',name:'Beta'},{id:'c',name:'Alpha locked',disabled:true}]} selected={selected} onChange={setSelected}/>;}
 render(<Demo/>);
 await user.type(screen.getByLabelText('Tìm trong Người nhận'),'Alpha');
 await user.click(screen.getByRole('checkbox',{name:'Chọn tất cả đang hiển thị · Người nhận'}));
 expect(screen.getByRole('checkbox',{name:'Chọn Alpha',exact:true})).toBeChecked();
 expect(screen.getByRole('checkbox',{name:'Chọn Alpha locked'})).not.toBeChecked();
 await user.clear(screen.getByLabelText('Tìm trong Người nhận'));
 expect(screen.getByRole('checkbox',{name:'Chọn tất cả đang hiển thị · Người nhận'})).toBePartiallyChecked();
 await user.click(screen.getByRole('checkbox',{name:'Chọn tất cả đang hiển thị · Người nhận'}));
 expect(screen.getByRole('checkbox',{name:'Chọn Beta'})).toBeChecked();
 expect(screen.getByText('3 mục đã chọn')).toBeInTheDocument();
});
