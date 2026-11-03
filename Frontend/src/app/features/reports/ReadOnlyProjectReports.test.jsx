import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act} from '@testing-library/react';
import {ReadOnlyProjectReports} from './ReadOnlyProjectReports';
const summary={metrics:{total:2,tested:1,ok:1,notRun:1,executionPercent:50},asOf:'2026-11-02T00:00:00Z'};
const mockApi=()=>({summary:vi.fn().mockResolvedValue(summary),list:vi.fn().mockResolvedValue({items:[{id:4,title:'Báo cáo tháng'}],totalPages:1}),get:vi.fn().mockResolvedValue({id:4,title:'Báo cáo tháng',markdown:'Nội dung đã lưu'}),create:vi.fn(),preview:vi.fn(),update:vi.fn()});
it('shows aggregate progress and saved Markdown without editor or AI calls',async()=>{
 const api=mockApi();render(<ReadOnlyProjectReports projectId={1} api={api}/>);
 expect(await screen.findByText('1 / 2 case đã test · 50%')).toBeVisible();
 fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo tháng'}));
 expect(await screen.findByText('Nội dung đã lưu')).toBeVisible();expect(screen.queryByRole('textbox')).toBeNull();
 expect(api.create).not.toHaveBeenCalled();expect(api.update).not.toHaveBeenCalled();expect(api.preview).not.toHaveBeenCalled();
});
it('never shows a previous project response after switching projects',async()=>{
 const api=mockApi();let finish;api.summary.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const view=render(<ReadOnlyProjectReports projectId={1} api={api}/>);view.rerender(<ReadOnlyProjectReports projectId={2} api={api}/>);
 await screen.findByText('1 / 2 case đã test · 50%');await act(async()=>finish({...summary,metrics:{...summary.metrics,total:999}}));
 expect(screen.queryByText(/999/)).toBeNull();expect(api.summary).toHaveBeenLastCalledWith(2,{},expect.anything());
});
it('clears saved content when membership is revoked and offers a read-only retry',async()=>{
 const api=mockApi();render(<ReadOnlyProjectReports projectId={1} api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo tháng'}));await screen.findByText('Nội dung đã lưu');
 api.summary.mockRejectedValue(Object.assign(new Error('Không còn quyền xem'),{status:403}));
 fireEvent.click(screen.getByRole('button',{name:'Tải lại'}));await screen.findByRole('alert');expect(screen.queryByText('Nội dung đã lưu')).toBeNull();
});
