import {useRefreshOnReturn} from '../../hooks/useRefreshOnReturn';
import {UnifiedSelect} from '../../components/UnifiedSelect';
import {SelectionTable} from '../../components/SelectionTable';
import React,{useCallback,useEffect,useState} from 'react';
import {useAdminRead,ReadState} from './shared';
import {isHandoverPm} from './handoverRecipient';
export function InitialDevicePicker({value,onChange,members,api,title='Máy bàn giao ban đầu',refreshKey=0}) {
 useRefreshOnReturn(()=>{if(!state.loading)state.retry();});
 const [keyword,setKeyword]=useState('');const [page,setPage]=useState(0);
 const [bulkRecipient,setBulkRecipient]=useState('');
 const recipients=members.filter(isHandoverPm);
 const validRecipient=id=>recipients.some(m=>String(m.userId)===String(id));
 const soleRecipient=recipients.length===1?recipients[0].userId:null;
 const selectedRecipient=soleRecipient??(validRecipient(value[0]?.recipientUserId)?value[0].recipientUserId:validRecipient(bulkRecipient)?bulkRecipient:'');
 useEffect(()=>{
  const next=value.map(a=>({...a,recipientUserId:soleRecipient??(validRecipient(a.recipientUserId)?a.recipientUserId:'')}));
  if(next.some((a,i)=>a.recipientUserId!==value[i].recipientUserId))onChange(next);
  if(bulkRecipient&&!validRecipient(bulkRecipient))setBulkRecipient('');
 },[members,value,onChange,soleRecipient,bulkRecipient]);
 const missing=value.filter(a=>!validRecipient(a.recipientUserId));
 const load=useCallback(signal=>api.assets({status:'AVAILABLE',keyword,page,size:20},{signal}),[api,keyword,page]);
 const state=useAdminRead(`initial-assets:${keyword}:${page}:${refreshKey}`,load);
 return <section className="admin-device-picker"><h3>{title}</h3><p>Đã chọn {value.length} máy. Không giới hạn hạn mức tài nguyên.</p><ReadState {...state}/>
 {value.length>0&&recipients.length>1&&<div className="admin-device-recipients">
  <div className="admin-device-bulk"><label>Người nhận chung<UnifiedSelect aria-label="Người nhận chung" required value={selectedRecipient} onChange={e=>{const id=e.target.value;setBulkRecipient(id);onChange(value.map(a=>({...a,recipientUserId:id})));}}><option value="">Chọn PM nhận tất cả máy</option>{recipients.map(m=><option key={m.userId} value={m.userId}>{m.displayName} · {m.username}</option>)}</UnifiedSelect></label>
  </div>
  <p>{missing.length?`${missing.length} máy chưa có PM nhận. Chọn một PM ở Người nhận chung.`:'Tất cả máy đã chọn được bàn giao cho cùng một PM. PM tự phân phối nội bộ bên ngoài phần mềm.'}</p>
 </div>}
 {value.length>0&&recipients.length===1&&<p>Tự động bàn giao cho PM: <strong>{recipients[0].displayName}</strong>.</p>}
 {value.length>0&&!recipients.length&&<p>Chọn hoặc bổ sung PM đang hoạt động trước khi bàn giao máy.</p>}
 <SelectionTable label="Máy sẵn sàng" searchable={false} pageScope loading={state.loading} selected={value.map(a=>a.assetId)}
 filters={<label className="ui-field ui-filter-search">Tìm<input aria-label="Tìm máy sẵn sàng" placeholder="Mã máy, model, serial…" type="search" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label>}
 rows={(state.data?.items||[]).map(a=>({id:a.id,name:a.assetCode+' · '+a.model,selectLabel:a.assetCode+' · '+a.model,description:[a.serial,a.osName,a.osVersion].filter(Boolean).join(' · ')}))}
 onChange={ids=>onChange(ids.map(id=>value.find(a=>a.assetId===id)||(()=>{const a=state.data.items.find(a=>a.id===id);return {assetId:a.id,assetCode:a.assetCode,model:a.model,expectedVersion:a.version,recipientUserId:selectedRecipient,expectedReturnOn:'',handoverNote:''};})()))}/>
 <div className="admin-device-picker-controls" role="group" aria-label="Điều khiển danh sách máy">

  <div className="admin-device-picker-pages"><span>Trang {page+1}{state.data&&` / ${Math.max(1,Math.ceil(state.data.totalElements/20))}`}</span><button type="button" disabled={state.loading||!state.data||!page} onClick={()=>setPage(page-1)}>Trang trước</button><button type="button" disabled={state.loading||!state.data||(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Trang sau</button></div>
 </div>
 <p className="admin-device-picker-help">Danh sách đã đổi? Bỏ chọn máy cũ rồi chọn lại để cập nhật.</p>
 </section>;
}
