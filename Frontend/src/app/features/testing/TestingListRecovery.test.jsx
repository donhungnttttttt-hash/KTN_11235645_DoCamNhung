import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,test,vi} from 'vitest';
import {TestingFeaturesPage} from './TestingFeaturesPage';
import {TestingFeaturePage} from './TestingFeaturePage';
import {featuresApi} from '../../services/api/features';

vi.mock('../../services/api/features',()=>({featuresApi:{testVersions:vi.fn().mockResolvedValue([]),list:vi.fn(),get:vi.fn(),documents:vi.fn(),archive:vi.fn(),hideDocument:vi.fn()}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role==='ADMIN'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Dự án thử',projectRole:'PM'}})}));
const feature={id:2,name:'Feature A',version:0,caseCount:1,testedCaseCount:0};
const file={id:3,fileName:'Case.xlsx',version:0,caseCount:1,testedCaseCount:0,progressPercent:0};
beforeEach(()=>{
 vi.resetAllMocks();
 featuresApi.testVersions.mockResolvedValue([]);
 featuresApi.list.mockResolvedValue({items:[feature],totalItems:1,totalPages:1});
 featuresApi.get.mockResolvedValue(feature);
 featuresApi.documents.mockResolvedValue({items:[file],totalItems:1,totalPages:1});
});
const entries=[
 {name:'Feature',render:()=>render(<TestingFeaturesPage projectId={1} onOpenFeature={vi.fn()}/>),read:()=>featuresApi.list,write:()=>featuresApi.archive,action:'Lưu trữ',item:'Feature A'},
 {name:'file',render:()=>render(<TestingFeaturePage projectId={1} featureId={2} onOpenDocument={vi.fn()} onBack={vi.fn()}/>),read:()=>featuresApi.documents,write:()=>featuresApi.hideDocument,action:'Xóa khỏi danh sách',item:'Case.xlsx'},
];
test.each(entries)('reloads the $name list after a read failure with an explicit read action',async entry=>{
 entry.read().mockRejectedValueOnce(new Error('Không đọc được danh sách'));
 entry.render();await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Tải lại danh sách'}));
 expect(await screen.findByRole('button',{name:entry.item})).toBeInTheDocument();
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();expect(entry.write()).not.toHaveBeenCalled();
});
test.each(entries)('revalidates the $name list without replaying a failed write or leaving its stale error',async entry=>{
 entry.write().mockRejectedValue(new Error('Chưa xác nhận thao tác'));
 entry.render();await screen.findByRole('button',{name:entry.item});
 fireEvent.click(screen.getByRole('button',{name:entry.action}));await screen.findByRole('alert');
 expect(screen.getByText(/không tự gửi lại thao tác/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Tải lại danh sách'}));
 await waitFor(()=>expect(entry.read()).toHaveBeenCalledTimes(2));
 await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());
 expect(screen.getByRole('button',{name:entry.item})).toBeInTheDocument();expect(entry.write()).toHaveBeenCalledTimes(1);
});
