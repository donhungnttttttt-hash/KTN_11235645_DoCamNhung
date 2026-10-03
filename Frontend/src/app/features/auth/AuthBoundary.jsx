import React, { useState } from "react";
import { Eye, EyeOff, LockKeyhole, ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "./AuthProvider";
import "./auth.css";

export function LoginForm() {
  const { login, user, status } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { await login({ username: username.trim(), password }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); setPassword(""); }
  }
  return <>
    <div className="auth-icon"><LockKeyhole size={23} /></div>
    <h1>{status === "expired" ? "Đăng nhập lại" : "Chào mừng trở lại"}</h1>
    <p className="auth-intro">{status === "expired" ? "Phiên làm việc đã kết thúc. Đăng nhập cùng tài khoản để tiếp tục bản nháp đang mở." : "Đăng nhập để quản lý dự án và công việc kiểm thử của bạn."}</p>
    <form onSubmit={submit} aria-label="Đăng nhập">
      <label htmlFor="auth-username">Tên đăng nhập</label>
      <input id="auth-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck="false" required maxLength={64} value={username} onChange={e => setUsername(e.target.value)} disabled={busy} autoFocus />
      <label htmlFor="auth-password">Mật khẩu</label>
      <div className="auth-password">
        <input id="auth-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
        <button type="button" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy} type="submit">{busy ? <><LoaderCircle size={17} className="auth-spin"/> Đang đăng nhập…</> : <>Đăng nhập <ArrowRight size={17}/></>}</button>
    </form>
    <p className="auth-help">Chưa có tài khoản hoặc cần hỗ trợ?<br/>Liên hệ quản trị viên của bạn.</p>
  </>;
}

export function AuthBoundary({ children }) {
  const { status, user, retry } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const authenticated = status === "authenticated";
  return <>
    {/* Retain drafts for the same user, but make the entire app inaccessible while locked. */}
    {user && <div key={user.id} hidden={!authenticated} inert={!authenticated ? "" : undefined}>{children}</div>}
    {!authenticated && <main className="auth-page">
      <div className="auth-brand"><span>S+</span><strong>Flutter</strong><small>Quản lý dự án & kiểm thử</small></div>
      <section className="auth-card" aria-label="Tài khoản nội bộ">
        {status === "loading" ? <div role="status" className="auth-wait"><LoaderCircle className="auth-spin" size={26}/><p>Đang tải phiên đăng nhập…</p></div>
          : status === "unavailable" ? <>
            <h1>Chưa thể kết nối</h1>
            <p className="auth-intro" role="alert">Không thể xác nhận phiên đăng nhập. Vui lòng thử lại sau giây lát.{user && " Bản nháp đang mở vẫn được giữ tại đây."}</p>
            <button className="auth-submit" disabled={retrying} onClick={async () => { setRetrying(true); try { await retry(); } finally { setRetrying(false); } }}>{retrying ? "Đang kết nối…" : "Thử lại"}</button>
          </> : <LoginForm/>}
      </section>
      <p className="auth-footer">Không gian làm việc nội bộ · S+Flutter</p>
    </main>}
  </>;
}
