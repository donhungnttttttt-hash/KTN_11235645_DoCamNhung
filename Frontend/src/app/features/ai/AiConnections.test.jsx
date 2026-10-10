import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
import {AiProviderProvider,AiSourceSelector,providerReady} from './AiConnections';
import {AiWorkspace} from './AiAssistantPage';
const identity=vi.hoisted(()=>({status:'authenticated',user:{id:1}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>identity}));
let api;
beforeEach(()=>{identity.status='authenticated';identity.user={id:1};api={providers:vi.fn().mockResolvedValue({providers:[{code:'OPENAI_API',label:'API của hệ thống',available:true,models:[{id:'api-model',label:'api-model'}]},{code:'OLLAMA',label:'Ollama local',enabled:true,available:true,models:[]},{code:'CHATGPT',label:'ChatGPT cá nhân',enabled:true,available:true,models:[],connection:{id:'c1',version:1,state:'VERIFIED',verifiedModel:'a',planPermission:true}}]}),models:vi.fn().mockImplementation(code=>Promise.resolve(code==='OLLAMA'?[{id:'local-model',label:'local-model'}]:[{id:'a',label:'a'},{id:'b',label:'b'}])),metadata:vi.fn().mockResolvedValue({enabled:true,purposes:[{code:'TESTER_WORK_REPORT',label:'Báo cáo',target:'NONE'}]}),list:vi.fn().mockResolvedValue([]),generate:vi.fn().mockResolvedValue({id:1,state:'FAILED',failureCode:'AI_QUOTA_EXHAUSTED',provider:'CHATGPT'})};});
it('sends explicit selected provider and model to analysis',async()=>{
 render(<AiProviderProvider api={api}><AiWorkspace projectId={1} api={api}/></AiProviderProvider>);
 await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'OLLAMA'}});
 await waitFor(()=>expect(screen.getByLabelText('Model AI')).toHaveValue('local-model'));
 fireEvent.click(screen.getByRole('button',{name:'Phân tích'}));
 await waitFor(()=>expect(api.generate).toHaveBeenCalledWith(1,expect.objectContaining({provider:'OLLAMA',model:'local-model'}),expect.anything()));
});
it('permits connection before project selection and explicitly requests missing plan permission using the issued registration',async()=>{
 api.providers.mockResolvedValue({providers:[{code:'CHATGPT',enabled:true,available:false,connection:{id:'c1',version:1,state:'MISSING_PERMISSION',accountLabel:'n***@example.com',planPermission:false}}]});api.authorize=vi.fn().mockResolvedValue({attemptId:'attempt',authorizationUrl:'https://auth.openai.com/api/accounts/authorize?state=synthetic',state:'PENDING'});vi.spyOn(window,'open').mockReturnValue(null);
 render(<AiProviderProvider api={api}><AiWorkspace api={api}/></AiProviderProvider>);await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'CHATGPT'}});
 fireEvent.click(screen.getByRole('button',{name:'Cấp quyền dùng gói ChatGPT'}));expect(await screen.findByRole('link',{name:'Mở đăng nhập ChatGPT chính thức'})).toHaveAttribute('href',expect.stringContaining('https://auth.openai.com/'));
 expect(api.authorize).toHaveBeenCalledWith({newAccount:false,enablePlanPermission:true},expect.anything());expect(api.metadata).not.toHaveBeenCalled();expect(api.models).not.toHaveBeenCalled();
});
it('never opens an untrusted authorization fallback and hides raw diagnostics',async()=>{
 api.authorize=vi.fn().mockResolvedValue({attemptId:'attempt',authorizationUrl:'https://evil.example/?secret=raw-secret'});vi.spyOn(window,'open').mockReturnValue(null);
 render(<AiProviderProvider api={api}><AiSourceSelector connectionsOnly/></AiProviderProvider>);await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'CHATGPT'}});fireEvent.click(screen.getByRole('button',{name:'Kết nối lại ChatGPT'}));await screen.findByRole('alert');expect(screen.queryByRole('link',{name:'Mở đăng nhập ChatGPT chính thức'})).toBeNull();expect(screen.queryByText(/raw-secret|Invalid authorization/)).toBeNull();
});
it('preserves probe key and model after timeout, then refreshes exact-model readiness',async()=>{
 api.probe=vi.fn().mockRejectedValueOnce(Object.assign(new Error('secret'),{code:'TIMEOUT'})).mockResolvedValueOnce({state:'READY'});
 render(<AiProviderProvider api={api}><AiSourceSelector connectionsOnly/></AiProviderProvider>);await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'CHATGPT'}});const button=await screen.findByRole('button',{name:/Kiểm tra kết nối model/});await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);fireEvent.click(await screen.findByRole('button',{name:/Kiểm tra lại kết nối/}));await waitFor(()=>expect(api.probe).toHaveBeenCalledTimes(2));expect(api.probe.mock.calls[0][1]).toEqual(api.probe.mock.calls[1][1]);expect(api.probe.mock.calls[0][1]).toMatchObject({model:'a'});
});
it('keeps a busy connection and explains remote-revocation failure after explicit disconnect',async()=>{
 api.disconnect=vi.fn().mockRejectedValueOnce(Object.assign(new Error('raw-secret'),{code:'AI_BUSY'})).mockResolvedValueOnce({disconnected:true,remoteRevoked:false});
 render(<AiProviderProvider api={api}><AiSourceSelector connectionsOnly/></AiProviderProvider>);await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'CHATGPT'}});fireEvent.click(screen.getByRole('button',{name:'Ngắt kết nối'}));await screen.findByText(/AI đang xử lý/);expect(screen.getByRole('button',{name:'Ngắt kết nối'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Ngắt kết nối'}));await screen.findByText(/Đã xóa kết nối local/);expect(api.disconnect).toHaveBeenCalledWith('c1',1,expect.anything());expect(screen.queryByText('raw-secret')).toBeNull();
});
it('requires reachable installed Ollama models and exact current ChatGPT catalog membership',()=>{
 expect(providerReady({code:'OLLAMA',available:true},'m',{ready:false,items:[{id:'m'}]})).toBeFalsy();expect(providerReady({code:'OLLAMA',available:true},'m',{ready:true,items:[]})).toBeFalsy();expect(providerReady({code:'CHATGPT',available:true,connection:{state:'VERIFIED',verifiedModel:'m',planPermission:true}},'m',{ready:true,items:[]})).toBeFalsy();
});
it('renders markup model names as text and preserves selected unavailable model after refresh',async()=>{
 api.models.mockResolvedValue([{id:'<b>local</b>',label:'<b>local</b>'}]);render(<AiProviderProvider api={api}><AiSourceSelector connectionsOnly/></AiProviderProvider>);await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'OLLAMA'}});await waitFor(()=>expect(screen.getByLabelText('Model AI')).toHaveValue('<b>local</b>'));expect(document.querySelector('.ai-connection b')).toBeNull();api.models.mockRejectedValue(Object.assign(new Error('private-secret'),{code:'AI_UNAVAILABLE'}));fireEvent.click(screen.getByRole('button',{name:'Tải lại nguồn AI'}));await screen.findByRole('alert');expect(screen.getByLabelText('Nguồn AI')).toHaveValue('OLLAMA');expect(screen.getByLabelText('Model AI')).toHaveValue('<b>local</b>');expect(screen.queryByText('private-secret')).toBeNull();
});
it('requires a probe for the selected ChatGPT model and keeps unavailable source selected',async()=>{
 render(<AiProviderProvider api={api}><AiWorkspace projectId={1} api={api}/></AiProviderProvider>);
 fireEvent.change(await screen.findByLabelText('Nguồn AI'),{target:{value:'CHATGPT'}});
 await screen.findByRole('option',{name:'b'});fireEvent.change(screen.getByLabelText('Model AI'),{target:{value:'b'}});
 expect(screen.getByRole('button',{name:'Phân tích'})).toBeDisabled();expect(screen.getByLabelText('Nguồn AI')).toHaveValue('CHATGPT');expect(screen.getByText(/Chưa kiểm chứng model này/)).toBeInTheDocument();
});
it('discards late provider metadata after an account switch',async()=>{
 let finish;api.providers.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const view=render(<AiProviderProvider api={api}><AiSourceSelector/></AiProviderProvider>);
 identity.user={id:2};view.rerender(<AiProviderProvider api={api}><AiSourceSelector/></AiProviderProvider>);
 await screen.findByLabelText('Nguồn AI');await act(async()=>finish({providers:[{code:'CHATGPT',label:'old private identity',connection:{accountLabel:'old-private'}}]}));
 expect(screen.queryByText(/old-private|old private/)).toBeNull();
});
