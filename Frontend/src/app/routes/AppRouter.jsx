import React from 'react';
import { DashboardPage } from '../pages/DashboardPage';
import { TestSpecsPage } from '../pages/TestSpecsPage';
import { TestDocumentsPage } from '../features/test-cases/TestDocumentsPage';
import { TestDocumentPage } from '../features/test-cases/TestDocumentPage';
import { TestRunnerGridPage } from '../pages/TestRunnerGridPage';
import { TestCyclesPage } from '../features/test-execution/TestCyclesPage';
import { RetestQueuePage } from '../features/retest/RetestQueuePage';
import { FileWorkPage } from '../features/file-work/FileWorkPage';
import { FileWorkDetail } from '../features/file-work/FileWorkDetail';
import { ActionInbox } from '../features/file-work/ActionInbox';
import { ProgressPage } from '../pages/ProgressPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { WorkBoardPage } from '../pages/WorkBoardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProjectSettingsPage } from '../features/projects/ProjectSettingsPage';
import { CatalogPage } from '../features/projects/CatalogPage';
import { routeInfo } from './routeInfo';
import { AiAssistantPage } from '../features/ai/AiAssistantPage';

export function AppRouter({ activeRoute, project, teamMembers, testSpecs, issues, memberProgress, navigate }) {
  const { path, specId, isFileWork, groupId, documentId, invalidFileWorkContext } = routeInfo(activeRoute);
  const isRunnerRoute = specId !== null;
  if (path === '/ai') return <AiAssistantPage/>;
  if (path === '/dashboard/actions') return <ActionInbox navigate={navigate}/>;

  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return <DashboardPage project={project} teamMembers={teamMembers} activeRoute={activeRoute} navigate={navigate} />;
  }

  if (path === '/board' || path.startsWith('/board/')) {
    return <WorkBoardPage activeRoute={activeRoute} navigate={navigate} />;
  }

  if (path === '/tests') {
    return <TestDocumentsPage navigate={navigate} />;
  }

  if (path === '/tests/cases') {
    return <TestSpecsPage testSpecs={testSpecs} navigate={navigate} />;
  }

  const documentRoute = /^\/tests\/documents\/([1-9]\d*)$/.exec(path);
  if (documentRoute) return <TestDocumentPage documentId={documentRoute[1]} navigate={navigate} />;

  if (path === '/tests/cycles') {
    return <TestCyclesPage navigate={navigate} />;
  }

  if (isFileWork) {
    if (invalidFileWorkContext) return <NotFoundPage navigate={navigate} />;
    if (path === '/tests/file-work') return <FileWorkPage documentId={documentId} navigate={navigate} />;
    // FileWorkDetail keys its inner state by the current project and group.
    return <FileWorkDetail groupId={groupId} navigate={navigate} />;
  }

  if (isRunnerRoute) {
    if (path === '/tests/retests') return <RetestQueuePage navigate={navigate} />;
    if (!/^\d+$/.test(specId)) return <NotFoundPage navigate={navigate} message="Không tìm thấy đợt kiểm thử này." />;
    return <TestRunnerGridPage key={specId} specId={specId} navigate={navigate} />;
  }

  if (path === '/issues') {
    return <WorkBoardPage activeRoute={activeRoute} navigate={navigate} />;
  }

  if (path === '/progress') {
    return <ProgressPage memberProgress={memberProgress} />;
  }

  if (path === '/analysis') {
    return <AnalysisPage />;
  }

  if (path === '/settings/catalogs') {
    return <CatalogPage />;
  }

  if (['/settings', '/settings/members', '/settings/rules', '/settings/handbook'].includes(path)) {
    return <ProjectSettingsPage activeRoute={activeRoute} />;
  }

  return <NotFoundPage navigate={navigate} />;
}
