import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {FeatureIssueForm} from './FeatureIssueForm';

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
