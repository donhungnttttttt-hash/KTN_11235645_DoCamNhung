import React, {useEffect,useId,useRef,useState} from 'react';
import './table-scroll.css';

export function TableScroll({children,className='',label,'aria-label':ariaLabel,'aria-describedby':description,...props}) {
  const ref=useRef(null),hintId=useId();
  const [horizontal,setHorizontal]=useState(false);
  useEffect(()=>{
    const element=ref.current;
    const measure=()=>setHorizontal(element.scrollWidth>element.clientWidth+1);
    measure();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
    observer?.observe(element);
    if(element.firstElementChild)observer?.observe(element.firstElementChild);
    window.addEventListener('resize',measure);
    return ()=>{observer?.disconnect();window.removeEventListener('resize',measure);};
  },[children]);
  return <div className="ui-table-frame">
    {horizontal&&<p className="ui-table-hint" id={hintId}>Kéo thanh cuộn ngang để xem thêm cột. Có thể dùng Shift + con lăn hoặc phím ← → khi chọn bảng.</p>}
    <div {...props} ref={ref} className={`ui-table-region ${className}`} role="region" tabIndex={0}
      aria-label={label||ariaLabel} aria-describedby={[description,horizontal?hintId:null].filter(Boolean).join(' ')||undefined} data-lenis-prevent>
      {children}
    </div>
  </div>;
}
