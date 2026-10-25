import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {FeatureTestVersions} from './FeatureTestVersions';

test('deleting a version requires confirmation; Cancel preserves it and confirm removes it',async()=>{
 const api={testVersions:vi.fn().mockResolvedValue([{id:1,name:'Version A'},{id:2,name:'Version B'}]),deleteTestVersion:vi.fn().mockResolvedValue(undefined)};
 render(<FeatureTestVersions projectId={1} featureId={2} canManage api={api}/>);
 fireEvent.click(screen.getByRole('button',{name:'Thêm version test'}));
 fireEvent.click(await screen.findByRole('button',{name:'Version A',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Version A',exact:true}));
 fireEvent.click(await screen.findByRole('button',{name:'Xóa version Version A'}));
 let dialog=screen.getByRole('dialog',{name:'Xóa version test?'});
 expect(within(dialog).getByRole('button',{name:'Hủy'})).toHaveFocus();
 fireEvent.click(within(dialog).getByRole('button',{name:'Hủy'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(api.deleteTestVersion).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Xóa version Version A'})).toHaveFocus();
 fireEvent.click(screen.getByRole('button',{name:'Xóa version Version A'}));
 dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Xóa',exact:true}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 expect(api.deleteTestVersion).toHaveBeenCalledWith(1,2,1);
 expect(screen.queryByRole('button',{name:'Version A',exact:true})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Version B',exact:true})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Thêm version test'})).toHaveAttribute('aria-expanded','true');
});

test('delete failure preserves the version; pending deletion prevents duplicate requests and Escape',async()=>{
 let finish;const api={testVersions:vi.fn().mockResolvedValue([{id:1,name:'Version A'}]),deleteTestVersion:vi.fn().mockRejectedValueOnce(new Error('Mất kết nối')).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}))};
 render(<FeatureTestVersions projectId={1} featureId={2} canManage api={api}/>);
 fireEvent.click(screen.getByRole('button',{name:'Thêm version test'}));
 fireEvent.click(await screen.findByRole('button',{name:'Xóa version Version A'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Xóa',exact:true}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
 expect(screen.getByRole('button',{name:'Version A',exact:true})).toBeInTheDocument();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Xóa',exact:true}));
 expect(within(screen.getByRole('dialog')).getByRole('button',{name:'Hủy'})).toBeDisabled();
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});
 expect(screen.getByRole('dialog')).toBeInTheDocument();
 await act(async()=>finish());expect(api.deleteTestVersion).toHaveBeenCalledTimes(2);
 expect(screen.getByText('Chưa có version')).toBeInTheDocument();
});

test('keeps the draft on failure and retries with the same command key',async()=>{
 const api={testVersions:vi.fn().mockResolvedValue([]),createTestVersion:vi.fn().mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValue({id:1,name:'iPad 133',createdAt:'2026-10-25T00:00:00Z'})};
 render(<FeatureTestVersions projectId={1} featureId={2} canManage api={api}/>);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Thêm version test'}));
 await screen.findByText('Chưa có version');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Tên version test')).toHaveFocus();
 fireEvent.change(screen.getByLabelText('Tên version test'),{target:{value:'iPad 133'}});
 fireEvent.click(screen.getByRole('button',{name:'Thêm',exact:true}));
 await screen.findByRole('alert');expect(screen.getByLabelText('Tên version test')).toHaveValue('iPad 133');
 fireEvent.click(screen.getByRole('button',{name:'Thêm',exact:true}));
 const trigger=await screen.findByRole('button',{name:'iPad 133',exact:true});expect(api.createTestVersion).toHaveBeenCalledTimes(2);
 expect(screen.queryByRole('region',{name:'Version test'})).not.toBeInTheDocument();
 expect(api.createTestVersion.mock.calls[1]).toEqual(api.createTestVersion.mock.calls[0]);
 await waitFor(()=>expect(trigger).toHaveFocus());
 api.testVersions.mockResolvedValue([{id:1,name:'iPad 133'}]);
 fireEvent.click(trigger);
 const panel=await screen.findByRole('region',{name:'Version test'});
 await within(panel).findByRole('button',{name:'iPad 133'});
 expect(within(panel).getByLabelText('Tên version test')).toHaveValue('');
});
test('read-only users do not see version creation controls',()=>{
 const api={testVersions:vi.fn().mockResolvedValue([{id:1,name:'iPad 133',createdAt:'2026-10-25T00:00:00Z'}])};
 render(<FeatureTestVersions projectId={1} featureId={2} canManage={false} api={api}/>);
 expect(screen.queryByRole('button',{name:'Thêm version test'})).not.toBeInTheDocument();
 expect(api.testVersions).not.toHaveBeenCalled();
});
test('Escape closes the dropdown and returns focus; closing is blocked during save',async()=>{
 let finish;const api={testVersions:vi.fn().mockResolvedValue([]),createTestVersion:vi.fn(()=>new Promise(resolve=>{finish=resolve;}))};
 render(<FeatureTestVersions projectId={1} featureId={2} canManage api={api}/>);
 fireEvent.click(screen.getByRole('button',{name:'Thêm version test'}));
 await screen.findByText('Chưa có version');
 fireEvent.keyDown(screen.getByLabelText('Tên version test'),{key:'Escape'});
 expect(screen.queryByRole('region',{name:'Version test'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Thêm version test'})).toHaveFocus();
 fireEvent.click(screen.getByRole('button',{name:'Thêm version test'}));
 await screen.findByText('Chưa có version');
 fireEvent.change(screen.getByLabelText('Tên version test'),{target:{value:'iPad 134'}});
 fireEvent.click(screen.getByRole('button',{name:'Thêm',exact:true}));
 expect(screen.getByRole('button',{name:'Thêm version test'})).toBeDisabled();
 fireEvent.keyDown(screen.getByLabelText('Tên version test'),{key:'Escape'});
 expect(screen.getByRole('region',{name:'Version test'})).toBeInTheDocument();
 await act(async()=>finish({id:2,name:'iPad 134'}));
 expect(screen.queryByRole('region',{name:'Version test'})).not.toBeInTheDocument();
});
test('lists existing versions, selects locally and never writes case results',async()=>{
 const api={testVersions:vi.fn().mockResolvedValue([{id:1,name:'Version A'},{id:2,name:'Version B'}]),createTestVersion:vi.fn()};
 render(<FeatureTestVersions projectId={1} featureId={2} canManage api={api}/>);
 fireEvent.click(screen.getByRole('button',{name:'Thêm version test'}));
 fireEvent.click(await screen.findByRole('button',{name:'Version A'}));
 expect(screen.queryByRole('region')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Version A'})).toHaveAttribute('aria-expanded','false');
 expect(api.createTestVersion).not.toHaveBeenCalled();
});
test('list errors offer retry instead of claiming an empty list; outside click closes',async()=>{
 const api={testVersions:vi.fn().mockRejectedValueOnce(new Error('Không tải được version')).mockResolvedValue([])};
 render(<FeatureTestVersions projectId={1} featureId={2} canManage api={api}/>);
 fireEvent.click(screen.getByRole('button',{name:'Thêm version test'}));
 await screen.findByRole('alert');expect(screen.queryByText('Chưa có version')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('Chưa có version');
 fireEvent.pointerDown(document.body);expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
