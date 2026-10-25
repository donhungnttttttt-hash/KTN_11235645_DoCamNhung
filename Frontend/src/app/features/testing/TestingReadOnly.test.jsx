import React from 'react';
import {render,screen} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {TestingFeaturesPage} from './TestingFeaturesPage';
import {TestingFeaturePage} from './TestingFeaturePage';
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role==='ADMIN'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,archived:true}})}));
vi.mock('../../services/api/features',()=>({featuresApi:{testVersions:vi.fn().mockResolvedValue([]),list:async()=>({items:[{id:2,name:'Feature active',version:0,caseCount:1,testedCaseCount:0}],totalItems:1,totalPages:1}),get:async()=>({id:2,name:'Feature active',archivedAt:null}),documents:async()=>({items:[{id:3,fileName:'Case.xlsx',caseCount:1,testedCaseCount:0,progressPercent:0}],totalItems:1,totalPages:1})}}));
test('keeps an archived project read-only for ADMIN on both Feature and file lists',async()=>{
 const view=render(<TestingFeaturesPage projectId={1} onOpenFeature={vi.fn()}/>);await screen.findByText('Feature active');
 expect(screen.queryByRole('button',{name:'Tạo Feature'})).toBeNull();expect(screen.queryByRole('button',{name:'Lưu trữ'})).toBeNull();
 view.rerender(<TestingFeaturePage projectId={1} featureId={2} onOpenDocument={vi.fn()} onBack={vi.fn()}/>);await screen.findByRole('button',{name:'Case.xlsx'});
 expect(screen.queryByRole('button',{name:'Nhập Excel'})).toBeNull();expect(screen.queryByRole('button',{name:'Xóa khỏi danh sách'})).toBeNull();
});
