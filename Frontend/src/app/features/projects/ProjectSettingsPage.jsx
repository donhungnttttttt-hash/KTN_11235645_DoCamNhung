import React, { useEffect, useState } from 'react';
import { useProject } from './ProjectProvider';
import { useAuth } from '../auth/AuthProvider';
import { projectsApi } from '../../services/api/projects';
import { ProjectDevices } from './ProjectDevices';
import '../admin/admin.css';
import { ProjectMembers } from './ProjectMembers';
import { RulesPanel } from './RulesPanel';
import { HandbookPanel } from './HandbookPanel';
import './projects.css';

export function ProjectSettingsPage({ activeRoute = '/settings' }) {
  const { currentProject, refreshProjects } = useProject();
  const { hasRole } = useAuth();
  if (!currentProject) return <div className="page-container">Vui lòng chọn một dự án.</div>;
  const tab = activeRoute.split('?')[0].split('/')[2] || 'general';
  return <Settings key={currentProject.id} admin={hasRole('ADMIN')} tab={tab} project={currentProject} refresh={refreshProjects} canEdit={!currentProject.archived && (hasRole('ADMIN') || currentProject.projectRole === 'PM')} />;
}

function Settings({ project, refresh, canEdit, tab, admin }) {
  const title = { general: 'Thông tin chung', members: 'Thành viên', rules: 'Quy tắc báo lỗi', handbook: 'Sổ tay dự án' }[tab];
  return <section className="page-container project-settings-page">
    <h1>{title} <span className="settings-project-name">· {project.name}</span></h1>
    {tab==='general' && <General project={project} refresh={refresh} canEdit={canEdit}/>}
    {tab==='members' && <>{admin&&<p><a className="cat-btn" href={`#/admin/projects/${project.id}`}>Quản lý thành viên tại khu Admin</a></p>}<ProjectMembers projectId={project.id} canEdit={false}/><ProjectDevices key={project.id} projectId={project.id}/></>}
    {tab==='rules' && <RulesPanel projectId={project.id} canEdit={canEdit}/>}
    {tab==='handbook' && <HandbookPanel projectId={project.id} canEdit={canEdit}/>}
  </section>;
}

function General({project,refresh,canEdit}) {
  const [form,setForm]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let live=true;setError('');setForm(null);
    projectsApi.get(project.id).then(data=>{if(live)setForm({name:data.name,description:data.description||'',timezone:data.timezone,expectedVersion:data.version});})
      .catch(failure=>{if(live)setError(failure.message);});
    return()=>{live=false;};
  },[project.id,reload]);
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      const result=await projectsApi.update(project.id,form);
      setForm({...form,expectedVersion:result.version});setMessage('Đã lưu thông tin dự án.');await refresh();
    } catch(failure) {setError(failure.message);} finally {setBusy(false);}
  }
  return <form className="settings-form" onSubmit={save}>
    {error && <p role="alert" className="text-danger">{error} <button type="button" className="cat-btn" disabled={busy} onClick={()=>{setMessage('');setReload(x=>x+1);}}>Tải lại thông tin</button></p>}
    {message && <p role="status">{message}</p>}
    {!form ? !error && <p>Đang tải thông tin dự án…</p> : <>
      <label className="form-group">Mã dự án<input value={project.code} disabled /></label>
      <fieldset disabled={!canEdit || busy}>
        <label className="form-group">Tên dự án<input required maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label className="form-group">Mô tả<textarea maxLength={500} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="form-group">Múi giờ<input required maxLength={50} value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})}/></label>
      </fieldset>
      {canEdit && <button className="cat-btn primary" disabled={busy}>{busy?'Đang lưu…':'Lưu thay đổi'}</button>}
    </>}
  </form>;
}
