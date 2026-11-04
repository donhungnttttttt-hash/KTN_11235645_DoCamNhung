import React from 'react';
import {act,render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,test,vi} from 'vitest';
import {AdminProjectDetail} from './AdminProjectDetail';
import {AdminProjectLifecycle} from './AdminProjectLifecycle';
import {adminApi} from '../../services/api/admin';

afterEach(()=>vi.unstubAllGlobals());
const legacyPreview={projectId:7,projectCode:'APP',projectName:'iPad',version:3,archived:false,canArchive:false,canArchiveWithLegacyException:true,legacyExceptionFingerprint:'a'.repeat(64),blockers:[{code:'UNFINISHED_CYCLES',label:'Đợt kiểm thử chưa chốt',count:1,exceptionEligible:true}],asOf:'2026-11-03T01:00:00Z'};
const json=(body,status=200)=>({ok:status>=200&&status<300,status,headers:new Headers({'content-type':'application/json'}),json:async()=>body});
async function selectLegacyArchive(){
 await userEvent.click(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'}));
 await screen.findByRole('checkbox');
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Giữ nguyên dữ liệu luồng cũ'}});
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));
}
test('apiRequest integration preserves exact exception JSON and CSRF on response-loss retry',async()=>{
 const posts=[];let csrfReads=0;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(url.endsWith('/auth/csrf')){csrfReads++;return json({headerName:'X-CSRF-TOKEN',token:'synthetic-csrf'});}
  if(url.endsWith('/archive-readiness'))return json(legacyPreview);
  if(url.endsWith('/archive')){
   posts.push(options);
   if(posts.length===1)throw new TypeError('Response lost');
   return json({...legacyPreview,version:4,archived:true,canArchiveWithLegacyException:false,canReopen:true});
  }
  return json({items:[],totalElements:0});
 }));
 const onSaved=vi.fn();render(<AdminProjectLifecycle projectId={7} api={adminApi} onSaved={onSaved}/>);
 await selectLegacyArchive();await screen.findByRole('alert');expect(onSaved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Thử lưu lại'}));
 await waitFor(()=>expect(onSaved).toHaveBeenCalledTimes(1));
 expect(posts).toHaveLength(2);expect(posts[1].body).toBe(posts[0].body);expect(csrfReads).toBe(2);
 expect(JSON.parse(posts[0].body)).toEqual({expectedVersion:3,reason:'Giữ nguyên dữ liệu luồng cũ',requestKey:expect.any(String),legacyException:{acknowledged:true,snapshotFingerprint:'a'.repeat(64)}});
 for(const options of posts){expect(options.headers['X-CSRF-TOKEN']).toBe('synthetic-csrf');expect(options.credentials).toBe('same-origin');}
});
test('apiRequest integration handles snapshot 409 by reading new readiness and requiring a new opt-in',async()=>{
 const posts=[];let changed=false;let reads=0;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(url.endsWith('/auth/csrf'))return json({headerName:'X-CSRF-TOKEN',token:'synthetic-csrf'});
  if(url.endsWith('/archive-readiness')){reads++;return json({...legacyPreview,legacyExceptionFingerprint:(changed?'b':'a').repeat(64)});}
  if(url.endsWith('/archive')){
   posts.push(JSON.parse(options.body));
   if(posts.length===1){changed=true;return json({code:'LEGACY_BLOCKERS_CHANGED',message:'Snapshot đã thay đổi'},409);}
   return json({...legacyPreview,archived:true});
  }
  return json({items:[],totalElements:0});
 }));
 render(<AdminProjectLifecycle projectId={7} api={adminApi}/>);await selectLegacyArchive();await screen.findByRole('alert');
 await waitFor(()=>expect(reads).toBe(3));
 expect(await screen.findByRole('checkbox')).not.toBeChecked();expect(screen.getByLabelText('Lý do lưu trữ')).toHaveValue('Giữ nguyên dữ liệu luồng cũ');
 expect(screen.getByRole('button',{name:'Xác nhận lưu trữ'})).toBeDisabled();expect(posts).toHaveLength(1);
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));
 await waitFor(()=>expect(posts).toHaveLength(2));
 expect(posts[1].legacyException.snapshotFingerprint).toBe('b'.repeat(64));expect(posts[1].requestKey).not.toBe(posts[0].requestKey);
});
test('apiRequest integration keeps ordinary archive body free of legacyException',async()=>{
 let body;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(url.endsWith('/auth/csrf'))return json({headerName:'X-CSRF-TOKEN',token:'synthetic-csrf'});
  if(url.endsWith('/archive-readiness'))return json({...legacyPreview,canArchive:true,canArchiveWithLegacyException:false,legacyExceptionFingerprint:null,blockers:[]});
  if(url.endsWith('/archive')){body=JSON.parse(options.body);return json({...legacyPreview,archived:true});}
  return json({items:[],totalElements:0});
 }));
 render(<AdminProjectLifecycle projectId={7} api={adminApi}/>);
 await userEvent.click(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'}));await screen.findByRole('dialog');
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Lưu trữ thường'}});fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));
 await waitFor(()=>expect(body).toEqual({expectedVersion:3,reason:'Lưu trữ thường',requestKey:expect.any(String)}));
});
test('apiRequest integration shows forbidden result without success or a retry mutation',async()=>{
 let posts=0;
 vi.stubGlobal('fetch',vi.fn(async(url)=>{
  if(url.endsWith('/auth/csrf'))return json({headerName:'X-CSRF-TOKEN',token:'synthetic-csrf'});
  if(url.endsWith('/archive-readiness'))return json(legacyPreview);
  if(url.endsWith('/archive')){posts++;return json({code:'ADMIN_REQUIRED',message:'Quyền Admin đã thay đổi'},403);}
  return json({items:[],totalElements:0});
 }));
 const onSaved=vi.fn();render(<AdminProjectLifecycle projectId={7} api={adminApi} onSaved={onSaved}/>);
 await selectLegacyArchive();await screen.findByRole('alert');
 expect(screen.getByRole('button',{name:'Xác nhận lưu trữ'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Thử lưu lại'})).not.toBeInTheDocument();
 expect(screen.getByLabelText('Lý do lưu trữ')).toHaveValue('Giữ nguyên dữ liệu luồng cũ');expect(onSaved).not.toHaveBeenCalled();expect(posts).toBe(1);
});
test('apiRequest integration displays current active state when an old archive retry is replayed after reopen',async()=>{
 let posts=0;const bodies=[];
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(url.endsWith('/auth/csrf'))return json({headerName:'X-CSRF-TOKEN',token:'synthetic-csrf'});
  if(url.endsWith('/archive-readiness'))return json(legacyPreview);
  if(url.endsWith('/archive')){
   posts++;bodies.push(options.body);if(posts===1)throw new TypeError('Response lost');
   return json({...legacyPreview,version:5,archived:false,canArchiveWithLegacyException:true,latestDecision:{action:'REOPEN',actorName:'Admin 2',reason:'Mở lại sau bàn giao',decidedAt:'2026-11-03T02:00:00Z',legacyException:null}});
  }
  return json({items:[],totalElements:0});
 }));
 const onSaved=vi.fn();render(<AdminProjectLifecycle projectId={7} api={adminApi} onSaved={onSaved}/>);
 await selectLegacyArchive();await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Thử lưu lại'}));
 await screen.findByText('Dự án đang hoạt động. Có thể tiếp tục công việc theo quyền hiện hành.');
 expect(screen.queryByText('Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.')).not.toBeInTheDocument();
 expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({version:5,archived:false}));expect(bodies[1]).toBe(bodies[0]);expect(posts).toBe(2);
});

test('reload refreshes management and lifecycle after another Admin archives the project',async()=>{
 let archived=false;
 const project=()=>({id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:archived?4:3,archivedAt:archived?'2026-10-08T02:00:00Z':null,metrics:{},milestones:[],verificationBugs:[]});
 const api={project:vi.fn(async()=>project()),members:vi.fn().mockResolvedValue([]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn(async()=>({projectId:7,version:archived?4:3,archived,canArchive:!archived,canReopen:archived,blockers:[]}))};
 render(<AdminProjectDetail id="7" api={api}/>);
 expect(await screen.findByRole('button',{name:'Sửa dự án'})).toBeEnabled();
 await screen.findByRole('button',{name:'Kiểm tra lưu trữ'});
 archived=true;fireEvent.click(screen.getByRole('button',{name:'Tải lại',exact:true}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Sửa dự án'})).toBeDisabled());
 expect(await screen.findByRole('button',{name:'Mở lại dự án'})).toBeEnabled();
 expect(api.members).toHaveBeenCalledTimes(2);
 expect(screen.getByRole('button',{name:'Thêm'})).toBeDisabled();
});

test('archive refreshes the real detail, locks its edit actions and focuses the confirmed outcome',async()=>{
 let archived=false;
 const project=()=>({id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:archived?4:3,archivedAt:archived?'2026-10-08T02:00:00Z':null,metrics:{},milestones:[],verificationBugs:[]});
 const readiness=()=>({projectId:7,projectCode:'APP',projectName:'iPad',version:archived?4:3,archived,canArchive:!archived,canReopen:archived,blockers:[],asOf:'2026-10-08T02:00:00Z'});
 const api={project:vi.fn(async()=>project()),members:vi.fn().mockResolvedValue([]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn(async()=>readiness()),archiveProject:vi.fn(async()=>{archived=true;return readiness();})};
 render(<AdminProjectDetail id="7" api={api}/>);
 await userEvent.click(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'}));
 await screen.findByRole('dialog');
 fireEvent.change(screen.getByLabelText('Lý do lưu trữ'),{target:{value:'Hoàn tất bàn giao'}});
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận lưu trữ'}));
 const outcome=await screen.findByText('Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.');
 await waitFor(()=>expect(outcome).toHaveFocus());
 expect(await screen.findByRole('button',{name:'Sửa dự án'})).toBeDisabled();
 expect(await screen.findByRole('button',{name:'Mở lại dự án'})).toBeEnabled();
 expect(api.project.mock.calls.length).toBeGreaterThanOrEqual(4);
});
test('does not allow lifecycle changes to discard an open project edit',async()=>{
 const project={id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:3,archivedAt:null,metrics:{},milestones:[],verificationBugs:[]};
 const api={project:vi.fn().mockResolvedValue(project),members:vi.fn().mockResolvedValue([]),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn().mockResolvedValue({projectId:7,version:3,archived:false,canArchive:true,canReopen:false,blockers:[]})};
 render(<AdminProjectDetail id="7" api={api}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Sửa dự án'}));
 fireEvent.change(screen.getByLabelText('Tên dự án'),{target:{value:'Bản nháp chưa lưu'}});
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 expect(screen.getByLabelText('Tên dự án')).toHaveValue('Bản nháp chưa lưu');
 fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
 fireEvent.click(screen.getByRole('button',{name:'Tiếp tục soạn'}));
 expect(screen.getByLabelText('Tên dự án')).toHaveValue('Bản nháp chưa lưu');
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Hủy'}));
 fireEvent.click(screen.getByRole('button',{name:'Bỏ bản nháp'}));
 expect(screen.queryByLabelText('Tên dự án')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
});

test('member roles stay read-only and lifecycle review waits only for pending removal',async()=>{
 const project={id:7,code:'APP',name:'iPad',description:'',timezone:'UTC',version:3,archivedAt:null,metrics:{},milestones:[],verificationBugs:[]};
 const first={userId:'first',displayName:'Tester One',username:'one',systemRole:'TESTER',projectRole:'TESTER',version:1};
 const other={userId:'other',displayName:'Tester Two',username:'two',systemRole:'TESTER',projectRole:'TESTER',version:2};
 let members=[first,other];
 let failRemoval,finishRemoval;
 const api={project:vi.fn().mockResolvedValue(project),members:vi.fn(async()=>members),users:vi.fn().mockResolvedValue({items:[],totalElements:0}),archiveReadiness:vi.fn().mockResolvedValue({projectId:7,version:3,archived:false,canArchive:true,canReopen:false,blockers:[]}),removeMember:vi.fn()
  .mockImplementationOnce(()=>new Promise((resolve,reject)=>{failRemoval=reject;}))
  .mockImplementationOnce(()=>new Promise(resolve=>{finishRemoval=()=>{members=[other];resolve();};}))};
 render(<AdminProjectDetail id="7" api={api}/>);
 const firstRow=await screen.findByRole('row',{name:/Tester One · one/});
 expect(within(firstRow).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(within(firstRow).queryByRole('combobox')).not.toBeInTheDocument();
 expect(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Gỡ Tester One'}));
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Gỡ Tester Two'})).toBeDisabled();
 await act(async()=>failRemoval(new Error('Membership conflict')));
 await screen.findByText('Membership conflict');
 expect(within(await screen.findByRole('row',{name:/Tester One · one/})).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(within(screen.getByRole('row',{name:/Tester Two · two/})).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Gỡ Tester One'}));
 expect(screen.getByRole('button',{name:'Kiểm tra lưu trữ'})).toBeDisabled();
 await act(async()=>finishRemoval());
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Gỡ Tester One'})).not.toBeInTheDocument());
 const remainingRow=await screen.findByRole('row',{name:/Tester Two · two/});
 expect(within(remainingRow).getByRole('cell',{name:'TESTER'})).toBeVisible();
 expect(within(remainingRow).queryByRole('combobox')).not.toBeInTheDocument();
 expect(await screen.findByRole('button',{name:'Kiểm tra lưu trữ'})).toBeEnabled();
 expect(api.removeMember).toHaveBeenCalledWith('7','first',1);
 expect(api.removeMember).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByRole('button',{name:'Kiểm tra lưu trữ'}));
 expect(await screen.findByRole('dialog')).toBeVisible();
});
