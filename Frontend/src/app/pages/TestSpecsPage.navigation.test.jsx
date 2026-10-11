import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {act,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TestSpecsPage} from './TestSpecsPage';
import {testCasesApi} from '../services/api/testCases';

const project=vi.hoisted(()=>({id:1,name:'Dự án',projectRole:'PM'}));
vi.mock('../features/projects/ProjectProvider',()=>({useProject:()=>({currentProject:project})}));
vi.mock('../features/auth/AuthProvider',()=>({useAuth:()=>({hasRole:()=>false})}));
vi.mock('../services/api/testCases',()=>({testCasesApi:{listSuites:vi.fn(),listCases:vi.fn()}}));

beforeEach(()=>{
  vi.resetAllMocks();
  testCasesApi.listSuites.mockResolvedValue([{id:7,code:'SMALL',name:'Nhóm nhỏ',caseCount:1}]);
  testCasesApi.listCases.mockImplementation(async(_project,suite,{page})=>({
    items:suite&&page>0?[]:[{id:1,caseNo:'CASE-1',titleVi:suite?'Case của nhóm nhỏ':'Case toàn bộ',createdAt:'2026-10-01'}],
    totalItems:suite?1:51,totalPages:suite?1:2,
  }));
});

it('opens suite cases from page one even when the all-cases list was on page two',async()=>{
  const user=userEvent.setup();render(<TestSpecsPage/>);
  await screen.findByText('Case toàn bộ');
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,300));});
  await user.click(screen.getByRole('button',{name:'Trang sau'}));
  await waitFor(()=>expect(testCasesApi.listCases).toHaveBeenLastCalledWith(1,undefined,{page:1,keyword:''}));
  await user.click(screen.getByRole('button',{name:'Nhóm test case (1)'}));
  await user.click(screen.getByRole('button',{name:'Xem 1 cases'}));
  expect(await screen.findByText('Case của nhóm nhỏ')).toBeVisible();
  expect(testCasesApi.listCases).toHaveBeenLastCalledWith(1,'7',{page:0,keyword:''});
});
