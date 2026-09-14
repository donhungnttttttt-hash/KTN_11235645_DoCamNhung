import React from 'react';

export function Header({ navigate }) {
  return (
    <header className="h-12 border-b border-slate-300 bg-white px-4 flex items-center justify-between text-xs flex-shrink-0 z-30">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-6 h-6 rounded-full bg-[#20B7A6] flex items-center justify-center font-bold text-white text-xs shadow-xs">
          S+
        </div>
        <span className="font-bold text-sm text-slate-900 tracking-tight">Flutter</span>
      </div>

      <div className="hidden md:flex items-center gap-3 text-slate-700 font-medium">
        <div>Dự án: <span className="font-bold text-slate-900">Flutter</span></div>
        <span className="text-slate-300">|</span>
        <div>Giai đoạn: <span className="font-bold text-slate-900">Chuẩn_iPad Merge Regression</span></div>
      </div>

      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
          Chế độ xem · hết hạn 01/09/2027 09:00
        </span>

        <div className="hidden lg:flex items-center gap-2 text-slate-500 text-[11px]">
          <span>SpiderPlus Co., Ltd.</span>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-800">Nguyen Xuan Nguyen Giap</span>
        </div>

        <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-[10px]">
          NG
        </div>

        <select className="cat-select text-[10px]" onChange={(e) => alert('Chuyển đợt test: ' + e.target.value)}>
          <option>Chuẩn_iPad Merge Regression</option>
          <option>Chuẩn_Android Regression</option>
          <option>System Test Sprint 14</option>
        </select>
      </div>
    </header>
  );
}

