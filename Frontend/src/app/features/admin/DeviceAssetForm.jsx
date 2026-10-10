import React,{useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useInlineEditorFocus} from './useInlineEditorFocus';
export const assetStatuses={AVAILABLE:'Sẵn sàng',ALLOCATED:'Đang bàn giao',MAINTENANCE:'Bảo trì',RETIRED:'Ngừng sử dụng'};
export function DeviceAssetForm({asset,onSaved,onCancel,api=adminApi}) {
 const formRef=useInlineEditorFocus();
 const [draft,setDraft]=useState({assetCode:asset?.assetCode||'',type:asset?.type||'IPAD',model:asset?.model||'',serial:asset?.serial||'',osName:asset?.osName||'',osVersion:asset?.osVersion||'',conditionCode:asset?.conditionCode||'AVAILABLE',notes:asset?.notes||''});
 const [version,setVersion]=useState(asset?.version);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function save(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{onSaved(await (asset?api.updateAsset(asset.id,{...draft,expectedVersion:version}):api.createAsset(draft)));}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function reload(){setBusy(true);try{const latest=await api.asset(asset.id);setVersion(latest.version);setError(`Đã tải phiên bản hiện hành (${assetStatuses[latest.status]}). Kiểm tra bản nháp trước khi lưu lại.`);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <form ref={formRef} className="admin-card admin-form" onSubmit={save}><h2 tabIndex={-1}>{asset?'Sửa máy':'Nhập máy vào kho'}</h2>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>
 {Object.entries({assetCode:['Mã tài sản',64],model:['Hãng / model',100],serial:['Serial',100],osName:['Hệ điều hành',50],osVersion:['Phiên bản OS',50]}).map(([key,[label,max]])=><label key={key}>{label}<input required={['assetCode','model'].includes(key)} maxLength={max} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
 <label>Loại máy<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{Object.entries({IPAD:'iPad',IPHONE:'iPhone',ANDROID:'Android',OTHER:'Khác'}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 <label>Tình trạng máy<select value={draft.conditionCode} onChange={e=>setDraft({...draft,conditionCode:e.target.value})}>{Object.entries(assetStatuses).filter(([key])=>key!=='ALLOCATED').map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 <label>Ghi chú<textarea maxLength={1000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
 <div className="admin-actions"><button type="submit">{busy?'Đang lưu…':'Lưu máy'}</button><button type="button" onClick={onCancel}>Hủy</button>{asset&&error&&<button type="button" onClick={reload}>Tải phiên bản hiện hành, giữ bản nháp</button>}</div></fieldset></form>;
}
