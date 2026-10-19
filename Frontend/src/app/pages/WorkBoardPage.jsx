import React from 'react';
import {useProject} from '../features/projects/ProjectProvider';
import {useAuth} from '../features/auth/AuthProvider';
import {FeatureIssuesPage} from '../features/work-items/FeatureIssuesPage';
import '../features/work-items/work-items.css';
import '../features/work-items/work-items-live.css';
import '../styles/work-board.css';

export function WorkBoardPage({activeRoute='/board',navigate}) {
  const {currentProject}=useProject()||{};
  const auth=useAuth();
  const hasRole=auth?.hasRole||((role)=>auth?.user?.roles?.includes(role));
  if(!currentProject)return <p role="status">Chọn dự án để xem Bug và QA.</p>;
  const [path,search='']=activeRoute.split('?');
  if(path==='/board/new'||new URLSearchParams(search).has('create'))return <section className="cat-container"><h1>Tạo Issue tại ngữ cảnh kiểm thử</h1><p>Dùng nút Issue ở case, hoặc Ghi lỗi monkey trong Quản lý lỗi. Liên kết tạo cũ không được chuyển thành ngữ cảnh Feature hay case mới.</p><button className="cat-btn" onClick={()=>navigate(`/board/testing?projectId=${currentProject.id}`)}>Mở Quản lý kiểm thử</button></section>;
  const canCreate=!currentProject.archived&&!hasRole('DEV')&&(hasRole('ADMIN')||['PM','TESTER'].includes(currentProject.projectRole));
  return <FeatureIssuesPage key={currentProject.id} projectId={currentProject.id} activeRoute={activeRoute} navigate={navigate} canCreate={canCreate}/>;
}
