import { apiRequest } from './client';

async function projectWrite(path, body) {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, {
    method: 'POST',
    headers: { [csrf.headerName]: csrf.token },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function projectUpdate(path, body, method = 'PATCH') {
  const csrf = await apiRequest('/auth/csrf');
  return apiRequest(path, {
    method,
    headers: { [csrf.headerName]: csrf.token },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export const projectsApi = {
  list: () => apiRequest('/projects'),
  get: (id) => apiRequest(`/projects/${id}`),
  create: (data) => projectWrite('/projects', data),
  update: (id, data) => projectUpdate(`/projects/${id}`, data),
  listMembers: (id) => apiRequest(`/projects/${id}/members`),
  addMember: (projectId, userId, data) => projectUpdate(`/projects/${projectId}/members/${userId}`, data, 'PUT'),
  memberCandidate: (projectId, username) => apiRequest(`/projects/${projectId}/member-candidate?username=${encodeURIComponent(username)}`),
  removeMember: (projectId, userId, version) => projectUpdate(`/projects/${projectId}/members/${userId}?expectedVersion=${version}`, null, 'DELETE'),
  // Catalog APIs
  listCatalog: (projectId, kind) => apiRequest(`/projects/${projectId}/catalogs/${kind}`),
  createCatalog: (projectId, kind, data) => projectWrite(`/projects/${projectId}/catalogs/${kind}`, data),
  updateCatalog: (projectId, kind, id, data) => projectUpdate(`/projects/${projectId}/catalogs/${kind}/${id}`, data),
  archiveCatalog: (projectId, kind, id, version) => projectUpdate(`/projects/${projectId}/catalogs/${kind}/${id}?expectedVersion=${version}`, null, 'DELETE'),
  // Ruleset APIs
  listRules: (projectId) => apiRequest(`/projects/${projectId}/bug-rule-versions`),
  createRuleset: (projectId, data) => projectWrite(`/projects/${projectId}/bug-rule-versions`, data),
  listRuleVersions: (projectId, rulesetId) => apiRequest(`/projects/${projectId}/bug-rule-versions/${rulesetId}/versions`),
  createRuleVersion: (projectId, rulesetId, data) => projectWrite(`/projects/${projectId}/bug-rule-versions/${rulesetId}/versions`, data),
  publishRule: (projectId, rulesetId, versionId, expectedActiveVersionId) => projectWrite(`/projects/${projectId}/bug-rule-versions/${rulesetId}/versions/${versionId}/publish`, { expectedActiveVersionId }),
  // Handbook APIs
  listHandbook: (projectId) => apiRequest(`/projects/${projectId}/handbook`),
  getHandbook: (projectId, id) => apiRequest(`/projects/${projectId}/handbook/${id}`),
  createHandbook: (projectId, data) => projectWrite(`/projects/${projectId}/handbook`, data),
  addRevision: (projectId, id, data) => projectWrite(`/projects/${projectId}/handbook/${id}/revisions`, data),
};
