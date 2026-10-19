import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,expect,test,vi} from 'vitest';
import {TestingFeaturesPage} from './TestingFeaturesPage';
import {featuresApi} from '../../services/api/features';
vi.mock('../../services/api/features',()=>({featuresApi:{list:vi.fn(),create:vi.fn(),archive:vi.fn(),restore:vi.fn(),update:vi.fn()}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>role==='ADMIN'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:{id:1,name:'Dự án thử',projectRole:'PM'}})}));
beforeEach(()=>{vi.clearAllMocks();featuresApi.list.mockResolvedValue({items:[{id:21,name:'Kiểm thử tháng10',environment:'Server riêng',description:'Đợt kiểm thử',version:0,caseCount:5,testedCaseCount:3}],totalItems:1,totalPages:1});});
test('opens the chosen test round from project Features',async()=>{
  const open=vi.fn();render(<TestingFeaturesPage projectId={1} onOpenFeature={open}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Kiểm thử tháng10'}));
  expect(open).toHaveBeenCalledWith(21);
});
test('keeps Feature fields when saving fails',async()=>{
  featuresApi.create.mockRejectedValue(new Error('Mạng chưa ổn định'));
  render(<TestingFeaturesPage projectId={1} onOpenFeature={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Tạo Feature'}));
  fireEvent.change(screen.getByLabelText('Tên Feature'),{target:{value:'Đợt đang nhập'}});
  fireEvent.change(screen.getByLabelText('Môi trường / server'),{target:{value:'Server tự do'}});
  fireEvent.click(screen.getByRole('button',{name:'Lưu Feature'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Mạng chưa ổn định');
  expect(screen.getByLabelText('Tên Feature')).toHaveValue('Đợt đang nhập');expect(screen.getByLabelText('Môi trường / server')).toHaveValue('Server tự do');
});
