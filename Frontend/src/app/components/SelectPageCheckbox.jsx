import React,{useEffect,useRef} from 'react';

export function SelectPageCheckbox({ids,selected,onChange,label='Chọn tất cả trên trang',disabled=false}) {
 const ref=useRef(null),count=ids.filter(id=>selected.includes(id)).length;
 const checked=ids.length>0&&count===ids.length;
 useEffect(()=>{if(ref.current)ref.current.indeterminate=count>0&&!checked;},[count,checked]);
 return <label className="ui-page-selection"><input ref={ref} type="checkbox" checked={checked} disabled={disabled||!ids.length} onChange={e=>onChange(e.target.checked?[...new Set([...selected,...ids])]:selected.filter(id=>!ids.includes(id)))}/><span>{label} ({ids.length})</span></label>;
}
