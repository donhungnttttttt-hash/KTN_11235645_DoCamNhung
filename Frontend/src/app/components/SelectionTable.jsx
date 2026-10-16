import React,{useEffect,useId,useRef,useState} from 'react';
import './selection-table.css';

/** Selection changes only affect visible, eligible rows; selections on other pages survive. */
export function SelectionTable({label,rows,selected,onChange,searchable=true,loading=false,
 extraTitle,empty='Không có mục phù hợp.',pageScope=false,filters}) {
 const [query,setQuery]=useState(''),[view,setView]=useState('');
 const id=useId(),allRef=useRef(null),searchRef=useRef(null),viewRef=useRef(null);
 const visible=rows.filter(row=>(!searchable || `${row.name} ${row.searchText||''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
  && (!view || (view==='selected')===selected.includes(row.id)));
 const eligible=visible.filter(row=>!row.disabled);
 const count=eligible.filter(row=>selected.includes(row.id)).length;
 const all=eligible.length>0&&count===eligible.length;
 const hiddenSelected=selected.filter(id=>!visible.some(row=>row.id===id)).length;
 const filtered=!!query.trim()||!!view;
 useEffect(()=>{if(allRef.current)allRef.current.indeterminate=count>0&&!all;},[count,all]);
 function toggleAll(checked){const ids=new Set(eligible.map(row=>row.id));onChange(checked?[...new Set([...selected,...ids])]:selected.filter(id=>!ids.has(id)));}
 function clearFilters(){setQuery('');setView('');(searchable?searchRef:viewRef).current?.focus();}
 return <section className="ui-selection" aria-label={label} aria-busy={loading}>
  <div className="ui-selection-filters">
   {filters}
   {searchable&&<label className="ui-field ui-filter-search">Tìm<input ref={searchRef} type="search" aria-label={`Tìm trong ${label}`} placeholder={pageScope?'Tìm trên trang…':'Tìm theo tên…'} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
   <label className="ui-field ui-filter-view">Hiển thị<select ref={viewRef} aria-label={`Hiển thị · ${label}`} value={view} onChange={e=>setView(e.target.value)}><option value="">Tất cả</option><option value="selected">{pageScope?'Đã chọn trên trang':'Đã chọn'}</option><option value="unselected">{pageScope?'Chưa chọn trên trang':'Chưa chọn'}</option></select></label>
   {filtered&&<button type="button" className="cat-btn ui-selection-reset" aria-label={`Xóa bộ lọc trong bảng · ${label}`} onClick={clearFilters}>Xóa bộ lọc trong bảng</button>}
  </div>
  <div className="ui-selection-summary"><label className="ui-selection-all"><input ref={allRef} type="checkbox" aria-label={`Chọn tất cả đang hiển thị · ${label}`} checked={all} disabled={loading||!eligible.length} onChange={e=>toggleAll(e.target.checked)}/><span>Chọn tất cả {pageScope?'trên trang':'đang hiển thị'} ({eligible.length})</span></label><span className="ui-selection-counts" aria-live="polite" aria-atomic="true"><span>{selected.length} mục đã chọn</span>{hiddenSelected>0&&<span>{hiddenSelected} mục ngoài phần đang hiển thị</span>}</span></div>
  <div className="ui-selection-scroll" role="region" aria-labelledby={id} tabIndex={0}>
   <table className="ui-selection-table"><caption id={id} className="sr-only">{label}</caption><thead><tr><th className="ui-selection-check" scope="col">Ô chọn</th><th scope="col">Tên</th>{extraTitle&&<th className="ui-selection-extra" scope="col">{extraTitle}</th>}</tr></thead>
    <tbody>{visible.map(row=><tr key={row.id} data-selected={selected.includes(row.id)}><td className="ui-selection-check"><label className="ui-selection-target"><input type="checkbox" aria-label={row.selectLabel||`Chọn ${row.name}`} checked={selected.includes(row.id)} disabled={loading||row.disabled} onChange={e=>onChange(e.target.checked?[...new Set([...selected,row.id])]:selected.filter(id=>id!==row.id))}/></label></td><td><span className="ui-selection-name">{row.name}</span>{row.description&&<small>{row.description}</small>}</td>{extraTitle&&<td>{row.extra}</td>}</tr>)}
    {!visible.length&&<tr><td colSpan={extraTitle?3:2}>{loading?'Đang tải…':filtered&&rows.length>0?(pageScope?'Không có mục khớp bộ lọc trên trang này. Xóa bộ lọc trong bảng hoặc xem trang khác.':'Không có mục khớp bộ lọc. Xóa bộ lọc trong bảng để xem lại danh sách.'):empty}</td></tr>}
    </tbody></table>
  </div>
 </section>;
}
