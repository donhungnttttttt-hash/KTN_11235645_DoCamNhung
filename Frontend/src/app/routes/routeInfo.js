const positiveId = value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;

export function routeInfo(route = "/dashboard") {
  const index = route.indexOf("?");
  const path = index < 0 ? route : route.slice(0, index);
  const params = new URLSearchParams(index < 0 ? "" : route.slice(index + 1));
  const isTesting = path === '/board/testing' || path.startsWith('/board/testing/');
  const testing = /^\/board\/testing(?:\/features\/([^/]+)(?:\/documents\/([^/]+))?)?$/.exec(path);
  const featureId = testing?.[1] ? positiveId(testing[1]) : null;
  const testingDocumentId = testing?.[2] ? positiveId(testing[2]) : null;
  const projects = params.getAll('projectId'), cases = params.getAll('caseId');
  const linkedProjectId = projects.length === 1 ? positiveId(projects[0]) : null;
  const testingCaseId = cases.length === 1 ? positiveId(cases[0]) : null;
  const invalidTestingContext = isTesting && (!testing || (testing[1] && !featureId) || (testing[2] && !testingDocumentId)
    || (projects.length > 0 && (projects.length !== 1 || !linkedProjectId))
    || (cases.length > 0 && (cases.length !== 1 || !testingCaseId || !testingDocumentId)));
  const isFileWork = path === '/tests/file-work' || path.startsWith('/tests/file-work/');
  const group = /^\/tests\/file-work\/([^/]+)$/.exec(path);
  const groupId = group ? positiveId(group[1]) : null;
  const documents = params.getAll('documentId');
  const documentId = documents.length === 1 ? positiveId(documents[0]) : undefined;
  const invalidFileWorkContext = isFileWork && (
    (path !== '/tests/file-work' && groupId === null) ||
    (documents.length > 0 && (documents.length !== 1 || documentId === null))
  );
  const runner = isFileWork ? null : /^\/tests\/(?:cycles\/)?([^/]+)$/.exec(path);
  return { path, params, specId: runner?.[1] ?? null, caseId: params.get("caseId"),
    isFileWork, groupId, documentId, invalidFileWorkContext,
    isTesting, featureId, testingDocumentId, linkedProjectId, testingCaseId, invalidTestingContext };
}

const pageNames = {
  '/dashboard/actions': 'Việc cần xử lý',
  '/dashboard': 'Tổng quan dự án', '/dashboard/testing': 'Tổng quan kiểm thử',
  '/board': 'Bảng trạng thái', '/board/list': 'Bảng trạng thái', '/board/testing': 'Quản lý kiểm thử',
  '/tests': 'Thư viện test case', '/tests/cases': 'Tất cả test case',
  '/tests/cycles': 'Đợt kiểm thử', '/tests/retests': 'Kiểm thử lại',
  '/tests/file-work': 'Công việc theo file',
  '/issues': 'Quản lý lỗi', '/progress': 'Quản lý tiến độ', '/analysis': 'Tổng hợp & Phân tích',
  '/settings': 'Thông tin chung', '/settings/notes': 'Note dự án', '/settings/members': 'Thành viên dự án',
  '/settings/catalogs': 'Danh mục dự án', '/settings/rules': 'Quy tắc báo lỗi', '/settings/handbook': 'Sổ tay dự án',
};

export function pageTitle(route) {
  const { path, isTesting, testingDocumentId, invalidTestingContext } = routeInfo(route);
  let name = pageNames[path];
  if (isTesting) name = invalidTestingContext ? undefined : testingDocumentId ? 'Tài liệu test case' : 'Quản lý kiểm thử';
  else if (path === '/tests' || path.startsWith('/tests/')) name = 'Luồng kiểm thử đã thay đổi';
  else if (path.startsWith('/board/issue/')) name = 'Chi tiết công việc';
  return `${name || 'Không tìm thấy trang'} · TMS`;
}

