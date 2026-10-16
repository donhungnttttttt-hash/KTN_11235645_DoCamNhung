import React,{useState} from 'react';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {SelectionTable} from './SelectionTable';

const rows=[{id:'alpha',name:'Alpha'},{id:'beta',name:'Beta'}];
function Picker(){const [selected,setSelected]=useState(['other-page']);return <SelectionTable label="Tester" rows={rows} selected={selected} onChange={setSelected} pageScope/>;}
it('explains offscreen selections and resets local filters without dropping them',async()=>{
 const user=userEvent.setup();render(<Picker/>);
 expect(screen.getByText('1 mục ngoài phần đang hiển thị')).toBeVisible();
 await user.click(screen.getByRole('checkbox',{name:'Chọn Alpha'}));
 await user.type(screen.getByLabelText('Tìm trong Tester'),'missing');
 expect(screen.getByText(/Không có mục khớp bộ lọc trên trang này/)).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Xóa bộ lọc trong bảng · Tester'}));
 expect(screen.getByLabelText('Tìm trong Tester')).toHaveFocus();
 expect(screen.getByRole('checkbox',{name:'Chọn Alpha'})).toBeChecked();
 expect(screen.getByText('2 mục đã chọn')).toBeVisible();
 expect(screen.getByText('1 mục ngoài phần đang hiển thị')).toBeVisible();
});
it('makes the selected view page-scoped and resets only the view inside a parent form',async()=>{
 const user=userEvent.setup(),submit=vi.fn(e=>e.preventDefault());
 render(<form onSubmit={submit}><Picker/></form>);
 const view=screen.getByLabelText('Hiển thị · Tester');
 expect(within(view).getByRole('option',{name:'Đã chọn trên trang'})).toBeInTheDocument();
 await user.selectOptions(view,'selected');
 await user.click(screen.getByRole('button',{name:'Xóa bộ lọc trong bảng · Tester'}));
 expect(view).toHaveValue('');expect(submit).not.toHaveBeenCalled();
 expect(screen.getByText('1 mục đã chọn')).toBeVisible();
});
it('keeps the callers failed-read message when there are no source rows to filter',async()=>{
 const user=userEvent.setup();render(<SelectionTable label="Phạm vi" rows={[]} selected={['other-page']} onChange={()=>{}} empty="Chưa tải được danh sách. Bấm Thử lại." pageScope/>);
 await user.selectOptions(screen.getByLabelText('Hiển thị · Phạm vi'),'selected');
 expect(screen.getByText('Chưa tải được danh sách. Bấm Thử lại.')).toBeVisible();
});
