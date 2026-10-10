import React from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {FileCaseView,SessionContext} from './FileCaseView';
const rows=[{runItemId:1,caseNo:'TC1',titleVi:'One',cells:['first'],sourceCells:['original']},{runItemId:2,caseNo:'TC2',titleVi:'Two',cells:['second'],sourceCells:['source two']}];
afterEach(()=>vi.unstubAllGlobals());
it('defaults to a single case on a narrow screen, navigates and preserves selection across layouts',()=>{
 vi.stubGlobal('matchMedia',vi.fn().mockReturnValue({matches:true}));
 const actions=vi.fn(row=><button>Save {row.caseNo}</button>);
 render(<FileCaseView view={{rows,headers:['Steps']}} renderResult={r=>r.caseNo} renderActions={actions}/>);
 expect(screen.getByRole('region',{name:'Case đang xem'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Case trước'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Case tiếp'}));expect(screen.getByText('second')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Case tiếp'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Xem dạng bảng'}));expect(screen.getByRole('region',{name:'Case thực thi chính thức'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Xem từng case'}));expect(screen.getByLabelText('Chọn case')).toHaveValue('2');
 fireEvent.click(screen.getByRole('button',{name:'Case trước'}));fireEvent.change(screen.getByLabelText('Chọn case'),{target:{value:'2'}});expect(screen.getByText('second')).toBeInTheDocument();
});
it('shows raw source cells and falls back safely when the selected case disappears',()=>{
 const props={raw:true,renderResult:r=>r.caseNo,renderActions:()=>null};
 const view=render(<FileCaseView {...props} view={{rows,headers:[]}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Xem từng case'}));expect(screen.getByText('original')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Case tiếp'}));view.rerender(<FileCaseView {...props} view={{rows:[rows[0]],headers:[]}}/>);
 expect(screen.getByText('original')).toBeInTheDocument();expect(screen.getByText('Cột 1')).toBeInTheDocument();
 view.rerender(<FileCaseView {...props} view={{rows:[],headers:[]}}/>);expect(screen.queryByRole('region',{name:'Case đang xem'})).toBeNull();
});
it('renders saved context using business labels rather than raw JSON',()=>{
 const {container}=render(<SessionContext context={{executor:{displayName:'Lan'},physicalAsset:{assetCode:'IP01',model:'iPad',osName:'iPadOS',osVersion:'18'},environment:{name:'QA'},device:{name:'Tablet'},build:{versionLabel:'1.2'}}}/>);
 expect(within(container).getByText('1.2')).toBeInTheDocument();expect(within(container).getByText('iPadOS 18')).toBeInTheDocument();expect(container.querySelector('pre')).toBeNull();
});
