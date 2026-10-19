import React from 'react';
import {render,screen} from '@testing-library/react';
import {expect,test} from 'vitest';
import {ExcelImportPreview} from './ExcelImportPreview';

test('shows exact source IDs from the Feature preview contract before import',()=>{
 render(<ExcelImportPreview previewData={{fileName:'Case.xlsx',format:'CUSTOMER_V1',totalRows:2,validRows:2,errorRows:0,rows:[{rowNumber:2,caseNo:'TC-Đăng nhập',titleVi:'Mở màn',valid:true},{rowNumber:3,caseNo:'001-漢字',titleVi:'Xác nhận',valid:true}]}}/>);
 expect(screen.getByRole('cell',{name:'TC-Đăng nhập'})).toBeInTheDocument();expect(screen.getByRole('cell',{name:'001-漢字'})).toBeInTheDocument();
});
