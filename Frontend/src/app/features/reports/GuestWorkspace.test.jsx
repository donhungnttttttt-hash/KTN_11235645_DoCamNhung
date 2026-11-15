import React from 'react';
import {beforeEach, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {GuestWorkspace} from './GuestWorkspace';

const state = vi.hoisted(() => ({currentProject: null, loading: false, error: '', refreshProjects: vi.fn()}));
vi.mock('../projects/ProjectProvider', () => ({useProject: () => state}));
vi.mock('../projects/ProjectSelector', () => ({ProjectSelector: () => <span>Chọn dự án được chia sẻ</span>}));
vi.mock('../auth/AccountMenu', () => ({AccountMenu: () => <span>Tài khoản</span>}));
vi.mock('./GuestDashboard', () => ({GuestDashboard: ({projectId}) => <div data-testid="report-project">{projectId}</div>}));

beforeEach(() => {
  Object.assign(state, {currentProject: null, loading: false, error: ''});
  state.refreshProjects.mockClear();
});

it('does not render report content while loading or when no project is shared', () => {
  state.loading = true;
  const view = render(<GuestWorkspace/>);
  expect(screen.getByRole('status')).toHaveTextContent('プロジェクトを読み込み中');
  expect(screen.queryByTestId('report-project')).toBeNull();
  state.loading = false;
  view.rerender(<GuestWorkspace/>);
  expect(screen.getByText('共有されているプロジェクトはありません。')).toBeVisible();
});

it('hides the previous project on error and retries the authorized project list', () => {
  state.currentProject = {id: 7, name: 'Dự án A'};
  const view = render(<GuestWorkspace/>);
  expect(screen.getByTestId('report-project')).toHaveTextContent('7');
  state.error = 'Không còn quyền xem';
  view.rerender(<GuestWorkspace/>);
  expect(screen.getByRole('alert')).toHaveTextContent('閲覧権限がありません');
  expect(screen.queryByTestId('report-project')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: '再試行'}));
  expect(state.refreshProjects).toHaveBeenCalledTimes(1);
});
it('defaults to Japanese, offers exactly two languages and keeps the choice across project changes',()=>{
 const view=render(<GuestWorkspace/>);const language=screen.getByRole('combobox',{name:'言語 / Ngôn ngữ'});
 expect(language).toHaveValue('ja');expect(language.querySelectorAll('option')).toHaveLength(2);
 fireEvent.change(language,{target:{value:'vi'}});expect(screen.getByText('Chưa có dự án được chia sẻ với bạn.')).toBeVisible();
 state.currentProject={id:9};view.rerender(<GuestWorkspace/>);expect(language).toHaveValue('vi');
 view.unmount();render(<GuestWorkspace/>);expect(screen.getByRole('combobox',{name:'言語 / Ngôn ngữ'})).toHaveValue('ja');
});

it('passes the currently shared project to read-only reports after selection changes', () => {
  state.currentProject = {id: 7, name: 'Dự án A'};
  const view = render(<GuestWorkspace/>);
  expect(screen.getByTestId('report-project')).toHaveTextContent('7');
  state.currentProject = {id: 9, name: 'Dự án B'};
  view.rerender(<GuestWorkspace/>);
  expect(screen.queryByRole('heading', {name: 'Dự án A'})).toBeNull();
  expect(screen.getByTestId('report-project')).toHaveTextContent('9');
  expect(screen.queryByRole('textbox')).toBeNull();
});
