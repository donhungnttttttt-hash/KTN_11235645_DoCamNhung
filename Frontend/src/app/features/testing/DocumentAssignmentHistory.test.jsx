import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {DocumentAssignmentHistory} from './DocumentAssignmentHistory';
import {featuresApi} from '../../services/api/features';
import {projectsApi} from '../../services/api/projects';
vi.mock('../../services/api/features',()=>({featuresApi:{history:vi.fn()}}));
vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn()}}));
test('shows assignment actors and recipient changes for the actual case and pages older history',async()=>{
 projectsApi.listMembers.mockResolvedValue([{membershipId:10,displayName:'Tester A'},{membershipId:20,displayName:'Tester B'}]);
 featuresApi.history.mockResolvedValueOnce({items:[{id:9,rowId:101,actor:'PM ghi nhận',changedAt:'2026-10-19T02:00:00Z',previousMembershipId:10,newMembershipId:20}],nextBefore:9}).mockResolvedValue({items:[{id:2,rowId:101,actor:'Admin',changedAt:'2026-10-18T02:00:00Z',previousMembershipId:null,newMembershipId:10}],nextBefore:null});
 render(<DocumentAssignmentHistory projectId={1} documentId={3} rows={[{rowId:101,sourceId:'TC-Đăng nhập'}]} onClose={vi.fn()}/>);
 expect(await screen.findByRole('cell',{name:'PM ghi nhận'})).toBeInTheDocument();expect(screen.getByRole('cell',{name:'TC-Đăng nhập'})).toBeInTheDocument();expect(screen.getByRole('cell',{name:'Tester A'})).toBeInTheDocument();expect(screen.getByRole('cell',{name:'Tester B'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Xem phân công cũ hơn'}));await screen.findByRole('cell',{name:'Admin'});await waitFor(()=>expect(featuresApi.history).toHaveBeenLastCalledWith(1,3,9));expect(screen.queryByRole('button',{name:'Xem phân công cũ hơn'})).toBeNull();
});
