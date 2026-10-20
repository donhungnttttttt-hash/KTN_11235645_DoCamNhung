import React, { useEffect, useRef, useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { initials, roleLabels, useAuth } from "./AuthProvider";
import {UserCreateDialog} from '../admin/UserCreateDialog';

export function AccountMenu({ inverted = false }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creating,setCreating]=useState(false),[notice,setNotice]=useState('');
  const triggerRef = useRef(null);
  const locked=auth?.status==='expired'||auth?.status==='unavailable';
  // A locked app retains its draft. A refreshed profile still removes a revoked grant.
  const canCreateTester=Boolean(auth?.user?.roles.includes('PM')&&(auth?.can('users:create')||(locked&&auth.user.permissions?.includes('users:create'))));
  useEffect(()=>{if(!canCreateTester)setCreating(false);},[canCreateTester]);
  function closeCreate(){setCreating(false);triggerRef.current?.focus();}
  if (!auth?.user) return null;
  const { user, logout } = auth;
  return <div className={`account-menu${inverted ? " inverted" : ""}`} onKeyDown={event => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={triggerRef} className="account-trigger" aria-label={`Tài khoản: ${user.displayName}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="app-user-avatar">{initials(user.displayName)}</span>
      <strong>{user.displayName}</strong><ChevronDown size={13}/>
    </button>
    {open && <div className="account-popover">
      <strong>{user.displayName}</strong><span>@{user.username}</span>
      <span>{user.roles.map(role => roleLabels[role] || role).join(", ")}</span>
      {user.roles.includes("PM") && auth.can("users:create") && <small>Được cấp quyền tạo tài khoản Tester</small>}
      {canCreateTester&&<button type="button" disabled={busy} onClick={()=>{setNotice('');setOpen(false);setCreating(true);}}>Tạo tài khoản Tester</button>}
      {notice&&<p role="status" className="account-action-notice">{notice}</p>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await logout(); } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
      }}><LogOut size={15}/>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</button>
    </div>}
    {creating&&canCreateTester&&<UserCreateDialog testerOnly onCancel={closeCreate} onSaved={name=>{setNotice(`Đã tạo tài khoản Tester ${name}.`);setOpen(true);closeCreate();}}/>}
  </div>;
}
