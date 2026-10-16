import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ScopeSetup} from './ScopeSetup';
import {CoverageEditor} from '../retest/CoverageEditor';
import {testCasesApi} from '../../services/api/testCases';
import {retestApi} from '../../services/api/retest';

vi.mock('../../services/api/testCases',()=>({testCasesApi:{listCases:vi.fn()}}));
vi.mock('../../services/api/retest',()=>({retestApi:{candidates:vi.fn()}}));
vi.mock('../file-work/FileWorkPage',()=>({CreateFile:()=>null}));
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});return {promise,resolve,reject};};
const cases={items:[{id:1,currentRevisionId:11,caseNo:'TC-1',titleVi:'Đăng nhập',approved:true}],totalItems:1,totalPages:1,page:0};
const candidates={items:[{id:101,caseNo:'TC-1',titleVi:'Đăng nhập',cycleName:'R1',environmentName:'QA',deviceName:'iPad',assigneeName:'Tester'}],totalItems:1,totalPages:1,page:0};
beforeEach(()=>{vi.resetAllMocks();});

it('ends the manual case-table busy state on fetch failure and retries without losing the scope draft',async()=>{
 const refresh=deferred(),retry=deferred(),user=userEvent.setup();
 testCasesApi.listCases.mockResolvedValueOnce(cases).mockReturnValueOnce(refresh.promise).mockReturnValueOnce(retry.promise);
 const props={projectId:1,cycle:{id:9,version:0},configs:[{id:3,environmentName:'QA',deviceName:'iPad'}],catalogs:{environments:[],devices:[],builds:[]},members:[{id:7,displayName:'Tester',active:true,enabled:true,projectRole:'TESTER',systemRole:'TESTER'}],onSaved:vi.fn()};
 const view=render(<ScopeSetup {...props} refreshKey={0}/>);
 await user.click(screen.getByRole('button',{name:'Case riêng lẻ'}));
 await user.click(await screen.findByRole('checkbox',{name:'Chọn TC-1'}));
 await user.selectOptions(screen.getByLabelText('Cấu hình chạy'),'3');await user.selectOptions(screen.getByLabelText('Người thực hiện'),'7');
 view.rerender(<ScopeSetup {...props} refreshKey={1}/>);
 const table=screen.getByRole('table',{name:'Phạm vi test case'}).closest('section');
 await waitFor(()=>expect(table).toHaveAttribute('aria-busy','true'));
 await act(async()=>refresh.reject(new Error('Không tải được danh sách case')));
 expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách case');expect(table).toHaveAttribute('aria-busy','false');expect(within(table).queryByText('Đang tải…')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Cấu hình chạy')).toHaveValue('3');expect(screen.getByLabelText('Người thực hiện')).toHaveValue('7');expect(within(table).getByText('1 mục đã chọn')).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Thử lại'}));await waitFor(()=>expect(table).toHaveAttribute('aria-busy','true'));
 await act(async()=>retry.resolve(cases));await waitFor(()=>expect(table).toHaveAttribute('aria-busy','false'));
 expect(screen.getByRole('checkbox',{name:'Chọn TC-1'})).toBeChecked();expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Cấu hình chạy')).toHaveValue('3');expect(screen.getByLabelText('Người thực hiện')).toHaveValue('7');
});

it('ends the retest candidate-table busy state on fetch failure and retries with the selection and reason intact',async()=>{
 const search=deferred(),retry=deferred(),user=userEvent.setup();
 retestApi.candidates.mockResolvedValueOnce(candidates).mockReturnValueOnce(search.promise).mockReturnValueOnce(retry.promise);
 render(<CoverageEditor projectId={1} items={[{runItemId:101}]} busy={false} onSubmit={vi.fn()}/>);
 expect(await screen.findByRole('checkbox',{name:'Chọn TC-1 · Đăng nhập'})).toBeChecked();
 await user.type(screen.getByLabelText('Lý do xác nhận phạm vi'),'Giữ lý do đang đối chiếu');
 fireEvent.change(screen.getByRole('textbox',{name:'Tìm case cho phạm vi'}),{target:{value:'TC-1'}});
 const table=screen.getByRole('table',{name:'Case cho phạm vi'}).closest('section');
 await waitFor(()=>expect(table).toHaveAttribute('aria-busy','true'));await act(async()=>search.reject(new Error('Không tải được phạm vi retest')));
 expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được phạm vi retest');expect(table).toHaveAttribute('aria-busy','false');expect(within(table).queryByText('Đang tải…')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Lý do xác nhận phạm vi')).toHaveValue('Giữ lý do đang đối chiếu');expect(within(table).getByText('1 mục đã chọn')).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Thử lại'}));await waitFor(()=>expect(table).toHaveAttribute('aria-busy','true'));
 await act(async()=>retry.resolve(candidates));await waitFor(()=>expect(table).toHaveAttribute('aria-busy','false'));
 expect(screen.getByRole('checkbox',{name:'Chọn TC-1 · Đăng nhập'})).toBeChecked();expect(screen.getByLabelText('Lý do xác nhận phạm vi')).toHaveValue('Giữ lý do đang đối chiếu');expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
