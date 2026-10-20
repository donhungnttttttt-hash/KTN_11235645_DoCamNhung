import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,within} from '@testing-library/react';
import {AppRouter} from './AppRouter';
import {Sidebar} from '../components/Sidebar';
import {MainLayout} from '../layouts/MainLayout';
import {pageTitle,routeInfo} from './routeInfo';
const state=vi.hoisted(()=>({project:{id:1,name:'A',projectRole:'PM'},roles:['PM'],canCreateIssue:true}));
vi.mock('../features/projects/ProjectProvider',()=>({useProject:()=>({currentProject:state.project})}));
vi.mock('../features/auth/AuthProvider',()=>({useAuth:()=>({user:{roles:state.roles},hasRole:role=>state.roles.includes(role)})}));
vi.mock('../components/Header',()=>({Header:()=>null}));vi.mock('../components/Footer',()=>({Footer:()=>null}));
vi.mock('../pages/WorkBoardPage',()=>({WorkBoardPage:({activeRoute})=><p>Board {activeRoute}</p>}));
vi.mock('../pages/AnalysisPage',()=>({AnalysisPage:()=> <p>Management analysis</p>}));
vi.mock('../pages/DashboardPage',()=>({DashboardPage:()=> <p>Project info</p>}));
vi.mock('../features/projects/ProjectSettingsPage',()=>({ProjectSettingsPage:({activeRoute})=><p>Settings {activeRoute}</p>}));
vi.mock('../features/testing/TestingFeaturesPage',()=>({TestingFeaturesPage:({projectId,onOpenFeature})=><button onClick={()=>onOpenFeature(42)}>Features {projectId}</button>}));
vi.mock('../features/testing/TestingFeaturePage',()=>({TestingFeaturePage:({projectId,featureId,onOpenDocument,onBack})=><><p>Feature {projectId}/{featureId}</p><button onClick={()=>onOpenDocument(7)}>Open file</button><button onClick={onBack}>Feature Back</button></>}));
vi.mock('../features/testing/TestingDocumentPage',()=>({TestingDocumentPage:({projectId,featureId,documentId,caseId,onBack,renderIssueAction})=><><p>Document {projectId}/{featureId}/{documentId} Case {caseId}</p><button onClick={onBack}>Document Back</button>{renderIssueAction({projectId,featureId,documentId,row:{rowId:1001},document:{canCreateIssue:state.canCreateIssue}})}</>}));
vi.mock('../features/work-items/CaseIssueAction',()=>({CaseIssueAction:({canCreate})=><p>Issue create {String(canCreate)}</p>}));
beforeEach(()=>{state.project={id:1,name:'A',projectRole:'PM'};state.roles=['PM'];state.canCreateIssue=true;});
it('keeps document detail focused while retaining its scoped back action',()=>{
 const navigate=vi.fn(),view=render(<AppRouter activeRoute='/board/testing' navigate={navigate}/>);
 expect(screen.getByRole('navigation',{name:'Các khu vực Bảng công việc'})).toBeVisible();
 view.rerender(<AppRouter activeRoute='/board/testing/features/42/documents/7?projectId=1' navigate={navigate}/>);
 expect(screen.queryByRole('navigation',{name:'Các khu vực Bảng công việc'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Document Back'}));
 expect(navigate).toHaveBeenCalledWith('/board/testing/features/42?projectId=1');
});
it.each([false,true])('lets Admin return home from the project sidebar when collapsed=%s',collapsed=>{
 state.roles=['ADMIN'];const onClose=vi.fn();
 render(<Sidebar activeRoute='/dashboard' navigate={vi.fn()} collapsed={collapsed} onClose={onClose} onToggle={vi.fn()}/>);
 const back=screen.getByRole('link',{name:'Quay lại Tổng quan hệ thống'});
 expect(back).toHaveAttribute('href','#/admin');fireEvent.click(back);expect(onClose).toHaveBeenCalledOnce();
});
it.each(['PM','TESTER','DEV'])('does not offer Admin home to %s',role=>{
 state.roles=[role];render(<Sidebar activeRoute='/dashboard' navigate={vi.fn()} collapsed={false} onToggle={vi.fn()}/>);
 expect(screen.queryByRole('link',{name:'Quay lại Tổng quan hệ thống'})).not.toBeInTheDocument();
});
it('offers Admin return within the mobile navigation dialog',()=>{
 state.roles=['ADMIN'];render(<Sidebar activeRoute='/dashboard' navigate={vi.fn()} collapsed overlayOpen onToggle={vi.fn()}/>);
 expect(within(screen.getByRole('dialog',{name:'Menu dự án'})).getByRole('link',{name:'Quay lại Tổng quan hệ thống'})).toHaveAttribute('href','#/admin');
});
it('FR05 dispatches Feature routes before the generic board and preserves scoped Back targets',()=>{
 const navigate=vi.fn(),view=render(<AppRouter activeRoute='/board/testing' navigate={navigate}/>);fireEvent.click(screen.getByRole('button',{name:'Features 1'}));expect(navigate).toHaveBeenCalledWith('/board/testing/features/42?projectId=1');
 view.rerender(<AppRouter activeRoute='/board/testing/features/42?projectId=1' navigate={navigate}/>);fireEvent.click(screen.getByRole('button',{name:'Open file'}));expect(navigate).toHaveBeenLastCalledWith('/board/testing/features/42/documents/7?projectId=1');
 view.rerender(<AppRouter activeRoute='/board/testing/features/42/documents/7?projectId=1&caseId=1001' navigate={navigate}/>);expect(screen.getByText('Document 1/42/7 Case 1001')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Document Back'}));expect(navigate).toHaveBeenLastCalledWith('/board/testing/features/42?projectId=1');
});
it.each(['/board/testing/features/0','/board/testing/features/01','/board/testing/features/9007199254740993','/board/testing/features/42/documents/0','/board/testing/features/42/extra','/board/testing?projectId=0','/board/testing?projectId=1&projectId=2'])('FR05 rejects malformed modern context %s',route=>{
 render(<AppRouter activeRoute={route} navigate={vi.fn()}/>);expect(screen.getByRole('heading',{name:'Không tìm thấy'})).toBeVisible();expect(screen.queryByText(/Features 1/)).toBeNull();
});
it('FR05 does not mount the current project under another linked project identity',()=>{
 render(<AppRouter activeRoute='/board/testing/features/42?projectId=2' navigate={vi.fn()}/>);expect(screen.queryByText('Feature 1/42')).toBeNull();expect(screen.getByRole('status')).toHaveTextContent('dự án');
});
it('FR05 supplies read-only Issue action to DEV and permits global Admin without membership',()=>{
 state.roles=['DEV'];state.project={...state.project,projectRole:'DEV'};const view=render(<AppRouter activeRoute='/board/testing/features/42/documents/7' navigate={vi.fn()}/>);expect(screen.getByText('Issue create false')).toBeVisible();
 state.roles=['ADMIN'];state.project={...state.project,projectRole:null};view.rerender(<AppRouter activeRoute='/board/testing/features/42/documents/7' navigate={vi.fn()}/>);expect(screen.getByText('Issue create true')).toBeVisible();
});
it('uses server scoped capability for archived documents rather than project role alone',()=>{
 state.canCreateIssue=false;const view=render(<AppRouter activeRoute='/board/testing/features/42/documents/7' navigate={vi.fn()}/>);
 expect(screen.getByText('Issue create false')).toBeVisible();
 state.canCreateIssue=true;view.rerender(<AppRouter activeRoute='/board/testing/features/42/documents/7' navigate={vi.fn()}/>);
 expect(screen.getByText('Issue create true')).toBeVisible();
});
it('FR05 keeps board/list as inner views and testing as the second outer destination',()=>{
 const navigate=vi.fn();render(<AppRouter activeRoute='/board/list' navigate={navigate}/>);expect(screen.getByText('Board /board/list')).toBeVisible();const nav=screen.getByRole('navigation',{name:'Các khu vực Bảng công việc'});expect(within(nav).getByRole('button',{name:'Bảng trạng thái'})).toHaveAttribute('aria-current','page');fireEvent.click(within(nav).getByRole('button',{name:'Quản lý kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/board/testing?projectId=1');
});
it.each(['/tests','/tests/cycles/15?caseId=2','/tests/file-work/27','/tests/documents/9','/tests/retests'])('FR05 gives explicit retired-workflow guidance without guessing a Feature for %s',route=>{
 const navigate=vi.fn();render(<AppRouter activeRoute={route} navigate={navigate}/>);expect(screen.getByRole('heading',{name:'Luồng kiểm thử đã thay đổi'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Mở Quản lý kiểm thử'}));expect(navigate).toHaveBeenCalledWith('/board/testing?projectId=1');expect(screen.queryByText(/Board /)).toBeNull();
});
it('FR05 hides management entry and denies direct routes for Tester/DEV while PM/Admin can read',()=>{
 state.roles=['TESTER'];state.project={...state.project,projectRole:'TESTER'};const view=render(<AppRouter activeRoute='/analysis' navigate={vi.fn()}/>);expect(screen.getByRole('heading',{name:'Không có quyền truy cập'})).toBeVisible();expect(screen.queryByText('Management analysis')).toBeNull();state.roles=['PM'];state.project={...state.project,projectRole:'PM'};view.rerender(<AppRouter activeRoute='/analysis' navigate={vi.fn()}/>);expect(screen.getByText('Management analysis')).toBeVisible();
});
it('FR05 replaces old sidebar entries with status/testing and Note and filters Analysis by scope',()=>{
 state.roles=['TESTER'];state.project={...state.project,projectRole:'TESTER'};render(<Sidebar activeRoute='/board/testing/features/42' navigate={vi.fn()} collapsed={false} onClose={vi.fn()} onToggle={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Quản lý kiểm thử',exact:true})).toHaveAttribute('aria-current','page');expect(screen.queryByRole('button',{name:'Danh sách',exact:true})).toBeNull();expect(screen.queryByRole('button',{name:'Trợ lý AI'})).toBeNull();expect(screen.queryByRole('button',{name:'Quản lý tiến độ'})).toBeNull();expect(screen.queryByRole('button',{name:'Tổng hợp & Phân tích'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Thông tin chung',exact:true}));expect(screen.getByRole('button',{name:'Note',exact:true})).toBeVisible();expect(screen.queryByRole('button',{name:'Danh mục',exact:true})).toBeNull();
});
it('FR05 recognizes modern document focus and clears deep context before mounting a switched project',()=>{
 const navigate=vi.fn(),view=render(<MainLayout activeRoute='/board/testing/features/42/documents/7?projectId=1' navigate={navigate}><p>Old deep context</p></MainLayout>);expect(view.container.querySelector('.app-shell')).toHaveClass('document-focus');state.project={id:2,name:'B',projectRole:'PM'};view.rerender(<MainLayout activeRoute='/board/testing/features/42/documents/7?projectId=1' navigate={navigate}><p>Old deep context</p></MainLayout>);expect(screen.queryByText('Old deep context')).toBeNull();expect(navigate).toHaveBeenCalledWith('/board/testing?projectId=2');
});
it('FR05 sets modern labels and preserves exact Feature/document identifiers in route metadata',()=>{
 expect(pageTitle('/board')).toBe('Bảng trạng thái · TMS');expect(pageTitle('/board/testing')).toBe('Quản lý kiểm thử · TMS');expect(pageTitle('/board/testing/features/42/documents/7')).toBe('Tài liệu test case · TMS');expect(pageTitle('/settings/notes')).toBe('Note dự án · TMS');expect(routeInfo('/board/testing/features/42/documents/7?projectId=1&caseId=1001')).toMatchObject({featureId:42,testingDocumentId:7,linkedProjectId:1,testingCaseId:1001});
});
it('FR05 keeps a query-free old Feature suppressed through subsequent renders after a project switch',()=>{
 const navigate=vi.fn(),route='/board/testing/features/42';const view=render(<MainLayout activeRoute={route} navigate={navigate}><p>Old Feature</p></MainLayout>);
 state.project={id:2,name:'B',projectRole:'PM'};view.rerender(<MainLayout activeRoute={route} navigate={navigate}><p>Old Feature</p></MainLayout>);
 view.rerender(<MainLayout activeRoute={route} navigate={navigate}><p>Old Feature</p></MainLayout>);expect(screen.queryByText('Old Feature')).toBeNull();
});
it('FR05 preserves a fresh link explicitly scoped to the newly selected project',()=>{
 const navigate=vi.fn(),view=render(<MainLayout activeRoute='/board/testing/features/42?projectId=1' navigate={navigate}><p>First</p></MainLayout>);
 state.project={id:2,name:'B',projectRole:'PM'};view.rerender(<MainLayout activeRoute='/board/testing/features/99?projectId=2' navigate={navigate}><p>Correct new Feature</p></MainLayout>);
 expect(screen.getByText('Correct new Feature')).toBeVisible();expect(navigate).not.toHaveBeenCalled();
});
