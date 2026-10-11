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
it('uses authorized project metadata, searches only allowed targets and pins the selected source',async()=>{
 const purpose={code:'PM_ASSIGNMENT_SUGGESTION',label:'Gợi ý phân công file',target:'FILE_GROUP'};api.metadata=vi.fn().mockResolvedValue({purposes:[purpose]});api.targets=vi.fn().mockResolvedValue({items:[{id:8,label:'File test được phép'}],hasMore:true});api.chatCreate.mockImplementation(async body=>({id:1,...body}));
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án của tôi'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Nguồn / phạm vi'}));await screen.findByRole('option',{name:'Dự án của tôi'});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});await screen.findByRole('option',{name:'File test được phép'});expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Tìm nguồn chat'),{target:{value:'file test'}});fireEvent.submit(screen.getByLabelText('Tìm nguồn chat').closest('form'));await waitFor(()=>expect(api.targets).toHaveBeenLastCalledWith('1','PM_ASSIGNMENT_SUGGESTION','file test',expect.anything()));fireEvent.change(screen.getByLabelText('Nguồn dự án cho chat'),{target:{value:'8'}});fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText('Trả lời');expect(api.chatCreate).toHaveBeenCalledWith({provider:'OPENAI_API',model:'m',projectId:1,purpose:'PM_ASSIGNMENT_SUGGESTION',targetId:8},expect.anything());expect(screen.getByText(/Dự án của tôi · Gợi ý phân công file · nguồn #8/)).toBeInTheDocument();expect(screen.queryByText(/PM_ASSIGNMENT_SUGGESTION/)).toBeNull();
});
it('keeps failed questions and generates a new key only on an explicit new send',async()=>{
 api.chatSend.mockResolvedValueOnce({id:2,text:'Xin chào',state:'FAILED',failureCode:'AI_DAILY_LIMIT',provider:'OPENAI_API',content:null});mount();await open();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText(/Bạn đã đạt giới hạn chat AI hôm nay/);expect(screen.getByLabelText('Tin nhắn AI')).toHaveValue('Xin chào');expect(api.chatSend).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await screen.findByText('Trả lời');expect(api.chatSend.mock.calls[1][1].requestKey).not.toBe(api.chatSend.mock.calls[0][1].requestKey);
});
it('retries a failed chat source search without changing the keyword',async()=>{
 api.metadata=vi.fn().mockResolvedValue({purposes:[{code:'PM_ASSIGNMENT_SUGGESTION',label:'Gợi ý phân công file',target:'FILE_GROUP'}]});
 api.targets=vi.fn().mockRejectedValueOnce(Object.assign(new Error('Mất kết nối'),{code:'NETWORK_ERROR'})).mockResolvedValueOnce({items:[{id:8,label:'File đã tải lại'}],hasMore:false});
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án của tôi'}]}}/></AiProviderProvider>);
 await open();fireEvent.click(screen.getByRole('button',{name:'Nguồn / phạm vi'}));
 await screen.findByRole('option',{name:'Dự án của tôi'});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Tìm',exact:true}));
 expect(await screen.findByRole('option',{name:'File đã tải lại'})).toBeInTheDocument();
 expect(api.targets).toHaveBeenCalledTimes(2);expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('returns focus on Escape and does not close a project select dropdown on Escape',async()=>{
 mount();await open();fireEvent.click(screen.getByRole('button',{name:'Nguồn / phạm vi'}));fireEvent.keyDown(screen.getByLabelText('Phạm vi chat'),{key:'Escape'});expect(screen.getByRole('dialog')).toBeInTheDocument();fireEvent.keyDown(screen.getByLabelText('Tin nhắn AI'),{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'Mở chat AI'})).toHaveFocus();
});
it('keeps immutable thread provenance and source-specific errors after future selection changes',async()=>{
 const oldThread={...thread,provider:'CHATGPT',model:'old-model'};api.chatList.mockResolvedValue({items:[oldThread],nextBefore:null});api.chatGet.mockResolvedValue({thread:oldThread,turns:[{id:2,state:'FAILED',text:'Old question',provider:'CHATGPT',failureCode:'AI_QUOTA_EXHAUSTED'}],nextBefore:null});
 mount();await open();fireEvent.click(screen.getByRole('button',{name:'Lịch sử'}));fireEvent.click(await screen.findByRole('button',{name:/#1.*ChatGPT cá nhân/}));await screen.findByText(/Ứng dụng đã chạm giới hạn sử dụng gói ChatGPT/);fireEvent.click(screen.getByRole('button',{name:'Nguồn / phạm vi'}));fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'OLLAMA'}});expect(screen.getByText('ChatGPT cá nhân · old-model')).toBeInTheDocument();expect(screen.getByText(/Ứng dụng đã chạm giới hạn sử dụng gói ChatGPT/)).toBeInTheDocument();expect(screen.queryByText(/hết số dư API/)).toBeNull();expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeDisabled();
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
it('does not display late project metadata and creates only the newly selected scope',async()=>{
 let finish;api.metadata=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({archived:false,purposes:[{code:'TESTER_WORK_REPORT',label:'Current task',target:'NONE'}]});
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'First'},{id:2,name:'Second'}]}}/></AiProviderProvider>);await open();fireEvent.click(screen.getByRole('button',{name:'Nguồn / phạm vi'}));await screen.findByRole('option',{name:'First'});fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});await waitFor(()=>expect(api.metadata).toHaveBeenCalledWith('1',expect.anything()));fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'2'}});await screen.findByRole('option',{name:'Current task'});await act(async()=>finish({purposes:[{code:'OLD',label:'Old private task',target:'NONE'}]}));expect(screen.queryByRole('option',{name:'Old private task'})).toBeNull();fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Xin chào'}});fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));await waitFor(()=>expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:2,purpose:'TESTER_WORK_REPORT',targetId:null,provider:'OPENAI_API',model:'m'}),expect.anything()));
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
it('keeps the selected project usable when New is clicked during its metadata load',async()=>{
 const metadata=deferred();
 api.metadata=vi.fn().mockReturnValue(metadata.promise);
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án đang tải'}]}}/></AiProviderProvider>);
 await open();
 fireEvent.click(screen.getByRole('button',{name:'Nguồn / phạm vi'}));
 await screen.findByRole('option',{name:'Dự án đang tải'});
 fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});
 await waitFor(()=>expect(api.metadata).toHaveBeenCalled());
 fireEvent.click(screen.getByRole('button',{name:'Mới'}));
 await act(async()=>metadata.resolve({purposes:[{code:'TESTER_WORK_REPORT',label:'Tác vụ đã tải',target:'NONE'}]}));
 expect(screen.getByLabelText('Phạm vi chat')).toHaveValue('1');
 expect(screen.getByRole('option',{name:'Tác vụ đã tải'})).toBeInTheDocument();
 expect(screen.getByLabelText('Tác vụ cho chat')).toBeEnabled();
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nội dung dự án'}});
 expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 await waitFor(()=>expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:1,purpose:'TESTER_WORK_REPORT'}),expect.anything()));
});
it('keeps the selected project target catalog usable when New is clicked during loading',async()=>{
 const targets=deferred();
 api.metadata=vi.fn().mockResolvedValue({purposes:[{code:'TESTER_BUG_DRAFT',label:'Hoàn thiện mô tả bug',target:'TICKET'}]});
 api.targets=vi.fn().mockReturnValue(targets.promise);
 render(<AiProviderProvider api={api}><AiChat api={api} projectApi={{list:async()=>[{id:1,name:'Dự án đang tải'}]}}/></AiProviderProvider>);
 await open();
 fireEvent.click(screen.getByRole('button',{name:'Nguồn / phạm vi'}));
 await screen.findByRole('option',{name:'Dự án đang tải'});
 fireEvent.change(screen.getByLabelText('Phạm vi chat'),{target:{value:'1'}});
 await waitFor(()=>expect(api.targets).toHaveBeenCalled());
 fireEvent.click(screen.getByRole('button',{name:'Mới'}));
 await act(async()=>targets.resolve({items:[{id:8,label:'Ticket đã tải'}],hasMore:false}));
 expect(screen.getByRole('option',{name:'Ticket đã tải'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Nguồn dự án cho chat'),{target:{value:'8'}});
 fireEvent.change(screen.getByLabelText('Tin nhắn AI'),{target:{value:'Nội dung ticket'}});
 expect(screen.getByRole('button',{name:'Gửi tin nhắn'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Gửi tin nhắn'}));
 await waitFor(()=>expect(api.chatCreate).toHaveBeenCalledWith(expect.objectContaining({projectId:1,purpose:'TESTER_BUG_DRAFT',targetId:8}),expect.anything()));
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
