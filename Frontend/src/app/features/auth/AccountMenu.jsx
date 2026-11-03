import React, { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { initials, roleLabels, useAuth } from "./AuthProvider";
import {UserCreateDialog} from '../admin/UserCreateDialog';
import {createPortal} from 'react-dom';
import {SelfProfileDialog} from './SelfProfileDialog';
import {avatarUrl,selfProfileApi} from '../../services/api/selfProfile';

export function AccountMenu({ inverted = false, hideLogout = false }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creating,setCreating]=useState(false),[notice,setNotice]=useState('');
  const [editingProfile,setEditingProfile]=useState(false),[profile,setProfile]=useState(null);
  const triggerRef = useRef(null);
  const locked=auth?.status==='expired'||auth?.status==='unavailable';
  // A locked app retains its draft. A refreshed profile still removes a revoked grant.
  const canCreateOrdinaryUser=Boolean(auth?.user?.roles.includes('PM')&&(auth?.can('users:create')||(locked&&auth.user.permissions?.includes('users:create'))));
  useEffect(()=>{if(!canCreateOrdinaryUser)setCreating(false);},[canCreateOrdinaryUser]);
  useEffect(()=>{if(!auth?.user?.id)return;const controller=new AbortController();setProfile(null);selfProfileApi.get({signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setProfile(value);}).catch(()=>{});return()=>controller.abort();},[auth?.user?.id]);
  function closeCreate(){setCreating(false);triggerRef.current?.focus();}
  if (!auth?.user) return null;
  const { user, logout } = auth;
  return <div className={`account-menu${inverted ? " inverted" : ""}`} onKeyDown={event => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={triggerRef} type="button" className="account-trigger" aria-label={`Tài khoản: ${user.displayName}`} title={`Tài khoản: ${user.displayName}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="app-user-avatar" aria-hidden="true">{profile?.hasAvatar?<img src={avatarUrl(profile)} alt="" onError={()=>setProfile(current=>current?{...current,hasAvatar:false}:current)}/>:initials(user.displayName)}</span>
    </button>
    {open && <div className="account-popover">
      <strong>{user.displayName}</strong><span>@{user.username}</span>
      <span>{user.roles.map(role => roleLabels[role] || role).join(", ")}</span>
      <button type="button" disabled={busy} onClick={()=>{setOpen(false);setEditingProfile(true);}}>Thông tin cá nhân</button>
      {user.roles.includes("PM") && auth.can("users:create") && <small>Được cấp quyền tạo User thường</small>}
      {canCreateOrdinaryUser&&<button type="button" disabled={busy} onClick={()=>{setNotice('');setOpen(false);setCreating(true);}}>Tạo tài khoản</button>}
      {notice&&<p role="status" className="account-action-notice">{notice}</p>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      {!hideLogout&&<button disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await logout(); } catch (failure) { setError(failure.message); }
        finally { setBusy(false); }
      }}><LogOut size={15}/>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</button>}
    </div>}
    {creating&&canCreateOrdinaryUser&&<UserCreateDialog ordinaryOnly onCancel={closeCreate} onSaved={name=>{setNotice(`Đã tạo User thường ${name}.`);setOpen(true);closeCreate();}}/>}
    {editingProfile&&createPortal(<SelfProfileDialog onCancel={()=>{setEditingProfile(false);triggerRef.current?.focus();}} onSaved={saved=>{setProfile(saved);auth.accountUpdated?.(saved);}}/>,document.body)}
  </div>;
}
