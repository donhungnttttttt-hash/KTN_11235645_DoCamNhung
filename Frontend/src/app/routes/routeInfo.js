const positiveId = value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;

export function routeInfo(route = "/dashboard") {
  const index = route.indexOf("?");
  const path = index < 0 ? route : route.slice(0, index);
  const params = new URLSearchParams(index < 0 ? "" : route.slice(index + 1));
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
    isFileWork, groupId, documentId, invalidFileWorkContext };
}

const pageNames = {
  '/dashboard/actions': 'Việc cần xử lý',
  '/dashboard': 'Tổng quan dự án', '/dashboard/testing': 'Tổng quan kiểm thử',
  '/board': 'Bảng Kanban', '/board/list': 'Danh sách công việc', '/board/new': 'Thêm công việc',
  '/tests': 'Thư viện test case', '/tests/cases': 'Tất cả test case',
  '/tests/cycles': 'Đợt kiểm thử', '/tests/retests': 'Kiểm thử lại',
  '/tests/file-work': 'Công việc theo file',
  '/issues': 'Quản lý lỗi', '/progress': 'Quản lý tiến độ', '/analysis': 'Tổng hợp & Phân tích',
  '/settings': 'Cài đặt dự án', '/settings/members': 'Thành viên dự án',
  '/settings/catalogs': 'Danh mục dự án', '/settings/rules': 'Quy tắc báo lỗi', '/settings/handbook': 'Sổ tay dự án',
};

export function pageTitle(route) {
  const { path, params, isFileWork, groupId, invalidFileWorkContext } = routeInfo(route);
  let name = pageNames[path];
  if (isFileWork) name = invalidFileWorkContext ? undefined : groupId ? 'Thực thi theo file' : 'Công việc theo file';
  else if (path.startsWith('/tests/documents/')) name = 'Tài liệu test case';
  else if (/^\/tests\/(?:cycles\/)?\d+$/.test(path)) name = 'Thực thi kiểm thử';
  else if (path.startsWith('/board/issue/')) name = 'Chi tiết công việc';
  else if (path === '/board' && params.get('view') === 'list') name = 'Danh sách công việc';
  return `${name || 'Không tìm thấy trang'} · TMS`;
}

