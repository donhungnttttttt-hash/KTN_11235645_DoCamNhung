import {SelectionTable} from '../../components/SelectionTable';
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
    {error && <p className="ex-error" role="alert">{error}<Button onClick={()=>setReload(n=>n+1)}>Thử lại</Button></p>}
    <fieldset disabled={busy} className="rt-fieldset"><SelectionTable label="Case cho phạm vi" searchable={false} pageScope loading={!data} selected={selected} onChange={setSelected}
      filters={<label className="ui-field ui-filter-search">Tìm<input aria-label="Tìm case cho phạm vi" placeholder="Mã hoặc tên case…" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label>}
      rows={(data?.items||[]).map(item=>({id:item.id,name:item.caseNo+' · '+item.titleVi,description:[item.cycleName,item.environmentName,item.deviceName,item.assigneeName].filter(Boolean).join(' · ')}))}/>
    {data && <Pager data={data} onChange={setPage}/>}
    <p>{selected.length} mục đã chọn <Button onClick={()=>setSelected([])}>Bỏ chọn tất cả</Button></p>
    <WorkField label="Lý do xác nhận phạm vi"><textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></WorkField>
    <p className="wi-note" role={selected.length>100?'status':undefined}>{selected.length}/100 mục tối đa cho mỗi lần xác nhận.{selected.length>100?' Bỏ chọn bớt mục để tiếp tục.':''}</p>
    <Button primary type="submit" disabled={busy || !selected.length || selected.length>100}>Xác nhận phạm vi</Button></fieldset>
  </form>;
}
