import React from 'react';
const statuses=[['ok','OK'],['ng','NG'],['pending','P'],['na','NA'],['notRun','Unexecuted']];
export function ProgressSummary({metrics,asOf}) {
 const total=Number(metrics.total)||0;
 const percent=Math.round(Math.max(0,Math.min(100,Number(metrics.executionPercent)||0))*100)/100;
 return <><h2>Tiến độ kiểm thử</h2><p className="management-progress-text">{total?`${metrics.tested} / ${total} case đã test · ${percent}%`:'Chưa có case trong phạm vi này.'}</p><p>Đã test gồm OK, NG, P và NA; tiến độ không thay cho xác nhận nghiệm thu.</p>
 <div className="management-status-bar" role="img" aria-label={statuses.map(([key,label])=>`${label}: ${metrics[key]??0}`).join(' · ')}>{statuses.map(([key,label])=><span key={key} className={`management-status-${key}`} title={`${label}: ${metrics[key]??0}`} style={{width:`${total?(Number(metrics[key])||0)*100/total:0}%`}}/>)}</div>
 <ul className="management-status-legend">{statuses.map(([key,label])=><li key={key}><span className={`management-status-${key}`} aria-hidden="true"/>{label}: {metrics[key]??0}</li>)}</ul>
 <p className="management-as-of">Cập nhật {asOf?new Date(asOf).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—'} · giờ Việt Nam</p></>;
}
