// Global administrators operate in every project, regardless of local membership.
export function isProjectObserver(project, hasRole) {
  return Boolean(project && !hasRole?.('ADMIN') && !project.projectRole);
}

export function canManageProjectWork(project, hasRole) {
  return Boolean(project && !project.archived && (hasRole?.('ADMIN')
    || (project.projectRole === 'PM' && !hasRole?.('DEV'))));
}

export function isProjectDeveloper(project, hasRole) {
  return !hasRole?.('ADMIN') && Boolean(hasRole?.('DEV') || project?.projectRole === 'DEV');
}

export function canImportTestCases(project, hasRole) {
  return Boolean(project && !project.archived && (hasRole?.('ADMIN') || canManageProjectWork(project, hasRole)));
}
