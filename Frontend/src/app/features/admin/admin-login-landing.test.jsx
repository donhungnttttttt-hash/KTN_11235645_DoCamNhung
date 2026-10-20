import React from 'react';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import AppEntry from '../../../AppEntry';
import {ApiError, createApiClient} from '../../services/api/client';

const api = vi.hoisted(() => ({me:vi.fn(), login:vi.fn(), logout:vi.fn(), overview:vi.fn(), projects:vi.fn()}));
vi.mock('../../services/api/auth', () => ({authApi:{me:api.me, login:api.login, logout:api.logout}}));
vi.mock('../../services/api/admin', () => ({adminApi:{overview:api.overview}}));
vi.mock('../../services/api/projects', () => ({projectsApi:{list:api.projects}}));
// Chat has its own provider requests; it is not part of choosing the login destination.
vi.mock('../ai/AiConnections', () => ({AiProviderProvider:({children}) => children}));
vi.mock('../ai/AiChat', () => ({AiChat:() => null}));

const profile = (role = 'ADMIN', id = 'admin-landing') => ({
  id, username:'landing.test', displayName:'Landing account', roles:[role],
  permissions:['profile:read'], sessionExpiresAt:new Date(Date.now() + 1800000).toISOString(),
});
const overview = {
  asOf:'2026-10-19T00:00:00Z', totalProjects:0, activeProjects:0, totalUsers:1, enabledUsers:1,
  openBugs:0, awaitingVerification:0,
  metrics:{total:0, na:0, applicable:0, ok:0, ng:0, pending:0, notRun:0, executionPercent:null, passPercent:null},
  byRole:[], byProject:[], attention:{overdueMilestones:[], withoutPm:[], awaitingVerification:[]},
};
const unauthorized = () => new ApiError('Phiên không hợp lệ', {status:401});
async function signIn(user) {
  const form = within(await screen.findByRole('form', {name:'Đăng nhập'}));
  await user.clear(form.getByLabelText('Tên đăng nhập'));
  await user.type(form.getByLabelText('Tên đăng nhập'), 'landing.test');
  await user.type(form.getByLabelText('Mật khẩu'), 'sample-only-password');
  await user.click(form.getByRole('button', {name:'Đăng nhập', exact:true}));
}
async function expireSession() {
  const client = createApiClient({fetchImpl:vi.fn().mockResolvedValue(new Response('{}', {status:401, headers:{'Content-Type':'application/json'}}))});
  await act(async () => {await client('/me').catch(() => {});});
}
beforeEach(() => {
  vi.clearAllMocks();
  api.me.mockResolvedValue(profile());
  api.login.mockResolvedValue(profile());
  api.logout.mockResolvedValue(null);
  api.overview.mockResolvedValue(overview);
  api.projects.mockResolvedValue([]);
  window.history.replaceState(null, '', '#/dashboard?workspace=1');
});
afterEach(() => {window.history.replaceState(null, '', '#');});

test('fresh Admin login ignores a workspace URL left by a previous session', async () => {
  api.me.mockRejectedValue(unauthorized());
  render(<AppEntry/>);
  await signIn(userEvent.setup());
  expect(await screen.findByRole('heading', {name:'Tổng quan hệ thống'})).toBeVisible();
  expect(window.location.hash).toBe('#/admin');
  expect(api.projects).not.toHaveBeenCalled();
});

test('logging out and back in as the same Admin resets the workspace choice', async () => {
  const user = userEvent.setup();
  render(<AppEntry/>);
  await user.click(await screen.findByRole('button', {name:'Tài khoản: Landing account'}));
  await user.click(screen.getByRole('button', {name:'Đăng xuất', exact:true}));
  await signIn(user);
  expect(await screen.findByRole('heading', {name:'Tổng quan hệ thống'})).toBeVisible();
  expect(window.location.hash).toBe('#/admin');
});

test('a rejected fresh login does not restore the stale workspace on the next attempt', async () => {
  api.me.mockRejectedValue(unauthorized());
  api.login.mockRejectedValueOnce(new ApiError('Thông tin đăng nhập không đúng', {status:401}));
  const user = userEvent.setup();
  render(<AppEntry/>);
  await signIn(user);
  expect(await screen.findByRole('alert')).toHaveTextContent('Thông tin đăng nhập không đúng');
  await signIn(user);
  expect(await screen.findByRole('heading', {name:'Tổng quan hệ thống'})).toBeVisible();
  expect(window.location.hash).toBe('#/admin');
});

test('restoring an authenticated session keeps the deliberately selected workspace', async () => {
  render(<AppEntry/>);
  expect(await screen.findByRole('button', {name:'Tài khoản: Landing account'})).toBeVisible();
  expect(screen.queryByRole('heading', {name:'Tổng quan hệ thống'})).not.toBeInTheDocument();
  expect(window.location.hash).toBe('#/dashboard?workspace=1');
});

test('Admin can return home from workspace and explicitly enter workspace again', async () => {
  const user = userEvent.setup();
  render(<AppEntry/>);
  await user.click(await screen.findByRole('link', {name:'Quay lại Tổng quan hệ thống'}));
  expect(await screen.findByRole('heading', {name:'Tổng quan hệ thống'})).toBeVisible();
  expect(window.location.hash).toBe('#/admin');
  await user.click(screen.getByRole('link', {name:'Không gian dự án', exact:true}));
  expect(await screen.findByRole('link', {name:'Quay lại Tổng quan hệ thống'})).toBeVisible();
  expect(screen.queryByRole('heading', {name:'Tổng quan hệ thống'})).not.toBeInTheDocument();
});

test('same-account reauthentication after expiry keeps the workspace', async () => {
  render(<AppEntry/>);
  await screen.findByRole('button', {name:'Tài khoản: Landing account'});
  await expireSession();
  expect(await screen.findByRole('heading', {name:'Đăng nhập lại'})).toBeVisible();
  await signIn(userEvent.setup());
  await waitFor(() => expect(screen.getByRole('button', {name:'Tài khoản: Landing account'})).toBeVisible());
  expect(window.location.hash).toBe('#/dashboard?workspace=1');
  expect(screen.queryByRole('heading', {name:'Tổng quan hệ thống'})).not.toBeInTheDocument();
});

test.each(['PM','TESTER','DEV'])('fresh %s login stays in the project workspace', async role => {
  api.me.mockRejectedValue(unauthorized());
  api.login.mockResolvedValue(profile(role, role.toLowerCase()));
  render(<AppEntry/>);
  await signIn(userEvent.setup());
  expect(await screen.findByRole('button', {name:'Tài khoản: Landing account'})).toBeVisible();
  expect(screen.queryByRole('heading', {name:'Tổng quan hệ thống'})).not.toBeInTheDocument();
  expect(window.location.hash).toBe('#/dashboard?workspace=1');
});
