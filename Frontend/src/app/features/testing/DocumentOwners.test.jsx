import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,test,vi} from 'vitest';
import {DocumentOwners} from './DocumentOwners';
import {featuresApi} from '../../services/api/features';
import {projectsApi} from '../../services/api/projects';
vi.mock('../../services/api/features',()=>({featuresApi:{owners:vi.fn(),setOwners:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn()}}));
beforeEach(()=>{vi.clearAllMocks();featuresApi.owners.mockResolvedValue({version:3,items:[]});featuresApi.setOwners.mockResolvedValue({version:4,items:[]});projectsApi.listMembers.mockResolvedValue([{membershipId:10,displayName:'An',username:'an',active:true,enabled:true},{membershipId:20,displayName:'Bình',username:'binh',active:true,enabled:true},{membershipId:30,displayName:'Inactive',active:false}]);});
const doc={id:2,fileName:'Cases.xlsx',version:1,assignees:[]};
test('selects multiple project members without assigning case ranges',async()=>{
 const saved=vi.fn();render(<DocumentOwners projectId={1} document={doc} canManage onSaved={saved}/>);
 fireEvent.click(screen.getByRole('button',{name:/Chọn người phụ trách/}));
 fireEvent.click(await screen.findByRole('checkbox',{name:/An/}));fireEvent.click(screen.getByRole('checkbox',{name:/Bình/}));
 expect(screen.queryByRole('checkbox',{name:/Inactive/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Lưu người phụ trách'}));
 await waitFor(()=>expect(featuresApi.setOwners).toHaveBeenCalledWith(1,2,{expectedVersion:3,requestKey:expect.any(String),membershipIds:[10,20]}));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('keeps selections after a conflict and reloads the version explicitly',async()=>{
 featuresApi.setOwners.mockRejectedValueOnce(Object.assign(new Error('File đã thay đổi'),{status:409}));
 render(<DocumentOwners projectId={1} document={doc} canManage onSaved={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/Chọn người phụ trách/}));fireEvent.click(await screen.findByRole('checkbox',{name:/An/}));fireEvent.click(screen.getByRole('button',{name:'Lưu người phụ trách'}));
 await screen.findByText('File đã thay đổi');expect(screen.getByRole('checkbox',{name:/An/})).toBeChecked();
 featuresApi.owners.mockResolvedValue({version:5,items:[]});fireEvent.click(screen.getByRole('button',{name:'Tải phiên bản mới'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu người phụ trách'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Lưu người phụ trách'}));
 await waitFor(()=>expect(featuresApi.setOwners).toHaveBeenLastCalledWith(1,2,expect.objectContaining({expectedVersion:5,membershipIds:[10]})));
});
test('read-only viewers see names without an assignment control',()=>{
 render(<DocumentOwners projectId={1} document={{...doc,assignees:[{name:'An'},{name:'Bình'}]}} canManage={false}/>);
 expect(screen.getByText('An, Bình')).toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(featuresApi.owners).not.toHaveBeenCalled();
});

test('retries member loading and allows removing an old inactive owner',async()=>{
 projectsApi.listMembers.mockRejectedValueOnce(new Error('Không tải được thành viên'));
 featuresApi.owners.mockResolvedValue({version:3,items:[{membershipId:30,name:'Old owner'}]});
 render(<DocumentOwners projectId={1} document={doc} canManage onSaved={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/Chọn người phụ trách/}));await screen.findByText('Không tải được thành viên');
 fireEvent.click(screen.getByRole('button',{name:'Thử lại danh sách'}));const inactive=await screen.findByRole('checkbox',{name:/Old owner/});expect(inactive).toBeChecked();
 fireEvent.click(inactive);expect(inactive).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Lưu người phụ trách'}));
 await waitFor(()=>expect(featuresApi.setOwners).toHaveBeenCalledWith(1,2,expect.objectContaining({membershipIds:[]})));
});
test('keeps the picker open while saving and closes with Escape afterward',async()=>{
 let finish;featuresApi.setOwners.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 render(<DocumentOwners projectId={1} document={doc} canManage onSaved={()=>{}}/>);
 const trigger=screen.getByRole('button',{name:/Chọn người phụ trách/});fireEvent.click(trigger);fireEvent.click(await screen.findByRole('checkbox',{name:/An/}));
 fireEvent.click(screen.getByRole('button',{name:'Lưu người phụ trách'}));expect(trigger).toBeDisabled();fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});fireEvent.pointerDown(document.body);expect(screen.getByRole('dialog')).toBeInTheDocument();
 await act(async()=>finish({version:4,items:[]}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 fireEvent.click(trigger);await screen.findByRole('checkbox',{name:/An/});fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();
});
test('empty member list and cancelled selection do not write',async()=>{
 projectsApi.listMembers.mockResolvedValue([]);render(<DocumentOwners projectId={1} document={doc} canManage onSaved={()=>{}}/>);
 const trigger=screen.getByRole('button',{name:/Chọn người phụ trách/});fireEvent.click(trigger);await screen.findByText('Chưa có thành viên đang hoạt động.');fireEvent.click(screen.getByRole('button',{name:'Hủy'}));expect(featuresApi.setOwners).not.toHaveBeenCalled();expect(trigger).toHaveFocus();
 fireEvent.click(trigger);await screen.findByText('Chưa có thành viên đang hoạt động.');fireEvent.pointerDown(document.body);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
