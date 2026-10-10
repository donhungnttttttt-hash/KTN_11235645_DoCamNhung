// Global visibility does not grant a project membership or a PM/executor role.
export function isProjectObserver(project, hasRole) {
  return Boolean(project && hasRole?.('ADMIN') && !project.projectRole);
}

export function canManageProjectWork(project, hasRole) {
  return Boolean(project && !project.archived && !isProjectObserver(project, hasRole)
    && project.projectRole !== 'DEV' && !hasRole?.('DEV')
    && (project.projectRole === 'PM' || hasRole?.('ADMIN')));
}
