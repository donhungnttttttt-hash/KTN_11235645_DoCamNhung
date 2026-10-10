import React, { useEffect, useState } from 'react';
import { retestApi } from '../../services/api/retest';
import { Button } from '../work-items/components';
import { WorkField } from '../work-items/WorkItemForm';
import { Pager } from '../test-execution/components';
export function CoverageEditor({ projectId, items, busy, onSubmit }) {
  const [selected, setSelected] = useState(() => items.map(i => i.runItemId)), [reason, setReason] = useState('');
  const [page, setPage] = useState(0), [keyword, setKeyword] = useState(''), [data, setData] = useState(null), [error, setError] = useState(''), [reload,setReload]=useState(0);
  useEffect(() => { let current=true;setData(null);setError('');
    retestApi.candidates(projectId,page,keyword).then(result=>{if(current)setData(result);}).catch(e=>{if(current)setError(e.message);});
    return()=>{current=false;};
  },[projectId,page,keyword,reload]);
  return <form className="wi-form" onSubmit={e=>{e.preventDefault();onSubmit({runItemIds:selected,reason});}}>
    <p className="wi-note">PM chọn toàn bộ case/cấu hình cần xác minh. Xác nhận lại sẽ hủy yêu cầu đang mở và bắt đầu vòng kiểm thử mới.</p>
    <WorkField label="Tìm case cho phạm vi"><input value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></WorkField>
    {error && <p className="ex-error" role="alert">{error}<Button onClick={()=>setReload(n=>n+1)}>Thử lại</Button></p>}
    <fieldset disabled={busy} className="rt-fieldset"><div className="rt-candidates">{data?.items.map(item=><label className="rt-candidate" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>setSelected(ids=>ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id])}/><span><strong>{item.caseNo}</strong> · {item.titleVi}<small>{item.cycleName} · {item.environmentName} · {item.deviceName} · {item.assigneeName}</small></span></label>)}</div>
    {data && <Pager data={data} onChange={setPage}/>}
    <p>{selected.length} mục đã chọn <Button onClick={()=>setSelected([])}>Bỏ chọn tất cả</Button></p>
    <WorkField label="Lý do xác nhận phạm vi"><textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></WorkField>
    <Button primary type="submit" disabled={busy || !selected.length || selected.length>100}>Xác nhận phạm vi</Button></fieldset>
  </form>;
}
