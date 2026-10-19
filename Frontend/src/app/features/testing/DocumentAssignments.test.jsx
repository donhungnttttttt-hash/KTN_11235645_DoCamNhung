import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,test,vi} from 'vitest';
import {DocumentAssignments} from './DocumentAssignments';
import {featuresApi} from '../../services/api/features';
import {projectsApi} from '../../services/api/projects';
vi.mock('../../services/api/features',()=>({featuresApi:{assign:vi.fn(),assignments:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn().mockResolvedValue([{id:10,projectRole:'TESTER',displayName:'A'},{id:20,projectRole:'TESTER',displayName:'B'}])}}));
beforeEach(()=>vi.clearAllMocks());
test('self range sends stable row ids and leaves other assignees omitted',async()=>{
  featuresApi.assign.mockResolvedValue({version:1});
  render(<DocumentAssignments projectId={1} documentId={2} data={{document:{version:0},selfMembershipId:10,canManage:false,rows:[{rowId:101,sourceId:'TC1',assigneeMembershipId:10},{rowId:102,sourceId:'TC2',assigneeMembershipId:null},{rowId:103,sourceId:'TC3',assigneeMembershipId:20}]}} onClose={()=>{}} onSaved={()=>{}}/>);
  const range=await screen.findByLabelText('Phạm vi case');fireEvent.change(range,{target:{value:'1-2'}});fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
  await waitFor(()=>expect(featuresApi.assign).toHaveBeenCalledWith(1,2,expect.objectContaining({expectedVersion:0,changes:[{assigneeMembershipId:10,rowIds:[101,102]}]})));
});
test('retains selected range on conflict and refreshes version without discarding draft',async()=>{
  featuresApi.assign.mockRejectedValueOnce(Object.assign(new Error('Phạm vi đã thay đổi'),{status:409})).mockResolvedValueOnce({version:3});featuresApi.assignments.mockResolvedValue({version:2});
  render(<DocumentAssignments projectId={1} documentId={2} data={{document:{version:0},selfMembershipId:10,canManage:false,rows:[{rowId:101,assigneeMembershipId:10},{rowId:102,assigneeMembershipId:null}]}} onClose={()=>{}} onSaved={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Phạm vi case'),{target:{value:'2'}});fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Phạm vi đã thay đổi');expect(screen.getByLabelText('Phạm vi case')).toHaveValue('2');
  fireEvent.click(screen.getByRole('button',{name:'Tải phiên bản mới, giữ lựa chọn'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeEnabled());expect(screen.getByLabelText('Phạm vi case')).toHaveValue('2');
  fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
  await waitFor(()=>expect(featuresApi.assign).toHaveBeenLastCalledWith(1,2,expect.objectContaining({expectedVersion:2,changes:[{assigneeMembershipId:10,rowIds:[102]}]})));
});
test('manager assignment sends only selected tester scopes, without staging the PM membership',async()=>{
  featuresApi.assign.mockResolvedValue({version:1});
  render(<DocumentAssignments projectId={1} documentId={2} data={{document:{version:0},selfMembershipId:99,canManage:true,rows:[{rowId:101,assigneeMembershipId:null}]}} onClose={()=>{}} onSaved={()=>{}}/>);
  fireEvent.change(await screen.findByLabelText('Tester'),{target:{value:'10'}});
  fireEvent.change(screen.getByLabelText('Phạm vi case'),{target:{value:'1'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
  await waitFor(()=>expect(featuresApi.assign).toHaveBeenCalledWith(1,2,expect.objectContaining({changes:[{assigneeMembershipId:10,rowIds:[101]}]})));
});
test('manager retries a failed Tester list without discarding the entered case range',async()=>{
  projectsApi.listMembers.mockRejectedValueOnce(new Error('Chưa tải được Tester do mất kết nối'));
  featuresApi.assign.mockResolvedValue({version:1});const onSaved=vi.fn();
  render(<DocumentAssignments projectId={1} documentId={2} data={{document:{version:0},selfMembershipId:99,canManage:true,rows:[{rowId:101,assigneeMembershipId:null}]}} onClose={()=>{}} onSaved={onSaved}/>);
  fireEvent.change(screen.getByLabelText('Phạm vi case'),{target:{value:'1'}});
  expect(await screen.findByRole('alert')).toHaveTextContent('mất kết nối');
  fireEvent.click(screen.getByRole('button',{name:'Tải lại danh sách Tester'}));
  await screen.findByRole('option',{name:'A'});expect(screen.getByLabelText('Phạm vi case')).toHaveValue('1');
  fireEvent.change(screen.getByLabelText('Tester'),{target:{value:'10'}});
  expect(screen.getByLabelText('Phạm vi case')).toHaveValue('1');
  fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
  await waitFor(()=>expect(featuresApi.assign).toHaveBeenCalledWith(1,2,expect.objectContaining({changes:[{assigneeMembershipId:10,rowIds:[101]}]})));
  await waitFor(()=>expect(onSaved).toHaveBeenCalledOnce());
});
