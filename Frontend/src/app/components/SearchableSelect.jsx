import React,{useState,useRef,useId,useLayoutEffect,useEffect} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown} from 'lucide-react';
import './searchable-select.css';

export function SearchableSelect({label,value,options,onChange,disabled=false,searchable=true,placeholder='Chọn',className=''}) {
 const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[position,setPosition]=useState({});
 const trigger=useRef(null),panel=useRef(null),id=useId();
 const selected=options.find(o=>String(o.value)===String(value));
 const filtered=options.filter(o=>o.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const close=()=>{setOpen(false);trigger.current?.focus();};
 useLayoutEffect(()=>{if(!open)return;const place=()=>{const r=trigger.current.getBoundingClientRect(),width=Math.min(Math.max(r.width,220),window.innerWidth-16);const below=window.innerHeight-r.bottom-12,above=r.top-12;const flip=below<180&&above>below;setPosition({left:Math.max(8,Math.min(r.left,window.innerWidth-width-8)),width,maxHeight:Math.max(100,Math.min(330,flip?above:below)),...(flip?{bottom:window.innerHeight-r.top+4}:{top:r.bottom+4})});};place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};},[open]);
 useEffect(()=>{if(!open)return;panel.current?.querySelector('input, [role=option]:not(:disabled)')?.focus();const outside=e=>{if(!trigger.current?.contains(e.target)&&!panel.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 function keys(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){e.preventDefault();close();}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){const items=[...panel.current.querySelectorAll('[role=option]:not(:disabled)')];if(!items.length)return;e.preventDefault();let i=items.indexOf(document.activeElement);i=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[i].focus();}}
 return <><button type="button" id={id+'control'} ref={trigger} role="combobox" aria-label={label} aria-controls={open?id:undefined} aria-expanded={open} aria-haspopup="listbox" disabled={disabled} className={`ui-select-trigger ${className}`} onClick={()=>{setSearch('');setOpen(v=>!v);}} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true);}}}><span>{selected?.label||placeholder}</span><ChevronDown size={14} aria-hidden="true" className={open?'is-open':''}/></button>
 {open&&createPortal(<div ref={panel} data-picker-owner={id+'control'} className="ui-select-popup" style={position} onKeyDown={keys}>
 {searchable&&<input type="search" aria-label={`Tìm ${label}`} placeholder="Tìm kiếm…" value={search} onChange={e=>setSearch(e.target.value)}/>}
 <div id={id} role="listbox" aria-label={label}>{filtered.map(o=><button type="button" key={o.value} role="option" aria-selected={String(o.value)===String(value)} disabled={o.disabled} onClick={()=>{onChange(String(o.value));close();}}>{o.label}</button>)}{!filtered.length&&<p>Không có kết quả phù hợp.</p>}</div>
 </div>,document.body)}</>;
}
