import React from 'react';
import { ProjectOverview } from '../modules/ProjectOverview';
import '../styles/project-overview.css';

export function DashboardPage({activeRoute='/dashboard',navigate}) {
  return <ProjectOverview activeRoute={activeRoute} navigate={navigate}/>;
}
