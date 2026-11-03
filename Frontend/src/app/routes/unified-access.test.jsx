import React from 'react';
import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen} from '@testing-library/react';
import {RoleApp} from '../../AppEntry';
const mocks=vi.hoisted(()=>({workspace:vi.fn(),guest:vi.fn(),roles:['GUEST']}));
vi.mock('../features/auth/AuthProvider',()=>({useAuth:()=>({user:{id:'g',roles:mocks.roles},hasRole:r=>mocks.roles.includes(r)}),AuthProvider:({children})=>children}));
vi.mock('../../App',()=>({default:()=>{mocks.workspace();return <p>Internal workspace</p>;}}));
vi.mock('../features/work-items/ProjectData',()=>({ProjectDataProvider:({children})=>{mocks.workspace();return children;}}));
vi.mock('../features/projects/ProjectProvider',()=>({ProjectProvider:({children})=>children}));
vi.mock('../features/reports/GuestWorkspace',()=>({GuestWorkspace:()=>{mocks.guest();return <h1>Tiến độ & Báo cáo</h1>;}}));
beforeEach(()=>{mocks.roles=['GUEST'];mocks.workspace.mockClear();mocks.guest.mockClear();});
it.each(['/board/testing/features/1/documents/2','/admin','/ai','/settings/members'])('guest cannot mount internal providers at %s',path=>{
 window.location.hash=path;render(<RoleApp/>);expect(screen.getByRole('heading',{name:'Tiến độ & Báo cáo'})).toBeVisible();expect(mocks.workspace).not.toHaveBeenCalled();
});
