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
it.each(['expired','unavailable'])('clears an obsolete provider error after successful same-owner recovery from %s',async status=>{
 api.providers.mockRejectedValueOnce(Object.assign(new Error('private transport detail'),{code:'AI_UNAVAILABLE'}));
 const view=render(<AiProviderProvider api={api}><AiSourceSelector/></AiProviderProvider>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Nguồn AI chưa phản hồi');
 identity.status=status;
 view.rerender(<AiProviderProvider api={api}><AiSourceSelector/></AiProviderProvider>);
 expect(screen.queryByLabelText('Nguồn AI')).toBeNull();
 identity.status='authenticated';
 view.rerender(<AiProviderProvider api={api}><AiSourceSelector/></AiProviderProvider>);
 await screen.findByText('Đã cấu hình API · chưa xác nhận live');
 expect(screen.getByLabelText('Model AI')).toHaveValue('api-model');
 expect(screen.queryByRole('alert')).toBeNull();
 expect(screen.queryByText('private transport detail')).toBeNull();
});
it.each(['GENERATING','TIMEOUT','AI_UNAVAILABLE','AI_INTERRUPTED','AI_BUSY','AI_CREDENTIAL_STORE_FAILED'])('locks probe scope and connection mutations until an unresolved %s probe settles with its original body',async outcome=>{
 api.probe=vi.fn().mockResolvedValue({state:'READY'});
 if(outcome==='TIMEOUT')api.probe.mockRejectedValueOnce(Object.assign(new Error('private transport detail'),{code:'TIMEOUT'}));
 else if(outcome==='GENERATING')api.probe.mockResolvedValueOnce({state:'GENERATING'});
 else api.probe.mockRejectedValueOnce(Object.assign(new Error('private settlement detail'),{status:422,code:outcome}));
 api.disconnect=vi.fn();api.authorize=vi.fn();const popup=vi.spyOn(window,'open').mockReturnValue(null);
 render(<AiProviderProvider api={api}><AiSourceSelector connectionsOnly/></AiProviderProvider>);
 await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'CHATGPT'}});
 const probe=await screen.findByRole('button',{name:/Kiểm tra kết nối model/});await waitFor(()=>expect(probe).toBeEnabled());fireEvent.click(probe);
 const retry=await screen.findByRole('button',{name:/Kiểm tra lại kết nối/});await waitFor(()=>expect(retry).toBeEnabled());
 expect(screen.getByLabelText('Nguồn AI')).toBeDisabled();expect(screen.getByLabelText('Model AI')).toBeDisabled();
 for(const name of ['Ngắt kết nối','Kết nối lại ChatGPT','Đổi tài khoản ChatGPT']){const mutation=screen.getByRole('button',{name});expect(mutation).toBeDisabled();fireEvent.click(mutation);}
 fireEvent.change(screen.getByLabelText('Model AI'),{target:{value:'b'}});fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'OLLAMA'}});
 expect(screen.getByLabelText('Nguồn AI')).toHaveValue('CHATGPT');expect(screen.getByLabelText('Model AI')).toHaveValue('a');
 fireEvent.click(retry);await waitFor(()=>expect(api.probe).toHaveBeenCalledTimes(2));
 expect(api.probe.mock.calls[0][0]).toBe('c1');expect(api.probe.mock.calls[0][1]).toMatchObject({model:'a',requestKey:expect.any(String)});
 expect(api.probe.mock.calls[1].slice(0,2)).toEqual(api.probe.mock.calls[0].slice(0,2));
 await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Model AI'),{target:{value:'b'}});expect(screen.getByLabelText('Model AI')).toHaveValue('b');
 expect(api.disconnect).not.toHaveBeenCalled();expect(api.authorize).not.toHaveBeenCalled();expect(popup).not.toHaveBeenCalled();
});
it.each([{outcome:'FAILED',failureCode:'AI_INVALID_MODEL'},{outcome:'REJECTED',failureCode:'AI_INVALID_MODEL'},{outcome:'FAILED',failureCode:'AI_UNAVAILABLE'},{outcome:'FAILED',failureCode:'AI_INTERRUPTED'}])('releases a terminal $outcome $failureCode probe so a corrected model starts an explicit new request',async({outcome,failureCode})=>{
 api.probe=vi.fn().mockResolvedValue({state:'READY'});
 if(outcome==='REJECTED')api.probe.mockRejectedValueOnce(Object.assign(new Error('invalid model'),{status:422,code:failureCode}));
 else api.probe.mockResolvedValueOnce({state:'FAILED',failureCode});
 render(<AiProviderProvider api={api}><AiSourceSelector connectionsOnly/></AiProviderProvider>);
 await waitFor(()=>expect(screen.getByLabelText('Nguồn AI')).toBeEnabled());fireEvent.change(screen.getByLabelText('Nguồn AI'),{target:{value:'CHATGPT'}});
 const probe=await screen.findByRole('button',{name:/Kiểm tra kết nối model/});await waitFor(()=>expect(probe).toBeEnabled());fireEvent.click(probe);
 await waitFor(()=>expect(api.probe).toHaveBeenCalledTimes(1));await waitFor(()=>expect(screen.getByLabelText('Model AI')).toBeEnabled());
 expect(screen.queryByRole('button',{name:/Kiểm tra lại kết nối/})).toBeNull();expect(screen.getByRole('button',{name:'Ngắt kết nối'})).toBeEnabled();
 fireEvent.change(screen.getByLabelText('Model AI'),{target:{value:'b'}});fireEvent.click(screen.getByRole('button',{name:/Kiểm tra kết nối model/}));
 await waitFor(()=>expect(api.probe).toHaveBeenCalledTimes(2));expect(api.probe.mock.calls[1][1].model).toBe('b');expect(api.probe.mock.calls[1][1].requestKey).not.toBe(api.probe.mock.calls[0][1].requestKey);
});
