import React,{useCallback,useEffect,useId,useState} from 'react';
import {useAdminRead,ReadState} from './shared';

/** Shared project chooser; each caller owns its selection and navigation. */
export function AdminUserProjectFilter({api,value,onChange,label="Dự án của người dùng",emptyLabel="Tất cả dự án"}) {
 const [page,setPage]=useState(0);const [selected,setSelected]=useState(null);
 const descriptionId=useId();
 const load=useCallback(signal=>api.projects({page,size:100},{signal}),[api,page]);
 const state=useAdminRead(`user-project-picker:${page}`,load);
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
  {value&&<p id={descriptionId} className="admin-picker-selected">Đã chọn: <strong>{selectedLabel}</strong></p>}
  <ReadState {...state}/>
  {state.data?.totalElements>100&&<div className="admin-picker-pages"><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Dự án trước</button><span>Trang {page+1}/{Math.ceil(state.data.totalElements/100)}</span><button type="button" disabled={(page+1)*100>=state.data.totalElements} onClick={()=>setPage(page+1)}>Dự án tiếp</button></div>}
 </div>;
}
