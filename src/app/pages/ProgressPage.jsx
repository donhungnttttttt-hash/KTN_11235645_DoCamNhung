import React from 'react';

export function ProgressPage({ memberProgress }) {
  return (
    <div className="cat-container space-y-4 py-3">
      <div className="border border-slate-200 bg-white p-3 rounded-xs space-y-3">
        <div className="font-bold text-slate-700 text-xs border-b border-slate-200 pb-2">Bảng tiến độ theo ngày</div>
        <div className="overflow-x-auto">
          <table className="cat-table text-center">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>07/08</th>
                <th>08/08</th>
                <th>09/08</th>
                <th>10/08</th>
                <th>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {memberProgress.map(m => (
                <tr key={m.id}>
                  <td className="text-left font-medium">{m.name}</td>
                  <td>{m.d07}</td>
                  <td>{m.d08}</td>
                  <td>{m.d09}</td>
                  <td>{m.d10}</td>
                  <td className="font-bold text-[#20B7A6]">{m.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

