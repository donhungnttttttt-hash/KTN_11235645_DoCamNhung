import {SelectionTable} from '../../components/SelectionTable';
import React,{useCallback,useRef,useState} from 'react';
import {useAdminRead,ReadState} from './shared';
export function InitialDevicePicker({value,onChange,members,api,title='Máy bàn giao ban đầu',refreshKey=0}) {
 const [keyword,setKeyword]=useState('');const [page,setPage]=useState(0);
 const [bulkRecipient,setBulkRecipient]=useState('');const recipientRefs=useRef({});
 const validRecipient=id=>members.some(m=>String(m.userId)===String(id));
 const missing=value.filter(a=>!validRecipient(a.recipientUserId));
 const load=useCallback(signal=>api.assets({status:'AVAILABLE',keyword,page,size:20},{signal}),[api,keyword,page]);
 const state=useAdminRead(`initial-assets:${keyword}:${page}:${refreshKey}`,load);
 const change=(id,key,next)=>onChange(value.map(a=>a.assetId===id?{...a,[key]:next}:a));
 return <section className="admin-device-picker"><h3>{title}</h3><p>Đã chọn {value.length} máy. Không giới hạn hạn mức tài nguyên.</p><ReadState {...state}/>
 {value.length>0&&<div className="admin-device-recipients">
  <div className="admin-device-bulk"><label>Người nhận chung<select value={validRecipient(bulkRecipient)?bulkRecipient:''} onChange={e=>setBulkRecipient(e.target.value)}><option value="">Chọn người nhận cho nhiều máy</option>{members.map(m=><option key={m.userId} value={m.userId}>{m.displayName} · {m.username}</option>)}</select></label>
   <button type="button" disabled={!validRecipient(bulkRecipient)} onClick={()=>onChange(value.map(a=>({...a,recipientUserId:bulkRecipient})))}>Áp dụng cho {value.length} máy đã chọn</button>
  </div>
  <p>{missing.length?`${missing.length} máy chưa có người nhận. Chọn người nhận chung hoặc điền riêng cho từng máy.`:'Mỗi máy đã có người nhận. Có thể đổi riêng ở thông tin từng máy bên dưới.'}</p>
  {missing.length>0&&<button type="button" onClick={()=>recipientRefs.current[missing[0].assetId]?.focus()}>Điền người nhận còn thiếu</button>}
 </div>}
 <SelectionTable label="Máy sẵn sàng" searchable={false} pageScope loading={state.loading} selected={value.map(a=>a.assetId)}
 filters={<label className="ui-field ui-filter-search">Tìm<input aria-label="Tìm máy sẵn sàng" placeholder="Mã máy, model, serial…" type="search" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label>}
 rows={(state.data?.items||[]).map(a=>({id:a.id,name:a.assetCode+' · '+a.model,selectLabel:a.assetCode+' · '+a.model,description:[a.serial,a.osName,a.osVersion].filter(Boolean).join(' · ')}))}
 onChange={ids=>onChange(ids.map(id=>value.find(a=>a.assetId===id)||(()=>{const a=state.data.items.find(a=>a.id===id);return {assetId:a.id,assetCode:a.assetCode,model:a.model,expectedVersion:a.version,recipientUserId:'',expectedReturnOn:'',handoverNote:''};})()))}/>
 <div className="admin-device-picker-controls" role="group" aria-label="Điều khiển danh sách máy">
  <button type="button" aria-label="Tải lại máy sẵn sàng" disabled={state.loading} onClick={state.retry}>{state.loading?'Đang tải…':'Tải lại danh sách'}</button>
  <div className="admin-device-picker-pages"><span>Trang {page+1}{state.data&&` / ${Math.max(1,Math.ceil(state.data.totalElements/20))}`}</span><button type="button" disabled={state.loading||!state.data||!page} onClick={()=>setPage(page-1)}>Máy trước</button><button type="button" disabled={state.loading||!state.data||(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Máy sau</button></div>
 </div>
 <p className="admin-device-picker-help">Danh sách đã đổi? Bỏ chọn máy cũ rồi chọn lại để cập nhật.</p>
 {value.map(a=><div className="admin-card" key={a.assetId}><strong>{a.assetCode} · {a.model}</strong><label>Người nhận {a.assetCode}<select ref={el=>{recipientRefs.current[a.assetId]=el;}} required aria-invalid={!validRecipient(a.recipientUserId)} value={validRecipient(a.recipientUserId)?a.recipientUserId:''} onChange={e=>change(a.assetId,'recipientUserId',e.target.value)}><option value="">Chọn người nhận</option>{members.map(m=><option key={m.userId} value={m.userId}>{m.displayName} · {m.username}</option>)}</select></label><label>Ngày dự kiến trả {a.assetCode}<input type="date" value={a.expectedReturnOn} onChange={e=>change(a.assetId,'expectedReturnOn',e.target.value)}/></label><label>Ghi chú bàn giao {a.assetCode}<textarea maxLength={1000} value={a.handoverNote} onChange={e=>change(a.assetId,'handoverNote',e.target.value)}/></label><button type="button" onClick={()=>onChange(value.filter(s=>s.assetId!==a.assetId))}>Bỏ máy {a.assetCode}</button></div>)}
 </section>;
}
