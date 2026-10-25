import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {AdminProjectForm} from './AdminProjectForm';
import {AdminDevices} from './AdminDevices';
import {DeviceAssetForm} from './DeviceAssetForm';
import {DeviceAllocationDialog} from './DeviceAllocationDialog';
import {ProjectDevices} from '../projects/ProjectDevices';
import {ProjectDeviceAssignDialog} from '../projects/ProjectDeviceAssignDialog';
const asset={id:8,assetCode:'IP-08',type:'IPAD',model:'iPad',conditionCode:'AVAILABLE',status:'AVAILABLE',version:2};
const page=items=>({items,totalElements:items.length});
async function chooseProject(label){fireEvent.click(screen.getByLabelText(label));fireEvent.click(await screen.findByRole('option',{name:'AA · Alpha'}));}
it('creates project with selected physical machine and clears recipient after member removal',async()=>{
 const api={users:vi.fn().mockResolvedValue(page([{id:'pm',displayName:'Manager',username:'manager',role:'PM'},{id:'dev',displayName:'Developer',username:'developer',role:'DEV'}])),assets:vi.fn().mockResolvedValue(page([asset])),createProject:vi.fn().mockRejectedValue(new Error('Máy đã được giao'))};
 render(<AdminProjectForm api={api} onSaved={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Mã dự án'),{target:{value:'AA'}});fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Alpha'}});
 fireEvent.click(await screen.findByLabelText('Chọn Manager'));fireEvent.click(screen.getByLabelText('Chọn Developer'));fireEvent.click(await screen.findByLabelText('IP-08 · iPad'));
 fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'pm'}});
 fireEvent.click(screen.getByLabelText('Chọn Manager'));expect(screen.getByLabelText('Người nhận chung')).toHaveValue('');fireEvent.click(screen.getByLabelText('Chọn Manager'));
 fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'pm'}});fireEvent.click(screen.getByRole('button',{name:'Tạo dự án'}));
 await screen.findByText('Máy đã được giao');expect(screen.getByLabelText('Tên dự án')).toHaveValue('Alpha');
 expect(api.createProject).toHaveBeenCalledWith(expect.objectContaining({devices:[{assetId:8,recipientUserId:'pm',expectedVersion:2,expectedReturnOn:null,handoverNote:''}]}));
});
it('preserves edited asset draft and reloads version on conflict',async()=>{
 const api={updateAsset:vi.fn().mockRejectedValueOnce(Object.assign(new Error('Conflict'),{status:409,code:'VERSION_CONFLICT'})).mockResolvedValue({}),asset:vi.fn().mockResolvedValue({...asset,version:3})};const saved=vi.fn();render(<DeviceAssetForm asset={asset} api={api} onSaved={saved} onCancel={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Hãng / model'),{target:{value:'New iPad'}});fireEvent.click(screen.getByText('Lưu máy'));await screen.findByText('Conflict');fireEvent.click(screen.getByText('Tải phiên bản hiện hành, giữ bản nháp'));await screen.findByText(/Đã tải phiên bản hiện hành/);expect(screen.getByLabelText('Hãng / model')).toHaveValue('New iPad');fireEvent.click(screen.getByText('Lưu máy'));await waitFor(()=>expect(saved).toHaveBeenCalled());expect(api.updateAsset).toHaveBeenLastCalledWith(8,expect.objectContaining({model:'New iPad',expectedVersion:3}));
});
it('named local project filter resets paging and history is explicit',async()=>{
 const api={projects:vi.fn().mockResolvedValue(page([{id:2,code:'AA',name:'Alpha'}])),assets:vi.fn().mockResolvedValue({...page([asset]),totalElements:30}),allocations:vi.fn().mockResolvedValue(page([]))};render(<AdminDevices api={api}/>);await screen.findByText('IP-08');fireEvent.click(screen.getByText('Trang sau'));await waitFor(()=>expect(api.assets).toHaveBeenLastCalledWith(expect.objectContaining({page:1}),expect.anything()));await chooseProject('Dự án đang giữ máy');await waitFor(()=>expect(api.assets).toHaveBeenLastCalledWith(expect.objectContaining({page:0,projectId:'2'}),expect.anything()));fireEvent.click(screen.getByLabelText('Xem lịch sử bàn giao'));await screen.findByText('Chưa có dữ liệu phù hợp.');expect(api.allocations).toHaveBeenCalledWith(expect.objectContaining({history:true,projectId:'2'}),expect.anything());
});
it('assignment selects named members and prevents duplicate submission',async()=>{
 let resolve;const api={projects:vi.fn().mockResolvedValue(page([{id:2,code:'AA',name:'Alpha'}])),members:vi.fn().mockResolvedValue([{userId:'pm',displayName:'Manager',username:'manager',projectRole:'PM',active:true}]),assignDevice:vi.fn().mockReturnValue(new Promise(r=>{resolve=r;}))};render(<DeviceAllocationDialog asset={asset} api={api} onSaved={()=>{}} onCancel={()=>{}}/>);await chooseProject('Dự án nhận máy');await screen.findByText('Manager · manager');fireEvent.change(screen.getByLabelText('Người nhận'),{target:{value:'pm'}});fireEvent.click(screen.getByText('Xác nhận bàn giao'));expect(screen.getByText('Xác nhận bàn giao')).toBeDisabled();expect(api.assignDevice).toHaveBeenCalledTimes(1);resolve({});
});
it('project inventory is read only and has retry state',async()=>{
 const api={projectDevices:vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(page([]))};render(<ProjectDevices projectId={2} api={api}/>);await screen.findByText('Offline');fireEvent.click(screen.getByText('Thử lại'));await screen.findByText('Dự án chưa được bàn giao máy.');expect(screen.queryByText('Nhập máy')).toBeNull();expect(screen.queryByText('Xác nhận bàn giao')).toBeNull();
});
it('adds multiple machines directly to a fixed project, retaining only failed handovers for retry',async()=>{
 const changed=vi.fn(),closed=vi.fn();
 const api={assets:vi.fn().mockResolvedValue(page([asset,{...asset,id:9,assetCode:'IP-09',version:5}])),members:vi.fn().mockResolvedValue([{userId:'t',username:'tester',displayName:'Tester',projectRole:'PM',active:true,enabled:true},{userId:'locked',username:'locked',displayName:'Locked',projectRole:'PM',active:true,enabled:false}]),assignDevice:vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Máy đã được giao')).mockResolvedValue({})};
 render(<ProjectDeviceAssignDialog projectId="2" api={api} onChanged={changed} onClose={closed}/>);
 fireEvent.click(await screen.findByLabelText('IP-08 · iPad'));fireEvent.click(screen.getByLabelText('IP-09 · iPad'));
 expect(screen.queryByRole('option',{name:'Locked · locked'})).toBeNull();
 fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'t'}});fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'t'}});
 fireEvent.change(screen.getByLabelText('Ghi chú bàn giao IP-09'),{target:{value:'Giữ ghi chú'}});
 fireEvent.click(screen.getByRole('button',{name:'Bàn giao máy đã chọn'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('IP-09: Máy đã được giao');
 expect(changed).toHaveBeenCalledWith(1);expect(closed).not.toHaveBeenCalled();
 expect(screen.queryByLabelText('Người nhận IP-08')).toBeNull();expect(screen.getByLabelText('Ghi chú bàn giao IP-09')).toHaveValue('Giữ ghi chú');
 fireEvent.click(screen.getByRole('button',{name:'Bàn giao máy đã chọn'}));await waitFor(()=>expect(closed).toHaveBeenCalledTimes(1));
 expect(api.assignDevice.mock.calls.map(([body])=>body.assetId)).toEqual([8,9,9]);
 expect(api.assignDevice).toHaveBeenLastCalledWith({projectId:2,assetId:9,recipientUserId:'t',expectedVersion:5,expectedReturnOn:null,handoverNote:'Giữ ghi chú'});
 expect(api.assets).toHaveBeenCalledWith({status:'AVAILABLE',keyword:'',page:0,size:20},expect.anything());
});
it('refreshes project allocations after handover and blocks new allocations in archived projects',async()=>{
 const api={allocations:vi.fn().mockResolvedValue(page([])),assets:vi.fn().mockResolvedValue(page([asset])),members:vi.fn().mockResolvedValue([{userId:'t',username:'tester',displayName:'Tester',projectRole:'PM',active:true}]),assignDevice:vi.fn().mockResolvedValue({})};
 const view=render(<ProjectDevices projectId={2} api={api} admin/>);
 fireEvent.click(await screen.findByRole('button',{name:'Bổ sung máy'}));fireEvent.click(await screen.findByLabelText('IP-08 · iPad'));
 fireEvent.change(screen.getByLabelText('Người nhận chung'),{target:{value:'t'}});fireEvent.click(screen.getByRole('button',{name:'Bàn giao máy đã chọn'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());await waitFor(()=>expect(api.allocations).toHaveBeenCalledTimes(2));
 expect(screen.getByRole('status')).toHaveTextContent('Đã bàn giao 1 máy');
 expect(screen.getByText(/PM tự phân phối nội bộ bên ngoài phần mềm/)).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Danh mục dự án'})).not.toBeInTheDocument();
 view.rerender(<ProjectDevices projectId={2} api={api} admin archived/>);expect(screen.queryByRole('button',{name:'Bổ sung máy'})).toBeNull();
});
it('late return lookup cannot reopen editor after page scope changed',async()=>{
 let resolve;const api={projects:vi.fn().mockResolvedValue(page([{id:2,code:'AA',name:'Alpha'}])),assets:vi.fn().mockResolvedValue(page([{...asset,status:'ALLOCATED'}])),allocations:vi.fn().mockReturnValue(new Promise(r=>{resolve=r;}))};render(<AdminDevices api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Thu hồi IP-08',exact:true}));await chooseProject('Dự án đang giữ máy');resolve(page([{id:10,version:0,recipientName:'Manager'}]));await waitFor(()=>expect(api.assets).toHaveBeenLastCalledWith(expect.objectContaining({projectId:'2'}),expect.anything()));expect(screen.queryByText('Xác nhận thu hồi')).toBeNull();
});

it.each(['asset','assign','return'])('late %s save preserves replacement editor and its draft',async(kind)=>{
 let resolveSave;
 const pending=new Promise(resolve=>{resolveSave=resolve;});
 const api={
  projects:vi.fn().mockResolvedValue(page([{id:2,code:'AA',name:'Alpha'}])),
  assets:vi.fn().mockResolvedValue(page([{...asset,status:kind==='return'?'ALLOCATED':'AVAILABLE'}])),
  members:vi.fn().mockResolvedValue([{userId:'pm',displayName:'Manager',username:'manager',projectRole:'PM',active:true}]),
  allocations:vi.fn().mockResolvedValue(page([{id:10,version:0,recipientName:'Manager'}])),
  updateAsset:vi.fn().mockReturnValue(pending),
  assignDevice:vi.fn().mockReturnValue(pending),
  returnDevice:vi.fn().mockReturnValue(pending),
 };
 render(<AdminDevices api={api}/>);
 await screen.findByText('IP-08');
 if(kind==='asset'){
  fireEvent.click(screen.getByRole('button',{name:'Sửa IP-08',exact:true}));
  fireEvent.click(screen.getByText('Lưu máy'));
 }else if(kind==='assign'){
  fireEvent.click(screen.getByRole('button',{name:'Bàn giao IP-08',exact:true}));
  await screen.findByLabelText('Dự án nhận máy');
  await chooseProject('Dự án nhận máy');
  await screen.findByText('Manager · manager');
  fireEvent.change(screen.getByLabelText('Người nhận'),{target:{value:'pm'}});
  fireEvent.click(screen.getByText('Xác nhận bàn giao'));
 }else{
  fireEvent.click(screen.getByRole('button',{name:'Thu hồi IP-08',exact:true}));
  fireEvent.click(await screen.findByText('Xác nhận thu hồi'));
 }
 expect(api[kind==='asset'?'updateAsset':kind==='assign'?'assignDevice':'returnDevice']).toHaveBeenCalledTimes(1);
 await chooseProject('Dự án đang giữ máy');
 fireEvent.click(await screen.findByRole('button',{name:'Sửa IP-08',exact:true}));
 fireEvent.change(screen.getByLabelText('Hãng / model'),{target:{value:'Replacement draft'}});
 await act(async()=>{resolveSave({});});
 expect(screen.getByLabelText('Hãng / model')).toHaveValue('Replacement draft');
 expect(screen.getByText('Lưu máy')).toBeEnabled();
});
