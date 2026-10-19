import React from 'react';
import {expect,it,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {ProjectOverview} from './ProjectOverview';
const state=vi.hoisted(()=>({value:{},retry:vi.fn()}));
vi.mock('../features/projects/ProjectProvider',()=>({useProject:()=>state.value}));
vi.mock('../services/api/featureIssues',()=>({featureIssuesApi:{list:async()=>({items:[],totalItems:0,page:0,size:1,totalPages:0})}}));
vi.mock('../services/api/projects',()=>({projectsApi:{listCatalog:async()=>[]}}));
it('does not show stale authorized content while the next project is loading or denied',()=>{
 state.value={currentProject:{id:1,code:'SPIDER-PLUS',name:'Spider Plus'}};const view=render(<ProjectOverview/>);expect(screen.getByRole('heading',{name:'Tài liệu làm việc'})).toBeVisible();
 state.value={...state.value,loading:true};view.rerender(<ProjectOverview/>);expect(screen.queryByRole('heading',{name:'Tài liệu làm việc'})).toBeNull();
 state.value={currentProject:null,error:'Dự án không còn truy cập được',refreshProjects:state.retry};view.rerender(<ProjectOverview/>);
 expect(screen.getByRole('alert')).toHaveTextContent(state.value.error);expect(screen.queryByRole('heading',{name:'Tài liệu làm việc'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Tải lại dự án'}));expect(state.retry).toHaveBeenCalledOnce();
});
