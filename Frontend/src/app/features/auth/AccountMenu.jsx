import React, { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { initials, roleLabels, useAuth } from "./AuthProvider";

export function AccountMenu({ inverted = false }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!auth?.user) return null;
  const { user, logout } = auth;
  return <div className={`account-menu${inverted ? " inverted" : ""}`} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button className="account-trigger" aria-label={`Tài khoản: ${user.displayName}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="app-user-avatar">{initials(user.displayName)}</span>
      <strong>{user.displayName}</strong><ChevronDown size={13}/>
    </button>
    {open && <div className="account-popover">
      <strong>{user.displayName}</strong><span>@{user.username}</span>
      <span>{user.roles.map(role => roleLabels[role] || role).join(", ")}</span>
      {user.roles.includes("PM") && auth.can("users:create") && <small>Được cấp quyền tạo tài khoản Tester</small>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await logout(); } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
      }}><LogOut size={15}/>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</button>
    </div>}
  </div>;
}
