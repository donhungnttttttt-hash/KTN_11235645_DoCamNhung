import React from 'react';
import {render,screen,fireEvent,waitFor,act,within} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
import {AiProviderProvider} from './AiConnections';
import {AiChat} from './AiChat';
import {ChatLauncherProvider,useChatLauncherSlot} from './ChatLauncherSlot';
const identity=vi.hoisted(()=>({status:'authenticated',user:{id:1}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>identity}));
let api;const thread={id:1,provider:'OPENAI_API',model:'m',projectId:null};
beforeEach(()=>{identity.status='authenticated';identity.user={id:1};api={providers:vi.fn().mockResolvedValue({providers:[{code:'OPENAI_API',label:'API của hệ thống',available:true,models:[{id:'m',label:'m'}]}]}),chatList:vi.fn().mockResolvedValue({items:[],nextBefore:null}),chatCreate:vi.fn().mockResolvedValue(thread),chatGet:vi.fn().mockResolvedValue({thread,turns:[],nextBefore:null}),chatSend:vi.fn().mockResolvedValue({id:2,text:'Xin chào',state:'READY',content:{text:'Trả lời',sources:[]},provider:'OPENAI_API'})};});
const mount=()=>render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[]}}/></AiProviderProvider>);
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});return {promise,resolve,reject};};
it('retries a failed initial project and history read without losing a typed draft or sending',async()=>{
 api.chatList.mockRejectedValueOnce(Object.assign(new Error('offline'),{code:'NETWORK_ERROR'})).mockResolvedValueOnce({items:[],nextBefore:null});
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nháp khi mất mạng'}});
 const retry=await screen.findByRole('button',{name:'Tải lại dự án và lịch sử'});
 expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();fireEvent.click(retry);
 await waitFor(()=>expect(api.chatList).toHaveBeenCalledTimes(2));await waitFor(()=>expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled());
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Nháp khi mất mạng');expect(api.chatSend).not.toHaveBeenCalled();
});
it('identifies the current conversation when returning to history',async()=>{
 api.chatList.mockResolvedValue({items:[thread],nextBefore:null});mount();await open();fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));
 fireEvent.click(await screen.findByRole('button',{name:/#1.*API/}));await waitFor(()=>expect(api.chatGet).toHaveBeenCalled());
 fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));
 expect(await screen.findByRole('button',{name:/#1.*API/})).toHaveAttribute('aria-current','true');
});
it('clears a transient reopen error when the same conversation is later revalidated successfully',async()=>{
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText('Trả lời');
 api.chatGet.mockRejectedValueOnce(Object.assign(new Error('offline'),{code:'NETWORK_ERROR'}))
  .mockResolvedValueOnce({thread,turns:[{id:2,text:'Xin chào',state:'READY',content:{text:'Trả lời',sources:[]}}],nextBefore:null});
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));await screen.findByRole('button',{name:'Tải lại hội thoại'});
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Tải lại hội thoại'})).toBeNull());expect(screen.queryByRole('alert')).toBeNull();
});
it('keeps the visible reading position when prepending older messages',async()=>{
 api.chatList.mockResolvedValue({items:[thread],nextBefore:null});
 api.chatGet.mockResolvedValueOnce({thread,turns:[{id:3,state:'READY',text:'new question',content:{text:'new answer',sources:[]}}],nextBefore:3})
  .mockResolvedValueOnce({thread,turns:[{id:2,state:'READY',text:'old question',content:{text:'old answer',sources:[]}}],nextBefore:null});
 mount();await open();fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));fireEvent.click(await screen.findByRole('button',{name:/#1.*API/}));await screen.findByText('new answer');
 const scroll=screen.getByRole('log',{name:'Tin nhắn hội thoại'}).parentElement;
 Object.defineProperty(scroll,'scrollHeight',{configurable:true,get:()=>screen.queryByText('old answer')?1600:1000});
 Object.defineProperty(scroll,'clientHeight',{configurable:true,value:300});
 scroll.scrollTop=120;fireEvent.scroll(scroll);
 fireEvent.click(screen.getByRole('button',{name:'Xem tin nhắn cũ hơn'}));await screen.findByText('old answer');
 expect(scroll.scrollTop).toBe(720);
});
it('keeps cached messages and the draft after a transient reopen failure and retries before sending',async()=>{
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText('Trả lời');
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nháp tiếp theo'}});
 api.chatGet.mockRejectedValueOnce(Object.assign(new Error('offline'),{code:'NETWORK_ERROR'}))
  .mockResolvedValueOnce({thread,turns:[{id:2,text:'Xin chào',state:'READY',content:{text:'Trả lời',sources:[]}}],nextBefore:null});
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));
 const retry=await screen.findByRole('button',{name:'Tải lại hội thoại'});
 expect(screen.getByText('Trả lời')).toBeVisible();expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Nháp tiếp theo');expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
 fireEvent.click(retry);await waitFor(()=>expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled());
 expect(screen.queryByRole('button',{name:'Tải lại hội thoại'})).toBeNull();expect(api.chatSend).toHaveBeenCalledTimes(1);
});
it.each([401,403,404])('clears cached messages when reopening returns %s rather than offering a transient retry',async status=>{
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText('Trả lời');
 api.chatGet.mockRejectedValueOnce(Object.assign(new Error('denied'),{status}));
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));
 await screen.findByRole('alert');expect(screen.queryByText('Trả lời')).toBeNull();expect(screen.queryByRole('button',{name:'Tải lại hội thoại'})).toBeNull();expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
});
it('does not render a numeric false archive flag as loose text when selecting an active project',async()=>{
 identity.user={id:1,roles:['ADMIN']};
 api.chatProjects=vi.fn().mockResolvedValue([{id:156,code:'ACTIVE',name:'Dự án hiện hành',archived:0}]);
 api.chatFeatures=vi.fn().mockResolvedValue([{id:187,name:'Feature hiện hành',archived:0}]);
 render(<AiProviderProvider api={api}><AiChat api={api}/></AiProviderProvider>);await open();
 fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));
 fireEvent.change(await screen.findByLabelText('Phạm vi chat'),{target:{value:'156'}});
 await screen.findByRole('option',{name:'Feature hiện hành'});
 const expectNoLooseArchiveZero=()=>{
  const scroll=screen.getByRole('log',{name:'Tin nhắn hội thoại'}).parentElement;
  expect([...scroll.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim()==='0')).toHaveLength(0);
  expect(screen.queryByText('Dự án đã lưu trữ. Chỉ đọc hội thoại cũ.')).toBeNull();
  expect(screen.getByText(/0\/2000$/)).toBeVisible();
 };
 expectNoLooseArchiveZero();
 fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));expectNoLooseArchiveZero();
 fireEvent.click(screen.getByRole('button',{name:'Cấu hình AI',exact:true}));expectNoLooseArchiveZero();
});
it('FR09 loads AI-authorized projects by default and offers Feature scope with whole-project default',async()=>{
 identity.user={id:1,roles:['PM']};api.chatProjects=vi.fn().mockResolvedValue([{id:9,code:'A',name:'Dự án ngoài membership',myRole:null}]);api.chatFeatures=vi.fn().mockResolvedValue([{id:42,name:'Đợt Flutter',archived:false}]);api.chatCreate.mockImplementation(async body=>({id:1,...body}));
 render(<AiProviderProvider api={api}><AiChat api={api}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));
 fireEvent.change(await screen.findByLabelText('Phạm vi chat'),{target:{value:'9'}});await screen.findByRole('option',{name:'Đợt Flutter'});expect(screen.getByLabelText('Feature cho chat')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Dự án này'}});fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');
 expect(api.chatProjects).toHaveBeenCalled();expect(api.chatFeatures).toHaveBeenCalledWith(9,expect.anything());expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:9,purpose:'PROJECT_CHAT',targetId:null}),expect.anything());
});
it('FR09 creates a Feature-targeted conversation and preserves a custom draft through scope changes',async()=>{
 api.chatFeatures=vi.fn().mockResolvedValue([{id:42,name:'Feature A'},{id:43,name:'Feature B'}]);api.chatCreate.mockImplementation(async body=>({id:1,...body}));
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án A'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));fireEvent.change(await screen.findByLabelText('Phạm vi chat'),{target:{value:'1'}});await screen.findByRole('option',{name:'Feature A'});
 fireEvent.change(screen.getByLabelText('Feature cho chat'),{target:{value:'42'}});fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Giải thích case này'}});fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');
 expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:1,targetId:42}),expect.anything());expect(screen.getByText('Dự án A · Feature A')).toBeVisible();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nháp còn giữ'}});fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));fireEvent.change(screen.getByLabelText('Feature cho chat'),{target:{value:'43'}});expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Nháp còn giữ');fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await waitFor(()=>expect(api.chatCreate).toHaveBeenCalledTimes(2));expect(api.chatCreate).toHaveBeenLastCalledWith(expect.objectContaining({targetId:43}),expect.anything());
});
it('FR09 discards a late Feature list from the previous project and does not reuse its target',async()=>{
 const old=deferred();api.chatFeatures=vi.fn().mockImplementation(project=>project===1?old.promise:Promise.resolve([{id:99,name:'Feature dự án B'}]));api.chatCreate.mockImplementation(async body=>({id:1,...body}));
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'A'},{id:2,name:'B'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));fireEvent.change(await screen.findByLabelText('Phạm vi chat'),{target:{value:'1'}});await waitFor(()=>expect(api.chatFeatures).toHaveBeenCalledWith(1,expect.anything()));
 fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'2'}});await screen.findByRole('option',{name:'Feature dự án B'});await act(async()=>old.resolve([{id:42,name:'Feature riêng A'}]));expect(screen.queryByRole('option',{name:'Feature riêng A'})).toBeNull();expect(screen.getByLabelText('Feature cho chat')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Hỏi B'}});fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:2,targetId:null}),expect.anything());
});
it.each(['TESTER','DEV'])('FR09 %s presets ask only personal file progress rather than management totals',async role=>{
 identity.user={id:1,roles:[role]};mount();await open();expect(screen.queryByRole('button',{name:'Tiến độ kiểm thử',exact:true})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Tiến độ file của tôi'}));await waitFor(()=>expect(api.chatSend).toHaveBeenCalled());expect(api.chatSend.mock.calls[0][1].text).toMatch(/file.*tôi|tôi.*file/);expect(api.chatSend.mock.calls[0][1].text).not.toMatch(/Tổng hợp tiến độ kiểm thử trong các dự án/);
});
it.each(['PM','ADMIN'])('FR09 %s keeps the management progress preset',async role=>{
 identity.user={id:1,roles:[role]};mount();await open();fireEvent.click(screen.getByRole('button',{name:'Tiến độ kiểm thử',exact:true}));await waitFor(()=>expect(api.chatSend).toHaveBeenCalled());expect(api.chatSend.mock.calls[0][1].text).toMatch(/^Tổng hợp tiến độ kiểm thử/);
});
it('FR09 retries Feature catalog failure without downgrading a selected target',async()=>{
 api.chatFeatures=vi.fn().mockRejectedValueOnce(Object.assign(new Error('unavailable'),{code:'NETWORK_ERROR'})).mockResolvedValue([{id:42,name:'Đợt A'}]);
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'A'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));fireEvent.change(await screen.findByLabelText('Phạm vi chat'),{target:{value:'1'}});
 fireEvent.click(await screen.findByRole('button',{name:'Tải lại Feature cho chat'}));await screen.findByRole('option',{name:'Đợt A'});expect(screen.getByLabelText('Feature cho chat')).toBeEnabled();
});
it('FR09 disables provider changes while a saved message is generating',async()=>{
 api.chatCreate.mockResolvedValue({...thread,purpose:'MY_PROJECTS'});api.chatSend.mockResolvedValue({id:2,text:'Hỏi',state:'GENERATING'});mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Hỏi'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByRole('button',{name:'Kiểm tra yêu cầu chat'});fireEvent.click(screen.getByRole('button',{name:'Cấu hình AI',exact:true}));expect(screen.getByLabelText('Nguồn AI')).toBeDisabled();expect(screen.getByLabelText('Model AI')).toBeDisabled();
});
it('FR09 applies provider model changes only to a future conversation',async()=>{
 api.providers.mockResolvedValue({providers:[{code:'OPENAI_API',available:true,models:[{id:'m',label:'m'},{id:'m2',label:'m2'}]}]});api.chatCreate.mockImplementation(async body=>({id:api.chatCreate.mock.calls.length,...body}));
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Câu đầu'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText('Trả lời');
 fireEvent.click(screen.getByRole('button',{name:'Cấu hình AI',exact:true}));fireEvent.change(screen.getByLabelText('Model AI'),{target:{value:'m2'}});expect(screen.getByText('API của hệ thống · m')).toBeVisible();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tiếp hội thoại cũ'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await waitFor(()=>expect(api.chatSend).toHaveBeenCalledTimes(2));expect(api.chatCreate).toHaveBeenCalledOnce();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Mới'})).toBeEnabled());fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nháp mới'}});fireEvent.click(screen.getByRole('button',{name:'Mới'}));expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Nháp mới');fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await waitFor(()=>expect(api.chatCreate).toHaveBeenCalledTimes(2));expect(api.chatCreate).toHaveBeenLastCalledWith(expect.objectContaining({model:'m2'}),expect.anything());
});
it('FR09 restores pinned project and Feature from history without losing the draft',async()=>{
 const saved={...thread,projectId:1,targetId:42,purpose:'PROJECT_CHAT'};api.chatList.mockResolvedValue({items:[saved],nextBefore:null});api.chatGet.mockResolvedValue({thread:saved,turns:[],nextBefore:null});api.chatFeatures=vi.fn().mockResolvedValue([{id:42,name:'Feature lịch sử'}]);
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án A'}]}}/></AiProviderProvider>);await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nháp của tôi'}});fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));fireEvent.click(await screen.findByRole('button',{name:/#1.*API/}));await screen.findByText('Dự án A · Feature lịch sử');fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));
 expect(screen.getByLabelText('Phạm vi chat')).toHaveValue('1');expect(screen.getByLabelText('Feature cho chat')).toHaveValue('42');expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Nháp của tôi');expect(api.chatCreate).not.toHaveBeenCalled();
});
it('FR09 opens connection recovery in chat without old AI menu links',async()=>{
 api.providers.mockResolvedValue({providers:[{code:'OPENAI_API',available:false,models:[]}]});mount();await open();fireEvent.click(await screen.findByRole('button',{name:'Mở cấu hình AI'}));expect(screen.getByLabelText('Nguồn AI')).toBeVisible();expect(document.querySelector('a[href="#/ai"],a[href="#/admin/ai"]')).toBeNull();
});
it('opens AI configuration inside chat and preserves the draft and pinned conversation',async()=>{
 api.chatCreate.mockResolvedValue({...thread,purpose:'MY_PROJECTS'});
 mount();await open();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Câu hỏi'}});
 fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText('Trả lời');
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nháp tiếp'}});
 fireEvent.click(screen.getByRole('button',{name:'Cấu hình AI',exact:true}));
 expect(screen.getByLabelText('Nguồn AI')).toBeInTheDocument();
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Nháp tiếp');
 expect(screen.getByText(/Hội thoại #1/)).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Mở thiết lập AI'})).toBeNull();
});
it('uses only project scope with no task or source controls and sends selected project context automatically',async()=>{
 api.metadata=vi.fn().mockResolvedValue({purposes:[{code:'TESTER_WORK_REPORT',label:'Old task',target:'NONE'}]});api.targets=vi.fn();api.chatCreate.mockImplementation(async body=>({id:1,...body}));
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án A'},{id:2,name:'Dự án B'}]}}/></AiProviderProvider>);await open();
 fireEvent.click(screen.getByRole('button',{name:/^(Nguồn \/ phạm vi|Phạm vi chat)$/}));await screen.findByRole('option',{name:'Dự án A'});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});await act(async()=>{});
 expect(screen.queryByLabelText('Tác vụ cho chat')).toBeNull();expect(screen.queryByLabelText('Tìm nguồn chat')).toBeNull();expect(screen.queryByLabelText('Nguồn dự án cho chat')).toBeNull();expect(screen.queryByLabelText('Nguồn AI')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/^(Nguồn \/ phạm vi|Phạm vi chat)$/}));
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tiến độ dự án này thế nào?'}});fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');
 expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:1,purpose:'PROJECT_CHAT',targetId:null}),expect.anything());expect(api.metadata).not.toHaveBeenCalled();expect(api.targets).not.toHaveBeenCalled();
});
it('sends project-specific presets without requiring a file or ticket',async()=>{
 api.chatCreate.mockImplementation(async body=>({id:1,...body}));api.metadata=vi.fn().mockResolvedValue({purposes:[{code:'TESTER_WORK_REPORT',label:'Old task',target:'NONE'}]});
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án A'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:/^(Nguồn \/ phạm vi|Phạm vi chat)$/}));await screen.findByRole('option',{name:'Dự án A'});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:/^(Nguồn \/ phạm vi|Phạm vi chat)$/}));
 fireEvent.click(await screen.findByRole('button',{name:'Phần việc trong dự án'}));await screen.findByText('Trả lời');expect(api.chatSend.mock.calls[0][1].text).toContain('dự án đang chọn');expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:1,purpose:'PROJECT_CHAT',targetId:null}),expect.anything());
});
it('New leaves history and returns to the scope selector while preserving a custom draft',async()=>{
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Câu hỏi mới'}});fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));expect(screen.getByRole('heading',{name:'Hội thoại của bạn'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Mới'}));expect(screen.queryByRole('heading',{name:'Hội thoại của bạn'})).toBeNull();expect(screen.getByLabelText('Phạm vi chat')).toBeInTheDocument();expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Câu hỏi mới');
});
it('keeps a legacy general thread sendable after an archived project was selected for a future chat',async()=>{
 api.chatList.mockResolvedValue({items:[thread],nextBefore:null});
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án lưu trữ',archived:true}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));await screen.findByRole('option',{name:'Dự án lưu trữ'});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Hỏi tiếp'}});expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));fireEvent.click(await screen.findByRole('button',{name:/#1.*API của hệ thống/}));await waitFor(()=>expect(api.chatGet).toHaveBeenCalled());await waitFor(()=>expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled());
});
it.each([
 ['Dự án tôi tham gia','Tôi đang tham gia những dự án nào? Tóm tắt tên và vai trò của tôi trong từng dự án.'],
 ['Tiến độ file của tôi','Cho tôi biết tiến độ những file và phạm vi case tôi được giao trong các dự án được phép. Nêu Status còn lại và dữ liệu chưa có.'],
 ['Việc và case còn lại','Tôi còn công việc và test case nào cần thực hiện trong các dự án của mình? Phân nhóm theo dự án và nêu giới hạn danh sách.'],
 ['Bug cần xử lý','Những Bug/QA nào đang được giao cho tôi cần ưu tiên xử lý? Dựa vào trạng thái và độ ưu tiên đã ghi, không suy đoán hạn chưa có.'],
])('sends preset %s immediately once and displays progress before thread creation finishes',async(label,question)=>{
 const creation=deferred(),reply=deferred();api.chatCreate.mockReturnValueOnce(creation.promise);api.chatSend.mockReturnValueOnce(reply.promise);
 mount();await open();expect(screen.getByText('Các dự án của tôi')).toBeInTheDocument();
 const preset=screen.getByRole('button',{name:label,exact:true});await waitFor(()=>expect(preset).toBeEnabled());
 expect(api.chatCreate).not.toHaveBeenCalled();expect(api.chatSend).not.toHaveBeenCalled();
 fireEvent.click(preset);
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('');
 expect(within(screen.getByRole('log')).getByText(question)).toBeInTheDocument();expect(screen.getByText('AI đang trả lời…')).toBeInTheDocument();
 expect(preset).toBeDisabled();fireEvent.click(preset);expect(api.chatCreate).toHaveBeenCalledTimes(1);
 expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:null,purpose:'MY_PROJECTS',targetId:null}),expect.anything());
 await act(async()=>creation.resolve({...thread,purpose:'MY_PROJECTS'}));await waitFor(()=>expect(api.chatSend).toHaveBeenCalledTimes(1));
 expect(api.chatSend.mock.calls[0][1].text).toBe(question);expect(preset).toBeDisabled();
 await act(async()=>reply.resolve({id:2,text:question,state:'READY',content:{text:'Trả lời',sources:[]}}));
 expect(screen.getByText('Trả lời')).toBeInTheDocument();expect(within(screen.getByRole('log')).getAllByText(question)).toHaveLength(1);
 expect(preset).toBeEnabled();expect(api.chatSend).toHaveBeenCalledTimes(1);
});
it('sends a preset while preserving an unsent custom draft and allows sending that draft afterward',async()=>{
 const reply=deferred();api.chatCreate.mockResolvedValue({...thread,purpose:'MY_PROJECTS'});api.chatSend.mockReturnValueOnce(reply.promise);
 mount();await open();const preset=screen.getByRole('button',{name:'Tiến độ file của tôi'});await waitFor(()=>expect(preset).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Câu hỏi đang soạn'}});fireEvent.click(preset);
 await waitFor(()=>expect(api.chatSend).toHaveBeenCalledTimes(1));
 const question=api.chatSend.mock.calls[0][1].text;expect(question).toMatch(/^Cho tôi biết tiến độ những file/);
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Câu hỏi đang soạn');
 await act(async()=>reply.resolve({id:2,text:question,state:'READY',content:{text:'Tiến độ',sources:[]}}));
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Câu hỏi đang soạn');
 fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');
 expect(api.chatSend).toHaveBeenCalledTimes(2);expect(api.chatSend.mock.calls[1][1].text).toBe('Câu hỏi đang soạn');expect(api.chatCreate).toHaveBeenCalledTimes(1);
});
it('keeps an uncertain preset request retryable with the same key and preserves a newer draft',async()=>{
 api.chatCreate.mockResolvedValue({...thread,purpose:'MY_PROJECTS'});
 api.chatSend.mockRejectedValueOnce(Object.assign(new Error('timeout'),{code:'TIMEOUT'})).mockImplementationOnce(async(id,body)=>({id:2,text:body.text,state:'READY',content:{text:'Đã nhận gợi ý',sources:[]}}));
 mount();await open();const preset=screen.getByRole('button',{name:'Bug cần xử lý'});await waitFor(()=>expect(preset).toBeEnabled());fireEvent.click(preset);
 const retry=await screen.findByRole('button',{name:'Kiểm tra yêu cầu chat'});await waitFor(()=>expect(retry).toBeEnabled());
 expect(preset).toBeDisabled();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nháp mới'}});fireEvent.click(retry);await screen.findByText('Đã nhận gợi ý');
 expect(api.chatSend.mock.calls[0][1]).toEqual(api.chatSend.mock.calls[1][1]);expect(api.chatCreate).toHaveBeenCalledTimes(1);
 expect(within(screen.getByRole('log')).getAllByText(api.chatSend.mock.calls[0][1].text)).toHaveLength(1);expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Nháp mới');
});
it('disables preset sends when the selected provider is unavailable',async()=>{
 api.providers.mockResolvedValue({providers:[{code:'OPENAI_API',available:false,models:[{id:'m',label:'m'}]}]});
 mount();await open();await screen.findByText(/chưa sẵn sàng/);
 const preset=screen.getByRole('button',{name:'Dự án tôi tham gia'});expect(preset).toBeDisabled();fireEvent.click(preset);
 expect(api.chatCreate).not.toHaveBeenCalled();expect(api.chatSend).not.toHaveBeenCalled();expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('');
});
it('defaults back to all permitted projects when no individual project is selected',async()=>{
 api.chatCreate.mockImplementation(async body=>({id:1,...body}));render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án A'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));await screen.findByRole('option',{name:'Dự án A'});expect(screen.queryByRole('option',{name:'Trao đổi chung'})).toBeNull();
 fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'MY_PROJECTS'}});fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tổng hợp tất cả'}});fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:null,purpose:'MY_PROJECTS',targetId:null}),expect.anything());
});
it('shows the submitted question and clears the composer before thread creation finishes',async()=>{
 const creation=deferred(),reply=deferred();api.chatCreate.mockReturnValueOnce(creation.promise);api.chatSend.mockReturnValueOnce(reply.promise);
 mount();await open();const input=screen.getByLabelText('Tin nhắn AI');fireEvent.change(input,{target:{value:'Chào AI'}});
 fireEvent.keyDown(input,{key:'Enter'});
 expect(input).toHaveValue('');expect(within(screen.getByRole('log')).getByText('Chào AI')).toBeInTheDocument();expect(screen.getByText('AI đang trả lời…')).toBeInTheDocument();
 fireEvent.keyDown(input,{key:'Enter'});expect(api.chatCreate).toHaveBeenCalledTimes(1);
 await act(async()=>creation.resolve(thread));await waitFor(()=>expect(api.chatSend).toHaveBeenCalledTimes(1));
 fireEvent.change(input,{target:{value:'Chào AI'}});
 await act(async()=>reply.resolve({id:2,text:'Chào AI',state:'READY',content:{text:'Xin chào bạn',sources:[]}}));
 expect(input).toHaveValue('Chào AI');expect(within(screen.getByRole('log')).getAllByText('Chào AI')).toHaveLength(1);expect(screen.queryByText('AI đang trả lời…')).toBeNull();
});
it.each([{code:'TIMEOUT'},{code:'NETWORK_ERROR'},{status:503}])('keeps one visible submitted question and the same key after an uncertain send %j',async failure=>{
 api.chatSend.mockRejectedValueOnce(Object.assign(new Error('uncertain'),failure)).mockResolvedValueOnce({id:2,text:'Tin đã gửi',state:'READY',content:{text:'Đã nhận',sources:[]}});
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tin đã gửi'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 await screen.findByRole('button',{name:'Kiểm tra yêu cầu chat'});await waitFor(()=>expect(screen.getByRole('button',{name:'Kiểm tra yêu cầu chat'})).toBeEnabled());
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('');expect(within(screen.getByRole('log')).getAllByText('Tin đã gửi')).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Bản nháp tiếp'}});fireEvent.click(screen.getByRole('button',{name:'Kiểm tra yêu cầu chat'}));await screen.findByText('Đã nhận');
 expect(api.chatSend.mock.calls[0][1]).toEqual(api.chatSend.mock.calls[1][1]);expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Bản nháp tiếp');expect(within(screen.getByRole('log')).getAllByText('Tin đã gửi')).toHaveLength(1);
});
it('restores a rejected unsaved message without overwriting a newer draft',async()=>{
 const creation=deferred();api.chatCreate.mockReturnValueOnce(creation.promise);
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tin chưa lưu'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('');
 await act(async()=>creation.reject(Object.assign(new Error('invalid'),{code:'AI_INVALID_INPUT'})));
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Tin chưa lưu');expect(api.chatSend).not.toHaveBeenCalled();expect(within(screen.getByRole('log')).queryByText('Tin chưa lưu')).toBeNull();
});
it('places the chat launcher in a registered header slot',()=>{
 function HeaderSlot(){const register=useChatLauncherSlot();return <header><div data-testid="chat-slot" ref={register}/></header>;}
 render(<ChatLauncherProvider><AiProviderProvider api={api}><HeaderSlot/><AiChat api={api} projectApi={{list:async()=>[]}}/></AiProviderProvider></ChatLauncherProvider>);
 expect(within(screen.getByTestId('chat-slot')).getByRole('button',{name:'Mở chat AI'})).toBeInTheDocument();
});
async function open(){fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));await screen.findByLabelText('Tin nhắn AI');await waitFor(()=>expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled());}
it('preserves unsent text on minimize, Shift+Enter and composing Enter; Enter sends',async()=>{
 mount();await open();const input=screen.getByLabelText('Tin nhắn AI');fireEvent.change(input,{target:{value:'Xin chào'}});fireEvent.keyDown(input,{key:'Enter',shiftKey:true});fireEvent.keyDown(input,{key:'Enter',isComposing:true});expect(api.chatSend).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Xin chào');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled());fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');expect(api.chatSend).toHaveBeenCalledTimes(1);
});

it('keeps failed questions and resends only explicitly with a new key, preserving the next draft',async()=>{
 api.chatSend.mockResolvedValueOnce({id:2,text:'Xin chào',state:'FAILED',failureCode:'AI_INVALID_RESPONSE',provider:'OPENAI_API',content:null}).mockResolvedValueOnce({id:3,text:'Xin chào',state:'READY',content:{text:'Trả lời',sources:[]}});
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 await screen.findByText(/Kết quả AI không hợp lệ/);expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('');expect(api.chatSend).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Bản nháp tiếp theo'}});fireEvent.click(screen.getByRole('button',{name:'Gửi lại tin nhắn'}));await screen.findByText('Trả lời');
 expect(api.chatSend.mock.calls[1][1].requestKey).not.toBe(api.chatSend.mock.calls[0][1].requestKey);expect(api.chatSend.mock.calls[1][1].text).toBe('Xin chào');expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Bản nháp tiếp theo');
});
it('keeps a rejected unsaved question available beside a newer draft',async()=>{
 const creation=deferred();api.chatCreate.mockReturnValueOnce(creation.promise);
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Câu đầu'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Bản nháp khác'}});await act(async()=>creation.reject(Object.assign(new Error('limit'),{code:'AI_DAILY_LIMIT'})));
 expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Bản nháp khác');expect(within(screen.getByRole('log')).getByText('Câu đầu')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Gửi lại tin nhắn'}));await screen.findByText('Trả lời');expect(api.chatSend.mock.calls[0][1].text).toBe('Câu đầu');expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Bản nháp khác');
});

it('returns focus on Escape and does not close a project select dropdown on Escape',async()=>{
 mount();await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));fireEvent.keyDown(screen.getByLabelText('Phạm vi chat'),{key:'Escape'});expect(screen.getByRole('dialog')).toBeInTheDocument();fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'Mở chat AI'})).toHaveFocus();
});
it('reads legacy thread provenance and source-specific errors without exposing removed source selectors',async()=>{
 const oldThread={...thread,provider:'CHATGPT',model:'old-model',projectId:1,purpose:'TESTER_BUG_DRAFT',targetId:8};api.chatList.mockResolvedValue({items:[oldThread],nextBefore:null});api.chatGet.mockResolvedValue({thread:oldThread,turns:[{id:2,state:'FAILED',text:'Old question',provider:'CHATGPT',failureCode:'AI_QUOTA_EXHAUSTED'}],nextBefore:null});
 mount();await open();fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));fireEvent.click(await screen.findByRole('button',{name:/#1.*ChatGPT cá nhân/}));await screen.findByText(/Ứng dụng đã chạm giới hạn sử dụng gói ChatGPT/);fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));expect(screen.getByText('ChatGPT cá nhân · old-model')).toBeInTheDocument();expect(screen.queryByLabelText('Nguồn AI')).toBeNull();expect(screen.queryByLabelText('Tác vụ cho chat')).toBeNull();expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
});
it('reads accessible history after disconnect, renders text safely, copies only READY output and reports truncation',async()=>{
 api.providers.mockResolvedValue({providers:[{code:'OPENAI_API',available:false,models:[{id:'m',label:'m'}]}]});api.chatList.mockResolvedValue({items:[thread],nextBefore:null});api.chatGet.mockResolvedValue({thread,turns:[{id:2,text:'<img src=x>',state:'READY',provider:'OPENAI_API',model:'m',content:{text:'<script>safe text</script>',sources:[{ref:'ref',label:'<b>source</b>',path:'/unused'}]},contextTruncated:true}],nextBefore:null});const writeText=vi.fn().mockResolvedValue();Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true});
 mount();await open();fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));fireEvent.click(await screen.findByRole('button',{name:/#1.*API/}));await screen.findByText('<script>safe text</script>');expect(document.querySelector('.ai-chat script,.ai-chat img')).toBeNull();expect(screen.getByText(/Ngữ cảnh đã được rút gọn/)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Sao chép câu trả lời'}));await waitFor(()=>expect(writeText).toHaveBeenCalledWith('<script>safe text</script>'));expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
});
it('continues an empty filtered history page and loads older turns without duplication',async()=>{
 api.chatList.mockResolvedValueOnce({items:[],nextBefore:50}).mockResolvedValueOnce({items:[thread],nextBefore:null});api.chatGet.mockResolvedValueOnce({thread,turns:[{id:3,state:'READY',text:'new question',content:{text:'new answer',sources:[]}}],nextBefore:3}).mockResolvedValueOnce({thread,turns:[{id:2,state:'READY',text:'old question',content:{text:'old answer',sources:[]}}],nextBefore:null});
 mount();await open();fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));fireEvent.click(await screen.findByRole('button',{name:'Xem hội thoại cũ hơn'}));fireEvent.click(await screen.findByRole('button',{name:/#1.*API/}));await screen.findByText('new answer');fireEvent.click(screen.getByRole('button',{name:'Xem tin nhắn cũ hơn'}));await screen.findByText('old answer');expect(api.chatList).toHaveBeenLastCalledWith(50,expect.anything());expect(api.chatGet).toHaveBeenLastCalledWith(1,3,expect.anything());expect(screen.getAllByText('new answer')).toHaveLength(1);
});
it('keeps the exact admitted request during pending polling and preserves text typed while busy',async()=>{
 let finish;api.chatSend.mockResolvedValueOnce({id:2,text:'Xin chào',state:'GENERATING',content:null}).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));fireEvent.click(await screen.findByRole('button',{name:'Kiểm tra yêu cầu chat'}));await waitFor(()=>expect(api.chatSend).toHaveBeenCalledTimes(2));fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tin tiếp theo'}});await act(async()=>finish({id:2,text:'Xin chào',state:'READY',content:{text:'Done',sources:[]}}));expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Tin tiếp theo');expect(api.chatSend.mock.calls[0][1]).toEqual(api.chatSend.mock.calls[1][1]);
});
it('uses only the newly selected project after scope switches and preserves the draft',async()=>{
 api.chatCreate.mockImplementation(async body=>({id:1,...body}));api.metadata=vi.fn();api.targets=vi.fn();
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'First'},{id:2,name:'Second'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Phạm vi chat'}));await screen.findByRole('option',{name:'First'});fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Câu hỏi riêng'}});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'2'}});expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Câu hỏi riêng');await waitFor(()=>expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled());fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Enter'});await screen.findByText('Trả lời');expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:2,purpose:'PROJECT_CHAT',targetId:null}),expect.anything());expect(api.metadata).not.toHaveBeenCalled();expect(api.targets).not.toHaveBeenCalled();
});
it('keeps unsent same-owner draft behind an expired session and reauthorizes history on reopen',async()=>{
 const view=mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Unsent'}});identity.status='expired';const props={api,projectApi:{list:async()=>[]}};view.rerender(<AiProviderProvider api={api}><AiChat {...props}/></AiProviderProvider>);expect(screen.queryByLabelText('Tin nhắn AI')).toBeNull();identity.status='authenticated';view.rerender(<AiProviderProvider api={api}><AiChat {...props}/></AiProviderProvider>);fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Unsent');await waitFor(()=>expect(api.chatList).toHaveBeenCalledTimes(2));
});
it('reuses exact request key after timeout and denies expired source without losing draft',async()=>{
 api.chatSend.mockRejectedValueOnce(Object.assign(new Error('timeout'),{code:'TIMEOUT'})).mockRejectedValueOnce(Object.assign(new Error('gone'),{status:404}));
 mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 fireEvent.click(await screen.findByRole('button',{name:'Kiểm tra yêu cầu chat'}));await screen.findByText(/không còn truy cập/);
 expect(api.chatSend.mock.calls[0][1]).toEqual(api.chatSend.mock.calls[1][1]);expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Xin chào');expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
});
it('ignores old owner responses and hides expired session while preserving inaccessible draft',async()=>{
 let finish;api.chatSend.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const view=mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Private'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await waitFor(()=>expect(api.chatSend).toHaveBeenCalled());
 identity.status='expired';view.rerender(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[]}}/></AiProviderProvider>);expect(screen.queryByRole('button',{name:'Mở chat AI'})).toBeNull();
 identity.status='authenticated';identity.user={id:2};view.rerender(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[]}}/></AiProviderProvider>);await act(async()=>finish({id:2,state:'READY',content:{text:'Private answer',sources:[]}}));expect(screen.queryByText('Private answer')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('');
});
it('keeps the initial authorized project list usable when New is clicked during loading',async()=>{
 const projects=deferred();
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:()=>projects.promise}}/></AiProviderProvider>);
 await open();
 fireEvent.click(screen.getByRole('button',{name:'Mới'}));
 await act(async()=>projects.resolve([{id:1,name:'Dự án đang tải'}]));
 expect(screen.getByRole('option',{name:'Dự án đang tải'})).toBeInTheDocument();
 expect(screen.getByLabelText('Phạm vi chat')).toBeEnabled();
});


it('waits for reopened thread detail as well as project/history reads before accepting a new send',async()=>{
 const detail=deferred();
 mount();await open();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});
 fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 await screen.findByText('Trả lời');
 api.chatGet.mockReturnValueOnce(detail.promise);
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));
 fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));
 await waitFor(()=>expect(api.chatGet).toHaveBeenCalled());
 await act(async()=>{});
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tin tiếp theo'}});
 expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
 await act(async()=>detail.resolve({thread,turns:[{id:2,text:'Xin chào',state:'READY',content:{text:'Trả lời',sources:[]}}],nextBefore:null}));
 expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled();
});
it.each(['empty','GENERATING'])('does not let a reopened %s snapshot overwrite a send that completed READY',async snapshot=>{
 const detail=deferred(),send=deferred();
 api.chatSend.mockReturnValueOnce(send.promise);
 mount();await open();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});
 fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 await waitFor(()=>expect(api.chatSend).toHaveBeenCalled());
 api.chatGet.mockReturnValueOnce(detail.promise);
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));
 fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));
 await waitFor(()=>expect(api.chatGet).toHaveBeenCalled());
 await act(async()=>send.resolve({id:2,text:'Xin chào',state:'READY',content:{text:'Câu trả lời mới nhất',sources:[]},provider:'OPENAI_API'}));
 expect(screen.getByText('Câu trả lời mới nhất')).toBeInTheDocument();
 await act(async()=>detail.resolve({thread,turns:snapshot==='empty'?[]:[{id:2,text:'Xin chào',state:'GENERATING',content:null}],nextBefore:null}));
 expect(screen.getByText('Câu trả lời mới nhất')).toBeInTheDocument();
 expect(screen.queryByText('Đang xử lý yêu cầu đã lưu…')).toBeNull();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Tin tiếp theo'}});
 expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled();
});
it('does not let an older authorized reopen snapshot restore content after newer source denial',async()=>{
 const detail=deferred(),send=deferred();
 api.chatSend.mockReturnValueOnce(send.promise);
 mount();await open();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});
 fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 await waitFor(()=>expect(api.chatSend).toHaveBeenCalled());
 api.chatGet.mockReturnValueOnce(detail.promise);
 fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ chat'}));
 fireEvent.click(screen.getByRole('button',{name:'Mở chat AI'}));
 await waitFor(()=>expect(api.chatGet).toHaveBeenCalled());
 await act(async()=>send.reject(Object.assign(new Error('Source denied'),{status:404})));
 expect(screen.getByText(/không còn truy cập/)).toBeInTheDocument();
 await act(async()=>detail.resolve({thread,turns:[{id:2,text:'Old question',state:'READY',content:{text:'Old private snapshot',sources:[]}}],nextBefore:null}));
 expect(screen.queryByText('Old private snapshot')).toBeNull();
 expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
});
