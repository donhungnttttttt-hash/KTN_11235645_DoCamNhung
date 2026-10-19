import React,{useCallback,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from '../admin/shared';
import {AllocationTable} from '../admin/AdminDevices';
import {DeviceAllocationDialog} from '../admin/DeviceAllocationDialog';
import {ProjectDeviceAssignDialog} from './ProjectDeviceAssignDialog';
export function ProjectDevices({projectId,api=adminApi,admin=false,archived=false}) {
 const [page,setPage]=useState(0),[reload,setReload]=useState(0),[adding,setAdding]=useState(false),[returning,setReturning]=useState(null),[notice,setNotice]=useState('');
 const load=useCallback(signal=>admin?api.allocations({projectId,page,size:20},{signal}):api.projectDevices(projectId,{page,size:20},{signal}),[api,projectId,page,admin]);const state=useAdminRead(`project-devices:${projectId}:${page}:${reload}`,load);
 return <section className="admin-card"><div className="admin-page-heading"><h2>Máy vật lý của dự án</h2>{admin&&!archived&&<button className="cat-btn" onClick={()=>setAdding(true)}>Bổ sung máy vào dự án</button>}</div>
 <p>Máy vật lý được lấy từ kho thiết bị và bàn giao cho PM; PM tự phân phối nội bộ bên ngoài phần mềm.</p>
 {admin&&<p><a href="#/admin/devices">Mở kho / nhập máy mới</a></p>}{notice&&<p role="status">{notice}</p>}<ReadState {...state}/>{state.data&&<><p>{state.data.totalElements} máy đang giữ.</p>{state.data.items.length?<AllocationTable items={state.data.items} onReturn={admin?a=>setReturning(a):undefined}/>:<p>Dự án chưa được bàn giao máy.</p>}<div className="ui-actions"><button className="cat-btn" disabled={!page} onClick={()=>setPage(page-1)}>Máy trước</button><button className="cat-btn" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Máy sau</button></div></>}
 {adding&&<ProjectDeviceAssignDialog projectId={projectId} api={api} onClose={()=>setAdding(false)} onChanged={count=>{setNotice(`Đã bàn giao ${count} máy. Danh sách đã được cập nhật.`);setPage(0);setReload(n=>n+1);}}/>}
 {returning&&<DeviceAllocationDialog asset={{id:returning.assetId,assetCode:returning.assetCode}} allocation={returning} api={api} onCancel={()=>setReturning(null)} onSaved={()=>{setReturning(null);setReload(n=>n+1);setNotice('Đã thu hồi máy.');}}/>}</section>;
}
