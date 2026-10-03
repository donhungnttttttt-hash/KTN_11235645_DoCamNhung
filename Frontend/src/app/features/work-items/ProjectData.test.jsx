import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProjectDataProvider, useProjectData } from './ProjectData';
import { workItemsApi } from '../../services/api/workItems';
import { projectsApi } from '../../services/api/projects';
const context=vi.hoisted(()=>({project:{id:1}}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:context.project})}));
vi.mock('../../services/api/workItems',()=>({workItemsApi:{list:vi.fn(),metadata:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn(),listCatalog:vi.fn()}}));
function View(){const data=useProjectData();return <><p>{data.loading?'Đang tải':data.error||'Đã tải'}</p>{data.issues.map(item=><p key={item.id}>{item.title}</p>)}</>;}
const page=title=>({items:[{id:1,key:title,title,type:'BUG',priority:'MEDIUM'}],totalItems:1,page:0,size:50,totalPages:1});
beforeEach(()=>{vi.resetAllMocks();context.project={id:1};projectsApi.listMembers.mockResolvedValue([]);projectsApi.listCatalog.mockResolvedValue([]);workItemsApi.metadata.mockResolvedValue({canTriage:false});});
it('ignores a late response from the previous project and never renders its data in the next project',async()=>{
  let resolveOld;const old=new Promise(resolve=>{resolveOld=resolve;});
  workItemsApi.list.mockImplementation(p=>p===1?old:Promise.resolve(page('Dự án mới')));
  const view=render(<ProjectDataProvider><View/></ProjectDataProvider>);
  await waitFor(()=>expect(workItemsApi.list).toHaveBeenCalled());
  context.project={id:2};view.rerender(<ProjectDataProvider><View/></ProjectDataProvider>);
  await screen.findByText('Dự án mới');resolveOld(page('Dự án cũ'));
  await waitFor(()=>expect(screen.queryByText('Dự án cũ')).not.toBeInTheDocument());
  expect(screen.getByText('Dự án mới')).toBeInTheDocument();
});
it('shows an API error with an empty list instead of falling back to mock work items',async()=>{
  workItemsApi.list.mockRejectedValue(new Error('Không có quyền truy cập'));
  render(<ProjectDataProvider><View/></ProjectDataProvider>);
  await screen.findByText('Không có quyền truy cập');expect(screen.queryByText(/SFLUTTER-/)).not.toBeInTheDocument();
});
