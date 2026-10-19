import React from 'react';
import {expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {HandbookPanel} from './HandbookPanel';
vi.mock('../../services/api/projects',()=>({projectsApi:{listHandbook:vi.fn().mockResolvedValue([{id:1,name:'Hướng dẫn',currentRevision:{id:2,revisionNo:1,contentHtml:'Nội dung cũ'}}]),getHandbook:vi.fn().mockResolvedValue({id:1,name:'Hướng dẫn',currentRevision:{id:2,revisionNo:1,contentHtml:'Nội dung cũ'},history:[]})}}));
it('moves keyboard focus to revision text and restores its new trigger after cancelling',async()=>{
 render(<HandbookPanel projectId={1} canEdit/>);
 fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn · v1'}));fireEvent.click(await screen.findByRole('button',{name:'Thêm phiên bản'}));
 expect(screen.getByLabelText('Nội dung')).toHaveFocus();fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Thêm phiên bản'})).toHaveFocus());
});
