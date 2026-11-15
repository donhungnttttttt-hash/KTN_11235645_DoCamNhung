import React,{useId,useState} from 'react';
import './admin-overview-charts.css';

const results=[['OK','ok','#00ce4b'],['NG','ng','#ce1717'],['P','pending','#f5d800'],['Chưa chạy','notRun','#c0c0c0'],['NA','na','#7c858c']];
const states=[['ALLOCATED','Đã bàn giao','#138bca'],['AVAILABLE','Sẵn sàng','#13b58d'],['MAINTENANCE','Bảo trì','#f0ad35'],['RETIRED','Ngưng sử dụng','#8a91a2']];
const types=[['ANDROID','Android'],['TABLET','Tablet'],['IPHONE','iPhone'],['IPAD','iPad']];
const count=value=>Math.max(0,Number(value)||0);
export function StatusDistribution({metrics}){
 const total=count(metrics.total);let position=0;
 const stops=results.map(([,key,color])=>{const start=position;position+=total?count(metrics[key])/total*100:0;return `${color} ${start}% ${position}%`;});
 return <div className="admin-status-summary"><div className="admin-status-donut" role="img" aria-label={'Phân bố Status test case: '+results.map(([label,key])=>`${label} ${count(metrics[key])}`).join(', ')} style={{background:total?`conic-gradient(${stops.join(',')})`:'#e8eeee'}}><div><strong>{total.toLocaleString('vi-VN')}</strong><span>test case</span></div></div><div><strong>{count(metrics.tested??(count(metrics.ok)+count(metrics.ng)+count(metrics.pending)+count(metrics.na))).toLocaleString('vi-VN')}/{total.toLocaleString('vi-VN')} case đã test</strong><p>{total?'Phân bố trạng thái hiện tại':'Chưa có test case trong phạm vi'}</p></div></div>;
}
export function InventoryStacks({groups=[]}){
 const [opened,setOpened]=useState(null),[pinned,setPinned]=useState(null);const uid=useId();
 const other=groups.filter(r=>!types.some(([key])=>key===r.type)).reduce((sum,r)=>sum+count(r.total),0);
 return <><div className="admin-inventory-stacks" role="group" aria-label="Kho thiết bị theo loại">{types.map(([type,label])=>{
  const values=states.map(([status,name,color])=>({status,name,color,value:groups.filter(r=>r.type===type&&r.status===status).reduce((sum,r)=>sum+count(r.total),0)}));
  const total=values.reduce((sum,r)=>sum+r.value,0),show=opened===type,tip=uid+'-'+type;
  return <div key={type} className="admin-inventory-stack-row" onMouseEnter={()=>setOpened(type)} onMouseLeave={()=>{if(pinned!==type)setOpened(null);}}>
   <button type="button" className="admin-inventory-stack-button" aria-label={`${label}: ${total} máy. Xem tình trạng`} aria-describedby={show?tip:undefined} onMouseEnter={()=>setOpened(type)} onMouseLeave={()=>{if(pinned!==type)setOpened(null);}} onFocus={()=>setOpened(type)} onBlur={()=>{setOpened(null);setPinned(null);}} onClick={()=>{const next=pinned===type?null:type;setPinned(next);setOpened(next);}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpened(null);setPinned(null);}}}>
    <span className="admin-inventory-type">{label}</span><span className="admin-inventory-stack" aria-hidden="true">{values.map(r=><span key={r.status} style={{width:`${total?r.value/total*100:0}%`,background:r.color}}>{r.value>0&&r.value/total>=.1?r.value:''}</span>)}</span><strong>{total}</strong>
   </button>
   {show&&<div className="admin-inventory-tooltip" role="tooltip" id={tip}><strong>{label} · {total} máy</strong>{!total&&<p>Chưa có thiết bị</p>}<dl>{values.map(r=><div key={r.status}><dt><i style={{background:r.color}}/>{r.name}</dt><dd>{r.value} <span>({total?Math.round(r.value/total*100):0}%)</span></dd></div>)}</dl></div>}
  </div>;
 })}</div><div className="admin-inventory-legend" aria-label="Chú giải tình trạng máy">{states.map(([key,label,color])=><span key={key}><i style={{background:color}}/>{label}</span>)}</div>{other>0&&<p className="admin-inventory-other">{other} máy loại Khác vẫn được giữ trong kho, ngoài bốn loại trên.</p>}</>;
}
