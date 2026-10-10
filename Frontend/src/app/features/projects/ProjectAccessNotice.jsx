import React from 'react';
import { useProject } from './ProjectProvider';
import { useAuth } from '../auth/AuthProvider';
import { isProjectObserver } from './projectAccess';

export function ProjectAccessNotice() {
  const { currentProject } = useProject() || {};
  const { hasRole } = useAuth() || {};
  if (!isProjectObserver(currentProject, hasRole)) return null;
  return <p className="project-access-notice" role="status">
    Bạn đang xem dữ liệu dự án với quyền quản trị tổng. Việc phân công và cập nhật kết quả do thành viên được giao thực hiện.
  </p>;
}
