import React from 'react';

/** Text values are the accessible data table; bars are a redundant visual encoding. */
export function MetricBars({label,rows,maximum}) {
 const max=maximum??Math.max(1,...rows.map(r=>r.value||0));
 return <div className="admin-metric-bars" role="group" aria-label={label}><table><thead><tr><th>Nhóm</th><th>Số lượng</th></tr></thead><tbody>{rows.map(r=><tr key={r.key??r.label}><th>{r.label}</th><td>{r.value??'Chưa có dữ liệu'}<div className="admin-bar-track" aria-hidden="true"><span style={{width:`${max?Math.max(0,(r.value||0)/max*100):0}%`}}/></div></td></tr>)}</tbody></table>{!rows.length&&<p>Chưa có dữ liệu.</p>}</div>;
}
