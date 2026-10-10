import {TableScroll} from '../components/TableScroll';
import React from 'react';

export function IssuesPage({ issues }) {
  return (
    <div className="cat-container flex gap-4 items-start py-3">
      <div className="w-48 flex-shrink-0 border border-slate-200 bg-white p-3 rounded-xs space-y-3 ui-caption">
        <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">Tóm tắt bộ lọc</div>
        <div className="space-y-1">
          <span className="font-bold text-slate-600 block ui-caption uppercase">Bộ lọc hệ thống</span>
          <div className="flex justify-between items-center p-1.5 bg-[#EBF8F6] text-[#20B7A6] font-bold rounded cursor-pointer">
            <span>Lỗi đang mở</span>
            <span className="cat-status-ng">1</span>
          </div>
          <div className="flex justify-between items-center p-1.5 text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
            <span>Tất cả lỗi</span>
            <span className="font-bold">7</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-bold text-slate-900">Danh sách lỗi ({issues.length})</h2>
          <input type="text" placeholder="Tìm kiếm tiêu đề..." className="cat-input w-52" />
        </div>

        <TableScroll label="Danh sách lỗi" className="overflow-x-auto border border-slate-200 bg-white">
          <table className="cat-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Giai đoạn</th>
                <th>Loại</th>
                <th>Tiêu đề</th>
                <th>Người phụ trách</th>
                <th>Mức độ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(i => (
                <tr key={i.id}>
                  <td className="font-mono font-bold"><span className="cat-link">{i.id}</span></td>
                  <td className="text-slate-500 ui-caption">{i.phase}</td>
                  <td>{i.type}</td>
                  <td className="font-medium text-slate-900 max-w-xs truncate">{i.title}</td>
                  <td>{i.assignee}</td>
                  <td><span className={i.severity === 'Nghiêm trọng' ? 'text-red-600 font-bold' : 'text-slate-700'}>{i.severity}</span></td>
                  <td><span className={i.status === 'Chưa xử lý' ? 'cat-status-ng' : 'cat-status-ok'}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </div>
  );
}

