import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {FeatureForm} from './FeatureForm';
import {featuresApi} from '../../services/api/features';
vi.mock('../../services/api/features',()=>({featuresApi:{get:vi.fn(),update:vi.fn(),create:vi.fn()}}));

test('keeps a rejected creation editable without offering to reload an unknown Feature',async()=>{
 featuresApi.create.mockRejectedValue(Object.assign(new Error('Yêu cầu tạo bị xung đột'),{status:409}));
 render(<FeatureForm projectId={1} onSaved={vi.fn()} onClose={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('Tên Feature'),{target:{value:'Feature đang tạo'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu Feature'}));await screen.findByRole('alert');
 expect(screen.queryByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'})).not.toBeInTheDocument();
 expect(screen.getByLabelText('Tên Feature')).toHaveValue('Feature đang tạo');
 expect(screen.getByRole('button',{name:'Lưu Feature'})).toBeEnabled();
});

test('compares the current Feature after a conflict while retaining the draft for explicit save',async()=>{
 featuresApi.update.mockRejectedValueOnce(Object.assign(new Error('Feature đã thay đổi'),{status:409})).mockResolvedValue({id:2,version:3});
 featuresApi.get.mockResolvedValue({id:2,name:'Tên người khác lưu',environment:'Server mới',description:'Mô tả mới',version:2});
 render(<FeatureForm projectId={1} feature={{id:2,name:'Tên cũ',environment:'Server cũ',description:'',version:0}} onSaved={vi.fn()} onClose={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('Tên Feature'),{target:{value:'Nháp của tôi'}});fireEvent.click(screen.getByRole('button',{name:'Lưu Feature'}));await screen.findByText('Feature đã thay đổi');
 fireEvent.click(screen.getByRole('button',{name:'Tải bản hiện hành, giữ bản nháp'}));await screen.findByText('Tên người khác lưu');expect(screen.getByLabelText('Tên Feature')).toHaveValue('Nháp của tôi');
 fireEvent.click(screen.getByRole('button',{name:'Lưu Feature'}));await waitFor(()=>expect(featuresApi.update).toHaveBeenLastCalledWith(1,2,expect.objectContaining({name:'Nháp của tôi',expectedVersion:2})));
});
