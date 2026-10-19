import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {MultiSelect} from './components';

it('finds a local multi-select option with reordered unaccented words',()=>{
 render(<MultiSelect label="Thành viên" options={[{id:'one',label:'Đỗ Cẩm Nhung'},{id:'two',label:'Cẩm Linh'}]} selected={[]} onChange={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('Tìm thành viên'),{target:{value:'NHUNG do'}});
 expect(screen.getByRole('button',{name:'Đỗ Cẩm Nhung'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Cẩm Linh'})).toBeNull();
});
