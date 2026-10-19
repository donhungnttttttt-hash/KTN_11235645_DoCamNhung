import React from 'react';
import {expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {DashboardPage} from '../pages/DashboardPage';
import {AnalysisPage} from '../pages/AnalysisPage';
import {normalizeRoute} from './legacyRoutes';
vi.mock('../modules/ProjectOverview',()=>({ProjectOverview:()=> <p>Read-only actual project information</p>}));
vi.mock('../modules/TestingOverview',()=>({TestingOverview:()=>{throw new Error('hidden legacy report mounted');}}));
vi.mock('../features/reports/ManagementAnalysisPage',()=>({ManagementAnalysisPage:()=> <p>Feature management reports</p>}));
it('mounts only project information at the Dashboard boundary',()=>{
 render(<DashboardPage/>);expect(screen.getByText('Read-only actual project information')).toBeVisible();expect(document.querySelector('[hidden]')).toBeNull();
});
it('mounts the new Feature management report at the Analysis boundary',()=>{
 render(<AnalysisPage/>);expect(screen.getByText('Feature management reports')).toBeVisible();
});
it.each([
 ['/design/home','/dashboard'],['/design/board','/board'],['/design/issues','/board/list'],
 ['/design/issue/7?projectId=1','/board/issue/7?projectId=1'],['/design/new','/board/new'],
 ['/tests/cycles/15?caseId=2','/tests/cycles/15?caseId=2'],['/board/testing/features/42','/board/testing/features/42'],
])('keeps legacy normalization deterministic without guessing Feature identity %s', (source,target)=>expect(normalizeRoute(source)).toBe(target));
