import React from 'react';

export function IssueContentEditor({draft,type,onChange}) {
 return <>
  <label className="wi-field">{type==='QA'?'Nội dung câu hỏi':'Mô tả'}<textarea required={type==='QA'||draft.ticketState!=='NEW'} maxLength={20000} rows={3} value={draft.description} onChange={event=>onChange('description',event.target.value)}/></label>
  {[['preconditions','Điều kiện tiên quyết'],['steps','Các bước thực hiện'],['expectedResult','Kết quả mong đợi'],['actualResult','Kết quả thực tế']].map(([key,label])=><label key={key} className="wi-field">{label}<textarea required={type==='BUG'&&key!=='preconditions'} maxLength={20000} rows={3} value={draft[key]} onChange={event=>onChange(key,event.target.value)}/></label>)}
 </>;
}
