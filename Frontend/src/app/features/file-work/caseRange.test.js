import {describe,it,expect} from 'vitest';
import {selectCaseRange} from './caseRange';
const rows=Array.from({length:70},(_,i)=>({sourceId:String(i+1),revisionId:100+i,caseNo:`XLSX-8-${i+1}`}));
describe('file source case ranges',()=>{
 it('selects the inclusive source ID range independently of display order',()=>expect(selectCaseRange([...rows].reverse(),'1-35').map(r=>r.sourceId)).toEqual(rows.slice(0,35).map(r=>r.sourceId)));
 it('supports individual IDs and multiple ranges without duplicates',()=>expect(selectCaseRange(rows,'1-3, 3, 7').map(r=>r.sourceId)).toEqual(['1','2','3','7']));
 it.each(['','35-1','0-2','1-x','1--5','1-999999999','71'])('rejects invalid or missing IDs %s',value=>expect(()=>selectCaseRange(rows,value)).toThrow());
 it('does not guess a number from the internal case code',()=>expect(()=>selectCaseRange([{sourceId:'SRC-1',caseNo:'XLSX-8-1',revisionId:1}],'1')).toThrow(/ID/));
 it('rejects ambiguous numeric source IDs',()=>expect(()=>selectCaseRange([{sourceId:'01'},{sourceId:'1'}],'1')).toThrow(/trùng/));
 it('does not silently omit missing IDs in an interval',()=>expect(()=>selectCaseRange([rows[0],rows[2]],'1-3')).toThrow(/2/));
});
