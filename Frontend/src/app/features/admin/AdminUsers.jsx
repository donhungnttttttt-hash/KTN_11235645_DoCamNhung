import {UserCreateDialog} from './UserCreateDialog';
import {UserEditDialog} from './UserEditDialog';
import {UserPasswordResetDialog} from './UserPasswordResetDialog';
import {TableScroll} from '../../components/TableScroll';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {AdminUserProjectFilter} from './AdminUserProjectFilter';
import {useAuth} from '../auth/AuthProvider';

export function AdminUsers({api=adminApi}) {
 const {user,status,retry,accountUpdated}=useAuth();const [filters,setFilters]=useState({keyword:'',role:'',enabled:'',projectId:'',page:0});const [creating,setCreating]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [editor,setEditor]=useState(null);const reloadAfterLogin=useRef(false);
 const [notice,setNotice]=useState('');
 const load=useCallback(signal=>api.users({...filters,size:20},{signal}),[api,filters]);const state=useAdminRead(JSON.stringify(filters),load);
 useEffect(()=>{
  // AuthBoundary retains this page through reauthentication; reload only once its session is valid again.
  if(status==='authenticated'&&reloadAfterLogin.current){reloadAfterLogin.current=false;state.retry();}
 },[status]);
 const filter=(key,value)=>setFilters({...filters,[key]:value,page:0});
 function accountSaved(saved){
  const message=editor.kind==='password'?`Đã đặt lại mật khẩu cho ${saved.displayName}.`:`Đã cập nhật thông tin của ${saved.displayName}.`;
  setEditor(null);setError('');setNotice(message);
  if(saved.id===user.id&&saved.version!==editor.account.version){reloadAfterLogin.current=true;accountUpdated?.(saved,`${message} Đăng nhập lại để tiếp tục.`);void retry?.();}
  else state.retry();
 }
 function openEditor(kind,account){setNotice('');setError('');setEditor({kind,account});}
 function closeEditor(){setEditor(null);state.retry();}
 async function update(u,change){if(busy)return;setBusy(true);setError('');setNotice('');try{await api.updateUser(u.id,{...change,expectedVersion:u.version});setNotice('enabled' in change?`Đã ${change.enabled?'mở khóa':'khóa'} tài khoản ${u.displayName}.`:`Đã ${change.canCreateUsers?'cấp':'thu hồi'} quyền tạo Tester cho ${u.displayName}.`);state.retry();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <><div className="admin-page-heading"><h1>Người dùng</h1><button onClick={()=>{setNotice('');setCreating(true);}}>Tạo tài khoản</button></div>{notice&&<p role="status">{notice}</p>}{busy&&<p role="status">Đang cập nhật tài khoản…</p>}{creating&&<UserCreateDialog api={api} onCancel={()=>setCreating(false)} onSaved={name=>{setNotice(`Đã tạo tài khoản ${name}.`);setCreating(false);state.retry();}}/>}
 {editor?.kind==='profile'&&<UserEditDialog account={editor.account} self={editor.account.id===user.id} api={api} onSaved={accountSaved} onCancel={closeEditor}/>}
 {editor?.kind==='password'&&<UserPasswordResetDialog account={editor.account} self={editor.account.id===user.id} api={api} onSaved={accountSaved} onCancel={closeEditor}/>}
 <section className="admin-card admin-filters"><label>Tìm username hoặc tên<input type="search" maxLength={100} value={filters.keyword} onChange={e=>filter('keyword',e.target.value)}/></label><label>Vai trò<select value={filters.role} onChange={e=>filter('role',e.target.value)}><option value="">Tất cả</option>{['ADMIN','PM','TESTER','DEV'].map(r=><option key={r}>{r}</option>)}</select></label><label>Trạng thái<select value={filters.enabled} onChange={e=>filter('enabled',e.target.value)}><option value="">Tất cả</option><option value="true">Hoạt động</option><option value="false">Đã khóa</option></select></label><AdminUserProjectFilter api={api} value={filters.projectId} onChange={id=>filter('projectId',id)}/></section>
 {error&&<p role="alert">{error} <button onClick={state.retry}>Tải dữ liệu hiện hành</button></p>}<ReadState {...state}/>{state.data&&<section className="admin-card"><p>{state.data.totalElements} tài khoản · Trang {filters.page+1}</p><TableScroll label="Tài khoản hệ thống" className="admin-table-scroll" tabIndex={0}><table><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Dự án</th><th>Tạo lúc</th><th>Thao tác</th></tr></thead><tbody>{state.data.items.map(u=><tr key={u.id}><th>{u.displayName}<small> @{u.username}</small></th><td>{u.role}</td><td>{u.enabled?'Hoạt động':'Đã khóa'}</td><td>{u.memberships?.length?u.memberships.map(m=><p key={m.projectId}><a href={`#/admin/projects/${m.projectId}`}>{m.code}</a> · {m.projectRole}</p>):'Chưa có dự án'}</td><td><time dateTime={u.createdAt} title={u.createdAt}>{new Date(u.createdAt).toLocaleString('vi-VN')}</time></td><td><div className="admin-actions"><button disabled={busy} aria-label={`Sửa thông tin ${u.displayName}`} onClick={()=>openEditor('profile',u)}>Sửa thông tin</button><button disabled={busy} aria-label={`Đặt lại mật khẩu ${u.displayName}`} onClick={()=>openEditor('password',u)}>Đặt lại mật khẩu</button><button disabled={busy||u.id===user.id} aria-describedby={u.id===user.id?"admin-self-lock-help":undefined} onClick={()=>update(u,{enabled:!u.enabled})}>{u.enabled?'Khóa':'Mở khóa'}</button>{u.id===user.id&&<small id="admin-self-lock-help">Bạn không thể khóa tài khoản đang đăng nhập.</small>}{u.role==='PM'&&<button disabled={busy} onClick={()=>update(u,{canCreateUsers:!u.canCreateUsers})}>{u.canCreateUsers?'Thu hồi quyền tạo user':'Cấp quyền tạo user'}</button>}</div></td></tr>)}</tbody></table></TableScroll>{!state.data.items.length&&<p>Không có tài khoản phù hợp.</p>}<div className="admin-pagination"><button disabled={!filters.page} onClick={()=>setFilters({...filters,page:filters.page-1})}>Trang trước</button><button disabled={(filters.page+1)*20>=state.data.totalElements} onClick={()=>setFilters({...filters,page:filters.page+1})}>Trang sau</button></div></section>}</>;
}
