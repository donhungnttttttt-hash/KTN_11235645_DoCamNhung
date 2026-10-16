import React,{useEffect,useRef,useState} from 'react';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {testCasesApi} from '../../services/api/testCases';
import {executionApi} from '../../services/api/execution';
import {projectsApi} from '../../services/api/projects';

export function DocumentSecondTestDialog({projectId,documentId,row:initialRow,assignment:initialAssignment,onClose,onSaved,onApproved,navigate,authorized=true}) {
  const [row,setRow]=useState(initialRow),[assignment,setAssignment]=useState(initialAssignment);
  const [conflict,setConflict]=useState(false),[blocked,setBlocked]=useState(false),[refreshed,setRefreshed]=useState(false);
  const live=useRef(true),lock=useRef(false);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const [cycles,setCycles]=useState(null),[page,setPage]=useState(0),[members,setMembers]=useState([]),[configs,setConfigs]=useState([]);
  const [cycle,setCycle]=useState(null),[cycleId,setCycleId]=useState(String(assignment?.cycleId || ''));
  const [configurationId,setConfigurationId]=useState(String(assignment?.configurationId || ''));
  const [assignee,setAssignee]=useState(String(assignment?.assigneeMembershipId || '')),[note,setNote]=useState(assignment?.note || '');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[contextLoading,setContextLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [approved,setApproved]=useState(row.approved===true),[approving,setApproving]=useState(false);
  const [optionsReady,setOptionsReady]=useState(false),[contextReady,setContextReady]=useState(false);
  const approvalRequired=!assignment&&!approved;
  const ref=useDialogFocus(onClose,busy);
  useEffect(()=>{let live=true;setLoading(true);setOptionsReady(false);setError('');
    Promise.all([executionApi.cycles(projectId,page),projectsApi.listMembers(projectId)]).then(([c,m])=>{if(live){setCycles(c);setMembers(m.filter(x=>x.active&&x.enabled!==false&&x.projectRole==='TESTER'&&x.systemRole!=='DEV'&&x.systemRole!=='UNKNOWN'));setOptionsReady(true);}})
      .catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[projectId,page,retry]);
  useEffect(()=>{let live=true;setCycle(null);setConfigs([]);setContextReady(false);setContextLoading(!!cycleId);if(!cycleId)return()=>{};
    Promise.all([executionApi.cycle(projectId,cycleId),executionApi.configurations(projectId,cycleId)]).then(([c,cf])=>{if(live){setCycle(c);setConfigs(cf);setContextReady(true);}})
      .catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setContextLoading(false);});return()=>{live=false;};},[projectId,cycleId,retry]);
  const locked=cycle?.statusCode==='CLOSED' || (!cycle && assignment?.cycleStatus==='CLOSED');
  const ready=authorized&&!blocked&&!conflict&&!row.archived&&!busy&&!loading&&!contextLoading&&optionsReady&&contextReady&&!locked&&!approvalRequired
    && String(cycle?.id)===cycleId && (assignment || cycle?.statusCode==='DRAFT')
    && configs.some(c=>String(c.id)===configurationId) && members.some(m=>String(m.membershipId)===assignee);
  function changePage(next){setCycleId('');setConfigurationId('');setPage(next);}
  async function approve(){if(lock.current || busy || blocked || conflict || !authorized)return;lock.current=true;setBusy(true);setApproving(true);setError('');
    try {await testCasesApi.approveRevision(projectId,row.caseId,row.revisionId);setApproved(true);onApproved?.();}
    catch(err){setError(err.message || 'Chưa duyệt được phiên bản. Bạn có thể thử lại.');}
    finally{lock.current=false;if(live.current){setBusy(false);setApproving(false);}}
  }
  async function reload(){if(lock.current || blocked || !authorized)return;lock.current=true;setBusy(true);setError('');
    try {
      const detail=await testCasesApi.getDocument(projectId,documentId);if(!live.current)return;
      const currentRow=detail.rows.find(r=>r.rowId===initialRow.rowId),currentAssignment=detail.secondTests?.find(a=>a.rowId===initialRow.rowId);
      if(detail.document.id!==Number(documentId) || !currentRow || currentRow.caseId!==initialRow.caseId || currentRow.archived) {
        setError('Case đã lưu trữ hoặc dòng nguồn đã thay đổi. Giữ bản nháp và mở lại tài liệu để kiểm tra.');return;
      }
      if(!assignment && currentRow.revisionId!==initialRow.revisionId) {
        setError('Phiên bản case đã thay đổi. Giữ bản nháp để đối chiếu và mở lại phân công sau khi kiểm tra nội dung hiện hành.');return;
      }
      if((assignment && (!currentAssignment || (assignment.runItemId!=null && assignment.runItemId!==currentAssignment.runItemId))) ||
          (currentAssignment && (String(currentAssignment.cycleId)!==cycleId || String(currentAssignment.configurationId)!==configurationId || !Number.isSafeInteger(Number(currentAssignment.runItemId)) || Number(currentAssignment.runItemId)<=0))) {
        setError('Lượt test lần 2 đã đổi ngữ cảnh. Giữ bản nháp và mở lại phân công để kiểm tra đúng lượt.');return;
      }
      setRow(currentRow);setAssignment(currentAssignment);setApproved(currentRow.approved===true);setConflict(false);setRefreshed(true);
      setOptionsReady(false);setContextReady(false);setRetry(n=>n+1);
    }catch(err){if(live.current){setError(err.message || 'Chưa tải được phân công hiện hành.');if([401,403,404].includes(err.status))setBlocked(true);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  async function save(e){e.preventDefault();if(lock.current || !ready)return;lock.current=true;setBusy(true);setError('');
    try {await testCasesApi.assignSecondTest(projectId,documentId,row.rowId,{cycleId:Number(cycleId),configurationId:Number(configurationId),assigneeMembershipId:Number(assignee),note,
      expectedVersion:assignment?.version || 0,expectedCycleVersion:cycle.version,expectedRunVersion:assignment?.runVersion ?? null,expectedRevisionId:row.revisionId});if(!live.current)return;await onSaved();if(live.current)onClose();}
    catch(err){if(live.current){setError(err.message || 'Chưa lưu được phân công.');setConflict(err.status===409);if([401,403,404].includes(err.status))setBlocked(true);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  return <div className="ex-modal"><section className="td-case-dialog td-edit-dialog" ref={ref} role="dialog" aria-modal="true" aria-label="Phân công test lần 2" tabIndex={-1}>
    <header><h3>Test lần 2 · Case {row.sourceId}</h3><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></header>
    <form className="td-dialog-body" onSubmit={save}>
      <p className="td-muted">{assignment?'Cập nhật người thực hiện và ghi chú cho lượt kiểm thử đã giao.':'Chọn người kiểm thử lại, đợt nháp và cấu hình chạy. Admin hoặc PM bắt đầu đợt để Tester ghi kết quả.'}</p>
      {!assignment&&!row.approved&&<div className="td-approval-step">
        {approved?<p role="status">Đã duyệt phiên bản này.</p>:<><p>Case đang là bản nháp. Admin hoặc PM cần duyệt phiên bản này trước khi lưu phân công.</p><button type="button" className="cat-btn" disabled={busy || conflict || blocked || !authorized} onClick={approve}>{approving?'Đang duyệt…':'Duyệt phiên bản này'}</button></>}
      </div>}
      {error&&<div role="alert" className="td-error">{error} {!conflict&&<button type="button" className="cat-btn" disabled={busy} onClick={()=>setRetry(x=>x+1)}>Tải lại lựa chọn</button>}</div>}
      {(!authorized || blocked)&&<p role="alert">Không còn quyền lưu trong ngữ cảnh này. Bản nháp được giữ để bạn đối chiếu trước khi đóng.</p>}
      {conflict&&<button type="button" className="cat-btn" disabled={busy || blocked || !authorized} onClick={reload}>Tải bản hiện hành, giữ bản nháp</button>}
      {refreshed&&<p role="status">{assignment?`Đang được giao: ${assignment.assigneeName} · ${assignment.cycleName} · ${assignment.resultCode==='NOT_RUN'?'Chưa chạy':assignment.resultCode}.`:'Hiện chưa có phân công test lần 2.'} Phiên bản case #{row.revisionId}. Đối chiếu với bản nháp rồi bấm Lưu phân công.</p>}
      {loading&&<p role="status">Đang tải lựa chọn…</p>}
      {!loading&&!assignment&&cycles&&!cycles.items.some(c=>c.statusCode==='DRAFT')&&<p className="td-history-note">Chưa có đợt nháp {cycles.totalPages>1?'trên trang này':''}. Mở Đợt kiểm thử để tạo đợt và cấu hình cho lần 2{cycles.totalPages>1?', hoặc xem trang đợt khác':''}.</p>}
      {!contextLoading&&cycle&&!configs.length&&<p className="td-history-note">Đợt này chưa có cấu hình. Mở Đợt kiểm thử để thêm môi trường, thiết bị và build.</p>}
      {!loading&&optionsReady&&!members.length&&<p className="td-history-note">Chưa có Tester đang hoạt động trong dự án. Admin cần thêm Tester vào thành viên dự án trước khi phân công.</p>}
      <fieldset disabled={busy || loading || locked}>
        <label className="td-edit-field">Đợt kiểm thử<select required value={cycleId} disabled={!!assignment} onChange={e=>{setCycleId(e.target.value);setConfigurationId('');}}>
          <option value="">Chọn đợt nháp</option>{assignment?<option value={assignment.cycleId}>{assignment.cycleName}</option>:cycles?.items.filter(c=>c.statusCode==='DRAFT').map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select></label>
        {!assignment&&cycles?.totalPages>1&&<div className="td-actions"><button type="button" className="cat-btn" disabled={!page} onClick={()=>changePage(page-1)}>Đợt trước</button><span>Trang {page+1}/{cycles.totalPages}</span><button type="button" className="cat-btn" disabled={page+1>=cycles.totalPages} onClick={()=>changePage(page+1)}>Đợt sau</button></div>}
        <label className="td-edit-field">Cấu hình chạy<select required value={configurationId} disabled={!!assignment || contextLoading} onChange={e=>setConfigurationId(e.target.value)}><option value="">Chọn cấu hình</option>{configs.map(c=><option key={c.id} value={c.id}>{c.environmentName} / {c.deviceName} · {c.versionLabel}</option>)}</select></label>
        <label className="td-edit-field">Người test lần 2<select required value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Chọn Tester</option>{members.map(m=><option key={m.membershipId} value={m.membershipId}>{m.displayName}</option>)}</select></label>
        <label className="td-edit-field">Ghi chú 2<textarea rows={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>
        <button className="cat-btn cat-btn-mint" disabled={!ready}>{busy&&!approving?'Đang lưu…':'Lưu phân công'}</button>
      </fieldset>
      {locked&&<p>Đợt đã chốt. Admin hoặc PM cần mở lại đợt trước khi đổi phân công.</p>}
      <button type="button" disabled={busy} className="td-result-history" onClick={()=>{onClose();navigate(cycleId?`/tests/cycles/${cycleId}`:'/tests/cycles');}}>Mở đợt kiểm thử</button>
    </form>
  </section></div>;
}
