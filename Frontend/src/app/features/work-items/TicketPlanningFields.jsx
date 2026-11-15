import React from 'react';
export function planningOf(item){return {startOn:item.startOn||null,dueOn:item.dueOn||null,estimatedHours:item.estimatedHours==null?null:Number(item.estimatedHours),actualHours:item.actualHours==null?null:Number(item.actualHours),milestoneIds:(item.milestones||[]).map(m=>Number(m.id)).sort((a,b)=>a-b)};}
export function TicketPlanningFields({value,onChange,milestones=[],savedMilestones=[],layout,assigneeField,closureField}){
 const update=(field,next)=>onChange({...value,[field]:next});
 const options=[...milestones,...savedMilestones.filter(old=>!milestones.some(m=>m.id===old.id))];
 return <div className={`ticket-planning-fields ${layout==='composer'?'is-composer':''}`}>
  {assigneeField}
  <label className="wi-field ticket-plan-start">Ngày bắt đầu<input type="date" min="1000-01-01" max="9999-12-31" value={value.startOn||''} onChange={e=>update('startOn',e.target.value||null)}/></label>
  <label className="wi-field ticket-plan-due">Hạn chót<input type="date" min={value.startOn||'1000-01-01'} max="9999-12-31" value={value.dueOn||''} onChange={e=>update('dueOn',e.target.value||null)}/></label>
  {layout!=='composer'&&<div className="ticket-plan-milestones">
   {layout==='composer'&&<div className="ticket-field-heading"><span>Mốc quan trọng</span><small>Chọn nhiều</small></div>}
   <details className="ticket-milestones"><summary aria-label="Mốc quan trọng">{layout==='composer'?(value.milestoneIds.length?`${value.milestoneIds.length} đã chọn`:'Chọn mốc quan trọng'):`Mốc quan trọng${value.milestoneIds.length?` · ${value.milestoneIds.length} đã chọn`:''}`}</summary>{options.length?options.map(m=><label key={m.id}><input type="checkbox" checked={value.milestoneIds.includes(Number(m.id))} onChange={e=>update('milestoneIds',e.target.checked?[...value.milestoneIds,Number(m.id)].sort((a,b)=>a-b):value.milestoneIds.filter(id=>id!==Number(m.id)))}/>{m.name}{m.archivedAt?' (đã lưu trữ)':''}</label>):<small>Chưa có mốc quan trọng.</small>}</details>
  </div>}
  {closureField}
  {layout!=='composer'&&<div className="ticket-plan-hours">
   {layout==='composer'&&<span className="ticket-hours-heading">Dự kiến / Thực tế (giờ)</span>}
   <label className="wi-field"><span className={layout==='composer'?'ticket-comment-label':undefined}>Dự kiến (giờ)</span><input type="number" min="0" max="99999999.99" step="0.01" value={value.estimatedHours??''} onChange={e=>update('estimatedHours',e.target.value===''?null:Number(e.target.value))}/></label>
   <label className="wi-field"><span className={layout==='composer'?'ticket-comment-label':undefined}>Thực tế (giờ)</span><input type="number" min="0" max="99999999.99" step="0.01" value={value.actualHours??''} onChange={e=>update('actualHours',e.target.value===''?null:Number(e.target.value))}/></label>
  </div>}
 </div>;
}
