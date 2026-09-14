import React, { useState } from 'react';
import { CatHandbook } from '../modules/CatHandbook';
import { KpiSummaryBar } from '../modules/KpiSummaryBar';

export function DashboardPage({ project, teamMembers }) {
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="cat-container flex gap-4 items-start py-3">
      {/* LEFT PANE SIDEBAR (~224px) */}
      <div className="w-56 flex-shrink-0 space-y-3">
        {/* Block 1: Donut Progress */}
        <div className="border border-slate-200 bg-white p-3 rounded-xs text-center space-y-2">
          <div className="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1 text-left">Biểu đồ tóm tắt</div>
          
          <div className="flex items-center justify-around pt-1">
            <div className="flex flex-col items-center">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-200" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path className="text-[#20B7A6]" strokeDasharray="100, 100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span className="absolute text-xs font-bold text-slate-800">100%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Thực hiện</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-200" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path className="text-[#0070F3]" strokeDasharray="100, 100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span className="absolute text-xs font-bold text-slate-800">100%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Kế hoạch</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 text-center">Đã tiêu hóa 136/136 trường hợp</div>
        </div>

        {/* Block 2: Phase Info */}
        <div className="border border-slate-200 bg-white p-3 rounded-xs space-y-1.5 text-[11px]">
          <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">Quy trình hiện tại</div>
          <div className="text-slate-700 font-semibold leading-snug">{project.phase}</div>
          <div className="text-slate-500 text-[10px] pt-1">Phiên bản: <span className="text-slate-700">-</span></div>
          <div className="text-slate-500 text-[10px]">Ngày bắt đầu: <span className="text-slate-700">{project.startDate}</span></div>
          <div className="text-slate-500 text-[10px]">Ngày kết thúc: <span className="text-slate-700">{project.endDate}</span></div>
          <div className="text-slate-500 text-[10px]">Số ngày đã trôi qua: <span className="text-slate-800 font-bold">{project.daysElapsed} ngày</span></div>
        </div>

        {/* Block 3: Team Members */}
        <div className="border border-slate-200 bg-white p-3 rounded-xs space-y-2 text-[11px]">
          <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">Thông tin đội nhóm</div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {teamMembers.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-slate-700">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">{m.name.charAt(0)}</div>
                <span className="text-[11px] font-medium">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANE MAIN AREA */}
      <div className="flex-1 space-y-4">
        {/* Sub-navigation Tabs */}
        <div className="border-b border-slate-200 flex items-center justify-between pb-1">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1 text-xs transition ${
                activeTab === 'summary'
                  ? 'font-bold text-[#20B7A6] border-b-2 border-[#20B7A6]'
                  : 'font-medium text-slate-500 hover:text-slate-800'
              }`}
            >
              Tổng hợp
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1 text-xs transition ${
                activeTab === 'manual'
                  ? 'font-bold text-[#20B7A6] border-b-2 border-[#20B7A6]'
                  : 'font-medium text-slate-500 hover:text-slate-800'
              }`}
            >
              Thủ công
            </button>
          </div>
        </div>

        {/* TAB 1: TỔNG HỢP */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <CatHandbook />
            <KpiSummaryBar />

            {/* PROGRESS SUMMARY TABLE */}
            <div className="border border-slate-200 bg-white p-3 rounded-xs space-y-2">
              <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1">Tóm tắt tiến độ kiểm tra tổng thể & Lịch trình</div>
              <div className="overflow-x-auto">
                <table className="cat-table text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold">
                      <th className="w-1/4">Tiến Độ Kiểm Tra Tổng Thể</th>
                      <th className="w-1/4">Tiến Độ Lịch Trình Kiểm Tra</th>
                      <th className="w-1/6 text-center">Cho đến ngày / Vào ngày hôm đó</th>
                      <th className="w-1/6">Phân Công / Trở ngại</th>
                      <th className="w-1/6 text-center">Bài tập kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-medium">Tổng số ca bệnh: <span className="font-bold text-slate-900 float-right">{project.totalCases}</span></td>
                      <td className="font-medium">lịch trình: <span className="font-bold text-slate-900 float-right">0 (0%)</span></td>
                      <td className="text-center font-semibold text-slate-600">0 (0%)</td>
                      <td className="font-medium">trọn: <span className="font-bold text-slate-900 float-right">7</span></td>
                      <td className="text-center font-bold text-slate-800">0</td>
                    </tr>
                    <tr>
                      <td className="font-medium">Đã tiêu hóa: <span className="font-bold text-[#20B7A6] float-right">{project.executedCases}</span></td>
                      <td className="font-medium">Đã tiêu hóa: <span className="font-bold text-[#20B7A6] float-right">{project.executedCases}</span></td>
                      <td className="text-center font-bold text-emerald-600">0</td>
                      <td className="font-medium">Hoàn thành: <span className="font-bold text-purple-600 float-right">6</span></td>
                      <td className="text-center font-bold text-slate-800">0</td>
                    </tr>
                    <tr>
                      <td className="font-medium">chưa tiêu (còn lại): <span className="font-bold text-slate-700 float-right">{project.unexecutedCases}</span></td>
                      <td className="font-medium">Chênh lệch giữa ngân sách và thực tế: <span className="font-bold text-emerald-600 float-right">↑ 136</span></td>
                      <td className="text-center font-bold text-emerald-600">0</td>
                      <td className="font-medium">Số ca bệnh (còn lại): <span className="font-bold text-red-600 float-right">1</span></td>
                      <td className="text-center font-bold text-slate-800">0</td>
                    </tr>
                    <tr>
                      <td className="font-medium">Tốc độ tiến độ: <span className="font-bold text-[#20B7A6] float-right">{project.progressPercent}%</span></td>
                      <td className="font-medium">Tỷ lệ hoàn thành kế hoạch: <span className="font-bold text-slate-700 float-right">0%</span></td>
                      <td className="text-center text-slate-500">0%</td>
                      <td className="font-medium">Tỷ lệ hỏng: <span className="font-bold text-red-600 float-right">{project.defectRate}</span></td>
                      <td className="text-center text-slate-500">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THỦ CÔNG */}
        {activeTab === 'manual' && (
          <div className="cat-handbook-box p-4 bg-white border border-slate-200 rounded-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Hướng dẫn thao tác thủ công</h3>
            <p className="text-xs text-slate-600">Thao tác chạy test được thực hiện trực tiếp trên giao diện Grid Spreadsheet. Hãy chọn tập tin đặc tả kiểm thử tương ứng ở tab [Quản lý kiểm thử] để mở lưới chạy test.</p>
          </div>
        )}
      </div>
    </div>
  );
}

