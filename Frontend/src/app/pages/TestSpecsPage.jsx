import React from 'react';

export function TestSpecsPage({ testSpecs, navigate }) {
  return (
    <div className="cat-container space-y-3 py-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h2 className="text-sm font-bold text-slate-900">Danh sách Test Specification ({testSpecs.length})</h2>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button onClick={() => alert('Đăng ký Test Spec mới')} className="cat-btn cat-btn-mint">Đăng ký</button>
          <button className="cat-btn">Thuộc tính</button>
          <button className="cat-btn">Cài đặt Sheet</button>
          <button className="cat-btn">Tải xuống</button>
          <input type="text" placeholder="Từ khóa tìm kiếm..." className="cat-input w-40" />
          <button className="cat-btn">Cài đặt hiển thị</button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="cat-table">
          <thead>
            <tr>
              <th className="w-10 text-center">No.</th>
              <th>Test Specification</th>
              <th className="text-center">Số Case</th>
              <th className="text-center">Tiến độ</th>
              <th className="text-center">Chưa làm</th>
              <th className="text-center">OK</th>
              <th className="text-center">Đã sửa</th>
              <th className="text-center">NG</th>
              <th className="text-center">Tạm hoãn</th>
              <th>Ngày cập nhật</th>
              <th>Người cập nhật</th>
              <th className="text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {testSpecs.map(s => (
              <tr key={s.no} className="hover:bg-slate-50">
                <td className="text-center text-slate-500 font-mono">{s.no}</td>
                <td>
                  <span onClick={() => navigate(`/tests/${s.no}`)} className="cat-link font-medium flex items-center gap-1.5 cursor-pointer">
                    <span>{s.name}</span>
                  </span>
                </td>
                <td className="text-center font-bold">{s.caseCount}</td>
                <td className="text-center font-bold text-[#20B7A6]">100%</td>
                <td className="text-center text-slate-400">{s.unexecuted}</td>
                <td className="text-center cat-status-ok">{s.ok}</td>
                <td className="text-center cat-status-fixed">{s.fixed}</td>
                <td className="text-center cat-status-ng">{s.ng}</td>
                <td className="text-center text-slate-400">{s.pending}</td>
                <td className="text-slate-500 text-[10px]">{s.updatedAt}</td>
                <td className="text-slate-600">{s.updatedBy}</td>
                <td className="text-center">
                  <span className="text-[10px] text-emerald-700 font-semibold">{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

