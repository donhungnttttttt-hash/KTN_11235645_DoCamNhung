import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {ProjectProvider,useProject} from './ProjectProvider';
import {projectsApi} from '../../services/api/projects';
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({status:'authenticated',user:{id:'admin'}})}));
vi.mock('../../services/api/projects',()=>({projectsApi:{list:vi.fn()}}));
const projects=[{id:1,name:'Alpha'},{id:2,name:'Beta'}];
function Current(){const {currentProject,error,loading,selectProject}=useProject();return <>{loading?'Loading':<p>{currentProject?.name||error}</p>}<button onClick={()=>selectProject(1)}>Select Alpha</button></>;}
beforeEach(()=>{localStorage.clear();window.history.replaceState(null,'','#/dashboard');projectsApi.list.mockResolvedValue(projects);});
it('opens the project in the link rather than a different stored project',async()=>{
 localStorage.setItem('tms_selected_project_admin','1');window.history.replaceState(null,'','#/settings/catalogs?workspace=1&projectId=2&type=devices');
 render(<ProjectProvider><Current/></ProjectProvider>);await screen.findByText('Beta');
 fireEvent.click(screen.getByText('Select Alpha'));expect(screen.getByText('Alpha')).toBeVisible();expect(window.location.hash).toBe('#/settings/catalogs?workspace=1&type=devices');
});
it('does not silently show another project when an explicit project is unavailable',async()=>{
 window.history.replaceState(null,'','#/settings/catalogs?workspace=1&projectId=99');render(<ProjectProvider><Current/></ProjectProvider>);
 await screen.findByText('Không tìm thấy dự án được mở hoặc bạn không còn quyền truy cập.');expect(screen.queryByText('Alpha')).toBeNull();
 fireEvent.click(screen.getByText('Select Alpha'));expect(screen.getByText('Alpha')).toBeVisible();
});
it('follows an explicit project link while the workspace is already mounted',async()=>{
 render(<ProjectProvider><Current/></ProjectProvider>);await screen.findByText('Alpha');
 act(()=>{window.history.replaceState(null,'','#/settings/catalogs?projectId=2&type=builds');window.dispatchEvent(new HashChangeEvent('hashchange'));});
 await waitFor(()=>expect(screen.getByText('Beta')).toBeVisible());
});
it('can follow the same project link again after a manual project selection',async()=>{
 window.history.replaceState(null,'','#/settings/catalogs?projectId=2&type=devices');render(<ProjectProvider><Current/></ProjectProvider>);await screen.findByText('Beta');
 fireEvent.click(screen.getByText('Select Alpha'));expect(screen.getByText('Alpha')).toBeVisible();
 act(()=>{window.history.replaceState(null,'','#/settings/catalogs?projectId=2&type=builds');window.dispatchEvent(new HashChangeEvent('hashchange'));});
 await waitFor(()=>expect(screen.getByText('Beta')).toBeVisible());
});
