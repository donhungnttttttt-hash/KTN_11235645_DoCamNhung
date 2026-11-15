import {useGuestLanguage} from '../../i18n/GuestLanguage';
import React,{useState} from 'react';
export const number=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(Number(value)||0);
export const healthLabels={HIGH:'Cần can thiệp',WATCH:'Cần theo dõi',ON_TRACK:'Đạt mốc theo dõi',INSUFFICIENT_DATA:'Chưa đủ dữ liệu'};
const observed=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
export function ComparisonBars({items,label}){
 const {t,number}=useGuestLanguage();
 const max=Math.max(1,...items.filter(item=>observed(item.value)).map(item=>Number(item.value)));
 return <div className="gd-comparison" role="img" aria-label={label}>{items.map(item=><div key={item.label} className="gd-comparison-row"><div><span>{item.label}</span><strong>{observed(item.value)?number(item.value):t("Chưa ghi nhận")}</strong></div><div className="gd-comparison-track"><i style={{width:`${observed(item.value)?Math.max(0,Number(item.value))/max*100:0}%`,background:item.color}}/></div></div>)}</div>;
}
export function RingChart({items,value,unit,label}){
 const {number}=useGuestLanguage();
 const total=items.reduce((sum,item)=>sum+Math.max(0,Number(item.value)||0),0);let cursor=0;
 const stops=items.map(item=>{const from=cursor;cursor+=total?Math.max(0,Number(item.value)||0)/total*100:0;return `${item.color} ${from}% ${cursor}%`;});
 return <div className="gd-quality gd-summary-ring"><div className="gd-donut" role="img" aria-label={`${label}: ${items.map(item=>`${item.label} ${number(item.value)}`).join(', ')}`} style={{background:total?`conic-gradient(${stops.join(',')})`:'#e8eeee'}}><div><strong>{value}</strong><span>{unit}</span></div></div><dl>{items.map(item=><div key={item.label}><dt><i style={{background:item.color}}/>{item.label}</dt><dd>{number(item.value)}</dd></div>)}</dl></div>;
}
export function TrendChart({rows,series,label}){
 const {t,number,date}=useGuestLanguage();
 const [table,setTable]=useState(false);
 if(!rows.length)return <div className="gd-empty">{t("Chưa có lịch sử quan sát. Biểu đồ sẽ cập nhật khi hệ thống ghi nhận dữ liệu theo ngày.")}</div>;
 const values=rows.flatMap(row=>series.filter(s=>observed(row[s.key])).map(s=>Number(row[s.key])));
 const max=Math.max(1,...values),zeroOnly=values.length>0&&values.every(value=>value===0),snapshot=rows.length===1||zeroOnly||!values.length;
 const x=i=>48+i*650/Math.max(1,rows.length-1),y=value=>205-(Number(value)||0)*165/max;
 const segments=s=>{const result=[];let current=[];rows.forEach((row,i)=>{if(observed(row[s.key]))current.push(`${x(i)},${y(row[s.key])}`);else{if(current.length>1)result.push(current);current=[];}});if(current.length>1)result.push(current);return result;};
 const last=rows[rows.length-1];
 return <div className="gd-trend">{snapshot?<><p className="gd-chart-context">{rows.length===1?t("Mới có 1 ngày ghi nhận; hiển thị số liệu ngày này, chưa đủ để vẽ xu hướng."):zeroOnly?t("Các giá trị đã ghi nhận đều bằng 0; chưa có biến động trong khoảng xem."):t("Chưa ghi nhận giá trị cho các chỉ số trong khoảng xem.")}</p><p className="gd-chart-date">{t("Ngày")} {last.day}</p><ComparisonBars label={label} items={series.map(s=>({label:s.name,value:last[s.key],color:s.color}))}/></>:<svg viewBox="0 0 740 250" role="img" aria-label={label}>
  {[0,.25,.5,.75,1].map(r=><g key={r}><line x1="48" y1={y(r*max)} x2="708" y2={y(r*max)} stroke="#e5edee"/><text x="40" y={y(r*max)+4} textAnchor="end">{number(r*max)}</text></g>)}
  {rows.filter((_,i)=>i===0||i===rows.length-1||i%Math.max(1,Math.ceil(rows.length/5))===0).map(row=><text key={row.day} x={x(rows.indexOf(row))} y="230" textAnchor="middle">{String(row.day).slice(5)}</text>)}
  {series.map(s=><g key={s.key}>{segments(s).map((points,i)=><polyline key={i} fill="none" stroke={s.color} strokeWidth="3" strokeDasharray={s.dashed?'6 5':undefined} points={points.join(' ')}/>)}{rows.map((r,i)=>observed(r[s.key])&&<circle key={r.day} cx={x(i)} cy={y(r[s.key])} r="4" fill={s.color}><title>{r.day} · {s.name}: {number(r[s.key])}</title></circle>)}</g>)}
 </svg>}<div className="gd-legend">{!snapshot&&series.map(s=><span key={s.key}><i style={{background:s.color}}/>{s.name}</span>)}<button type="button" onClick={()=>setTable(!table)} aria-expanded={table}>{t(table?'Ẩn số liệu':'Xem số liệu')}</button></div>
 {table&&<div className="gd-table-scroll"><table><caption>{label}</caption><thead><tr><th>{t("Ngày")}</th>{series.map(s=><th key={s.key}>{s.name}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.day}><td>{row.day}</td>{series.map(s=><td key={s.key}>{observed(row[s.key])?number(row[s.key]):t("Chưa ghi nhận")}</td>)}</tr>)}</tbody></table></div>}</div>;
}
export function QualityChart({metrics}){
 const {t,number}=useGuestLanguage();
 const items=[['OK','ok','#13b78a'],['NG','ng','#e55a63'],['P','pending','#f4bb46'],['NA','na','#7d8b99'],['Unexecuted','notRun','#c0c7cb']];
 let cursor=0;const stops=items.map(([,key,color])=>{const start=cursor;cursor+=metrics.total?metrics[key]/metrics.total*100:0;return `${color} ${start}% ${cursor}%`;});
 return <div className="gd-quality"><div className="gd-donut" role="img" aria-label={t("Trạng thái {0} case",{0:(number(metrics.total))})} style={{background:metrics.total?`conic-gradient(${stops.join(',')})`:'#e8eeee'}}><div><strong>{number(metrics.total)}</strong><span>{t("test case")}</span></div></div><dl>{items.map(([label,key,color])=><div key={key}><dt><i style={{background:color}}/>{t(label)}</dt><dd>{number(metrics[key])}<small>{metrics.total?number(metrics[key]*100/metrics.total):0}%</small></dd></div>)}</dl></div>;
}
