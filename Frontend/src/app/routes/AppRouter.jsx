import React from 'react';
import { DashboardPage } from '../pages/DashboardPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { WorkBoardPage } from '../pages/WorkBoardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProjectSettingsPage } from '../features/projects/ProjectSettingsPage';
import { useProject } from '../features/projects/ProjectProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { isProjectDeveloper } from '../features/projects/projectAccess';
import { TestingFeaturesPage } from '../features/testing/TestingFeaturesPage';
import { TestingFeaturePage } from '../features/testing/TestingFeaturePage';
import { TestingDocumentPage } from '../features/testing/TestingDocumentPage';
import { CaseIssueAction } from '../features/work-items/CaseIssueAction';
import { routeInfo } from './routeInfo';
import { RetiredAiEntry } from './RetiredAiEntry';
import './navigation.css';

export function AppRouter({ activeRoute, navigate }) {
  const context = useProject(), auth = useAuth();
  const project = context?.currentProject;
  const hasRole = role => auth?.hasRole?.(role) || auth?.user?.roles?.includes(role);
  const info = routeInfo(activeRoute), {path} = info;
  const scoped = route => `${route}${project?.id ? `?projectId=${project.id}` : ''}`;
  const testingPath = scoped('/board/testing');
  const boardArea = content => <><nav className="board-area-nav overview-tabs" aria-label="Các khu vực Bảng công việc">
    <button aria-current={!info.isTesting ? 'page' : undefined} onClick={()=>navigate('/board')}>Bảng trạng thái</button>
    <button aria-current={info.isTesting ? 'page' : undefined} onClick={()=>navigate(testingPath)}>Quản lý kiểm thử</button>
  </nav>{content}</>;
  const retired = (title, message, destination, label) => <section className="page-container"><h1>{title}</h1><p>{message}</p><button className="btn-primary" onClick={()=>navigate(destination)}>{label}</button></section>;

  if (info.isTesting) {
    if(info.invalidTestingContext) return <NotFoundPage navigate={navigate}/>;
    if(context?.error) return <p role="alert">{context.error}</p>;
    if(!project) return <p role="status">{context?.loading?'Đang tải dự án…':'Chọn dự án để mở Quản lý kiểm thử.'}</p>;
    if(info.linkedProjectId && Number(project.id)!==info.linkedProjectId) return <p role="status">Đang chọn dự án phù hợp với đường dẫn…</p>;
    const featurePath = scoped(`/board/testing/features/${info.featureId}`);
    let content;
    if(info.testingDocumentId) content = <TestingDocumentPage key={`${project.id}/${info.featureId}/${info.testingDocumentId}`} projectId={project.id} featureId={info.featureId} documentId={info.testingDocumentId} caseId={info.testingCaseId} onBack={()=>navigate(featurePath)} renderIssueAction={props=><CaseIssueAction {...props} canCreate={props.document?.canCreateIssue===true&&!isProjectDeveloper(project,hasRole)}/>}/>;
    else if(info.featureId) content = <TestingFeaturePage key={`${project.id}/${info.featureId}`} projectId={project.id} featureId={info.featureId} onOpenDocument={id=>navigate(scoped(`/board/testing/features/${info.featureId}/documents/${id}`))} onBack={()=>navigate(testingPath)}/>;
    else content = <TestingFeaturesPage key={project.id} projectId={project.id} onOpenFeature={id=>navigate(scoped(`/board/testing/features/${id}`))}/>;
    return boardArea(content);
  }
  if(path==='/tests'||path.startsWith('/tests/')) return retired('Luồng kiểm thử đã thay đổi','Quản lý kiểm thử hiện được tổ chức theo Feature và tài liệu. Chọn Feature trong dự án để tiếp tục; mã đợt kiểm thử cũ không được chuyển thành mã Feature.',testingPath,'Mở Quản lý kiểm thử');
  if(path==='/dashboard') return <DashboardPage activeRoute={activeRoute} navigate={navigate}/>;
  if(path.startsWith('/dashboard/')) return retired('Tổng quan dự án đã thay đổi','Thông tin dự án nằm tại Tổng quan. Tiến độ kiểm thử dành cho PM và ADMIN nằm tại Tổng hợp & Phân tích.','/dashboard','Mở Tổng quan dự án');
  if(path==='/board'||path==='/board/list'||/^\/board\/issue\/[1-9]\d*$/.test(path)) return boardArea(<WorkBoardPage activeRoute={activeRoute} navigate={navigate}/>);
  if(path==='/issues') return <WorkBoardPage activeRoute={activeRoute} navigate={navigate}/>;
  if(path==='/board/new') return retired('Cách tạo công việc đã thay đổi','Tạo Bug hoặc QA từ case trong Quản lý kiểm thử; lỗi Monkey có thể tạo trong Quản lý lỗi.','/issues','Mở Quản lý lỗi');
  if(path==='/analysis'||path==='/progress') {
    if(!hasRole('ADMIN')&&(hasRole('DEV')||project?.projectRole!=='PM')) return <section className="page-container"><h1>Không có quyền truy cập</h1><p>Tổng hợp & Phân tích dành cho PM của dự án và ADMIN.</p></section>;
    return <AnalysisPage/>;
  }
  if(path==='/settings/catalogs') return retired('Thông tin chung đã thay đổi','Danh mục cũ đã được thay thế bằng Note của dự án.','/settings/notes','Mở Note');
  if(path==='/ai') return <RetiredAiEntry/>;
  if(['/settings','/settings/members','/settings/notes','/settings/rules','/settings/handbook'].includes(path)) return <ProjectSettingsPage activeRoute={activeRoute}/>;
  return <NotFoundPage navigate={navigate}/>;
}
