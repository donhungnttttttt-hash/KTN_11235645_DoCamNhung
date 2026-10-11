import React,{useEffect,useId,useRef,useState} from 'react';
import './selection-table.css';

/** Selection changes only affect visible, eligible rows; selections on other pages survive. */
export function SelectionTable({label,rows,selected,onChange,searchable=true,loading=false,
 extraTitle,empty='Không có mục phù hợp.',pageScope=false,filters}) {
 const [query,setQuery]=useState(''),[view,setView]=useState('');
 const id=useId(),allRef=useRef(null);
 const visible=rows.filter(row=>(!searchable || `${row.name} ${row.searchText||''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
  && (!view || (view==='selected')===selected.includes(row.id)));
 const eligible=visible.filter(row=>!row.disabled);
 const count=eligible.filter(row=>selected.includes(row.id)).length;
 const all=eligible.length>0&&count===eligible.length;
 useEffect(()=>{if(allRef.current)allRef.current.indeterminate=count>0&&!all;},[count,all]);
 function toggleAll(checked){const ids=new Set(eligible.map(row=>row.id));onChange(checked?[...new Set([...selected,...ids])]:selected.filter(id=>!ids.has(id)));}
 return <section className="ui-selection" aria-label={label} aria-busy={loading}>
  <div className="ui-selection-filters">
   {filters}
   {searchable&&<label className="ui-field ui-filter-search">Tìm<input type="search" aria-label={`Tìm trong ${label}`} placeholder={pageScope?'Tìm trên trang…':'Tìm theo tên…'} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
   <label className="ui-field ui-filter-view">Hiển thị<select aria-label={`Hiển thị · ${label}`} value={view} onChange={e=>setView(e.target.value)}><option value="">Tất cả</option><option value="selected">Đã chọn</option><option value="unselected">Chưa chọn</option></select></label>
  </div>
  <div className="ui-selection-summary"><label className="ui-selection-all"><input ref={allRef} type="checkbox" aria-label={`Chọn tất cả đang hiển thị · ${label}`} checked={all} disabled={loading||!eligible.length} onChange={e=>toggleAll(e.target.checked)}/><span>Chọn tất cả {pageScope?'trên trang':'đang hiển thị'} ({eligible.length})</span></label><span>{selected.length} mục đã chọn</span></div>
  <div className="ui-selection-scroll" role="region" aria-labelledby={id} tabIndex={0}>
   <table className="ui-selection-table"><caption id={id} className="sr-only">{label}</caption><thead><tr><th className="ui-selection-check" scope="col">Ô chọn</th><th scope="col">Tên</th>{extraTitle&&<th className="ui-selection-extra" scope="col">{extraTitle}</th>}</tr></thead>
    <tbody>{visible.map(row=><tr key={row.id} data-selected={selected.includes(row.id)}><td className="ui-selection-check"><label className="ui-selection-target"><input type="checkbox" aria-label={row.selectLabel||`Chọn ${row.name}`} checked={selected.includes(row.id)} disabled={loading||row.disabled} onChange={e=>onChange(e.target.checked?[...new Set([...selected,row.id])]:selected.filter(id=>id!==row.id))}/></label></td><td><span className="ui-selection-name">{row.name}</span>{row.description&&<small>{row.description}</small>}</td>{extraTitle&&<td>{row.extra}</td>}</tr>)}
    {!visible.length&&<tr><td colSpan={extraTitle?3:2}>{loading?'Đang tải…':empty}</td></tr>}
    </tbody></table>
  </div>
 </section>;
}
