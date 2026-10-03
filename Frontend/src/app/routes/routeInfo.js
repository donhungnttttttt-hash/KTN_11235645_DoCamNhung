export function routeInfo(route = "/dashboard") {
  const index = route.indexOf("?");
  const path = index < 0 ? route : route.slice(0, index);
  const params = new URLSearchParams(index < 0 ? "" : route.slice(index + 1));
  const runner = /^\/tests\/(?:cycles\/)?([^/]+)$/.exec(path);
  return { path, params, specId: runner?.[1] ?? null, caseId: params.get("caseId") };
}

const pageNames = {
  '/dashboard': 'Tổng quan dự án', '/dashboard/testing': 'Tổng quan kiểm thử',
  '/board': 'Bảng Kanban', '/board/list': 'Danh sách công việc', '/board/new': 'Thêm công việc',
  '/tests': 'Thư viện test case', '/tests/cases': 'Tất cả test case',
  '/tests/cycles': 'Đợt kiểm thử', '/tests/retests': 'Kiểm thử lại',
  '/issues': 'Quản lý lỗi', '/progress': 'Quản lý tiến độ', '/analysis': 'Tổng hợp & Phân tích',
  '/settings': 'Cài đặt dự án', '/settings/members': 'Thành viên dự án',
  '/settings/catalogs': 'Danh mục dự án', '/settings/rules': 'Quy tắc báo lỗi', '/settings/handbook': 'Sổ tay dự án',
};

export function pageTitle(route) {
  const { path, params } = routeInfo(route);
  let name = pageNames[path];
  if (path.startsWith('/tests/documents/')) name = 'Tài liệu test case';
  else if (/^\/tests\/(?:cycles\/)?\d+$/.test(path)) name = 'Thực thi kiểm thử';
  else if (path.startsWith('/board/issue/')) name = 'Chi tiết công việc';
  else if (path === '/board' && params.get('view') === 'list') name = 'Danh sách công việc';
  return `${name || 'Không tìm thấy trang'} · TMS`;
}

