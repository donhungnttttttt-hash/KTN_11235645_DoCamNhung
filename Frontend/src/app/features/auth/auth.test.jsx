import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AuthBoundary } from "./AuthBoundary";
import { AccountMenu } from "./AccountMenu";
import { ApiError, createApiClient } from "../../services/api/client";
import { Header } from "../../components/Header";
import { Modal } from "../work-items/components";

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
  const username = screen.getByLabelText("Tên đăng nhập");
  if (!username.value) await user.type(username, "tester.test");
  await user.type(screen.getByLabelText("Mật khẩu"), "test-password");
  await user.click(screen.getByRole("button", { name: "Đăng nhập", exact: true }));
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
    const user = setup({ me: vi.fn().mockResolvedValue(profile()) }, <Modal title="Bản nháp" onClose={close}><input aria-label="Nội dung nháp" /></Modal>);
    await screen.findByRole("dialog", { name: "Bản nháp" });
    await rejectSession();
    await user.keyboard("{Escape}");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
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
