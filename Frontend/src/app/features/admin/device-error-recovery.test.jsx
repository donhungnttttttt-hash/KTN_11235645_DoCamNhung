import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {ApiError} from '../../services/api/client';
import {DeviceAssetForm} from './DeviceAssetForm';
import {DeviceAllocationDialog} from './DeviceAllocationDialog';

const asset={id:8,assetCode:'IP-08',type:'IPAD',model:'iPad',conditionCode:'AVAILABLE',status:'AVAILABLE',version:2};
const allocation={id:5,version:4,projectName:'Alpha',recipientName:'Manager',returnedAt:null};
const reloadName='Tải phiên bản hiện hành, giữ bản nháp';
it('guides a missing project locally without offering unrelated version recovery or writing',()=>{
 const api={assignDevice:vi.fn()};render(<DeviceAllocationDialog asset={asset} api={api} onSaved={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận bàn giao'}));
 expect(screen.getByRole('alert')).toHaveTextContent('Chọn dự án nhận máy trước khi bàn giao.');
 expect(screen.queryByRole('button',{name:reloadName})).toBeNull();expect(api.assignDevice).not.toHaveBeenCalled();
});
it('does not offer a version reload for invalid fields in an existing asset edit',()=>{
 render(<DeviceAssetForm asset={asset} api={{}} onSaved={vi.fn()}/>);
 fireEvent.invalid(screen.getByLabelText('Hãng / model'));
 expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra các trường bắt buộc');
 expect(screen.queryByRole('button',{name:reloadName})).toBeNull();
});
const forms=[
 {name:'asset',Form:DeviceAssetForm,props:{asset},save:'Lưu máy',method:'updateAsset',field:'Hãng / model'},
 {name:'return',Form:DeviceAllocationDialog,props:{asset,allocation},save:'Xác nhận thu hồi',method:'returnDevice',field:'Ghi chú bàn giao / thu hồi'},
];
it.each(forms.flatMap(form=>[{status:422,code:'INVALID_RECIPIENT'},{status:403,code:'FORBIDDEN'},{status:0,code:'NETWORK_ERROR'},{status:409,code:'ARCHIVED'}].map(failure=>({...form,failure}))))('does not offer $name version recovery for $failure.code',async({Form,props,save,method,failure})=>{
 const api={[method]:vi.fn().mockRejectedValue(new ApiError('Không thể lưu',failure))};
 render(<Form {...props} api={api} onSaved={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:save}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu');
 expect(screen.queryByRole('button',{name:reloadName})).toBeNull();
});
it.each(forms)('keeps the $name draft through failed reload and announces successful version recovery as status',async({Form,props,save,method,field,name})=>{
 const saved=vi.fn(),read=vi.fn().mockRejectedValueOnce(new ApiError('Mất kết nối khi đối chiếu')).mockResolvedValue(name==='asset'?{...asset,version:3}:{items:[{...allocation,version:6}]}),api={
  [method]:vi.fn().mockRejectedValueOnce(new ApiError('Dữ liệu đã thay đổi',{status:409,code:'VERSION_CONFLICT'})).mockResolvedValue({}),
  ...(name==='asset'?{asset:read}:{allocations:read}),
 };
 render(<Form {...props} api={api} onSaved={saved}/>);fireEvent.change(screen.getByLabelText(field),{target:{value:'Bản sửa còn giữ'}});fireEvent.click(screen.getByRole('button',{name:save}));
 await screen.findByText('Dữ liệu đã thay đổi');fireEvent.click(screen.getByRole('button',{name:reloadName}));
 await screen.findByText('Mất kết nối khi đối chiếu');expect(screen.getByRole('button',{name:reloadName})).toBeEnabled();
 expect(screen.getByLabelText(field)).toHaveValue('Bản sửa còn giữ');fireEvent.click(screen.getByRole('button',{name:reloadName}));
 const notice=await screen.findByText(/Đã tải phiên bản hiện hành/);expect(notice).toHaveAttribute('role','status');expect(notice).toHaveFocus();
 expect(screen.queryByRole('alert')).toBeNull();expect(screen.queryByRole('button',{name:reloadName})).toBeNull();
 expect(screen.getByLabelText(field)).toHaveValue('Bản sửa còn giữ');fireEvent.click(screen.getByRole('button',{name:save}));await waitFor(()=>expect(saved).toHaveBeenCalled());
 expect(api[method]).toHaveBeenLastCalledWith(name==='asset'?8:5,expect.objectContaining({expectedVersion:name==='asset'?3:6}));
});
