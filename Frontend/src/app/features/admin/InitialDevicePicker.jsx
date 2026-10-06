import React,{useCallback,useState} from 'react';
import {useAdminRead,ReadState} from './shared';
export function InitialDevicePicker({value,onChange,members,api}) {
 const [keyword,setKeyword]=useState('');const [page,setPage]=useState(0);
 const load=useCallback(signal=>api.assets({status:'AVAILABLE',keyword,page,size:20},{signal}),[api,keyword,page]);
 const state=useAdminRead(`initial-assets:${keyword}:${page}`,load);
 const change=(id,key,next)=>onChange(value.map(a=>a.assetId===id?{...a,[key]:next}:a));
 return <section><h3>Máy bàn giao ban đầu</h3><p>Đã chọn {value.length} máy. Không giới hạn hạn mức tài nguyên.</p><label>Tìm máy sẵn sàng<input type="search" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label><ReadState {...state}/>
 {state.data?.items.map(a=><label key={a.id}><input type="checkbox" checked={value.some(s=>s.assetId===a.id)} onChange={e=>onChange(e.target.checked?[...value,{assetId:a.id,assetCode:a.assetCode,model:a.model,expectedVersion:a.version,recipientUserId:'',expectedReturnOn:'',handoverNote:''}]:value.filter(s=>s.assetId!==a.id))}/>{a.assetCode} · {a.model}</label>)}
 <button type="button" onClick={state.retry}>Tải lại máy sẵn sàng</button><p>Nếu máy đã thay đổi, bỏ chọn rồi chọn lại máy từ danh sách mới.</p>
 {state.data&&!state.data.items.length&&<p>Không có máy sẵn sàng phù hợp.</p>}
 {state.data&&<div className="admin-pagination"><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Máy trước</button><button type="button" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Máy sau</button></div>}
 {value.map(a=><div className="admin-card" key={a.assetId}><strong>{a.assetCode} · {a.model}</strong><label>Người nhận {a.assetCode}<select required value={members.some(m=>m.userId===a.recipientUserId)?a.recipientUserId:''} onChange={e=>change(a.assetId,'recipientUserId',e.target.value)}><option value="">Chọn người nhận</option>{members.map(m=><option key={m.userId} value={m.userId}>{m.displayName} · {m.username}</option>)}</select></label><label>Ngày dự kiến trả {a.assetCode}<input type="date" value={a.expectedReturnOn} onChange={e=>change(a.assetId,'expectedReturnOn',e.target.value)}/></label><label>Ghi chú bàn giao {a.assetCode}<textarea maxLength={1000} value={a.handoverNote} onChange={e=>change(a.assetId,'handoverNote',e.target.value)}/></label><button type="button" onClick={()=>onChange(value.filter(s=>s.assetId!==a.assetId))}>Bỏ máy {a.assetCode}</button></div>)}
 </section>;
}
