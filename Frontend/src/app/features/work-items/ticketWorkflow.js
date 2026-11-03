// Ticket workflow is independent of case results and retired work-item enums.
export const ticketColumns = [
 {id:'spec',label:'Xác nhận spec',color:'#8b5cf6'},
 {id:'new',label:'Chưa xử lý',color:'#94a3b8'},
 {id:'progress',label:'Đang xử lý',color:'#3b82f6'},
 {id:'verify',label:'Chờ xác nhận',color:'#f59e0b'},
 {id:'processed',label:'Đóng – Đã xử lý',color:'#0d9488'},
 {id:'fixed',label:'Đóng – Đã sửa',color:'#22c55e'},
 {id:'cannot_reproduce',label:'Đóng – Không thể tái hiện',color:'#64748b'},
 {id:'wont_fix',label:'Đóng – Không xử lý',color:'#ef4444'},
 {id:'unsupported',label:'QA – Đóng – Không được hỗ trợ',color:'#a855f7'},
];
const stateColumns={SPEC_CONFIRM:'spec',NEW:'new',IN_PROGRESS:'progress',WAITING_CONFIRM:'verify'};
const reasonColumns={PROCESSED:'processed',FIXED:'fixed',CANNOT_REPRODUCE:'cannot_reproduce',WONT_FIX:'wont_fix',UNSUPPORTED:'unsupported'};
export const ticketStateLabel=state=>state==='CLOSED'?'Đóng':ticketColumns.find(column=>column.id===stateColumns[state])?.label||'Trạng thái chưa xác định';
export const ticketTransitionLabel=transition=>ticketColumns.find(column=>column.id===(transition.columnId||transition.boardColumn||(transition.state==='CLOSED'?reasonColumns[transition.closureReason]:stateColumns[transition.state])))?.label||ticketStateLabel(transition.state);
export const ticketClosureLabel=reason=>({PROCESSED:'Đã xử lý',FIXED:'Đã sửa',CANNOT_REPRODUCE:'Không thể tái hiện',WONT_FIX:'Không xử lý',UNSUPPORTED:'Không được hỗ trợ'}[reason]||'Chưa xác định');
export const ticketLabel=item=>item.legacyWorkflow||!item.boardColumn&&!item.ticketState?'Cần đối chiếu lịch sử':ticketTransitionLabel({...item,state:item.ticketState});
// Existing source No/ID; pending wording can change without inventing a Bug ID.
export function ticketTitlePrefix({source,featureName,monkey}) {
 return (monkey?[featureName,'Monkey']:[source?.testObject,source?.fileName,source?.caseReference]).filter(Boolean).map(value=>`[${value}]`).join('');
}
// Keep at least 99 UTF-16 units for a suffix plus its separating space.
// Full source values remain in the discovery context; only the title is abbreviated.
export function boundedTicketTitlePrefix(context) {
 const full=ticketTitlePrefix(context);if(full.length<=200)return full;
 const values=(context.monkey?[context.featureName,'Monkey']:[context.source?.testObject,context.source?.fileName,context.source?.caseReference]).filter(Boolean).map(String);
 const budgets=values.map(value=>value.length);let available=200-values.length*2;
 while(budgets.reduce((sum,size)=>sum+size,0)>available){const largest=budgets.indexOf(Math.max(...budgets));budgets[largest]--;}
 return values.map((value,index)=>{
  if(value.length<=budgets[index])return `[${value}]`;
  const characters=Array.from(value);let front='',back='',remaining=budgets[index]-1,left=0,right=characters.length-1;
  while(left<=right){const takeFront=front.length<=back.length,character=characters[takeFront?left:right];if(character.length>remaining)break;if(takeFront){front+=character;left++;}else{back=character+back;right--;}remaining-=character.length;}
  return `[${front}…${back}]`;
 }).join('');
}
export const ticketContentFields=[['title','Tiêu đề Issue'],['description','Mô tả Issue'],['preconditions','Điều kiện tiên quyết'],['steps','Các bước thực hiện'],['expectedResult','Kết quả mong đợi'],['actualResult','Kết quả thực tế'],['frequency','Tần suất tái hiện'],['environment','Môi trường phát hiện'],['device','Thiết bị phát hiện']];
export const chronological=items=>[...items].sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))||Number(a.id)-Number(b.id));
export function ticketAction(item,{body='',transition,assignee='',verifier='',convert=false,repairCoordinator=false}) {
 const payload={expectedVersion:item.version};
 if(body.trim())payload.body=body.trim();
 if(convert)payload.convertToBug=true;
 else if(transition){payload.state=transition.state;if(transition.closureReason)payload.closureReason=transition.closureReason;}
 if(assignee&&(convert||repairCoordinator||String(assignee)!==String(item.assigneeMembershipId)))payload.assigneeMembershipId=Number(assignee);
 if(verifier&&String(verifier)!==String(item.verifierUserId))payload.verifierUserId=String(verifier);
 return payload;
}
