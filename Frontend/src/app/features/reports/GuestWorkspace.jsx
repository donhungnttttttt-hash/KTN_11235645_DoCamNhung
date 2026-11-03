import React from 'react';
import {AccountMenu} from '../auth/AccountMenu';
import {ProjectSelector} from '../projects/ProjectSelector';
import {useProject} from '../projects/ProjectProvider';
import {ReadOnlyProjectReports} from './ReadOnlyProjectReports';
import '../projects/projects.css';
import './guest-workspace.css';

export function GuestWorkspace(){
 const {currentProject,loading,error,refreshProjects}=useProject();
 return <div className="guest-workspace"><header className="guest-header"><strong>TMS · Tiến độ & Báo cáo</strong><ProjectSelector/><AccountMenu/></header>
 <main className="page-container"><h1>Tiến độ & Báo cáo</h1><p>Bạn có thể xem tiến độ, biểu đồ và báo cáo đã lưu của các dự án được chia sẻ.</p>
 {loading?<p role="status">Đang tải dự án…</p>:error?<p role="alert">{error} <button onClick={()=>refreshProjects()}>Thử lại</button></p>:currentProject?<><h2>{currentProject.name}</h2><ReadOnlyProjectReports projectId={currentProject.id}/></>:<p>Chưa có dự án được chia sẻ với bạn.</p>}
 </main></div>;
}
