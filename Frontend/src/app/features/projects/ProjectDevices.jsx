import React,{useCallback,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from '../admin/shared';
import {AllocationTable} from '../admin/AdminDevices';
export function ProjectDevices({projectId,api=adminApi,admin=false}) {
 const [page,setPage]=useState(0);const load=useCallback(signal=>admin?api.allocations({projectId,page,size:20},{signal}):api.projectDevices(projectId,{page,size:20},{signal}),[api,projectId,page,admin]);const state=useAdminRead(`project-devices:${projectId}:${page}`,load);
 return <section className="admin-card"><h2>Máy vật lý đang được bàn giao</h2><p>ADMIN quản lý bàn giao và thu hồi máy.</p><ReadState {...state}/>{state.data&&<><p>{state.data.totalElements} máy đang giữ.</p>{state.data.items.length?<AllocationTable items={state.data.items}/>:<p>Dự án chưa được bàn giao máy.</p>}<div className="ui-actions"><button className="cat-btn" disabled={!page} onClick={()=>setPage(page-1)}>Máy trước</button><button className="cat-btn" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Máy sau</button></div></>}</section>;
}
