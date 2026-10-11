/** Ranges refer to the source ID column, never an internal case number or Excel row. */
export function selectCaseRange(rows,text) {
  const parts=String(text).trim().split(',');
  const ids=new Set();
  for(const part of parts){
    const match=part.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if(!match)throw new Error('Nhập ID case như 1-35 hoặc 1-10, 15, 20-35.');
    const start=Number(match[1]),end=Number(match[2]??match[1]);
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<1||end<start||end-start>=500)throw new Error('Khoảng case không hợp lệ; tối đa 500 case mỗi lần.');
    for(let id=start;id<=end;id++){ids.add(id);if(ids.size>500)throw new Error('Tối đa 500 case mỗi lần.');}
  }
  const byId=new Map();
  for(const row of rows){
    if(!/^\d+$/.test(String(row.sourceId).trim()))continue;
    const id=Number(row.sourceId);
    if(!ids.has(id))continue;
    if(byId.has(id))throw new Error(`ID ${id} bị trùng trong file. Hãy chọn case thủ công.`);
    byId.set(id,row);
  }
  const missing=[...ids].filter(id=>!byId.has(id));
  if(missing.length)throw new Error(`Không tìm thấy ID case: ${missing.slice(0,8).join(', ')}${missing.length>8?'…':''}. Dùng ID trong file hoặc chọn thủ công.`);
  return [...ids].sort((a,b)=>a-b).map(id=>byId.get(id));
}
