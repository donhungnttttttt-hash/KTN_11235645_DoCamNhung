import React from 'react';
import { useProject } from './ProjectProvider';
import { useAuth } from '../auth/AuthProvider';

export function ProjectAccessNotice() {
  const { currentProject } = useProject() || {};
  const { hasRole } = useAuth() || {};
  if (!currentProject || !hasRole?.('ADMIN')) return null;
  return <p className="project-access-notice" role="status">
    {currentProject.archived ? 'Dự án đã lưu trữ. Mở lại dự án để tiếp tục chỉnh sửa.' : 'Bạn có toàn quyền quản trị dự án: chỉnh sửa, phân công, duyệt và cập nhật kết quả kiểm thử.'}
  </p>;
}
