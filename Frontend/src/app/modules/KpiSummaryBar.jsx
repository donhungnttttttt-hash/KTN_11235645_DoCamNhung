import React from 'react';

export function KpiSummaryBar() {
  return (
    <div className="space-y-1 pt-2">
      <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
        <span>Giá trị tổng hợp (Summary Metrics)</span>
        <span className="text-[10px] text-slate-500 font-normal">Dự án: Flutter • Giai đoạn: Chuẩn_iPad Merge Regression</span>
      </div>
      <div className="cat-kpi-bar">
        <div className="cat-kpi-block cat-kpi-block-unexec">
          <span className="text-[11px] font-medium">Chưa được thực thi</span>
          <span className="text-xl font-extrabold mt-0.5">0 <span className="text-xs font-normal">trường hợp</span></span>
        </div>
        <div className="cat-kpi-block cat-kpi-block-ng">
          <span className="text-[11px] font-medium">NG</span>
          <span className="text-xl font-extrabold mt-0.5">1 <span className="text-xs font-normal">trường hợp</span></span>
        </div>
        <div className="cat-kpi-block cat-kpi-block-pending">
          <span className="text-[11px] font-medium">đang chờ</span>
          <span className="text-xl font-extrabold mt-0.5">0 <span className="text-xs font-normal">trường hợp</span></span>
        </div>
        <div className="cat-kpi-block cat-kpi-block-fixed">
          <span className="text-[11px] font-medium">Đã sửa</span>
          <span className="text-xl font-extrabold mt-0.5">1 <span className="text-xs font-normal">trường hợp</span></span>
        </div>
        <div className="cat-kpi-block cat-kpi-block-ok">
          <span className="text-[11px] font-medium">ĐƯỢC RỒI (OK)</span>
          <span className="text-xl font-extrabold mt-0.5">134 <span className="text-xs font-normal">trường hợp</span></span>
        </div>
        <div className="cat-kpi-block cat-kpi-block-na">
          <span className="text-[11px] font-medium">Không áp dụng</span>
          <span className="text-xl font-extrabold mt-0.5">0 <span className="text-xs font-normal">trường hợp</span></span>
        </div>
      </div>
    </div>
  );
}

