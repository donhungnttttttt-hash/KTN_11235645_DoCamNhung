const fs=require('fs');const p='Frontend/src/app/features/test-cases/TestDocumentPage.jsx';let s=fs.readFileSync(p,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,70));s=s.replace(a,b);}
replace("import './test-cases.css';","import { DocumentCellEditor } from './DocumentCellEditor';\nimport { DocumentSecondTestDialog } from './DocumentSecondTestDialog';\nimport './test-cases.css';");
replace('  const execution=useDocumentExecution(project,documentId);',`  const canEdit=!readOnly && !project.archived && (project.projectRole==='PM' || hasRole?.('ADMIN'));
  const canAssign=!dev && !project.archived && project.projectRole==='PM';
  const [editing,setEditing]=useState(null),[secondTest,setSecondTest]=useState(null);
  const execution=useDocumentExecution(project,documentId);`);
replace('  const { document: doc, headers } = data;',`  const { document: doc, headers } = data;
  const visibleColumns=headers.map((header,index)=>({header,index})).filter(({header,index})=>
    !customer || header.trim() || Object.values(columns).includes(index) || data.rows.some(r=>String(r.cells[index] || '').trim()));
  const secondTests=new Map((data.secondTests || []).map(x=>[x.rowId,x]));
  function openCell(row,index){
    const field=customer ? Object.keys(columns).find(key=>columns[key]===index) : ['','','titleVi','preconditionsVi','stepsVi','expectedVi','titleJp','preconditionsJp','stepsJp','expectedJp','sourceReference'][index];
    const canonical=['titleVi','preconditionsVi','stepsVi','expectedVi','titleJp','preconditionsJp','stepsJp','expectedJp','sourceReference'].includes(field);
    setEditing({row,index,value:row.cells[index] || '',version:data.cellVersions?.[row.rowId]?.[index] || 0,
      label:headers[index] || 'Cột '+String.fromCharCode(65+index),canonical,maxLength:['titleVi','titleJp','sourceReference'].includes(field)?255:8000});
  }`);
const footerStart=s.indexOf('    <fieldset className="td-sheet-footer">');
const footerEnd=s.indexOf('    </fieldset>',footerStart)+'    </fieldset>'.length;
const footer=s.slice(footerStart,footerEnd).replace('<fieldset className="td-sheet-footer">','<div className="td-toolbar-pagination" aria-label="Điều khiển bảng">').replace('</fieldset>','</div>');
s=s.slice(0,footerStart)+s.slice(footerEnd);
replace('    </fieldset>\n    <p className="td-export-help">',footer+'\n    </fieldset>\n    <p className="td-export-help">');
replace("'Chế độ xem: bạn có thể xem kết quả, lịch sử và xuất tài liệu.'","'Chỉ xem kết quả: tài khoản này chưa có quyền thực thi trong dự án. PM phân công; Tester được giao ghi kết quả theo đợt.'");
replace('</div>\n    <div ref={grid}',"{canEdit && ' Nhấp đúp ô nội dung hoặc nhấn Enter để sửa. PM phân công test lần 2 ở cuối bảng.'}</div>\n    <div ref={grid}");
replace('width:headers.reduce((sum,_,index)=>sum+columnWidth(index),0)','width:visibleColumns.reduce((sum,{index})=>sum+columnWidth(index),0)+380');
replace('{headers.map((_,index)=><col key={index} style={{width:columnWidth(index)}}/>)}','{visibleColumns.map(({index})=><col key={index} style={{width:columnWidth(index)}}/>)}<col style={{width:200}}/><col style={{width:180}}/>');
replace('{headers.map((header,index) => <th','{visibleColumns.map(({header,index}) => <th');
replace('/></th>)}</tr></thead>','/></th>)}<th scope="col">Người test lần 2</th><th scope="col">Ghi chú 2</th></tr></thead>');
replace('{row.cells.map((value,index) => <td key={index}',`{visibleColumns.map(({index}) => {const value=row.cells[index];const editable=canEdit && !row.archived && row.rowId!=null && index!==idColumn && index!==resultColumn && (customer || index!==1);return <td key={index}
            tabIndex={editable?0:undefined} title={editable?'Nhấp đúp hoặc nhấn Enter để sửa':undefined}
            onDoubleClick={editable?()=>openCell(row,index):undefined}
            onKeyDown={editable?e=>{if(e.key==='Enter' && e.target===e.currentTarget){e.preventDefault();openCell(row,index);}}:undefined}`);
replace('<ResultCycleButton disabled={readOnly','<ResultCycleButton disabledReason={readOnly?"Chỉ xem. Bạn chưa có quyền cập nhật kết quả trong dự án.":undefined} disabled={readOnly');
replace('          </td>)}',`          </td>;})}
          <td className="td-second-test">{secondTests.has(row.rowId)?<><strong>{secondTests.get(row.rowId).assigneeName}</strong><small>{secondTests.get(row.rowId).cycleName} · {secondTests.get(row.rowId).resultCode==='NOT_RUN'?'Chưa chạy':secondTests.get(row.rowId).resultCode}</small><button className="td-result-history" onClick={()=>navigate('/tests/cycles/'+secondTests.get(row.rowId).cycleId)}>Mở lượt kiểm thử</button></>:<span className="td-muted">Chưa phân công</span>}
            {canAssign && <button className="td-result-history" disabled={row.archived || (!row.approved && !secondTests.has(row.rowId))} title={!row.approved?'PM cần duyệt phiên bản case trước khi giao test lần 2.':undefined} onClick={()=>setSecondTest(row)}>{secondTests.has(row.rowId)?'Đổi phân công':'Giao test lần 2'}</button>}
          </td><td><CellText value={secondTests.get(row.rowId)?.note || ''}/></td>`);
replace('    {activeCase && <CaseDetailModal',`    {editing && <DocumentCellEditor projectId={project.id} documentId={documentId} cell={editing} onClose={()=>setEditing(null)} onSaved={load}/>}
    {secondTest && <DocumentSecondTestDialog projectId={project.id} documentId={documentId} row={secondTest} assignment={secondTests.get(secondTest.rowId)} onClose={()=>setSecondTest(null)} onSaved={load} navigate={navigate}/>}
    {activeCase && <CaseDetailModal`);
fs.writeFileSync(p,s);
