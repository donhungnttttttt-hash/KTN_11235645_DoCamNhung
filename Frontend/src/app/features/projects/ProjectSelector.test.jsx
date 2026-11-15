import React from 'react';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import {ProjectSelector} from './ProjectSelector';
const select=vi.hoisted(()=>vi.fn());
vi.mock('./ProjectProvider',()=>({useProject:()=>({projects:[{id:1,name:'Alpha'},{id:2,name:'Beta'}],currentProject:{id:1,name:'Alpha'},selectProject:select})}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:()=>true})}));
it('puts search and creation before choices, filters and closes after selection',async()=>{
 const user=userEvent.setup();render(<ProjectSelector/>);
 const trigger=screen.getByRole('button',{name:/Dự án:/});await user.click(trigger);
 const menu=screen.getByRole('group',{name:'Chọn dự án'}),search=within(menu).getByRole('searchbox');
 expect(search.compareDocumentPosition(within(menu).getByRole('button',{name:'Alpha'}))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(within(menu).getByRole('button',{name:'Tạo dự án'}).compareDocumentPosition(within(menu).getByRole('button',{name:'Alpha'}))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 await user.type(search,'beta');expect(within(menu).queryByRole('button',{name:'Alpha'})).not.toBeInTheDocument();
 await user.click(within(menu).getByRole('button',{name:'Beta'}));expect(select).toHaveBeenCalledWith(2);expect(trigger).toHaveAttribute('aria-expanded','false');
});
