import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {Check,ChevronDown,Search} from 'lucide-react';
import {ReadState} from './shared';

function visibleBounds(trigger){
 const viewport=window.visualViewport;
 let top=viewport?.offsetTop||0,bottom=top+(viewport?.height||window.innerHeight);
 const scrollers=[];
 for(let ancestor=trigger.parentElement;ancestor;ancestor=ancestor.parentElement){
  const style=getComputedStyle(ancestor),overflow=style.overflowY||style.overflow;
  if(!/auto|scroll|hidden|clip|overlay/.test(overflow))continue;
  const rect=ancestor.getBoundingClientRect();
  if(rect.height>0){const edge=rect.top+ancestor.clientTop;top=Math.max(top,edge);bottom=Math.min(bottom,edge+ancestor.clientHeight);}
  if(/auto|scroll|overlay/.test(overflow)&&ancestor.scrollHeight>ancestor.clientHeight)scrollers.push(ancestor);
 }
 return {top,bottom,scrollers};
}

/** Searchable project chooser. Typing never changes the caller's project scope. */
export function AdminProjectDropdown({label,emptyLabel,value,selectedLabel,onChange,search,onSearch,state,pendingSearch,pages,onReset}) {
 const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const [placement,setPlacement]=useState({above:false,height:380});
 const root=useRef(null),trigger=useRef(null),input=useRef(null),list=useRef(null);
 const id=useId(),popupId=`${id}-popup`,listId=`${id}-list`,labelId=`${id}-label`,valueId=`${id}-value`;
 const busy=pendingSearch||state.loading;
 const items=state.data?.items;
 const options=[{id:'',text:emptyLabel},...(items||[]).map(project=>({id:String(project.id),text:`${project.code} · ${project.name}`}))];
 const ready=!busy&&!state.error;

 function close(restoreFocus=false) {setOpen(false);if(restoreFocus)trigger.current?.focus();}
 function show() {onReset();setOpen(true);}
 function choose(index) {if(!ready||!options[index])return;onChange(options[index].id);close(true);}

 useEffect(()=>{
  if(open)input.current?.focus();
 },[open]);
 useEffect(()=>{
  setActive(ready?options.findIndex(option=>option.id===String(value||'')):-1);
 },[open,items,ready,value,emptyLabel]);
 useEffect(()=>{
  if(active>=0)list.current?.children[active]?.scrollIntoView?.({block:'nearest'});
 },[active]);
 useEffect(()=>{
  if(!open)return;
  function outside(event){if(!root.current?.contains(event.target))close();}
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 useLayoutEffect(()=>{
  if(!open)return;
  // The independently scrolling main/dialog can clip a popup before the viewport edge.
  // Make room once on open; subsequent user scrolling only remeasures placement.
  function position(makeRoom=false){
   const element=trigger.current;if(!element)return;
   let rect=element.getBoundingClientRect(),bounds=visibleBounds(element);
   const spaces=()=>({below:bounds.bottom-rect.bottom-12,above:rect.top-bounds.top-12});
   let room=spaces();
   const target=Math.min(240,Math.max(0,bounds.bottom-bounds.top-rect.height-24));
   if(makeRoom&&target>=136&&Math.max(room.above,room.below)+1<136){
    for(const ancestor of bounds.scrollers){
     const before=ancestor.scrollTop,max=Math.max(0,ancestor.scrollHeight-ancestor.clientHeight);
     const down=Math.min(Math.max(0,target-room.below),Math.max(0,max-before));
     const up=Math.min(Math.max(0,target-room.above),Math.max(0,before));
     // Prefer below when it can fit; otherwise use the side with more attainable room.
     const delta=room.below+down+1>=target?down:room.above+up+1>=target?-up:room.below+down>=room.above+up?down:-up;
     if(Math.abs(delta)<1)continue;
     ancestor.scrollTop=Math.max(0,Math.min(max,before+delta));
     rect=element.getBoundingClientRect();bounds=visibleBounds(element);room=spaces();
     if(Math.max(room.above,room.below)+1>=target)break;
    }
   }
   const useAbove=room.below<240&&room.above>room.below;
   setPlacement({above:useAbove,height:Math.max(0,Math.min(380,useAbove?room.above:room.below))});
  }
  const remeasure=()=>position();
  position(true);window.addEventListener('resize',remeasure);window.addEventListener('scroll',remeasure,true);
  window.visualViewport?.addEventListener('resize',remeasure);
  window.visualViewport?.addEventListener('scroll',remeasure);
  return()=>{
   window.removeEventListener('resize',remeasure);window.removeEventListener('scroll',remeasure,true);
   window.visualViewport?.removeEventListener('resize',remeasure);
   window.visualViewport?.removeEventListener('scroll',remeasure);
  };
 },[open]);

 function searchKey(event){
  if(event.nativeEvent.isComposing)return;
  if(['ArrowDown','ArrowUp'].includes(event.key)){
   event.preventDefault();if(!ready)return;
   setActive(index=>event.key==='ArrowDown'?Math.min(options.length-1,index+1):index<0?options.length-1:Math.max(0,index-1));
  }else if((event.key==='Home'||event.key==='End')&&!search){
   event.preventDefault();if(ready)setActive(event.key==='Home'?0:options.length-1);
  }else if(event.key==='Enter'){
   // Also prevent accidental submission when used in the device handover form.
   event.preventDefault();choose(active);
  }
 }

 return <div className="admin-project-dropdown" ref={root}
  onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}
  onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close(true);}}}>
  <label className="ui-field" id={labelId} htmlFor={`${id}-trigger`}>{label}</label>
  <div className="admin-project-dropdown-anchor">
   <button type="button" id={`${id}-trigger`} ref={trigger} className="admin-project-dropdown-trigger"
    aria-labelledby={labelId} aria-describedby={valueId} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?popupId:undefined}
    title={value?selectedLabel:emptyLabel} onClick={()=>open?close():show()}
    onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!open)show();}}}>
    <span id={valueId}>{value?selectedLabel:emptyLabel}</span><ChevronDown size={18} aria-hidden="true"/>
   </button>
   {open&&<div id={popupId} role="dialog" aria-labelledby={labelId} className={`admin-project-dropdown-popup${placement.above?' is-above':''}`} style={{maxHeight:placement.height}}>
    <div className="admin-project-dropdown-search"><Search size={18} aria-hidden="true"/>
     <input ref={input} type="search" role="combobox" aria-label="Tìm dự án theo tên hoặc mã" placeholder="Tìm theo tên hoặc mã dự án…"
      aria-expanded="true" aria-autocomplete="list" aria-controls={listId} aria-activedescendant={ready&&active>=0?`${id}-option-${active}`:undefined}
      maxLength={100} autoComplete="off" value={search} onChange={event=>{setActive(-1);onSearch(event.target.value);}} onKeyDown={searchKey}/>
    </div>
    <div className="admin-project-dropdown-results">
     <ReadState {...state} loading={busy}/>
     {ready&&items?.length===0&&<p className="admin-project-dropdown-message" role="status">{search.trim()?'Không tìm thấy dự án phù hợp.':'Chưa có dự án.'}</p>}
     <ul id={listId} ref={list} role="listbox" aria-label={label} aria-busy={busy} className="admin-project-dropdown-list">
      {ready&&options.map((option,index)=><li id={`${id}-option-${index}`} key={option.id} role="option" aria-selected={option.id===String(value||'')}
       className={active===index?'is-active':''} onMouseDown={event=>event.preventDefault()}
       onMouseMove={()=>setActive(index)} onClick={()=>choose(index)}>
       <span>{option.text}</span>{option.id===String(value||'')&&<Check size={16} aria-hidden="true"/>}
      </li>)}
     </ul>
    </div>
    {ready&&pages&&<div className="admin-project-dropdown-footer" onClick={()=>input.current?.focus()}>{pages}</div>}
   </div>}
  </div>
 </div>;
}
