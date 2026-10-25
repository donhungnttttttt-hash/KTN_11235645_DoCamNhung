import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {FeatureIssueForm} from './FeatureIssueForm';

it('shows current Feature environment and description before creating Bug or QA from a case',async()=>{
 const api={context:vi.fn().mockResolvedValue({featureId:2,featureName:'Test 25 tháng 10',featureEnvironment:'idec-test100',featureDescription:'Sử dụng test ST app Duolingo',fileName:'A.xlsx',caseNo:'1',title:'Bản vẽ',steps:'Mở bản vẽ',expectedResult:'Hiện bản vẽ'}),create:vi.fn().mockResolvedValue({id:9})};
 render(<FeatureIssueForm projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 const context=within(await screen.findByRole('region',{name:'Thông tin Feature hiện tại'}));
 expect(context.getByText('Test 25 tháng 10')).toBeInTheDocument();
 expect(context.getByText('idec-test100')).toBeInTheDocument();
 expect(context.getByText('Sử dụng test ST app Duolingo')).toBeInTheDocument();
 expect(screen.getByLabelText('Mô tả')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('Loại Issue'),{target:{value:'QA'}});
 expect(context.getByText('idec-test100')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'),{target:{value:'Câu hỏi riêng của Issue'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));
 await waitFor(()=>expect(api.create).toHaveBeenCalledOnce());
 expect(api.create.mock.calls[0][1]).toEqual(expect.objectContaining({type:'QA',featureId:2,description:'Câu hỏi riêng của Issue'}));
 expect(api.create.mock.calls[0][1]).not.toHaveProperty('featureDescription');
 expect(api.create.mock.calls[0][1]).not.toHaveProperty('featureEnvironment');
});

it('prefills the exact case and keeps the draft and case context when saving fails',async()=>{
 const api={context:vi.fn().mockResolvedValue({featureName:'Feature A',fileName:'A.xlsx',caseNo:'CASE-2',title:'Icon stamp',steps:'Mở bản vẽ',expectedResult:'Hiện icon'}),create:vi.fn().mockRejectedValue(new Error('Mất kết nối'))};
 const saved=vi.fn();
 render(<FeatureIssueForm projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api} onSaved={saved}/>);
 await waitFor(()=>expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Icon stamp'));
 expect(screen.getByLabelText('Các bước thực hiện')).toHaveValue('Mở bản vẽ');
 fireEvent.change(screen.getByLabelText('Kết quả thực tế'),{target:{value:'Không hiện'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu Issue'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
 expect(screen.getByLabelText('Kết quả thực tế')).toHaveValue('Không hiện');
 expect(saved).not.toHaveBeenCalled();
 expect(api.create).toHaveBeenCalledWith(1,expect.objectContaining({featureId:2,documentId:3,rowId:4,type:'BUG',monkey:false}),expect.anything());
});
it('lets a failed current-case context load be retried explicitly',async()=>{
 const api={context:vi.fn().mockRejectedValueOnce(new Error('Không lấy được case')).mockResolvedValueOnce({title:'Đúng case',steps:'Bước',expectedResult:'Đạt'}),create:vi.fn()};
 render(<FeatureIssueForm projectId={1} featureId={2} documentId={3} row={{rowId:4}} api={api}/>);
 await screen.findByText('Không lấy được case');fireEvent.click(screen.getByRole('button',{name:'Tải lại nội dung case'}));
 await waitFor(()=>expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Đúng case'));
 expect(api.context).toHaveBeenCalledTimes(2);expect(screen.getByLabelText('Tiêu đề')).toBeEnabled();expect(api.create).not.toHaveBeenCalled();
});
it('keeps an entered draft but denies submit if create permission is revoked',async()=>{
 const api={create:vi.fn()},view=render(<FeatureIssueForm projectId={1} featureId={2} monkey api={api}/>);
 fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'Giữ nháp'}});
 view.rerender(<FeatureIssueForm projectId={1} featureId={2} monkey api={api} authorized={false}/>);
 expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Giữ nháp');expect(screen.getByRole('button',{name:'Lưu Issue'})).toBeDisabled();
 expect(screen.getByRole('alert')).toHaveTextContent('Quyền tạo Issue');expect(api.create).not.toHaveBeenCalled();
});
