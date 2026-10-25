import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {TestingFeaturePage} from './TestingFeaturePage';
import {featuresApi} from '../../services/api/features';

vi.mock('../../services/api/features',()=>({featuresApi:{get:vi.fn(),documents:vi.fn(),testVersions:vi.fn().mockResolvedValue([])}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role==='ADMIN'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Dự án thử',projectRole:'PM'}})}));

test('uses current file case counts for progress and still opens the selected workbook',async()=>{
 featuresApi.get.mockResolvedValue({id:2,name:'Feature A',archivedAt:null});
 featuresApi.documents.mockResolvedValue({items:[{id:3,fileName:'Case.xlsx',caseCount:200,testedCaseCount:199,progressPercent:100},{id:4,fileName:'Empty.xlsx',caseCount:0,testedCaseCount:0,progressPercent:0}],totalItems:2,totalPages:1});
 const open=vi.fn();render(<TestingFeaturePage projectId={1} featureId={2} onOpenDocument={open} onBack={()=>{}}/>);
 const progress=await screen.findByRole('progressbar',{name:'Tiến độ Case.xlsx'});
 expect(progress).toHaveAttribute('aria-valuenow','199');expect(progress).toHaveAttribute('aria-valuemax','200');expect(progress).toHaveAttribute('aria-valuetext','199/200 case · 99.5%');
 expect(screen.getByRole('progressbar',{name:'Tiến độ Empty.xlsx'})).toHaveAttribute('aria-valuetext','Chưa có case');
 fireEvent.click(screen.getByRole('button',{name:'Case.xlsx'}));expect(open).toHaveBeenCalledWith(3);
});
