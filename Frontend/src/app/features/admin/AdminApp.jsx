import React, { useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { AdminLayout } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { AdminProjects } from './AdminProjects';
import { AdminProjectDetail } from './AdminProjectDetail';
import { AdminDevices } from './AdminDevices';
import { AdminUsers } from './AdminUsers';
import {AdminAudit} from './AdminAudit';
import './admin.css';

export function AdminApp({route}) {
  const {hasRole}=useAuth();
  const [path,query='']=route.split('?');
  const detail=/^\/admin\/projects\/([1-9]\d*)$/.exec(path);
  const projectId=detail ? detail[1] : path.startsWith('/admin/projects') ? new URLSearchParams(query).get('projectId') || undefined : undefined;
  useEffect(()=>{document.title='Quản trị hệ thống · TMS';},[]);
  if(!hasRole('ADMIN')) return <main className="admin-denied"><h1>Không có quyền truy cập</h1><p>Khu quản trị hệ thống chỉ dành cho ADMIN.</p><a href="#/dashboard">Về không gian dự án</a></main>;
  const navigate=(next,scope)=>{
    const destination=detail ? (scope ? `/admin/projects/${scope}` : '/admin/projects') : next;
    window.location.hash=destination+(scope ? `?projectId=${encodeURIComponent(scope)}` : '');
  };
  return <AdminLayout path={path} projectId={projectId} navigate={navigate}>{path==='/admin' ? <AdminDashboard projectId={projectId}/> : path==='/admin/devices' ? <AdminDevices key={query} initialProjectId={new URLSearchParams(query).get('projectId')||''}/> : path==='/admin/audit' ? <AdminAudit key={query} initialProjectId={new URLSearchParams(query).get('projectId')||''}/> : path==='/admin/users' ? <AdminUsers/> : path==='/admin/projects' ? <AdminProjects key={projectId || 'all'} projectId={projectId}/> : detail ? <AdminProjectDetail id={detail[1]}/> : <section><h1>Không tìm thấy trang quản trị</h1><a href={`#/admin${projectId ? `?projectId=${projectId}` : ''}`}>Về tổng quan</a></section>}</AdminLayout>;
}
