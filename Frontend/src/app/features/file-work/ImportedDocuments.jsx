import React,{useState} from 'react';
import {testCasesApi} from '../../services/api/testCases';
import {Pager,useResource,WorkError} from './FileWorkPage';
import {TableScroll} from '../../components/TableScroll';

/** Imports remain visible before a PM creates a cycle/configuration assignment. */
export function ImportedDocuments({projectId,documentId,keyword,reload,canAssign,onAssign,navigate}) {
 const [page,setPage]=useState(0);
 const [retry,setRetry]=useState(0);
 const source=useResource(async options=>{
  if(documentId){const detail=await testCasesApi.getDocument(projectId,documentId,options);return {items:detail?[detail.document]:[],page:0,totalPages:1,totalItems:detail?1:0};}
  return testCasesApi.listDocuments(projectId,{page,keyword},options);
 },[projectId,documentId,page,keyword,reload,retry]);
 return <section className="fw-panel fw-imported-documents" aria-label="Tài liệu nguồn đã nhập">
  <h3>Tài liệu nguồn đã nhập</h3>
  <p>Nhập Excel tạo tài liệu và test case. PM cần giao file vào đợt kiểm thử, cấu hình và Tester để bắt đầu thực thi.</p>
  <WorkError error={source.error} retry={()=>setRetry(v=>v+1)} focusOnError={false}/>
  {source.loading&&<p role="status">Đang tải tài liệu nguồn…</p>}
  {source.data&&<><TableScroll label="Tài liệu nguồn" className="fw-source-table"><table><thead><tr><th>Tên file</th><th>Test case</th><th>Thao tác</th></tr></thead><tbody>
   {source.data.items.map(doc=><tr key={doc.id}><td>{doc.fileName}</td><td>{doc.caseCount}</td><td><div className="fw-actions"><button type="button" aria-label={'Xem tài liệu '+doc.fileName} onClick={()=>navigate('/tests/documents/'+doc.id)}>Xem tài liệu</button>{canAssign&&<button type="button" aria-label={'Giao file '+doc.fileName} onClick={()=>onAssign(doc.id)}>Giao file</button>}</div></td></tr>)}
  </tbody></table></TableScroll>{!source.data.items.length&&<p>Chưa có tài liệu nguồn phù hợp. Kiểm tra từ khóa hoặc nhập Excel tại thư viện.</p>}
  {!documentId&&<Pager data={source.data} onChange={setPage} label="tài liệu nguồn"/>}</>}
  <button type="button" onClick={()=>navigate('/tests')}>Mở thư viện test case</button>
 </section>;
}
