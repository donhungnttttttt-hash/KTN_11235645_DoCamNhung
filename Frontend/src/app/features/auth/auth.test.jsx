import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AuthBoundary } from "./AuthBoundary";
import { AccountMenu } from "./AccountMenu";
import { ApiError, createApiClient } from "../../services/api/client";
import { Header } from "../../components/Header";
import { Modal } from "../work-items/components";
import {AdminFormDialog} from '../admin/AdminFormDialog';

const unauthorized = () => new ApiError("Phiên không hợp lệ", { status: 401 });
const profile = (overrides = {}) => ({ id: "user-1", username: "tester.test", displayName: "Tester nội bộ", roles: ["TESTER"], permissions: ["profile:read"], sessionExpiresAt: new Date(Date.now() + 1800000).toISOString(), ...overrides });
function ProtectedApp() {
  const { can } = useAuth();
  return <><AccountMenu/><label>Bản nháp<input defaultValue=""/></label><p>{can("users:create") ? "Được tạo tài khoản" : "Không được tạo tài khoản"}</p></>;
}
function setup(api, children = <ProtectedApp/>) {
  render(<AuthProvider api={api}><AuthBoundary>{children}</AuthBoundary></AuthProvider>);
  return userEvent.setup();
}
async function signIn(user) {
  const login=within(screen.getByRole('form',{name:'Đăng nhập'}));
  const username = login.getByLabelText("Tên đăng nhập");
  if (!username.value) await user.type(username, "tester.test");
  await user.type(login.getByLabelText("Mật khẩu"), "test-password");
  await user.click(login.getByRole("button", { name: "Đăng nhập", exact: true }));
}
async function rejectSession() {
  const client = createApiClient({ fetchImpl: vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Hết phiên" }), { status: 401, headers: { "Content-Type": "application/json" } })) });
  await act(async () => { await client("/me").catch(() => {}); });
}

describe("internal authentication", () => {
  it("locks the app while loading and shows a retryable connection failure", async () => {
    let reject;
    const api = { me: vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValue(profile()) };
    const user = setup(api);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải phiên");
    expect(screen.queryByLabelText("Bản nháp")).not.toBeInTheDocument();
    await act(async () => reject(new ApiError("Network")));
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể xác nhận");
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByLabelText("Bản nháp")).toBeVisible();
  });

  it("logs in, hides password, and never stores credentials in browser storage", async () => {
    const api = { me: vi.fn().mockRejectedValue(unauthorized()), login: vi.fn().mockResolvedValue(profile()) };
    const user = setup(api);
    await screen.findByLabelText("Tên đăng nhập");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("type", "password");
    await signIn(user);
    expect(await screen.findByLabelText("Bản nháp")).toBeVisible();
    expect(api.login).toHaveBeenCalledWith({ username: "tester.test", password: "test-password" });
    expect(screen.getByText("Không được tạo tài khoản")).toBeVisible();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("shows rejected login and preserves username but clears password", async () => {
    const api = { me: vi.fn().mockRejectedValue(unauthorized()), login: vi.fn().mockRejectedValue(new ApiError("Tên đăng nhập hoặc mật khẩu không đúng.", { status: 401 })) };
    const user = setup(api);
    await screen.findByLabelText("Tên đăng nhập");
    await signIn(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Tên đăng nhập hoặc mật khẩu không đúng");
    expect(screen.getByLabelText("Tên đăng nhập")).toHaveValue("tester.test");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("");
    expect(screen.queryByLabelText("Bản nháp")).not.toBeInTheDocument();
  });

  it("blocks duplicate login while a request is pending", async () => {
    let resolve;
    const api = { me: vi.fn().mockRejectedValue(unauthorized()), login: vi.fn().mockImplementation(() => new Promise(done => { resolve = done; })) };
    const user = setup(api);
    await screen.findByLabelText("Tên đăng nhập");
    await signIn(user);
    expect(screen.getByRole("button", { name: "Đang đăng nhập…" })).toBeDisabled();
    expect(api.login).toHaveBeenCalledTimes(1);
    await act(async () => resolve(profile()));
  });

  it("uses one password toggle without submitting or changing the entered password", async () => {
    const api = { me: vi.fn().mockRejectedValue(unauthorized()), login: vi.fn() };
    const user = setup(api);
    const password = await screen.findByLabelText("Mật khẩu");
    await user.type(password, "sample-password");
    const reveal = screen.getByRole("button", { name: "Hiện mật khẩu", exact: true });
    expect(screen.getAllByRole("button", { name: /^(Hiện|Ẩn) mật khẩu$/ })).toHaveLength(1);
    await user.click(reveal);
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("sample-password");
    expect(screen.getByRole("button", { name: "Ẩn mật khẩu", exact: true })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveValue("sample-password");
    expect(api.login).not.toHaveBeenCalled();
  });

  it("masks the password and blocks its reveal while sign-in is pending", async () => {
    let resolve;
    const api = { me: vi.fn().mockRejectedValue(unauthorized()), login: vi.fn(() => new Promise(done => { resolve = done; })) };
    const user = setup(api);
    await screen.findByLabelText("Tên đăng nhập");
    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu", exact: true }));
    await signIn(user);
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Hiện mật khẩu", exact: true })).toBeDisabled();
    await act(async () => resolve(profile()));
  });

  it("starts a rejected sign-in retry with a masked empty password", async () => {
    const api = { me: vi.fn().mockRejectedValue(unauthorized()), login: vi.fn().mockRejectedValue(new ApiError("Không đăng nhập được", {status:401})) };
    const user = setup(api);
    const password = await screen.findByLabelText("Mật khẩu");
    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu", exact: true }));
    await signIn(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không đăng nhập được");
    expect(password).toHaveValue("");
    expect(password).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Hiện mật khẩu", exact: true })).toBeEnabled();
    await user.type(password, "second-attempt");
    expect(password).toHaveAttribute("type", "password");
  });

  it("locks on 401 and restores the draft only for the same account", async () => {
    const api = { me: vi.fn().mockResolvedValue(profile()), login: vi.fn().mockResolvedValue(profile()) };
    const user = setup(api);
    await user.type(await screen.findByLabelText("Bản nháp"), "Nội dung chưa lưu");
    await rejectSession();
    expect(screen.getByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
    expect(screen.getByLabelText("Bản nháp")).not.toBeVisible();
    await signIn(user);
    expect(await screen.findByLabelText("Bản nháp")).toBeVisible();
    expect(screen.getByLabelText("Bản nháp")).toHaveValue("Nội dung chưa lưu");
    await rejectSession();
    api.login.mockResolvedValue(profile({ id: "user-2", username: "another.test" }));
    await signIn(user);
    expect(await screen.findByLabelText("Bản nháp")).toHaveValue("");
  });

  it("locks when the server-provided idle deadline is reached", async () => {
    setup({ me: vi.fn().mockResolvedValue(profile({ sessionExpiresAt: new Date(Date.now() + 250).toISOString() })) });
    expect(await screen.findByLabelText("Bản nháp")).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
    expect(screen.getByLabelText("Bản nháp")).not.toBeVisible();
  });

  it("does not close a retained draft modal when Escape is pressed on the login screen", async () => {
    const close = vi.fn();
    const user = setup({ me: vi.fn().mockResolvedValue(profile()), login: vi.fn().mockResolvedValue(profile()) }, <Modal title="Bản nháp" onClose={close}><input aria-label="Nội dung nháp" /></Modal>);
    await screen.findByRole("dialog", { name: "Bản nháp" });
    await user.type(screen.getByLabelText('Nội dung nháp'),'Nội dung giữ khi đăng nhập lại');
    await rejectSession();
    expect(screen.getByLabelText('Nội dung nháp')).not.toBeVisible();
    expect(screen.getByLabelText('Nội dung nháp').closest('[inert]')).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
    await signIn(user);
    expect(await screen.findByRole('dialog',{name:'Bản nháp'})).toBeVisible();
    expect(screen.getByLabelText('Nội dung nháp')).toHaveValue('Nội dung giữ khi đăng nhập lại');
  });

  it('retains a delegated Tester creation draft while the same PM reauthenticates',async()=>{
    const account=profile({roles:['PM'],permissions:['profile:read','users:create']});
    const user=setup({me:vi.fn().mockResolvedValue(account),login:vi.fn().mockResolvedValue(account)});
    await user.click(await screen.findByRole('button',{name:'Tài khoản: Tester nội bộ'}));
    await user.click(screen.getByRole('button',{name:'Tạo tài khoản Tester'}));
    await user.type(screen.getByLabelText('Tên hiển thị'),'Tên còn đang nhập');
    await rejectSession();
    expect(screen.getByLabelText('Tên hiển thị')).not.toBeVisible();
    await signIn(user);
    expect(await screen.findByRole('dialog',{name:'Tạo tài khoản Tester'})).toBeVisible();
    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Tên còn đang nhập');
  });

  it('releases a retained Admin dialog scroll lock during reauthentication',async()=>{
    const user=setup({me:vi.fn().mockResolvedValue(profile()),login:vi.fn().mockResolvedValue(profile())},<AdminFormDialog title="Thông tin đang sửa" onClose={vi.fn()}><input aria-label="Nháp Admin"/></AdminFormDialog>);
    await screen.findByRole('dialog',{name:'Thông tin đang sửa'});
    await user.type(screen.getByLabelText('Nháp Admin'),'Bản nháp Admin giữ lại');
    expect(document.body.style.overflow).toBe('hidden');
    await rejectSession();
    expect(screen.getByLabelText('Nháp Admin')).not.toBeVisible();
    expect(document.body.style.overflow).not.toBe('hidden');
    await signIn(user);
    expect(await screen.findByRole('dialog',{name:'Thông tin đang sửa'})).toBeVisible();
    expect(screen.getByLabelText('Nháp Admin')).toHaveValue('Bản nháp Admin giữ lại');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it("reports logout failure and removes all private state after successful retry", async () => {
    const api = { me: vi.fn().mockResolvedValue(profile()), logout: vi.fn().mockRejectedValueOnce(new ApiError("Chưa thể đăng xuất")).mockResolvedValue(null) };
    const user = setup(api);
    await user.type(await screen.findByLabelText("Bản nháp"), "Bản nháp riêng");
    await user.click(screen.getByRole("button", { name: "Tài khoản: Tester nội bộ" }));
    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa thể đăng xuất");
    expect(screen.getByLabelText("Bản nháp")).toHaveValue("Bản nháp riêng");
    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await screen.findByLabelText("Tên đăng nhập");
    expect(screen.queryByLabelText("Bản nháp")).not.toBeInTheDocument();
  });

  it("uses the real profile in the header and exposes only server-granted PM permission", async () => {
    const account = profile({ displayName: "Nguyễn An", roles: ["PM"], permissions: ["profile:read", "users:create"] });
    const api = { me: vi.fn().mockResolvedValue(account) };
    const user = setup(api, <Header navigate={vi.fn()} phase="Regression" setPhase={vi.fn()}/>);
    await user.click(await screen.findByRole("button", { name: "Tài khoản: Nguyễn An" }));
    expect(screen.getByText("Quản lý dự án")).toBeVisible();
    expect(screen.getByText("Được cấp quyền tạo tài khoản Tester")).toBeVisible();
    expect(screen.queryByText(/Nguyen Xuan/)).not.toBeInTheDocument();
  });
});
