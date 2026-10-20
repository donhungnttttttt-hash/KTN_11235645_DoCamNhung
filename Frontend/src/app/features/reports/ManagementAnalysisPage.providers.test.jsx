import React,{StrictMode} from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ManagementAnalysisPage} from './ManagementAnalysisPage';
import {AiProviderProvider} from '../ai/AiConnections';
import {ReportDraftProvider} from './ReportDraftProvider';

vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({status:'authenticated',user:{id:1,roles:['ADMIN']},hasRole:role=>role==='ADMIN'})}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:null})}));
afterEach(()=>vi.unstubAllGlobals());
const project={id:11,name:'Dự án kiểm thử',code:'TEST'};
const summary={project,feature:null,metrics:{total:0,tested:0,ok:0,ng:0,pending:0,na:0,notRun:0,executionPercent:0},features:[],issues:[]};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});

it('generates through real provider readiness, CSRF and preview clients in StrictMode without losing the response',async()=>{
 let finish;
 const previews=[];
 vi.stubGlobal('fetch',vi.fn(async(path,options)=>{
  if(path==='/api/v1/ai/providers')return json({providers:[{code:'OPENAI_API',enabled:true,available:true,models:[{id:'report-model',label:'report-model'}]}]});
  if(path==='/api/v1/auth/csrf')return json({headerName:'X-CSRF-TOKEN',token:'test-csrf'});
  if(path==='/api/v1/projects/11/management-reports/summary')return json(summary);
  if(path==='/api/v1/projects/11/management-reports?page=0&size=20')return json({items:[],totalPages:0});
  if(path==='/api/v1/projects/11/management-reports/preview'){
   previews.push({body:JSON.parse(options.body),csrf:options.headers['X-CSRF-TOKEN']});
   return new Promise(resolve=>{finish=resolve;});
  }
  throw new Error(`Unexpected request ${path}`);
 }));
 render(<StrictMode><ReportDraftProvider><AiProviderProvider><ManagementAnalysisPage project={project}/></AiProviderProvider></ReportDraftProvider></StrictMode>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Tạo gợi ý AI'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Tạo gợi ý AI'}));
 expect(screen.getByRole('button',{name:'Đang tạo gợi ý…'})).toBeDisabled();
 await waitFor(()=>expect(previews).toHaveLength(1));
 expect(previews[0]).toMatchObject({body:{featureId:null,provider:'OPENAI_API',model:'report-model',requestKey:expect.stringMatching(/^report-/)},csrf:'test-csrf'});
 await act(async()=>finish(json({state:'READY',draftId:8,markdown:'# Báo cáo từ API'})));
 await waitFor(()=>expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('# Báo cáo từ API'));
 expect(screen.getByRole('status',{name:'Kết quả tạo gợi ý AI'})).toBeVisible();
 expect(previews).toHaveLength(1);
});

it('saves edited AI text as an ordinary report and reopens the exact saved content',async()=>{
 const generated='# Báo cáo tiến độ\n\nChưa có case để kiểm thử.\n\n- Cần bổ sung phạm vi.';
 const edited=generated+'\n\nGhi chú của PM: kiểm tra lại ngày mai.';
 let saved=null;
 vi.stubGlobal('fetch',vi.fn(async(path,options={})=>{
  if(path==='/api/v1/ai/providers')return json({providers:[{code:'OPENAI_API',enabled:true,available:true,models:[{id:'report-model',label:'report-model'}]}]});
  if(path==='/api/v1/auth/csrf')return json({headerName:'X-CSRF-TOKEN',token:'test-csrf'});
  if(path==='/api/v1/projects/11/management-reports/summary')return json(summary);
  if(path==='/api/v1/projects/11/management-reports?page=0&size=20')return json({items:saved?[saved]:[],totalPages:saved?1:0});
  if(path==='/api/v1/projects/11/management-reports/preview')return json({state:'READY',draftId:8,markdown:generated});
  if(path==='/api/v1/projects/11/management-reports'&&options.method==='POST'){
   expect(options.headers['X-CSRF-TOKEN']).toBe('test-csrf');
   expect(JSON.parse(options.body)).toEqual({featureId:null,title:'Báo cáo đã chỉnh sửa',markdown:edited});
   saved={id:101,projectId:11,version:0,...JSON.parse(options.body)};return json(saved);
  }
  if(path==='/api/v1/projects/11/management-reports/101')return json(saved);
  throw new Error(`Unexpected request ${path}`);
 }));
 render(<ReportDraftProvider><AiProviderProvider><ManagementAnalysisPage project={project}/></AiProviderProvider></ReportDraftProvider>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Tạo gợi ý AI'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Tạo gợi ý AI'}));
 await waitFor(()=>expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue(generated));
 expect(saved).toBeNull();
 fireEvent.change(screen.getByLabelText('Tiêu đề báo cáo'),{target:{value:'Báo cáo đã chỉnh sửa'}});
 fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:edited}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));
 expect(await screen.findByText('Đã lưu báo cáo.')).toBeVisible();
 await screen.findByRole('button',{name:'Mở báo cáo Báo cáo đã chỉnh sửa'});
 fireEvent.click(screen.getByRole('button',{name:'Báo cáo mới'}));
 expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('');
 fireEvent.click(screen.getByRole('button',{name:'Mở báo cáo Báo cáo đã chỉnh sửa'}));
 await waitFor(()=>expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue(edited));
 expect(screen.getByLabelText('Tiêu đề báo cáo')).toHaveValue('Báo cáo đã chỉnh sửa');
});
