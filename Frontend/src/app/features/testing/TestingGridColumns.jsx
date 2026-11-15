import React,{useEffect,useRef} from 'react';

const widths={titleVi:150,preconditionsVi:280,stepsVi:320,viewpoint:150,confirmation:160,expectedVi:270,designNote:120,executionNote:190,sourceReference:150};
const fields=[['sourceId','ID',['id','caseno']],['sourceNo','No',['no']],['titleVi','Đối tượng test',['doituongtest','titlevi']],['preconditionsVi','Điều kiện tiên quyết',['dieukientienquyet','dieukientiende','preconditionsvi']],['stepsVi','Các bước test',['cacbuoctest','stepsvi']],['viewpoint','Quan điểm test',['quandiemtest']],['confirmation','Hạng mục xác nhận',['hangmucxacnhan','mucxacnhan']],['expectedVi','Kết quả mong đợi',['ketquamongdoi','expectedvi']],['designNote','Ghi chú thiết kế',['ghichuthietke']]];
const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');
export function approvedTestColumns(data){
 const headers=data?.headers||[],columns=data?.columns||{};
 return fields.map(([key,label,aliases])=>{const found=columns[key]??headers.findIndex(header=>aliases.includes(normalize(header)));return {key,label,index:found>=0?found:undefined};});
}
export function testerNames(row){return row.firstTesterName?[row.firstTesterName]:[];}
export function testingColumnWidth({index,label,key},columns,sourceIndex){
  if(key==='sourceNo')return 56;
  if(widths[key])return widths[key];
  if(index===sourceIndex)return 64;
  if(label==='MT & Ver')return 190;
  const field=Object.keys(columns).find(key=>columns[key]===index);
  if(widths[field])return widths[field];
  if(/^no\b/i.test(label.trim()))return 56;
  return 160;
}

export function ColumnResizeHandle({label,width,onResize,defaultWidth}){
  const drag=useRef(null),resize=useRef(onResize);resize.current=onResize;
  const clamp=value=>Math.min(720,Math.max(56,value));
  useEffect(()=>{
    const move=event=>{if(drag.current)resize.current(clamp(drag.current.width+event.clientX-drag.current.x));};
    const stop=()=>{drag.current=null;};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop);window.addEventListener('pointercancel',stop);window.addEventListener('blur',stop);
    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop);window.removeEventListener('blur',stop);};
  },[]);
  return <span className="testing-column-resize" role="separator" tabIndex={0} aria-orientation="vertical" aria-label={`Độ rộng cột ${label}`} aria-valuemin={56} aria-valuemax={720} aria-valuenow={Math.round(width)} title="Kéo để chỉnh độ rộng; phím ← → để điều chỉnh; bấm đúp để đặt lại"
    onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={x:event.clientX,width};}}
    onDoubleClick={()=>onResize(defaultWidth)}
    onKeyDown={event=>{const next={ArrowLeft:width-16,ArrowRight:width+16,Home:56,End:720}[event.key];if(next!=null){event.preventDefault();onResize(clamp(next));}}}/>;
}
