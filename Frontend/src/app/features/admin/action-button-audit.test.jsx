import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {DeviceAllocationDialog} from './DeviceAllocationDialog';
import {AdminUsers} from './AdminUsers';
import {AdminDevices} from './AdminDevices';
import {AdminProjectForm} from './AdminProjectForm';
import {DeviceAssetForm} from './DeviceAssetForm';
import {CatalogEditor} from '../projects/CatalogEditor';
import {CatalogPage} from '../projects/CatalogPage';
import {HandbookPanel} from '../projects/HandbookPanel';
import {RulesPanel} from '../projects/RulesPanel';
import {projectsApi} from '../../services/api/projects';
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({user:{id:'self'},hasRole:()=>true})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Alpha',projectRole:'PM'}})}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listCatalog:vi.fn(),createCatalog:vi.fn(),updateCatalog:vi.fn(),archiveCatalog:vi.fn(),listHandbook:vi.fn(),createHandbook:vi.fn(),listRules:vi.fn(),listRuleVersions:vi.fn(),createRuleset:vi.fn()}}));
const asset={id:8,assetCode:'IP-08',type:'PHONE',model:'iPad',status:'AVAILABLE',version:2};
const page=items=>({items,totalElements:items.length});
beforeEach(()=>{vi.resetAllMocks();window.location.hash='';projectsApi.listCatalog.mockResolvedValue([]);projectsApi.listHandbook.mockResolvedValue([]);projectsApi.listRules.mockResolvedValue([]);});
it('explains an incomplete inventory handover and focuses the error instead of silently disabling submit',async()=>{
 const api={members:vi.fn().mockResolvedValue([]),projects:vi.fn().mockResolvedValue(page([])),assignDevice:vi.fn()};
 render(<DeviceAllocationDialog asset={asset} api={api} onSaved={vi.fn()} onCancel={vi.fn()}/>);
 const submit=screen.getByRole('button',{name:'Xác nhận bàn giao'});expect(submit).toBeEnabled();fireEvent.click(submit);
 const alert=await screen.findByRole('alert');expect(alert).toHaveTextContent('Chọn dự án nhận máy');expect(alert).toHaveFocus();expect(api.assignDevice).not.toHaveBeenCalled();
});
it('rejects whitespace-only required catalog fields before sending and focuses the field',async()=>{
 render(<CatalogEditor projectId={1} kind="environments" onSaved={vi.fn()} onClose={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('Mã'),{target:{value:'QA'}});fireEvent.change(screen.getByLabelText('Tên'),{target:{value:'   '}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu danh mục'}));expect(await screen.findByRole('alert')).toHaveTextContent('Tên');expect(screen.getByLabelText('Tên')).toHaveFocus();expect(projectsApi.createCatalog).not.toHaveBeenCalled();
});
it('shows account lock success after reload and explains why the current account cannot be locked',async()=>{
 const api={users:vi.fn().mockResolvedValue(page([{id:'self',displayName:'Admin',username:'admin',role:'ADMIN',enabled:true},{id:'other',displayName:'Tester',username:'tester',role:'TESTER',enabled:true,version:3}])),updateUser:vi.fn().mockResolvedValue({}),projects:vi.fn().mockResolvedValue(page([]))};
 render(<AdminUsers api={api}/>);const row=(await screen.findByText('Admin')).closest('tr');expect(within(row).getByRole('button',{name:'Khóa'})).toHaveAccessibleDescription('Bạn không thể khóa tài khoản đang đăng nhập.');
 fireEvent.click(within(screen.getByText('Tester').closest('tr')).getByRole('button',{name:'Khóa'}));expect(await screen.findByText('Đã khóa tài khoản Tester.')).toHaveAttribute('role','status');expect(api.updateUser).toHaveBeenCalledWith('other',{enabled:false,expectedVersion:3});
});
it('reports catalog save completion after the editor closes',async()=>{
 projectsApi.createCatalog.mockResolvedValue({id:2});render(<CatalogPage/>);await screen.findByText('Chưa có dữ liệu');fireEvent.click(screen.getByRole('button',{name:'Thêm mới'}));fireEvent.change(screen.getByLabelText('Mã'),{target:{value:'QA'}});fireEvent.change(screen.getByLabelText('Tên'),{target:{value:'QA'}});fireEvent.click(screen.getByRole('button',{name:'Lưu danh mục'}));expect(await screen.findByText('Đã lưu danh mục.')).toHaveAttribute('role','status');
});
it('reports handbook completion after saving and closing its form',async()=>{
 projectsApi.createHandbook.mockResolvedValue({id:2});render(<HandbookPanel projectId={1} canEdit/>);await screen.findByText('Chưa có tài liệu trong dự án.');fireEvent.click(screen.getByText('Thêm tài liệu'));for(const [label,value] of [['Mã tài liệu','GUIDE'],['Tên tài liệu','Hướng dẫn'],['Nội dung','Nội dung hướng dẫn']])fireEvent.change(screen.getByLabelText(label),{target:{value}});fireEvent.click(screen.getByText('Lưu tài liệu'));expect(await screen.findByText('Đã lưu tài liệu.')).toHaveAttribute('role','status');
});
it('reports ruleset completion after its data reload',async()=>{
 projectsApi.createRuleset.mockResolvedValue({id:2});render(<RulesPanel projectId={1} canEdit/>);fireEvent.click(await screen.findByText('Tạo bộ quy tắc nội bộ'));expect(await screen.findByText('Đã tạo bộ quy tắc nội bộ.')).toHaveAttribute('role','status');
});
it('reports an inventory edit after its dialog closes',async()=>{
 const api={assets:vi.fn().mockResolvedValue(page([asset])),updateAsset:vi.fn().mockResolvedValue(asset),projects:vi.fn().mockResolvedValue(page([]))};render(<AdminDevices api={api}/>);fireEvent.click(await screen.findByRole('button',{name:'Sửa IP-08'}));fireEvent.click(screen.getByRole('button',{name:'Lưu máy'}));expect(await screen.findByText('Đã lưu thông tin máy.')).toHaveAttribute('role','status');
});
it('shows a visible project validation summary when native validation blocks submission',()=>{
 render(<AdminProjectForm project={{id:1,code:'AA',name:'Alpha',timezone:'Asia/Ho_Chi_Minh',version:1}} api={{updateProject:vi.fn()}} onSaved={vi.fn()} onCancel={vi.fn()}/>);fireEvent.invalid(screen.getByLabelText('Tên dự án'));expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra các trường bắt buộc');
});
it.each(['account','asset','handbook','rules'])('explains native required validation for %s instead of leaving its save action silent',async kind=>{
 let field;
 if(kind==='account'){render(<AdminUsers api={{users:vi.fn().mockResolvedValue(page([])),projects:vi.fn().mockResolvedValue(page([]))}}/>);fireEvent.click(screen.getByText('Tạo tài khoản'));field=screen.getByLabelText('Tên đăng nhập');}
 if(kind==='asset'){render(<DeviceAssetForm api={{}} onSaved={vi.fn()} onCancel={vi.fn()}/>);field=screen.getByLabelText('Mã tài sản');}
 if(kind==='handbook'){render(<HandbookPanel projectId={1} canEdit/>);fireEvent.click(screen.getByText('Thêm tài liệu'));field=screen.getByLabelText('Mã tài liệu');}
 if(kind==='rules'){projectsApi.listRules.mockResolvedValue([{id:2,code:'INTERNAL_DEMO'}]);projectsApi.listRuleVersions.mockResolvedValue([]);render(<RulesPanel projectId={1} canEdit/>);field=await screen.findByLabelText('Nguồn quy tắc');}
 fireEvent.invalid(field);expect(screen.getByRole('alert')).toHaveTextContent('Kiểm tra các trường bắt buộc');
});
it('preserves an inventory handover draft after API failure and retries only with an eligible recipient',async()=>{
 const api={projects:vi.fn().mockResolvedValue(page([{id:1,code:'AA',name:'Alpha'}])),members:vi.fn().mockResolvedValue([{userId:'active',displayName:'Tester',username:'tester',projectRole:'PM',active:true,enabled:true},{userId:'locked',displayName:'Locked',username:'locked',projectRole:'PM',active:true,enabled:false}]),assignDevice:vi.fn().mockRejectedValueOnce(new Error('Conflict')).mockResolvedValue({id:9})};
 const saved=vi.fn();render(<DeviceAllocationDialog asset={asset} api={api} onSaved={saved} onCancel={vi.fn()}/>);fireEvent.click(screen.getByLabelText('Dự án nhận máy'));fireEvent.click(await screen.findByRole('option',{name:'AA · Alpha'}));await screen.findByRole('option',{name:'Tester · tester'});expect(screen.queryByRole('option',{name:'Locked · locked'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByText('Xác nhận bàn giao'));expect(await screen.findByRole('alert')).toHaveTextContent('Chọn PM');expect(api.assignDevice).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Người nhận'),{target:{value:'active'}});fireEvent.change(screen.getByLabelText('Ghi chú bàn giao / thu hồi'),{target:{value:'Giữ ghi chú'}});fireEvent.click(screen.getByText('Xác nhận bàn giao'));expect(await screen.findByRole('alert')).toHaveTextContent('Conflict');expect(saved).not.toHaveBeenCalled();expect(screen.getByLabelText('Ghi chú bàn giao / thu hồi')).toHaveValue('Giữ ghi chú');
 fireEvent.click(screen.getByText('Xác nhận bàn giao'));await waitFor(()=>expect(saved).toHaveBeenCalledWith({id:9}));expect(api.assignDevice).toHaveBeenLastCalledWith({assetId:8,projectId:1,recipientUserId:'active',expectedVersion:2,expectedReturnOn:null,handoverNote:'Giữ ghi chú'});
});
it('guards direct project submission when initial machines have no recipient and preserves the selected machine',async()=>{
 const api={users:vi.fn().mockResolvedValue(page([{id:'pm',displayName:'Manager',username:'pm',role:'PM'}])),assets:vi.fn().mockResolvedValue(page([asset])),createProject:vi.fn().mockResolvedValue({id:1})};render(<AdminProjectForm api={api} onSaved={vi.fn()} onCancel={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('Mã dự án'),{target:{value:'AA'}});fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Alpha'}});fireEvent.click(await screen.findByLabelText('Chọn Manager'));fireEvent.click(await screen.findByLabelText('IP-08 · iPad'));fireEvent.submit(screen.getByRole('button',{name:'Tạo dự án'}).closest('form'));expect(screen.getByRole('alert')).toHaveTextContent('Chọn người nhận cho tất cả máy');expect(api.createProject).not.toHaveBeenCalled();expect(screen.getByLabelText('IP-08 · iPad')).toBeChecked();
});
