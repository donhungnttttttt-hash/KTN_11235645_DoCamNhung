import React from 'react';
import {expect,it,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {AdminApp} from '../features/admin/AdminApp';
const state=vi.hoisted(()=>({host:null}));
vi.mock('../features/auth/AuthProvider',()=>({useAuth:()=>({hasRole:r=>r==='ADMIN'})}));
vi.mock('../features/ai/ChatLauncherSlot',()=>({useChatLauncherHost:()=>({host:state.host})}));
vi.mock('../features/admin/AdminLayout',()=>({AdminLayout:({children})=><main>{children}</main>}));
vi.mock('../features/ai/AiAssistantPage',()=>({AdminAiPage:()=>{throw new Error('retired AI page mounted');}}));
it('retires the Admin AI bookmark and opens the existing header chat launcher',()=>{
 const host=document.createElement('div'),launcher=document.createElement('button'),open=vi.fn();launcher.setAttribute('aria-label','Mở chat AI');launcher.addEventListener('click',open);host.append(launcher);state.host=host;
 render(<AdminApp route='/admin/ai'/>);expect(screen.getByRole('heading',{name:'Cấu hình AI đã chuyển vào Chat'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Mở Chat AI'}));expect(open).toHaveBeenCalledOnce();
});
