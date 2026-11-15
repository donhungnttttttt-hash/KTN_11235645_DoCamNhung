import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,test,vi} from 'vitest';
import {DocumentAssignments} from './DocumentAssignments';
import {featuresApi} from '../../services/api/features';
vi.mock('../../services/api/features',()=>({featuresApi:{claim:vi.fn(),assignments:vi.fn()}}));
beforeEach(()=>{vi.clearAllMocks();featuresApi.claim.mockResolvedValue({version:1});});
const data={document:{version:0},selfUserId:'my-user-id',canManage:false,rows:[{rowId:101,assigneeUserId:'my-user-id'},{rowId:102,assigneeUserId:null},{rowId:103,assigneeUserId:'other-user'}]};
test('claims a range by session identity without a user dropdown or user ID in the command',async()=>{
 render(<DocumentAssignments projectId={1} documentId={2} data={{...data,canManage:true}} onClose={()=>{}} onSaved={()=>{}}/>);
 expect(screen.getByRole('dialog')).toHaveAccessibleName('Phân công test case');expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Phạm vi case')).toHaveValue('1');
 fireEvent.change(screen.getByLabelText('Phạm vi case'),{target:{value:'1-2, 2'}});fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
 await waitFor(()=>expect(featuresApi.claim).toHaveBeenCalledWith(1,2,{expectedVersion:0,requestKey:expect.any(String),rowIds:[101,102]}));
});
test('retains the range on conflict and explicitly refreshes the document version',async()=>{
 featuresApi.claim.mockRejectedValueOnce(Object.assign(new Error('Phạm vi đã thay đổi'),{status:409})).mockResolvedValueOnce({version:3});featuresApi.assignments.mockResolvedValue({version:2});
 render(<DocumentAssignments projectId={1} documentId={2} data={data} onClose={()=>{}} onSaved={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Phạm vi case'),{target:{value:'2'}});fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Phạm vi đã thay đổi');expect(screen.getByLabelText('Phạm vi case')).toHaveValue('2');
 fireEvent.click(screen.getByRole('button',{name:'Tải phiên bản mới, giữ lựa chọn'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu phân công'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));await waitFor(()=>expect(featuresApi.claim).toHaveBeenLastCalledWith(1,2,expect.objectContaining({expectedVersion:2,rowIds:[102]})));
});
test('rejects invalid ranges without writing and allows releasing the current range',async()=>{
 render(<DocumentAssignments projectId={1} documentId={2} data={data} onClose={()=>{}} onSaved={()=>{}}/>);
 for(const value of ['0-2','2-4','3-1','a','1,,2']){fireEvent.change(screen.getByLabelText('Phạm vi case'),{target:{value}});fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));expect(screen.getByRole('alert')).toBeInTheDocument();}
 expect(featuresApi.claim).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText('Phạm vi case'),{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
 await waitFor(()=>expect(featuresApi.claim).toHaveBeenCalledWith(1,2,expect.objectContaining({rowIds:[]})));
});
test('retries a lost response with the same command key and preserves the entered range',async()=>{
 featuresApi.claim.mockRejectedValueOnce(new Error('Mất kết nối'));
 render(<DocumentAssignments projectId={1} documentId={2} data={data} onClose={()=>{}} onSaved={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));await screen.findByText('Mất kết nối');fireEvent.click(screen.getByRole('button',{name:'Lưu phân công'}));
 await waitFor(()=>expect(featuresApi.claim).toHaveBeenCalledTimes(2));expect(featuresApi.claim.mock.calls[0]).toEqual(featuresApi.claim.mock.calls[1]);
});
