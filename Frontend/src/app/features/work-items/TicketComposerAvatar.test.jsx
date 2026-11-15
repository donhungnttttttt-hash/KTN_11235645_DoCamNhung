import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import {TicketComposerAvatar} from './TicketComposerAvatar';
import {selfProfileApi} from '../../services/api/selfProfile';
const auth=vi.hoisted(()=>({user:{id:'actor',displayName:'Nguyễn An'}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>auth,initials:name=>name.split(' ').map(p=>p[0]).join('')}));
vi.mock('../../services/api/selfProfile',()=>({selfProfileApi:{get:vi.fn()},avatarUrl:p=>`/api/v1/me/avatar?v=${p.version}`}));
afterEach(()=>{vi.clearAllMocks();});
it('uses the signed-in account photo and falls back to initials if the image fails',async()=>{
 selfProfileApi.get.mockResolvedValue({id:'actor',hasAvatar:true,version:4});
 render(<TicketComposerAvatar/>);
 const avatar=screen.getByRole('img',{name:'Ảnh đại diện Nguyễn An'});
 await waitFor(()=>expect(avatar.querySelector('img')).toHaveAttribute('src','/api/v1/me/avatar?v=4'));
 fireEvent.error(avatar.querySelector('img'));expect(avatar).toHaveTextContent('NA');
 expect(avatar.querySelector('img')).toBeNull();
});
it('does not display a profile belonging to a different account',async()=>{
 selfProfileApi.get.mockResolvedValue({id:'other',hasAvatar:true,version:1});
 render(<TicketComposerAvatar/>);
 await waitFor(()=>expect(selfProfileApi.get).toHaveBeenCalled());
 expect(screen.getByRole('img',{name:'Ảnh đại diện Nguyễn An'}).querySelector('img')).toBeNull();
});
