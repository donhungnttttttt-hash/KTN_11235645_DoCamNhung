import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {ManagementAnalysisPage} from './ManagementAnalysisPage';
import {ReportDraftProvider} from './ReportDraftProvider';
const auth=vi.hoisted(()=>({roles:['PM'],id:1,status:'authenticated'}));
const provider=vi.hoisted(()=>({ready:true,selection:{provider:'OPENAI_API',model:'m'}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({status:auth.status,user:{id:auth.id,roles:auth.roles},hasRole:role=>auth.roles.includes(role)})}));
vi.mock('../ai/AiConnections',()=>({useAiProviders:()=>provider}));
vi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:null})}));
const project={id:1,name:'Dự án A',code:'A',projectRole:'PM'};
const metrics={total:5,tested:3,ok:1,ng:0,pending:1,na:1,notRun:2,executionPercent:60};
const summary={project,feature:null,metrics,features:[{id:42,name:'Feature A',environment:'staging',caseCount:5,testedCaseCount:3,progressPercent:60}],issues:[{type:'BUG',status:'OPEN',total:10}],asOf:'2026-10-19T00:00:00Z',timeZone:'Asia/Ho_Chi_Minh'};
const saved={id:7,projectId:1,featureId:null,title:'Báo cáo A',markdown:'10 lỗi',version:3};
let api;
afterEach(()=>vi.unstubAllGlobals());
beforeEach(()=>{auth.roles=['PM'];auth.id=1;auth.status='authenticated';provider.ready=true;api={summary:vi.fn().mockResolvedValue(summary),list:vi.fn().mockResolvedValue({items:[saved],totalItems:1,page:0,size:20,totalPages:1}),get:vi.fn().mockResolvedValue(saved),create:vi.fn(),update:vi.fn(),download:vi.fn(),preview:vi.fn()};});
const mount=(props={})=>render(<ManagementAnalysisPage project={project} api={api} {...props}/>);
it('distinguishes filtered metrics from the full-project Feature comparison without changing either scope',async()=>{
 const featureA={...summary.features[0]},featureB={...featureA,id:43,name:'Feature B'};
 api.summary.mockResolvedValueOnce({...summary,features:[featureA,featureB]})
  .mockResolvedValueOnce({...summary,feature:featureA,metrics:{...metrics,total:2,tested:1,executionPercent:50},features:[featureA,featureB],issues:[{type:'BUG',status:'OPEN',total:2}]});
 mount();await screen.findByRole('option',{name:'Feature B'});fireEvent.change(screen.getByLabelText('Phạm vi Feature'),{target:{value:'42'}});
 expect(await screen.findByText('Phạm vi số liệu: Feature A')).toBeVisible();expect(screen.getByText('1 / 2 case đã test · 50%')).toBeVisible();
 expect(screen.getByRole('heading',{name:'Đối chiếu tiến độ toàn dự án'})).toBeVisible();expect(screen.getByRole('cell',{name:'Feature B'})).toBeVisible();expect(screen.getByRole('option',{name:'Feature B'})).toBeVisible();
});
it('restores a new report and its Feature after route or project changes without browser storage',async()=>{
 const tree=(current=project,show=true)=><ReportDraftProvider>{show?<ManagementAnalysisPage project={current} api={api}/>:<p>Route khác</p>}</ReportDraftProvider>;
 const view=render(tree());await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Phạm vi Feature'),{target:{value:'42'}});
 fireEvent.change(screen.getByLabelText('Tiêu đề báo cáo'),{target:{value:'Nháp Feature A'}});fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp chưa lưu của A'}});
 view.rerender(tree(project,false));view.rerender(tree({...project,id:2,name:'B'}));expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('');
 view.rerender(tree());expect(screen.getByLabelText('Tiêu đề báo cáo')).toHaveValue('Nháp Feature A');expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp chưa lưu của A');expect(screen.getByLabelText('Phạm vi Feature')).toHaveValue('42');
 expect(api.create).not.toHaveBeenCalled();expect(api.update).not.toHaveBeenCalled();
});
it('revalidates a restored saved report version and preserves conflicting edits instead of overwriting them',async()=>{
 const tree=(show=true)=><ReportDraftProvider>{show?<ManagementAnalysisPage project={project} api={api}/>:<p>Route khác</p>}</ReportDraftProvider>;
 const view=render(tree());fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));await screen.findByDisplayValue('10 lỗi');
 fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp 8 lỗi'}});view.rerender(tree(false));
 api.get.mockResolvedValue({...saved,markdown:'Bản mới trên máy chủ',version:4});view.rerender(tree());
 expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp 8 lỗi');
 await screen.findByText(/Bản đã lưu đã thay đổi/);expect(screen.getByRole('button',{name:'Lưu báo cáo'})).toBeDisabled();expect(api.update).not.toHaveBeenCalled();
});
it('does not replace a buffered draft with a save result received after route disposal',async()=>{
 let finish;api.create.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const tree=(show=true)=><ReportDraftProvider>{show?<ManagementAnalysisPage project={project} api={api}/>:<p>Route khác</p>}</ReportDraftProvider>;
 const view=render(tree());fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp đang lưu'}});fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));
 await waitFor(()=>expect(api.create).toHaveBeenCalledOnce());view.rerender(tree(false));await act(async()=>finish({...saved,markdown:'Kết quả response trễ'}));view.rerender(tree());
 expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp đang lưu');expect(screen.queryByText('Đã lưu báo cáo.')).toBeNull();expect(api.create).toHaveBeenCalledOnce();
});
it('keeps restored edits through validation failure and clears the buffer only after a confirmed save',async()=>{
 const tree=(show=true)=><ReportDraftProvider>{show?<ManagementAnalysisPage project={project} api={api}/>:<p>Route khác</p>}</ReportDraftProvider>;
 const view=render(tree());fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));await screen.findByDisplayValue('10 lỗi');
 fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp 8 lỗi'}});view.rerender(tree(false));
 api.get.mockRejectedValueOnce(new Error('Không đối chiếu được')).mockResolvedValueOnce(saved);view.rerender(tree());
 fireEvent.click(await screen.findByRole('button',{name:'Đối chiếu lại bản đã lưu'}));expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp 8 lỗi');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu báo cáo'})).toBeEnabled());api.update.mockResolvedValue({...saved,markdown:'Nháp 8 lỗi',version:4});
 fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));await screen.findByText('Đã lưu báo cáo.');expect(api.update).toHaveBeenCalledWith(1,7,expect.objectContaining({markdown:'Nháp 8 lỗi',expectedVersion:3}),expect.anything());
 view.rerender(tree(false));view.rerender(tree());expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('');expect(screen.queryByText(/Đã khôi phục bản sửa/)).toBeNull();
});
it('reconciles a confirmed save with the buffer after the same owner reauthenticates',async()=>{
 let finish;api.create.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const tree=<ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>;
 const view=render(tree);fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nội dung đang lưu'}});fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));
 await waitFor(()=>expect(api.create).toHaveBeenCalledOnce());auth.status='expired';view.rerender(<ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>);
 await act(async()=>finish({...saved,markdown:'Nội dung đang lưu'}));auth.status='authenticated';view.rerender(<ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>);
 const close=new Event('beforeunload',{cancelable:true});window.dispatchEvent(close);expect(close.defaultPrevented).toBe(false);
});
it.each(['expired','unavailable'])('hydrates an existing owner draft after a report route remounts while %s',status=>{
 const tree=(show=true)=><ReportDraftProvider>{show?<ManagementAnalysisPage project={project} api={api}/>:<p>Route khác</p>}</ReportDraftProvider>;
 const view=render(tree());fireEvent.change(screen.getByLabelText('Tiêu đề báo cáo'),{target:{value:'Nháp riêng của A'}});fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nội dung cần phục hồi'}});
 view.rerender(tree(false));auth.status=status;view.rerender(tree());
 expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull();expect(screen.queryByDisplayValue('Nội dung cần phục hồi')).toBeNull();
 auth.status='authenticated';view.rerender(tree());
 expect(screen.getByLabelText('Tiêu đề báo cáo')).toHaveValue('Nháp riêng của A');expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nội dung cần phục hồi');expect(api.create).not.toHaveBeenCalled();
});
it.each(['expired','unavailable'])('waits for active owner access before restoring and revalidating a saved draft remounted while %s',async status=>{
 const tree=(show=true)=><ReportDraftProvider>{show?<ManagementAnalysisPage project={project} api={api}/>:<p>Route khác</p>}</ReportDraftProvider>;
 const view=render(tree());fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));await screen.findByDisplayValue('10 lỗi');
 fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp saved v3'}});view.rerender(tree(false));
 auth.status=status;api.get.mockResolvedValue({...saved,markdown:'Server v4',version:4});const priorReads=api.get.mock.calls.length;view.rerender(tree());
 expect(api.get).toHaveBeenCalledTimes(priorReads);expect(screen.queryByDisplayValue('Nháp saved v3')).toBeNull();
 auth.status='authenticated';view.rerender(tree());expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp saved v3');
 await screen.findByText(/Bản đã lưu đã thay đổi/);expect(api.get).toHaveBeenCalledWith(1,7,expect.anything());expect(screen.getByRole('button',{name:'Lưu báo cáo'})).toBeDisabled();expect(api.update).not.toHaveBeenCalled();
});
it('revalidates read access after 401 and same-owner reauthentication while preserving the editor and never saving automatically',async()=>{
 api.summary.mockResolvedValueOnce(summary).mockRejectedValueOnce(Object.assign(new Error('Phiên hết hạn'),{status:401})).mockResolvedValue(summary);
 const tree=()=> <ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>;
 const view=render(tree());await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp cần giữ sau 401'}});
 fireEvent.click(screen.getByRole('button',{name:'Tải lại số liệu'}));await waitFor(()=>expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull());
 auth.status='expired';view.rerender(tree());auth.status='authenticated';view.rerender(tree());
 expect(await screen.findByLabelText('Nội dung Markdown')).toHaveValue('Nháp cần giữ sau 401');expect(api.summary).toHaveBeenCalledTimes(3);
 expect(api.create).not.toHaveBeenCalled();expect(api.update).not.toHaveBeenCalled();expect(api.preview).not.toHaveBeenCalled();
});
it('keeps a real 403 denial after same-owner reauthentication without probing or writing again',async()=>{
 api.summary.mockResolvedValueOnce(summary).mockRejectedValueOnce(Object.assign(new Error('Quyền đã bị thu hồi'),{status:403}));
 const tree=()=> <ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>;
 const view=render(tree());await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp bị chặn quyền'}});
 fireEvent.click(screen.getByRole('button',{name:'Tải lại số liệu'}));await screen.findByRole('heading',{name:'Không có quyền truy cập'});
 auth.status='expired';view.rerender(tree());auth.status='authenticated';view.rerender(tree());
 expect(screen.getByRole('heading',{name:'Không có quyền truy cập'})).toBeVisible();expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull();expect(api.summary).toHaveBeenCalledTimes(2);expect(api.create).not.toHaveBeenCalled();
});
it('keeps denied content hidden if reauthentication read now returns 403',async()=>{
 api.summary.mockResolvedValueOnce(summary).mockRejectedValueOnce(Object.assign(new Error('Phiên hết hạn'),{status:401})).mockRejectedValueOnce(Object.assign(new Error('Không còn quyền'),{status:403}));
 const tree=()=> <ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>;
 const view=render(tree());await screen.findByText('3 / 5 case đã test · 60%');fireEvent.click(screen.getByRole('button',{name:'Tải lại số liệu'}));await waitFor(()=>expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull());
 auth.status='expired';view.rerender(tree());auth.status='authenticated';view.rerender(tree());await waitFor(()=>expect(api.summary).toHaveBeenCalledTimes(3));
 expect(screen.getByRole('heading',{name:'Không có quyền truy cập'})).toBeVisible();expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull();expect(api.preview).not.toHaveBeenCalled();
});
it('offers an explicit read retry after reauthentication validation fails without losing the draft',async()=>{
 api.summary.mockResolvedValueOnce(summary).mockRejectedValueOnce(Object.assign(new Error('Phiên hết hạn'),{status:401})).mockRejectedValueOnce(new Error('Mạng chưa sẵn sàng')).mockResolvedValue(summary);
 const tree=()=> <ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>;
 const view=render(tree());await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp qua lỗi mạng'}});fireEvent.click(screen.getByRole('button',{name:'Tải lại số liệu'}));await waitFor(()=>expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull());
 auth.status='expired';view.rerender(tree());auth.status='authenticated';view.rerender(tree());
 fireEvent.click(await screen.findByRole('button',{name:'Kiểm tra lại quyền báo cáo'}));expect(await screen.findByLabelText('Nội dung Markdown')).toHaveValue('Nháp qua lỗi mạng');expect(api.summary).toHaveBeenCalledTimes(4);expect(api.create).not.toHaveBeenCalled();
});
it('reauthenticates a rejected save with reads only and keeps its original version and edited text',async()=>{
 api.update.mockRejectedValueOnce(Object.assign(new Error('Phiên hết hạn'),{status:401}));
 const tree=()=> <ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>;
 const view=render(tree());fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));await screen.findByDisplayValue('10 lỗi');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'8 lỗi chưa lưu'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));await waitFor(()=>expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull());auth.status='expired';view.rerender(tree());auth.status='authenticated';view.rerender(tree());
 expect(await screen.findByLabelText('Nội dung Markdown')).toHaveValue('8 lỗi chưa lưu');await waitFor(()=>expect(screen.getByRole('button',{name:'Lưu báo cáo'})).toBeEnabled());
 expect(api.update).toHaveBeenCalledTimes(1);expect(api.update).toHaveBeenCalledWith(1,7,expect.objectContaining({markdown:'8 lỗi chưa lưu',expectedVersion:3}),expect.anything());expect(api.get).toHaveBeenCalledTimes(2);expect(api.preview).not.toHaveBeenCalled();
});
it('does not let a successful reauthentication read clear a concurrent real 403 denial',async()=>{
 let failList,finishCheck;api.list.mockReturnValueOnce(new Promise((_resolve,reject)=>{failList=reject;}));
 api.summary.mockResolvedValueOnce(summary).mockRejectedValueOnce(Object.assign(new Error('Phiên hết hạn'),{status:401})).mockReturnValueOnce(new Promise(resolve=>{finishCheck=resolve;}));
 const tree=()=> <ReportDraftProvider><ManagementAnalysisPage project={project} api={api}/></ReportDraftProvider>;
 const view=render(tree());await screen.findByText('3 / 5 case đã test · 60%');fireEvent.click(screen.getByRole('button',{name:'Tải lại số liệu'}));await waitFor(()=>expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull());
 auth.status='expired';view.rerender(tree());auth.status='authenticated';view.rerender(tree());await waitFor(()=>expect(api.summary).toHaveBeenCalledTimes(3));
 await act(async()=>{failList(Object.assign(new Error('Quyền đã bị thu hồi'),{status:403}));await Promise.resolve();await Promise.resolve();finishCheck(summary);});
 expect(screen.getByRole('heading',{name:'Không có quyền truy cập'})).toBeVisible();expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull();expect(api.update).not.toHaveBeenCalled();
});
it('announces opening a saved report without claiming that it is being saved',async()=>{
 let finish;api.get.mockReturnValue(new Promise(resolve=>{finish=resolve;}));mount();
 fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));
 expect(screen.getByRole('status',{name:'Thao tác báo cáo'})).toHaveTextContent('Đang mở báo cáo…');
 expect(screen.queryByRole('button',{name:'Đang lưu…'})).toBeNull();
 await act(async()=>finish(saved));await screen.findByDisplayValue('10 lỗi');
 expect(screen.queryByRole('status',{name:'Thao tác báo cáo'})).toBeNull();
});
it('explains archived report read-only mode without enabling write actions',async()=>{
 mount({project:{...project,archived:true}});
 expect(screen.getByRole('status',{name:'Chế độ báo cáo'})).toHaveTextContent('Dự án đã lưu trữ. Bạn có thể xem và tải bản báo cáo đã lưu.');
 expect(screen.queryByRole('button',{name:'Lưu báo cáo'})).toBeNull();expect(screen.getByLabelText('Nội dung Markdown')).toBeDisabled();
 await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'});
});
it('FR12 shows readable percentages while keeping the exact progress value',async()=>{
 api.summary.mockResolvedValue({...summary,features:[{...summary.features[0],caseCount:120,testedCaseCount:1,progressPercent:100/120}]});
 mount();const bar=await screen.findByRole('progressbar',{name:'Tiến độ Feature A'});
 expect(screen.getByText('0.83%')).toBeVisible();
 expect(bar).toHaveAttribute('aria-valuenow',String(100/120));
 expect(screen.queryByText('0.8333333333333334%')).toBeNull();
});
it('FR12 displays the same Vietnamese Issue status labels as the work board',async()=>{
 api.summary.mockResolvedValue({...summary,issues:[{type:'BUG',status:'progress',total:3},{type:'QA',status:'OPEN',total:1}]});
 mount();expect(await screen.findByRole('cell',{name:'Đang xử lý',exact:true})).toBeVisible();
 expect(screen.getByRole('cell',{name:'Chưa xử lý',exact:true})).toBeVisible();
 expect(screen.queryByRole('cell',{name:'progress',exact:true})).toBeNull();
});
it('FR12 explains why AI generation is disabled without losing the manual report draft',async()=>{
 provider.ready=false;mount();await screen.findByText('3 / 5 case đã test · 60%');
 fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp thủ công đang viết'}});
 const button=screen.getByRole('button',{name:'Tạo gợi ý AI'});
 expect(button).toBeDisabled();expect(button).toHaveAccessibleDescription(/Nguồn AI chưa sẵn sàng/);
 expect(screen.getByText(/Nguồn AI: API của hệ thống/)).toBeVisible();
 expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp thủ công đang viết');
 expect(api.preview).not.toHaveBeenCalled();
});
it.each(['TESTER','DEV'])('FR10 denies %s before fetching management data',role=>{
 auth.roles=[role];mount({project:{...project,projectRole:role}});expect(screen.getByRole('heading',{name:'Không có quyền truy cập'})).toBeVisible();expect(api.summary).not.toHaveBeenCalled();expect(api.list).not.toHaveBeenCalled();
});
it('FR10 uses Feature Status metrics with P and NA counted and optional whole-project scope',async()=>{
 mount();await screen.findByText('3 / 5 case đã test · 60%');expect(screen.getByRole('img',{name:/OK: 1.*P: 1.*NA: 1.*Unexecuted: 2/})).toBeVisible();
 fireEvent.change(screen.getByLabelText('Phạm vi Feature'),{target:{value:'42'}});await waitFor(()=>expect(api.summary).toHaveBeenLastCalledWith(1,{featureId:42},expect.anything()));expect(screen.queryByLabelText('Build thực thi')).toBeNull();
});
it('FR10 saves edited report text and downloads the saved revision while issue counts stay unchanged',async()=>{
 api.update.mockResolvedValue({...saved,markdown:'8 lỗi',version:4});api.download.mockResolvedValue(new Response('8 lỗi'));const createURL=vi.fn().mockReturnValue('blob:report');vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:createURL,revokeObjectURL:vi.fn()}));vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 mount();fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));await screen.findByDisplayValue('10 lỗi');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'8 lỗi'}});fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));await screen.findByText('Đã lưu báo cáo.');
 expect(api.update).toHaveBeenCalledWith(1,7,{title:'Báo cáo A',markdown:'8 lỗi',expectedVersion:3},expect.anything());expect(screen.getByText('10',{selector:'td'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Tải bản đã lưu'}));await waitFor(()=>expect(createURL).toHaveBeenCalled());const downloaded=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(createURL.mock.calls[0][0]);});expect(downloaded).toBe('8 lỗi');expect(api.download).toHaveBeenCalledWith(1,7,expect.anything());
});
it('FR10 keeps the edit buffer on conflict and marks success only after the server saves',async()=>{
 api.update.mockRejectedValue(new Error('Phiên bản đã thay đổi'));mount();fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));await screen.findByDisplayValue('10 lỗi');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'8 lỗi chưa lưu'}});fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));await screen.findByRole('alert');expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('8 lỗi chưa lưu');expect(screen.queryByText('Đã lưu báo cáo.')).toBeNull();
});
it('FR10 uses the same admitted AI request key while pending and never overwrites the edit buffer',async()=>{
 api.preview.mockResolvedValueOnce({state:'GENERATING',draftId:8}).mockResolvedValueOnce({state:'READY',draftId:8,markdown:'# Gợi ý AI'});mount();await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Bản tôi đang sửa'}});fireEvent.click(screen.getByRole('button',{name:'Tạo gợi ý AI'}));fireEvent.click(await screen.findByRole('button',{name:'Kiểm tra gợi ý AI'}));await screen.findByRole('heading',{name:'Gợi ý AI'});
 expect(api.preview.mock.calls[0][1]).toEqual(api.preview.mock.calls[1][1]);expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Bản tôi đang sửa');expect(api.create).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Đưa vào bản soạn'}));expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('# Gợi ý AI');
});
it('FR10 saves manual text with nullable Feature and no AI draft identity',async()=>{
 api.create.mockResolvedValue({...saved,title:'Báo cáo mới',markdown:'Nội dung mới',version:0});mount();await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Tiêu đề báo cáo'),{target:{value:'Báo cáo mới'}});fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nội dung mới'}});fireEvent.click(screen.getByRole('button',{name:'Lưu báo cáo'}));await screen.findByText('Đã lưu báo cáo.');expect(api.create).toHaveBeenCalledWith(1,{featureId:null,title:'Báo cáo mới',markdown:'Nội dung mới'},expect.anything());
});
it('FR10 ignores stale summary and report reads after project changes',async()=>{
 let finish;api.summary.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValue({...summary,project:{...project,id:2},metrics:{...metrics,total:0,tested:0,executionPercent:0}});const view=mount();view.rerender(<ManagementAnalysisPage project={{...project,id:2,name:'B'}} api={api}/>);await screen.findByText('Chưa có case trong phạm vi này.');await act(async()=>finish(summary));expect(screen.queryByText('3 / 5 case đã test · 60%')).toBeNull();
});
it('FR10 keeps archived reports readable without write or AI generation actions',async()=>{
 mount({project:{...project,archived:true}});fireEvent.click(await screen.findByRole('button',{name:'Mở báo cáo Báo cáo A'}));await screen.findByDisplayValue('10 lỗi');expect(screen.getByLabelText('Nội dung Markdown')).toBeDisabled();expect(screen.queryByRole('button',{name:'Lưu báo cáo'})).toBeNull();expect(screen.queryByRole('button',{name:'Tạo gợi ý AI'})).toBeNull();
});
it('FR10 lets global Admin read without membership and denies a global PM outside the project',async()=>{
 auth.roles=['PM'];const view=mount({project:{...project,projectRole:null}});expect(screen.getByRole('heading',{name:'Không có quyền truy cập'})).toBeVisible();auth.roles=['ADMIN'];view.rerender(<ManagementAnalysisPage project={{...project,projectRole:null}} api={api}/>);await screen.findByText('3 / 5 case đã test · 60%');
});
it('FR10 explains an absent project without fetching',()=>{
 mount({project:null});expect(screen.getByText('Chọn dự án để xem phân tích.')).toBeVisible();expect(api.summary).not.toHaveBeenCalled();
});
it('FR10 retries summary/list errors and paginates the saved report catalog',async()=>{
 api.summary.mockRejectedValueOnce(new Error('Số liệu chưa tải được')).mockResolvedValue({...summary,features:[],issues:[]});api.list.mockRejectedValueOnce(new Error('Báo cáo chưa tải được')).mockResolvedValue({items:[],page:0,totalItems:0,totalPages:2});mount();await screen.findAllByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Tải lại số liệu'}));fireEvent.click(screen.getByRole('button',{name:'Tải lại báo cáo'}));await screen.findByText('Chưa có Feature.');await screen.findByText('Chưa có Bug/QA.');await screen.findByText('Chưa có báo cáo đã lưu.');fireEvent.click(screen.getByRole('button',{name:'Báo cáo sau'}));await waitFor(()=>expect(api.list).toHaveBeenLastCalledWith(1,{page:1,size:20},expect.anything()));fireEvent.click(await screen.findByRole('button',{name:'Báo cáo trước'}));await waitFor(()=>expect(api.list).toHaveBeenLastCalledWith(1,{page:0,size:20},expect.anything()));
});
it('FR10 preserves edits on AI failure and does not create a stored report',async()=>{
 api.preview.mockResolvedValue({state:'FAILED',failureCode:'AI_INVALID_RESPONSE'});mount();await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Bản soạn giữ lại'}});fireEvent.click(screen.getByRole('button',{name:'Tạo gợi ý AI'}));await screen.findByRole('alert');expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Bản soạn giữ lại');expect(api.create).not.toHaveBeenCalled();expect(api.update).not.toHaveBeenCalled();
});
it('FR10 retries an uncertain AI request with the same provider model and key',async()=>{
 api.preview.mockRejectedValueOnce(Object.assign(new Error('Quá thời gian chờ'),{code:'TIMEOUT'})).mockResolvedValueOnce({state:'READY',markdown:'Bản gợi ý'});mount();await screen.findByText('3 / 5 case đã test · 60%');fireEvent.click(screen.getByRole('button',{name:'Tạo gợi ý AI'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Kiểm tra gợi ý AI'}));await waitFor(()=>expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Bản gợi ý'));expect(api.preview.mock.calls[0][1]).toEqual(api.preview.mock.calls[1][1]);
});
it('FR10 protects unsaved edits when a Feature or saved-report switch is declined',async()=>{
 vi.spyOn(window,'confirm').mockReturnValue(false);mount();await screen.findByText('3 / 5 case đã test · 60%');fireEvent.change(screen.getByLabelText('Nội dung Markdown'),{target:{value:'Nháp chưa lưu'}});fireEvent.change(screen.getByLabelText('Phạm vi Feature'),{target:{value:'42'}});fireEvent.click(screen.getByRole('button',{name:'Mở báo cáo Báo cáo A'}));expect(api.get).not.toHaveBeenCalled();expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp chưa lưu');expect(screen.getByLabelText('Phạm vi Feature')).toHaveValue('');fireEvent.click(screen.getByRole('button',{name:'Báo cáo mới'}));expect(screen.getByLabelText('Nội dung Markdown')).toHaveValue('Nháp chưa lưu');
});
it('FR10 ignores saved-report and AI-preview responses after switching projects',async()=>{
 let finish;api.preview.mockReturnValue(new Promise(resolve=>{finish=resolve;}));const view=mount();await screen.findByText('3 / 5 case đã test · 60%');fireEvent.click(screen.getByRole('button',{name:'Tạo gợi ý AI'}));view.rerender(<ManagementAnalysisPage project={{...project,id:2,name:'Dự án B'}} api={api}/>);await screen.findByDisplayValue('Báo cáo Dự án B');await act(async()=>finish({state:'READY',markdown:'Gợi ý dự án A'}));expect(screen.queryByText('Gợi ý dự án A')).toBeNull();
});
it('FR10 hides previously loaded management data after server-side permission revocation',async()=>{
 api.summary.mockResolvedValueOnce(summary).mockRejectedValueOnce(Object.assign(new Error('Không có quyền'),{status:403}));mount();await screen.findByText('3 / 5 case đã test · 60%');fireEvent.click(screen.getByRole('button',{name:'Tải lại số liệu'}));await screen.findByRole('heading',{name:'Không có quyền truy cập'});expect(screen.queryByLabelText('Nội dung Markdown')).toBeNull();expect(screen.queryByText('10',{selector:'td'})).toBeNull();
});
