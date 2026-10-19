import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {SelectionTable} from './SelectionTable';

it('finds a complete local choice using all accent-insensitive words across its fields',()=>{
 render(<SelectionTable label="Người" selected={[]} onChange={vi.fn()} rows={[{id:1,name:'Cẩm Nhung',searchText:'Đỗ'},{id:2,name:'Cẩm Linh',searchText:'Lê'}]}/>);
 fireEvent.change(screen.getByLabelText('Tìm trong Người'),{target:{value:'NHUNG do cam'}});
 expect(screen.getByLabelText('Chọn Cẩm Nhung')).toBeInTheDocument();
 expect(screen.queryByLabelText('Chọn Cẩm Linh')).toBeNull();
});
