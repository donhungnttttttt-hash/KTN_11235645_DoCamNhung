import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {ProjectOverview} from './ProjectOverview';
const state=vi.hoisted(()=>({project:null,loading:false,error:''}));
const forbidden=vi.hoisted(()=>({overview:vi.fn(),handoff:vi.fn()}));
vi.mock('../features/projects/ProjectProvider',()=>({useProject:()=>({currentProject:state.project,loading:state.loading,error:state.error})}));
vi.mock('../features/work-items/ProjectData',()=>({useProjectData:()=>({projectId:1}),presentItem:x=>x}));
vi.mock('../services/api/workItems',()=>({workItemsApi:{overview:forbidden.overview}}));
vi.mock('../services/api/qa',()=>({qaApi:{handoff:forbidden.handoff}}));
vi.mock('../services/api/featureIssues',()=>({featureIssuesApi:{list:async()=>({items:[],totalItems:0,page:0,size:1,totalPages:0})}}));
vi.mock('../services/api/projects',()=>({projectsApi:{listCatalog:async()=>[]}}));
beforeEach(()=>{state.project={id:1,code:'SPIDER-PLUS',name:'Spider Plus',description:'Mô tả'};state.loading=false;state.error='';vi.clearAllMocks();forbidden.overview.mockResolvedValue({items:[],statuses:[],milestones:[]});});
it('shows approved project information only for exact Spider Plus identity',()=>{
 const view=render(<ProjectOverview/>);expect(screen.getByRole('heading',{name:'Mục tiêu và phạm vi'})).toBeVisible();
 expect(screen.getByText(/Thực hiện System Test/)).toBeVisible();expect(screen.getAllByRole('link',{name:/Google Drive/})).toHaveLength(2);
 state.project={id:2,code:'DEMO',name:'Flutter',description:'Mô tả thật của demo'};view.rerender(<ProjectOverview/>);
 expect(screen.queryByText(/Thực hiện System Test/)).toBeNull();expect(screen.getByText('Mô tả thật của demo')).toBeVisible();
});
it('handles loading, denied project and missing descriptions without inventing content',()=>{
 state.project=null;state.loading=true;const view=render(<ProjectOverview/>);expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
 state.loading=false;state.error='Không có quyền dự án';view.rerender(<ProjectOverview/>);expect(screen.getByRole('alert')).toHaveTextContent(state.error);
 state.error='';view.rerender(<ProjectOverview/>);expect(screen.getByText('Chọn dự án để xem thông tin.')).toBeVisible();
 state.project={id:4,code:'spider-plus',name:'Dự án khác',description:''};view.rerender(<ProjectOverview/>);expect(screen.getByText('Dự án chưa có mô tả.')).toBeVisible();expect(screen.queryByText(/Thực hiện System Test/)).toBeNull();
});
it('renders other project descriptions as safe literal text',()=>{
 state.project={id:3,code:'OTHER',name:'Dự án khác',description:'<script>alert(1)</script>'};const view=render(<ProjectOverview/>);
 expect(screen.getByText(state.project.description)).toBeVisible();expect(view.container.querySelector('script')).toBeNull();
});
it('is read-only and never retrieves management or legacy retest data',()=>{
 render(<ProjectOverview/>);expect(screen.queryByRole('button',{name:'Thêm công việc'})).toBeNull();expect(screen.queryByText('Công việc tạo gần đây')).toBeNull();expect(screen.queryByText('Hàng chờ bàn giao BUG')).toBeNull();
 expect(forbidden.overview).not.toHaveBeenCalled();expect(forbidden.handoff).not.toHaveBeenCalled();
});
