import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {TestingFeaturePage} from './TestingFeaturePage';
import {featuresApi} from '../../services/api/features';

vi.mock('../../services/api/features',()=>({featuresApi:{get:vi.fn(),documents:vi.fn(),hideDocument:vi.fn(),restoreDocument:vi.fn(),testVersions:vi.fn().mockResolvedValue([])}}));
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

test('filters hidden files before pagination and restores without changing the search',async()=>{
 let restored=false;featuresApi.get.mockResolvedValue({id:2,name:'Feature A'});
 featuresApi.documents.mockImplementation(async(p,f,{archived})=>({items:archived&&!restored?[{id:3,fileName:'Hidden.xlsx',version:7,canRestore:true}]:[],totalItems:archived&&!restored?1:0,totalPages:archived&&!restored?1:0}));
 featuresApi.restoreDocument.mockImplementation(async()=>{restored=true;});
 render(<TestingFeaturePage projectId={1} featureId={2}/>);await screen.findByLabelText('Hiển thị file');
 fireEvent.change(screen.getByLabelText('Tìm file'),{target:{value:'Hidden'}});
 fireEvent.change(await screen.findByLabelText('Hiển thị file'),{target:{value:'hidden'}});
 await screen.findByRole('button',{name:'Hidden.xlsx'});fireEvent.click(screen.getByRole('button',{name:'Khôi phục file'}));
 await screen.findByText('Đã khôi phục file.');expect(featuresApi.restoreDocument).toHaveBeenCalledWith(1,2,3,expect.objectContaining({expectedVersion:7,requestKey:expect.any(String)}));
 expect(screen.getByLabelText('Tìm file')).toHaveValue('Hidden');expect(screen.getByLabelText('Hiển thị file')).toHaveValue('hidden');
});
test('failed restore has an error and reload reads without automatically repeating the write',async()=>{
 featuresApi.get.mockResolvedValue({id:2,name:'Feature A'});featuresApi.documents.mockResolvedValue({items:[{id:3,fileName:'Hidden.xlsx',version:7,canRestore:true}],totalItems:1,totalPages:1});featuresApi.restoreDocument.mockReset().mockRejectedValue(new Error('Server refused restore'));
 render(<TestingFeaturePage projectId={1} featureId={2}/>);fireEvent.change(await screen.findByLabelText('Hiển thị file'),{target:{value:'hidden'}});fireEvent.click(await screen.findByRole('button',{name:'Khôi phục file'}));
 await screen.findByText('Server refused restore');expect(screen.queryByText('Đã khôi phục file.')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Tải lại danh sách'}));await screen.findByRole('button',{name:'Khôi phục file'});expect(featuresApi.restoreDocument).toHaveBeenCalledTimes(1);
});
test('returns to the remaining file page after hiding the last file on page two',async()=>{
 let hidden=false;featuresApi.get.mockResolvedValue({id:2,name:'Feature A',archivedAt:null});featuresApi.hideDocument.mockImplementation(async()=>{hidden=true;});
 featuresApi.documents.mockImplementation(async(p,f,{page})=>({items:hidden&&page===1?[]:[{id:3,fileName:'Remaining.xlsx',version:0}],totalItems:hidden?20:21,totalPages:hidden?1:2}));
 render(<TestingFeaturePage projectId={1} featureId={2}/>);await screen.findByRole('button',{name:'Remaining.xlsx'});
 fireEvent.click(screen.getByRole('button',{name:'Trang sau'}));await screen.findByText('Trang 2/2');
 fireEvent.click(screen.getByRole('button',{name:'Xóa khỏi danh sách'}));
 await screen.findByText('Trang 1/1');expect(screen.getByRole('button',{name:'Remaining.xlsx'})).toBeVisible();
});
test('returns to the remaining hidden page after restoring its last file',async()=>{
 let restored=false;featuresApi.get.mockResolvedValue({id:2,name:'Feature A'});featuresApi.restoreDocument.mockImplementation(async()=>{restored=true;});
 featuresApi.documents.mockImplementation(async(p,f,{page,archived})=>({items:archived&&!(restored&&page===1)?[{id:3,fileName:'Recover.xlsx',version:2,canRestore:true}]:[],totalItems:restored?20:21,totalPages:restored?1:2}));
 render(<TestingFeaturePage projectId={1} featureId={2}/>);fireEvent.change(await screen.findByLabelText('Hiển thị file'),{target:{value:'hidden'}});await screen.findByRole('button',{name:'Recover.xlsx'});fireEvent.click(screen.getByRole('button',{name:'Trang sau'}));await screen.findByText('Trang 2/2');fireEvent.click(screen.getByRole('button',{name:'Khôi phục file'}));await screen.findByText('Trang 1/1');expect(screen.getByLabelText('Hiển thị file')).toHaveValue('hidden');
});
test('reports current hidden visibility instead of restored success for an old restore replay',async()=>{
 featuresApi.get.mockResolvedValue({id:2,name:'Feature A'});featuresApi.documents.mockResolvedValue({items:[{id:3,fileName:'Hidden.xlsx',version:7,canRestore:true}],totalItems:1,totalPages:1});featuresApi.restoreDocument.mockResolvedValue({id:3,archived:true,version:9});
 render(<TestingFeaturePage projectId={1} featureId={2}/>);fireEvent.change(await screen.findByLabelText('Hiển thị file'),{target:{value:'hidden'}});fireEvent.click(await screen.findByRole('button',{name:'Khôi phục file'}));await screen.findByText('Yêu cầu trước đã xử lý; file hiện đã ẩn lại.');expect(screen.queryByText('Đã khôi phục file.')).not.toBeInTheDocument();
});
