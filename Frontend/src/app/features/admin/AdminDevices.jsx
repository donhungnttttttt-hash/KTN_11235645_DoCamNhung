import React,{useCallback,useState,useRef,useEffect} from 'react';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from './shared';
import {AdminUserProjectFilter} from './AdminUserProjectFilter';
import {DeviceAssetForm,assetStatuses} from './DeviceAssetForm';
import {DeviceAllocationDialog} from './DeviceAllocationDialog';
export function AllocationTable({items,onReturn}) {
 const time=value=>value?new Date(value).toLocaleString('vi-VN'):'—';
 return <div className="admin-table-scroll" tabIndex={0} aria-label="Lịch sử bàn giao máy"><table><thead><tr><th>Máy</th><th>Dự án / người nhận</th><th>Bàn giao</th><th>Hạn trả</th><th>Thu hồi</th><th>Ghi chú</th>{onReturn&&<th>Thao tác</th>}</tr></thead><tbody>{items.map(a=><tr key={a.id}><th>{a.assetCode} · {a.model}</th><td>{a.projectCode} · {a.projectName}<br/>{a.recipientName} · {a.recipientUsername}</td><td>{time(a.assignedAt)}<br/>{a.assignedByName}</td><td>{a.expectedReturnOn||'Chưa đặt'}</td><td>{a.returnedAt?<>{time(a.returnedAt)}<br/>{a.returnedByName} · {assetStatuses[a.returnedCondition]}</>:'Đang bàn giao'}</td><td>{a.handoverNote||'—'}{a.returnNote&&<p>Thu hồi: {a.returnNote}</p>}</td>{onReturn&&<td>{!a.returnedAt&&<button onClick={()=>onReturn(a)}>Thu hồi {a.assetCode}</button>}</td>}</tr>)}</tbody></table></div>;
}
export function AdminDevices({api=adminApi,initialProjectId=''}) {
 const [projectId,setProject]=useState(initialProjectId);const [keyword,setKeyword]=useState('');const [status,setStatus]=useState('');const [history,setHistory]=useState(false);const [page,setPage]=useState(0);const [refresh,setRefresh]=useState(0);const [editor,setEditorRaw]=useState(null);
 const editorRequest=useRef(0);const setEditor=value=>{editorRequest.current++;setEditorRaw(value);};useEffect(()=>()=>{editorRequest.current++;},[]);
 const load=useCallback(signal=>history?api.allocations({projectId,history:true,page,size:20},{signal}):api.assets({projectId,keyword,status,page,size:20},{signal}),[api,projectId,keyword,status,history,page]);
 const state=useAdminRead(`inventory:${projectId}:${keyword}:${status}:${history}:${page}:${refresh}`,load);
 // A completed mutation belongs only to the editor that submitted it.
 const editorGeneration=editorRequest.current;
 const changed=()=>{
  if(editorRequest.current!==editorGeneration)return;
  setEditor(null);
  setRefresh(n=>n+1);
 };
 const filter=(fn,value)=>{fn(value);setPage(0);setEditor(null);};
 async function receive(asset){setEditor({kind:'loading',asset});const request=editorRequest.current;try{const result=await api.allocations({assetId:asset.id});if(editorRequest.current===request)setEditor(result.items[0]?{kind:'return',asset,allocation:result.items[0]}:{kind:'error',message:'Máy đã được thu hồi. Tải lại danh sách.'});}catch(e){if(editorRequest.current===request)setEditor({kind:'error',message:e.message});}}
 return <section><div className="admin-page-heading"><div><h1>Kho thiết bị vật lý</h1><p>Quản lý từng máy và lịch sử bàn giao theo dự án.</p></div><button onClick={()=>setEditor({kind:'asset',asset:null})}>Nhập máy</button><button onClick={()=>{setRefresh(n=>n+1);setEditor(null);}}>Tải lại</button></div>
 <div className="admin-card admin-filters"><AdminUserProjectFilter api={api} label="Dự án đang giữ máy" value={projectId} onChange={v=>filter(setProject,v)}/><label className="admin-check"><input type="checkbox" checked={history} onChange={e=>filter(setHistory,e.target.checked)}/>Xem lịch sử bàn giao</label>{!history&&<><label>Tìm mã / model / serial<input value={keyword} onChange={e=>filter(setKeyword,e.target.value)}/></label><label>Lọc tình trạng<select value={status} onChange={e=>filter(setStatus,e.target.value)}><option value="">Tất cả tình trạng</option>{Object.entries(assetStatuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></>}</div>
 {editor?.kind==='asset'&&<DeviceAssetForm key={`asset:${editor.asset?.id||'new'}:${editorGeneration}`} asset={editor.asset} api={api} onSaved={changed} onCancel={()=>setEditor(null)}/>}
 {['assign','return'].includes(editor?.kind)&&<DeviceAllocationDialog key={`${editor.kind}:${editor.asset.id}:${editorGeneration}`} asset={editor.asset} allocation={editor.allocation} api={api} onSaved={changed} onCancel={()=>setEditor(null)}/>}
 {editor?.kind==='loading'&&<p role="status">Đang tải lượt bàn giao…</p>}{editor?.kind==='error'&&<p role="alert">{editor.message}</p>}
 <ReadState {...state}/>{state.data&&<><p>{state.data.totalElements} {history?'lượt bàn giao':'máy'} phù hợp {projectId&&!history&&'đang được dự án giữ'}</p>{!state.data.items.length?<p>Chưa có dữ liệu phù hợp.</p>:history?<AllocationTable items={state.data.items} onReturn={a=>setEditor({kind:'return',asset:{id:a.assetId,assetCode:a.assetCode},allocation:a})}/>:<div className="admin-table-scroll" tabIndex={0} aria-label="Kho máy"><table><thead><tr><th>Mã tài sản</th><th>Loại / model</th><th>Serial / OS</th><th>Tình trạng / dự án</th><th>Thao tác</th></tr></thead><tbody>{state.data.items.map(a=><tr key={a.id}><th>{a.assetCode}</th><td>{a.type} · {a.model}</td><td>{a.serial||'Chưa có serial'}<br/>{a.osName} {a.osVersion}</td><td>{assetStatuses[a.status]}{a.projectName&&<p>{a.projectCode} · {a.projectName}</p>}</td><td><button onClick={()=>setEditor({kind:'asset',asset:a})}>Sửa {a.assetCode}</button>{a.status==='AVAILABLE'&&<button onClick={()=>setEditor({kind:'assign',asset:a})}>Bàn giao {a.assetCode}</button>}{a.status==='ALLOCATED'&&<button onClick={()=>receive(a)}>Thu hồi {a.assetCode}</button>}</td></tr>)}</tbody></table></div>}
 <div className="admin-pagination"><button disabled={!page} onClick={()=>setPage(page-1)}>Trang trước</button><span>Trang {page+1}</span><button disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Trang sau</button></div></>}
 </section>;
}
