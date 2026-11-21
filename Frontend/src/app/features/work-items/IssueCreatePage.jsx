import {ConfirmationDialog} from '../../components/ConfirmationDialog';
import React,{useEffect,useState} from 'react';
import {Plus,ArrowLeft,FileText} from 'lucide-react';
import {UnifiedSelect} from '../../components/UnifiedSelect';
import {testCasesApi} from '../../services/api/testCases';
import {FeatureIssueForm} from './FeatureIssueForm';

export function IssueCreatePage({projectId,activeRoute,navigate,api,featureApi,documentApi=testCasesApi,canCreate}) {
 const params=new URLSearchParams(activeRoute.split('?')[1]||''),workspace=params.get('workspace')==='1';
 const [features,setFeatures]=useState([]),[featureId,setFeatureId]=useState(params.get('featureId')||''),[mode,setMode]=useState('case');
 const [documents,setDocuments]=useState([]),[documentId,setDocumentId]=useState(''),[rows,setRows]=useState([]),[rowId,setRowId]=useState('');
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[activity,setActivity]=useState({busy:false,dirty:false}),[discard,setDiscard]=useState(false),[generation,setGeneration]=useState(0);
 const locked=activity.busy||activity.dirty;
 const route=path=>`${path}?projectId=${projectId}${workspace?'&workspace=1':''}`;
 useEffect(()=>{let live=true;setFeatures([]);setError('');
  (async()=>{const all=[];let page=0,totalPages=1;do{const data=await featureApi.list(projectId,{page});if(!live)return;all.push(...data.items);totalPages=data.totalPages||0;page++;}while(page<totalPages);setFeatures(all);})().catch(e=>{if(live)setError(e.message);});return()=>{live=false;};
 },[projectId,featureApi,reload]);
 useEffect(()=>{let live=true;setDocuments([]);setDocumentId('');setRows([]);setRowId('');setError('');if(!featureId||mode!=='case'){setLoading(false);return;}setLoading(true);
  (async()=>{const all=[];let page=0,totalPages=1;do{const data=await featureApi.documents(projectId,Number(featureId),{page});if(!live)return;all.push(...data.items);totalPages=data.totalPages||0;page++;}while(page<totalPages);setDocuments(all);})().catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};
 },[projectId,featureId,mode,featureApi,reload]);
 useEffect(()=>{let live=true;setRows([]);setRowId('');if(!documentId)return;setLoading(true);setError('');documentApi.getDocument(projectId,Number(documentId)).then(data=>{if(live)setRows(data.rows.filter(row=>row.rowId&&row.caseId&&!row.archived));}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[projectId,documentId,documentApi,reload]);
 useEffect(()=>{if(!activity.dirty)return;const warn=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[activity.dirty]);
 const feature=features.find(item=>String(item.id)===featureId),row=rows.find(item=>String(item.rowId)===rowId);
 function reset(){setGeneration(value=>value+1);setActivity({busy:false,dirty:false});setDiscard(false);}
 return <section className="cat-container issue-create-page">
  <header className="issue-create-heading"><div><span className="issue-create-eyebrow"><Plus size={16}/> GHI NHẬN SAI LỆCH</span><h1 className="ui-page-title">Thêm lỗi</h1><p>Ghi nhận Bug hoặc câu hỏi QA, cung cấp ngữ cảnh và chuyển đến đúng người xử lý.</p></div><button className="cat-btn" disabled={locked} onClick={()=>navigate(route('/board/list'))}><ArrowLeft size={16}/> Danh sách Ticket</button></header>
  {!canCreate&&<p role="alert">Bạn không có quyền tạo Ticket trong dự án này.</p>}
  <section className="issue-create-source" aria-label="Chọn nguồn phát hiện"><label className="wi-field">Nguồn phát hiện<UnifiedSelect disabled={locked||!canCreate} value={mode} onChange={event=>setMode(event.target.value)}><option value="case">Từ test case · Bug / QA</option><option value="monkey">Lỗi ngoài test case · Monkey</option></UnifiedSelect></label><label className="wi-field">Đợt kiểm thử phát hiện lỗi<UnifiedSelect disabled={locked||!canCreate} value={featureId} onChange={event=>setFeatureId(event.target.value)}><option value="">Chọn Đợt kiểm thử</option>{features.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</UnifiedSelect></label>
   {mode==='case'&&featureId&&<><label className="wi-field">File test case<UnifiedSelect disabled={locked||loading||!canCreate} value={documentId} onChange={event=>setDocumentId(event.target.value)}><option value="">Chọn file test case</option>{documents.map(item=><option key={item.id} value={item.id}>{item.fileName}</option>)}</UnifiedSelect></label><label className="wi-field">Case tham chiếu<UnifiedSelect disabled={locked||loading||!documentId||!canCreate} value={rowId} onChange={event=>setRowId(event.target.value)}><option value="">Chọn test case</option>{rows.map(item=><option key={item.rowId} value={item.rowId}>{item.sourceId||item.caseNo||item.rowNumber} · {item.cells?.[2]||'Test case'}</option>)}</UnifiedSelect></label></>}
  </section>
  {loading&&<p role="status">Đang tải nguồn test case…</p>}{error&&<p role="alert">{error} <button className="cat-btn" disabled={locked} onClick={()=>setReload(value=>value+1)}>Thử lại</button></p>}
  {activity.dirty&&<p className="wi-note">Bản nháp thuộc nguồn đã chọn. <button className="cat-btn" disabled={activity.busy} onClick={()=>setDiscard(true)}>Soạn lại / đổi nguồn</button></p>}
  {feature&&(mode==='monkey'||row)?<FeatureIssueForm key={`${projectId}/${featureId}/${documentId}/${rowId}/${mode}/${generation}`} presentation="page" projectId={projectId} featureId={Number(featureId)} documentId={Number(documentId)} row={row} monkey={mode==='monkey'} featureName={feature.name} api={api} authorized={canCreate} onActivity={setActivity} onSaved={saved=>navigate(route(`/board/issue/${saved.id}`)+'&from=issues')} onCancel={()=>activity.dirty?setDiscard(true):reset()}/>:<div className="issue-create-empty"><FileText size={32}/><h2>Chọn nguồn để bắt đầu</h2><p>{mode==='case'?'Chọn Đợt kiểm thử, file và case. Nội dung, môi trường và version sẽ được điền từ case; bạn có thể điều chỉnh theo phát hiện thực tế.':'Chọn Đợt kiểm thử để ghi nhận lỗi phát hiện ngoài test case.'}</p></div>}
  <footer className="issue-create-footer"><button className="cat-btn" disabled={locked} onClick={()=>navigate(route('/board'))}>Mở Kanban</button></footer>
  {discard&&<ConfirmationDialog title="Bỏ nội dung chưa lưu?" onCancel={()=>setDiscard(false)}><p>Bỏ bản nháp hiện tại để chọn lại nguồn hoặc soạn lỗi mới?</p><div className="wi-actions"><button className="cat-btn" data-dialog-initial-focus onClick={()=>setDiscard(false)}>Tiếp tục soạn</button><button className="cat-btn" onClick={reset}>Bỏ bản nháp</button></div></ConfirmationDialog>}
 </section>;
}
