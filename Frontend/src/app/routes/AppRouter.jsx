import React from 'react';
import { DashboardPage } from '../pages/DashboardPage';
import { TestSpecsPage } from '../pages/TestSpecsPage';
import { TestRunnerGridPage } from '../pages/TestRunnerGridPage';
import { IssuesPage } from '../pages/IssuesPage';
import { ProgressPage } from '../pages/ProgressPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { WorkBoardPage } from '../pages/WorkBoardPage';

export function AppRouter({ activeRoute, project, teamMembers, testSpecs, issues, memberProgress, navigate }) {
  const isRunnerRoute = activeRoute.startsWith('/tests/');
  const specId = isRunnerRoute ? activeRoute.replace('/tests/', '') : null;

  if (activeRoute === '/dashboard' || activeRoute.startsWith('/dashboard/')) {
    return <DashboardPage project={project} teamMembers={teamMembers} activeRoute={activeRoute} navigate={navigate} />;
  }

  if (activeRoute === '/board' || activeRoute.startsWith('/board/')) {
    return <WorkBoardPage activeRoute={activeRoute} navigate={navigate} />;
  }

  if (activeRoute === '/tests') {
    return <TestSpecsPage testSpecs={testSpecs} navigate={navigate} />;
  }

  if (isRunnerRoute) {
    return <TestRunnerGridPage specId={specId} testSpecs={testSpecs} navigate={navigate} />;
  }

  if (activeRoute.startsWith('/issues')) {
    return <IssuesPage issues={issues} />;
  }

  if (activeRoute.startsWith('/progress')) {
    return <ProgressPage memberProgress={memberProgress} />;
  }

  if (activeRoute === '/analysis') {
    return <AnalysisPage />;
  }

  return <DashboardPage project={project} teamMembers={teamMembers} navigate={navigate} />;
}

