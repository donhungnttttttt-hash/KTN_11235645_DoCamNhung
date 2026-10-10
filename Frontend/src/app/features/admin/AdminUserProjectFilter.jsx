import React,{useCallback,useEffect,useId,useState} from 'react';
import {useAdminRead,ReadState} from './shared';

/** Shared project chooser; each caller owns its selection and navigation. */
export function AdminUserProjectFilter({api,value,onChange,label="Dự án của người dùng",emptyLabel="Tất cả dự án",searchable=true}) {
 const [page,setPage]=useState(0);const [selected,setSelected]=useState(null);
 const [search,setSearch]=useState(''),[keyword,setKeyword]=useState('');
 const descriptionId=useId();
 const load=useCallback(signal=>api.projects({page,size:100,...(keyword?{keyword}:{})},{signal}),[api,page,keyword]);
 const state=useAdminRead(`user-project-picker:${page}:${keyword}`,load);
 const listed=state.data?.items.find(p=>String(p.id)===String(value));
 const current=listed || (String(selected?.id)===String(value)?selected:null);
 const selectedLabel=current?`${current.code} · ${current.name}`:`Dự án #${value}`;
 useEffect(()=>{
  if(!value){setSelected(null);return;}
  if(listed){setSelected(listed);return;}
  if(String(selected?.id)===String(value)||!api.project)return;
  let live=true;
  api.project(value).then(project=>{if(live)setSelected(project);}).catch(()=>{});
  return()=>{live=false;};
 },[api,value,listed,selected]);
 function choose(event){const id=event.target.value;setSelected(state.data?.items.find(p=>String(p.id)===id)||null);onChange(id);}
 return <div className="admin-project-picker">
  <label className="ui-field">{label}<select value={value} onChange={choose} title={value?selectedLabel:emptyLabel} aria-describedby={value?descriptionId:undefined}>
   <option value="">{emptyLabel}</option>
   {value&&!listed&&<option value={value}>{selectedLabel}</option>}
   {state.data?.items.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
  </select></label>
  {searchable&&<div className="admin-picker-search"><label className="ui-field">Tìm dự án theo tên hoặc mã<input type="search" maxLength={100} value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setKeyword(search.trim());setPage(0);}}}/></label><button type="button" onClick={()=>{setKeyword(search.trim());setPage(0);}}>Tìm dự án</button>{keyword&&<button type="button" onClick={()=>{setSearch('');setKeyword('');setPage(0);}}>Xóa tìm kiếm dự án</button>}</div>}
  {keyword && state.data && <p role="status">{state.data.totalElements} dự án khớp “{keyword}”. Lựa chọn hiện tại được giữ nguyên.</p>}
  {value&&<p id={descriptionId} className="admin-picker-selected">Đã chọn: <strong>{selectedLabel}</strong></p>}
  <ReadState {...state}/>
  {state.data?.totalElements>100&&<div className="admin-picker-pages"><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Dự án trước</button><span>Trang {page+1}/{Math.ceil(state.data.totalElements/100)}</span><button type="button" disabled={(page+1)*100>=state.data.totalElements} onClick={()=>setPage(page+1)}>Dự án tiếp</button></div>}
 </div>;
}
