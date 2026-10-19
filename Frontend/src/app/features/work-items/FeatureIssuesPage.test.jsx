import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {FeatureIssuesPage} from './FeatureIssuesPage';
import userEvent from '@testing-library/user-event';

it('returns focus to the monkey opener after discarding a dirty draft through nested confirmation',async()=>{
 const user=userEvent.setup(),api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})},featureApi={list:async()=>({items:[{id:1,name:'Feature A'}],totalPages:1})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/issues" api={api} featureApi={featureApi} canCreate/>);
 await screen.findByRole('option',{name:'Feature A'});
 const opener=screen.getByRole('button',{name:'Ghi lỗi monkey'});await user.click(opener);
 await user.selectOptions(screen.getByLabelText('Feature phát hiện lỗi'),'1');
 await user.type(screen.getByLabelText('Tiêu đề'),'Nháp');await user.keyboard('{Escape}');
 expect(screen.getByRole('dialog',{name:'Bỏ nội dung chưa lưu?'})).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(opener).toHaveFocus();
});

it('lists Bug and QA across the project and creates only monkey bugs from error management',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[{id:1,key:'P-1',type:'BUG',title:'Bug title',featureName:'A',status:'open'},{id:2,key:'P-2',type:'QA',title:'QA title',featureName:'B',status:'open'}],totalItems:2,page:0,size:20,totalPages:1})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/issues" api={api} featureApi={{list:async()=>({items:[],totalPages:1})}} navigate={vi.fn()} canCreate/>);
 expect(await screen.findByText('Bug title')).toBeInTheDocument();expect(screen.getByText('QA title')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Ghi lỗi monkey'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Thêm công việc'})).toBeNull();
 expect(api.list.mock.calls[0][1].type).toBe('');
});
it('switches from the list to Kanban without retaining the list view flag',async()=>{
 const navigate=vi.fn();const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/board/list" api={api} featureApi={{list:async()=>({items:[],totalPages:0})}} navigate={navigate}/>);
 fireEvent.click(screen.getByRole('button',{name:'Kanban'}));
 expect(navigate.mock.calls[0][0]).not.toContain('view=list');
 expect(navigate.mock.calls[0][0]).toMatch(/^\/board\?/);
});
it('restores server filters when browser navigation changes the linked list scope',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})},featureApi={list:vi.fn().mockResolvedValue({items:[{id:1,name:'A'},{id:2,name:'B'}],totalPages:1})};
 const view=render(<FeatureIssuesPage projectId={1} activeRoute="/board/list?featureId=1&keyword=nhung" api={api} featureApi={featureApi}/>);
 await waitFor(()=>expect(screen.getByLabelText('Feature')).toHaveValue('1'));
 view.rerender(<FeatureIssuesPage projectId={1} activeRoute="/board/list?featureId=2&keyword=cam&status=open" api={api} featureApi={featureApi}/>);
 await waitFor(()=>expect(api.list.mock.lastCall[1]).toMatchObject({featureId:'2',keyword:'cam',status:'open'}));
 expect(screen.getByLabelText('Feature')).toHaveValue('2');expect(screen.getByLabelText('Tìm Issue')).toHaveValue('cam');
});
it('keeps project and changed filters in reloadable URLs and issue links',async()=>{
 const previous=window.location.href,navigate=vi.fn(),api={list:vi.fn().mockResolvedValue({items:[{id:7,key:'A-7',type:'BUG',title:'Lỗi đăng nhập',status:'open'}],totalItems:1,totalPages:1})},featureApi={list:vi.fn().mockResolvedValue({items:[],totalPages:0})};
 try{window.history.replaceState(null,'','#/board/list?projectId=42&workspace=1');render(<FeatureIssuesPage projectId={42} activeRoute="/board/list?projectId=42&workspace=1" api={api} featureApi={featureApi} navigate={navigate}/>);
 await screen.findByText('Lỗi đăng nhập');fireEvent.change(screen.getByLabelText('Tìm Issue'),{target:{value:'đăng nhập'}});
 const query=new URLSearchParams(window.location.hash.split('?')[1]);expect(query.get('projectId')).toBe('42');expect(query.get('keyword')).toBe('đăng nhập');expect(query.get('workspace')).toBe('1');
 fireEvent.click(await screen.findByRole('button',{name:'A-7'}));expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/board\/issue\/7\?/));expect(new URLSearchParams(navigate.mock.lastCall[0].split('?')[1]).get('projectId')).toBe('42');
 }finally{window.history.replaceState(null,'',previous);}
});
it('keeps a monkey draft attached to its Feature until it is explicitly discarded',async()=>{
 const api={list:vi.fn().mockResolvedValue({items:[],totalItems:0,totalPages:0})},featureApi={list:async()=>({items:[{id:1,name:'Feature A'},{id:2,name:'Feature B'}],totalPages:1})};
 render(<FeatureIssuesPage projectId={1} activeRoute="/issues" api={api} featureApi={featureApi} canCreate/>);await screen.findByRole('option',{name:'Feature A'});fireEvent.click(screen.getByRole('button',{name:'Ghi lỗi monkey'}));
 fireEvent.change(screen.getByLabelText('Feature phát hiện lỗi'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Tiêu đề'),{target:{value:'Nháp cho Feature A'}});
 await waitFor(()=>expect(screen.getByLabelText('Feature phát hiện lỗi')).toBeDisabled());expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Nháp cho Feature A');
});
