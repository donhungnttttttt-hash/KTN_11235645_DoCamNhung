import React,{useCallback,useEffect,useState} from 'react';
import {useAdminRead,ReadState} from './shared';

/** Same paged all-project read as the Projects picker; selection belongs to Users only. */
export function AdminUserProjectFilter({api,value,onChange,label="Dự án của người dùng",emptyLabel="Tất cả dự án"}) {
 const [page,setPage]=useState(0);const [selected,setSelected]=useState(null);
 const load=useCallback(signal=>api.projects({page,size:100},{signal}),[api,page]);
 const state=useAdminRead(`user-project-picker:${page}`,load);
 useEffect(()=>{if(!value||state.data?.items.some(p=>String(p.id)===String(value))||!api.project)return;let live=true;api.project(value).then(p=>{if(live)setSelected(p);}).catch(()=>{});return()=>{live=false;};},[api,value,state.data]);
 function choose(event){const id=event.target.value;setSelected(state.data?.items.find(p=>String(p.id)===id)||null);onChange(id);}
 return <div><label className="ui-field">{label}<select value={value} onChange={choose}><option value="">{emptyLabel}</option>{value&&selected&&!state.data?.items.some(p=>String(p.id)===value)&&<option value={value}>{selected.code} · {selected.name}</option>}{state.data?.items.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><ReadState {...state}/>{state.data?.totalElements>100&&<div className="admin-picker-pages"><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Dự án trước</button><button type="button" disabled={(page+1)*100>=state.data.totalElements} onClick={()=>setPage(page+1)}>Dự án tiếp</button></div>}</div>;
}
