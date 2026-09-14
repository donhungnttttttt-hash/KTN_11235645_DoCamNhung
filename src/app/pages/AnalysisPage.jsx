import React from 'react';

export function AnalysisPage() {
  return (
    <div className="cat-container flex gap-4 items-start py-3">
      <div className="flex-1 space-y-4">
        <div className="border border-slate-200 bg-white p-3 rounded-xs space-y-3">
          <div className="font-bold text-slate-700 text-xs border-b border-slate-200 pb-2">Bảng tổng hợp & Phân tích chất lượng</div>
          <p className="text-xs text-slate-600">Phân tích mật độ lỗi theo từng quan điểm kiểm thử (Viewpoint) và mức độ nghiêm trọng.</p>
        </div>
      </div>

      <div className="w-64 flex-shrink-0 border border-slate-200 bg-white p-3 rounded-xs space-y-3 text-[11px]">
        <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">Bộ lọc phân tích</div>
        <select className="cat-select w-full"><option>Theo Viewpoint</option></select>
        <button onClick={() => alert('Đã áp dụng bộ lọc phân tích')} className="cat-btn cat-btn-mint w-full">Áp dụng</button>
      </div>
    </div>
  );
}

