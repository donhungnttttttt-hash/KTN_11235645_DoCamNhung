import React from 'react';
export function KpiSummaryBar({ metrics }) {
  if (!metrics) return null;
  const blocks=[['notRun','Chưa chạy','unexec'],['ng','NG · Không đạt','ng'],['pending','P · Tạm hoãn','pending'],['ok','OK · Đạt','ok'],['na','NA · Ngoài phạm vi','na'],['awaitingVerification','Bug chờ xác minh','fixed']];
  return <section className="cat-kpi-bar" aria-label="Kết quả kiểm thử">{blocks.map(([key,label,color])=><div key={key} className={`cat-kpi-block cat-kpi-block-${color}`}><span className="text-xs font-medium">{label}</span><strong className="text-xl mt-1">{metrics[key]} <small className="text-xs font-normal">{key==='awaitingVerification'?'lỗi':'lượt'}</small></strong></div>)}</section>;
}
