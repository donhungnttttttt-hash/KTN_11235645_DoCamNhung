import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ProjectSettingsPage } from './ProjectSettingsPage';
import { ProjectMembers } from './ProjectMembers';
import { HandbookPanel } from './HandbookPanel';
import { RulesPanel } from './RulesPanel';
import { projectsApi } from '../../services/api/projects';
let project;
let admin=false;
const refresh=vi.fn();
vi.mock('./ProjectProvider',()=>({useProject:()=>({currentProject:project,refreshProjects:refresh})}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({hasRole:role=>admin&&role==='ADMIN'})}));
vi.mock('../../services/api/projects',()=>({projectsApi:{get:vi.fn(),update:vi.fn(),listMembers:vi.fn(),memberCandidate:vi.fn(),addMember:vi.fn(),removeMember:vi.fn(),listHandbook:vi.fn(),getHandbook:vi.fn(),createHandbook:vi.fn(),addRevision:vi.fn(),listRules:vi.fn(),listRuleVersions:vi.fn(),createRuleset:vi.fn(),createRuleVersion:vi.fn(),publishRule:vi.fn()}}));
const member={userId:'tester',displayName:'Lan',username:'lan',projectRole:'TESTER',version:4};
const revision={id:7,revisionNo:1,contentHtml:'<img src=x onerror=alert(1)>',createdAt:'2026-09-30T00:00:00Z',editedBy:1};
const document={id:1,code:'GUIDE',name:'Hướng dẫn A',currentRevision:revision,history:[revision]};
const version={id:11,versionNo:1,contentJson:JSON.stringify({sourceReference:'ADR-006',titlePrefix:'[QA]'}),createdAt:'2026-09-30T00:00:00Z',createdBy:1};
beforeEach(()=>{
  vi.resetAllMocks();admin=false;project={id:1,code:'A',name:'Dự án A',projectRole:'PM'};
  projectsApi.get.mockResolvedValue({...project,timezone:'Asia/Ho_Chi_Minh',version:3});projectsApi.listMembers.mockResolvedValue([member]);
  projectsApi.listHandbook.mockResolvedValue([document]);projectsApi.getHandbook.mockResolvedValue(document);
  projectsApi.listRules.mockResolvedValue([{id:1,code:'INTERNAL_DEMO',activeVersion:null}]);projectsApi.listRuleVersions.mockResolvedValue([version]);
});
it('loads the latest project version and submits only the displayed version',async()=>{
  projectsApi.update.mockResolvedValue({version:4});render(<ProjectSettingsPage/>);
  fireEvent.change(await screen.findByLabelText('Tên dự án'),{target:{value:'Tên mới'}});fireEvent.click(screen.getByRole('button',{name:'Lưu thay đổi'}));
  await screen.findByText('Đã lưu thông tin dự án.');expect(projectsApi.update).toHaveBeenCalledWith(1,{name:'Tên mới',description:'',timezone:'Asia/Ho_Chi_Minh',expectedVersion:3});expect(refresh).toHaveBeenCalled();
});
it('keeps general edits after conflict and allows explicitly reloading',async()=>{
  projectsApi.update.mockRejectedValue(new Error('Phiên bản cũ'));render(<ProjectSettingsPage/>);
  fireEvent.change(await screen.findByLabelText('Tên dự án'),{target:{value:'Bản nháp'}});fireEvent.click(screen.getByRole('button',{name:'Lưu thay đổi'}));await screen.findByRole('alert');expect(screen.getByLabelText('Tên dự án')).toHaveValue('Bản nháp');
  fireEvent.click(screen.getByRole('button',{name:'Tải lại thông tin'}));await waitFor(()=>expect(screen.getByLabelText('Tên dự án')).toHaveValue('Dự án A'));
});
it('hides write actions from a tester and handles an empty project',async()=>{
  project={...project,projectRole:'TESTER'};const view=render(<ProjectSettingsPage/>);expect(await screen.findByLabelText('Tên dự án')).toBeDisabled();expect(screen.queryByText('Lưu thay đổi')).toBeNull();
  view.rerender(<ProjectSettingsPage activeRoute='/settings/members'/>);await screen.findByText('Lan');expect(screen.queryByText('Thêm thành viên')).toBeNull();
  project=null;view.rerender(<ProjectSettingsPage/>);expect(screen.getByText('Vui lòng chọn một dự án.')).toBeVisible();
});
it('sends Admin to centralized membership management and keeps the project list read-only',async()=>{
  admin=true;render(<ProjectSettingsPage activeRoute='/settings/members'/>);
  await screen.findByText('Lan');
  expect(screen.getByRole('link',{name:'Quản lý thành viên tại khu Admin'})).toHaveAttribute('href','#/admin/projects/1');
  expect(screen.queryByRole('button',{name:'Thêm thành viên'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Sửa vai trò Lan'})).not.toBeInTheDocument();
});
it('keeps PM membership settings read-only without an Admin management link',async()=>{
  render(<ProjectSettingsPage activeRoute='/settings/members'/>);
  await screen.findByText('Lan');
  expect(screen.queryByRole('link',{name:'Quản lý thành viên tại khu Admin'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Thêm thành viên'})).not.toBeInTheDocument();
});
it('remounts settings when changing project and ignores the previous response',async()=>{
  let resolve;projectsApi.get.mockReturnValueOnce(new Promise(r=>{resolve=r;}));const view=render(<ProjectSettingsPage/>);
  project={...project,id:2,name:'Dự án B'};projectsApi.get.mockResolvedValue({...project,timezone:'UTC',version:0});view.rerender(<ProjectSettingsPage/>);
  await screen.findByDisplayValue('Dự án B');await act(async()=>resolve({name:'Dự án cũ',timezone:'UTC',version:0}));expect(screen.queryByDisplayValue('Dự án cũ')).toBeNull();
});
it('opens settings from deep links and follows route changes without duplicate tabs',async()=>{
  const view=render(<ProjectSettingsPage activeRoute='/settings/rules'/>);
  await screen.findByText('Lịch sử phiên bản');
  expect(screen.queryByRole('navigation',{name:'Cài đặt dự án'})).not.toBeInTheDocument();
  view.rerender(<ProjectSettingsPage activeRoute='/settings/handbook'/>);
  await screen.findByRole('button',{name:'Hướng dẫn A · v1'});
  view.rerender(<ProjectSettingsPage activeRoute='/settings'/>);
  await screen.findByLabelText('Tên dự án');
});
it('looks up an existing account and restores membership using its returned version',async()=>{
  projectsApi.memberCandidate.mockResolvedValue({...member,membershipVersion:8});projectsApi.addMember.mockResolvedValue(member);
  render(<ProjectMembers projectId={1} canEdit/>);fireEvent.click(screen.getByText('Thêm thành viên'));
  fireEvent.change(screen.getByLabelText('Tên đăng nhập'),{target:{value:'lan'}});fireEvent.click(screen.getByText('Tìm tài khoản'));await screen.findByText('Lan · @lan');
  fireEvent.click(screen.getByText('Lưu thành viên'));await waitFor(()=>expect(projectsApi.addMember).toHaveBeenCalledWith(1,'tester',{projectRole:'TESTER',expectedVersion:8}));
});
it('edits a role with the displayed version and preserves the form on conflict',async()=>{
  projectsApi.addMember.mockRejectedValue(new Error('Vai trò đã thay đổi'));render(<ProjectMembers projectId={1} canEdit/>);
  fireEvent.click(await screen.findByText('Sửa vai trò Lan'));fireEvent.change(screen.getByLabelText('Vai trò dự án'),{target:{value:'MEMBER'}});fireEvent.click(screen.getByText('Lưu thành viên'));
  await screen.findByText('Vai trò đã thay đổi');expect(projectsApi.addMember).toHaveBeenCalledWith(1,'tester',{projectRole:'MEMBER',expectedVersion:4});expect(screen.getByLabelText('Vai trò dự án')).toHaveValue('MEMBER');fireEvent.click(screen.getByText('Hủy'));
});
it('requires confirmation before removing members, surfaces errors and retries',async()=>{
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);projectsApi.removeMember.mockRejectedValue(new Error('PM cuối cùng'));
  render(<ProjectMembers projectId={1} canEdit/>);fireEvent.click(await screen.findByText('Gỡ Lan'));expect(projectsApi.removeMember).not.toHaveBeenCalled();confirm.mockReturnValue(true);fireEvent.click(screen.getByText('Gỡ Lan'));await screen.findByRole('alert');
  expect(projectsApi.removeMember).toHaveBeenCalledWith(1,'tester',4);projectsApi.removeMember.mockResolvedValue();fireEvent.click(screen.getByText('Gỡ Lan'));await waitFor(()=>expect(projectsApi.listMembers).toHaveBeenCalledTimes(2));
});
it('does not retain a candidate when the entered username changes',async()=>{
  projectsApi.memberCandidate.mockRejectedValueOnce(new Error('Không tìm thấy')).mockResolvedValue(member);render(<ProjectMembers projectId={1} canEdit/>);fireEvent.click(screen.getByText('Thêm thành viên'));
  fireEvent.change(screen.getByLabelText('Tên đăng nhập'),{target:{value:'wrong'}});fireEvent.click(screen.getByText('Tìm tài khoản'));await screen.findByText('Không tìm thấy');fireEvent.click(screen.getByText('Tìm tài khoản'));await screen.findByText('Lan · @lan');fireEvent.change(screen.getByLabelText('Tên đăng nhập'),{target:{value:'someone'}});expect(screen.getByText('Lưu thành viên')).toBeDisabled();
});
it('renders handbook content and its history as plain text instead of HTML',async()=>{
  const {container}=render(<HandbookPanel projectId={1}/>);fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn A · v1'}));await screen.findByText('Lịch sử chỉnh sửa (1)');expect(container.querySelector('img')).toBeNull();expect(screen.getAllByText(revision.contentHtml)).toHaveLength(2);expect(screen.queryByText('Thêm tài liệu')).toBeNull();
});
it('creates a document and appends immutable revisions using currentRevisionId',async()=>{
  render(<HandbookPanel projectId={1} canEdit/>);fireEvent.click(screen.getByText('Thêm tài liệu'));
  fireEvent.change(screen.getByLabelText('Mã tài liệu'),{target:{value:'SPEC'}});fireEvent.change(screen.getByLabelText('Tên tài liệu'),{target:{value:'Đặc tả'}});fireEvent.change(screen.getByLabelText('Loại tài liệu'),{target:{value:'SPEC_REFERENCE'}});fireEvent.change(screen.getByLabelText('Nội dung'),{target:{value:'Nguồn nội bộ'}});fireEvent.click(screen.getByText('Lưu tài liệu'));
  await waitFor(()=>expect(projectsApi.createHandbook).toHaveBeenCalledWith(1,{code:'SPEC',name:'Đặc tả',resourceType:'SPEC_REFERENCE',contentHtml:'Nguồn nội bộ',visibility:'INTERNAL'}));
  fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn A · v1'}));fireEvent.click(await screen.findByText('Thêm phiên bản'));fireEvent.change(screen.getByLabelText('Nội dung'),{target:{value:'Bản mới'}});fireEvent.click(screen.getByText('Lưu tài liệu'));
  await waitFor(()=>expect(projectsApi.addRevision).toHaveBeenCalledWith(1,1,{contentHtml:'Bản mới',visibility:'INTERNAL',expectedCurrentRevisionId:7}));
});
it('keeps archived handbook history readable without offering another revision',async()=>{
  projectsApi.getHandbook.mockResolvedValue({...document,archived:true});
  render(<HandbookPanel projectId={1} canEdit/>);
  fireEvent.click(await screen.findByRole('button',{name:'Hướng dẫn A · v1'}));
  await screen.findByText('Lịch sử chỉnh sửa (1)');
  expect(screen.queryByText('Thêm phiên bản')).toBeNull();
});
it('reports handbook loading and editing errors without losing draft',async()=>{
  projectsApi.listHandbook.mockRejectedValueOnce(new Error('Tải thất bại'));projectsApi.createHandbook.mockRejectedValue(new Error('Mã trùng'));render(<HandbookPanel projectId={1} canEdit/>);fireEvent.click(await screen.findByText('Thử lại'));await screen.findByRole('button',{name:'Hướng dẫn A · v1'});fireEvent.click(screen.getByText('Thêm tài liệu'));
  fireEvent.change(screen.getByLabelText('Mã tài liệu'),{target:{value:'A'}});fireEvent.change(screen.getByLabelText('Tên tài liệu'),{target:{value:'Tên'}});fireEvent.change(screen.getByLabelText('Nội dung'),{target:{value:'Nội dung giữ'}});fireEvent.click(screen.getByText('Lưu tài liệu'));await screen.findByText('Mã trùng');expect(screen.getByLabelText('Nội dung')).toHaveValue('Nội dung giữ');fireEvent.click(screen.getByText('Hủy'));
});
it('creates the explicit internal ruleset when none exists',async()=>{
  projectsApi.listRules.mockResolvedValue([]);render(<RulesPanel projectId={1} canEdit/>);fireEvent.click(await screen.findByText('Tạo bộ quy tắc nội bộ'));await waitFor(()=>expect(projectsApi.createRuleset).toHaveBeenCalledWith(1,{code:'INTERNAL_DEMO',name:'Quy tắc báo lỗi nội bộ DEMO'}));
});
it('creates a typed policy draft with a source and the fixed minimum fields',async()=>{
  render(<RulesPanel projectId={1} canEdit/>);fireEvent.change(await screen.findByLabelText('Nguồn quy tắc'),{target:{value:'ADR-006'}});fireEvent.change(screen.getByLabelText('Tiền tố tiêu đề (tùy chọn)'),{target:{value:'[QA]'}});fireEvent.click(screen.getByText('Lưu bản nháp'));
  await waitFor(()=>expect(projectsApi.createRuleVersion).toHaveBeenCalled());const payload=JSON.parse(projectsApi.createRuleVersion.mock.calls[0][2].contentJson);expect(payload).toMatchObject({scope:'INTERNAL_DEMO',sourceReference:'ADR-006',titlePrefix:'[QA]'});expect(payload.requiredFields).toHaveLength(7);
});
it('confirms publication with the previously read active version and displays conflicts',async()=>{
  vi.spyOn(window,'confirm').mockReturnValue(true);projectsApi.publishRule.mockRejectedValue(new Error('Quy tắc đã thay đổi'));render(<RulesPanel projectId={1} canEdit/>);fireEvent.click(await screen.findByText('Công bố phiên bản 1'));await screen.findByRole('alert');expect(projectsApi.publishRule).toHaveBeenCalledWith(1,1,11,0);
});
it('keeps published policies read-only to testers and displays active history',async()=>{
  projectsApi.listRules.mockResolvedValue([{id:1,code:'INTERNAL_DEMO',activeVersion:{...version,publishedAt:'2026-09-30T00:00:00Z'}}]);projectsApi.listRuleVersions.mockResolvedValue([{...version,publishedAt:'2026-09-30T00:00:00Z',publishedBy:1}]);render(<RulesPanel projectId={1} canEdit={false}/>);await screen.findByText('Phiên bản 1 · Đang áp dụng');expect(screen.queryByText('Lưu bản nháp')).toBeNull();expect(screen.queryByText('Công bố phiên bản 1')).toBeNull();
});
