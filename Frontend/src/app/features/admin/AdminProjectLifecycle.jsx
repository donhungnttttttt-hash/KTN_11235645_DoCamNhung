import React,{useCallback,useEffect,useRef,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {useAdminRead,ReadState} from './shared';

const time=value=>value?new Date(value).toLocaleString('vi-VN'):'Chưa ghi nhận';
const guidance={
 ACTIVE_SESSIONS:'PM kiểm tra Công việc theo file của dự án và hoàn tất các phiên đang làm hoặc tạm dừng.',
 OPEN_WORK_ITEMS:'PM phối hợp Tester và Dev xử lý ticket, QA và xác minh trước khi kết thúc.',
 UNFINISHED_CYCLES:'PM kiểm tra Đợt kiểm thử của dự án và chốt các đợt đã có phạm vi thực thi.',
 OPEN_RETESTS:'Tester hoàn tất kiểm thử lại; PM xác nhận kết quả và xử lý các lượt còn mở.',
 PENDING_PUBLICATIONS:'PM kiểm tra công bố Redmine của dự án, xử lý các lượt đang gửi hoặc chờ thử lại.',
};

export function AdminProjectLifecycle({projectId,api=adminApi,onSaved,pendingChanges=false}) {
 const [open,setOpen]=useState(false),[receipt,setReceipt]=useState(null),[notice,setNotice]=useState('');
 const load=useCallback(signal=>api.archiveReadiness(projectId,{signal}),[api,projectId]);
 const state=useAdminRead(`lifecycle:${projectId}`,load);
 const current=receipt||state.data;
 function saved(result){setReceipt(result);setOpen(false);setNotice(result.archived?'Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.':'Dự án đang hoạt động. Có thể tiếp tục công việc theo quyền hiện hành.');onSaved?.(result);}
 return <section className="admin-card admin-lifecycle" aria-label="Vòng đời dự án">
  <div className="admin-page-heading"><h2>Vòng đời dự án</h2>{current&&<span className={`admin-lifecycle-state ${current.archived?'is-archived':''}`}>{current.archived?'Đã lưu trữ':'Đang hoạt động'}</span>}</div>
  {notice&&<p role="status">{notice}</p>}
  {!current&&<ReadState {...state}/>}
  {current&&<>
   <p>{current.archived?'Dự án chỉ đọc. Vẫn xem và xuất được dữ liệu đã lưu; mở lại để tiếp tục công việc.':'Lưu trữ sau khi xử lý xong việc tồn và thu hồi thiết bị. Chỉ Admin thực hiện; hệ thống kiểm tra lại khi xác nhận.'}</p>
   {current.latestDecision&&<div className="admin-lifecycle-decision"><strong>{current.latestDecision.action==='ARCHIVE'?'Lưu trữ':'Mở lại'} · {current.latestDecision.actorName}</strong><small>{time(current.latestDecision.decidedAt)}</small><p>{current.latestDecision.reason}</p></div>}
   {pendingChanges&&<p>Hoàn tất hoặc hủy chỉnh sửa dự án, bỏ chọn thành viên và hoàn nguyên vai trò chưa lưu trước khi đổi trạng thái dự án.</p>}
   <div className="admin-actions"><button type="button" disabled={pendingChanges} onClick={()=>setOpen(true)}>{current.archived?'Mở lại dự án':'Kiểm tra lưu trữ'}</button><a href={`#/admin/audit?projectId=${encodeURIComponent(projectId)}`}>Xem nhật ký dự án</a></div>
   {api.lifecycleDecisions&&<LifecycleHistory key={current.version} projectId={projectId} api={api}/>}
  </>}
  {open&&<LifecycleDialog projectId={projectId} mode={current.archived?'REOPEN':'ARCHIVE'} api={api} onCancel={()=>setOpen(false)} onSaved={saved}/>}
 </section>;
}

function LifecycleHistory({projectId,api}) {
 const [open,setOpen]=useState(false);
 return <div className="admin-lifecycle-history"><button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>Lịch sử lưu trữ / mở lại</button>{open&&<DecisionList projectId={projectId} api={api}/>}</div>;
}
function DecisionList({projectId,api}) {
 const [page,setPage]=useState(0);
 const load=useCallback(signal=>api.lifecycleDecisions(projectId,{page,size:20},{signal}),[api,projectId,page]);
 const state=useAdminRead(`decisions:${projectId}:${page}`,load);
 return <section aria-label="Lịch sử vòng đời dự án"><ReadState {...state}/>{state.data&&<>
  {state.data.items.length?<ol className="admin-lifecycle-decisions">{state.data.items.map(decision=><li key={decision.id}><strong>{decision.action==='ARCHIVE'?'Lưu trữ':'Mở lại'} · {decision.actorName}</strong><small>{time(decision.decidedAt)}</small><p>{decision.reason}</p></li>)}</ol>:<p>Chưa có quyết định lưu trữ hoặc mở lại.</p>}
  <div className="admin-pagination"><span>{state.data.totalElements} quyết định · Trang {page+1}</span><button type="button" disabled={!page} onClick={()=>setPage(value=>value-1)}>Lịch sử trước</button><button type="button" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(value=>value+1)}>Lịch sử sau</button></div>
 </>}</section>;
}

function LifecycleDialog({projectId,mode,api,onCancel,onSaved}) {
 const reopening=mode==='REOPEN';
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(null);
 const [needsReview,setNeedsReview]=useState(false),[uncertain,setUncertain]=useState(false),[revision,setRevision]=useState(0);
 const lock=useRef(false),live=useRef(true),command=useRef(null);
 const dialogRef=useDialogFocus(onCancel,busy);
 const load=useCallback(signal=>api.archiveReadiness(projectId,{signal}),[api,projectId]);
 const state=useAdminRead(`decision:${projectId}:${revision}`,load);
 const current=state.data;
 const applicable=current&&(reopening?current.archived&&current.canReopen:!current.archived&&current.canArchive&&current.blockers.length===0);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 function refresh(){if(lock.current)return;setError(null);setNeedsReview(false);setUncertain(false);setRevision(n=>n+1);}
 async function submit(event,retry=false) {
  event?.preventDefault();
  if(lock.current||(!retry&&(!applicable||!reason.trim()||needsReview)))return;
  lock.current=true;setBusy(true);setError(null);
  const fingerprint=`${mode}|${current?.version}|${reason.trim()}`;
  if(!retry&&command.current?.fingerprint!==fingerprint) command.current={fingerprint,input:{expectedVersion:current.version,reason:reason.trim(),requestKey:crypto.randomUUID()}};
  try {
   const result=await (reopening?api.reopenProject:api.archiveProject)(projectId,command.current.input);
   if(live.current)onSaved(result);
  }catch(e){if(live.current){setError(e);const unknown=!e.status||e.status>=500;setUncertain(unknown);setNeedsReview(unknown||e.status!==422);}}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 const label=reopening?'Xác nhận mở lại':'Xác nhận lưu trữ';
 return <div className="admin-lifecycle-overlay"><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="lifecycle-title" aria-describedby="lifecycle-help" tabIndex={-1} className="admin-lifecycle-dialog">
  <header className="admin-page-heading"><h2 id="lifecycle-title">{reopening?'Mở lại dự án':'Kiểm tra trước khi lưu trữ'}</h2><button type="button" disabled={busy} onClick={onCancel}>Hủy</button></header>
  <p id="lifecycle-help">{reopening?'Lịch sử và dữ liệu đã lưu được giữ nguyên. Các thành viên có thể tiếp tục làm việc theo quyền hiện hành.':'Dữ liệu đã lưu vẫn xem và xuất được. Lưu trữ khóa thay đổi nghiệp vụ, không xóa lịch sử. Không thể bỏ qua việc tồn bên dưới.'}</p>
  <ReadState {...state}/>
  {current&&<>
   <p><strong>{current.projectCode} · {current.projectName}</strong></p>
   {!reopening&&<><p className="admin-lifecycle-check" role="status">{current.archived?'Dự án đã được lưu trữ. Đóng hộp thoại và tải lại trang để xem trạng thái mới.':current.blockers.length?'Cần xử lý các mục sau trước khi lưu trữ:':'Đã đáp ứng các điều kiện bắt buộc để lưu trữ.'}</p>
    {current.blockers.length>0&&<ul className="admin-lifecycle-blockers">{current.blockers.map(blocker=><li key={blocker.code}><div><strong>{blocker.label}</strong><span aria-label={`${blocker.count} mục`}>{blocker.count}</span></div>{blocker.code==='ALLOCATED_DEVICES'?<a href={`#/admin/devices?projectId=${encodeURIComponent(projectId)}`}>Thu hồi thiết bị</a>:<p>{guidance[blocker.code]||'Kiểm tra và xử lý mục còn tồn của dự án trước khi xác nhận.'}</p>}</li>)}</ul>}
    {current.warnings?.length>0&&<section className="admin-lifecycle-warnings" aria-label="Lưu ý trước khi lưu trữ"><h3>Lưu ý · Không chặn lưu trữ</h3><ul>{current.warnings.map(warning=><li key={warning.code}><strong>{warning.label}: {warning.count}</strong>{warning.code==='PUBLICATION_REVIEW'&&<p>Các lượt công bố thất bại, chưa rõ kết quả hoặc có xung đột vẫn được giữ lại. Sau khi lưu trữ, Admin cần mở lại dự án để PM đối chiếu hoặc gửi lại.</p>}</li>)}</ul></section>}
   </>}
   {reopening&&!current.archived&&<p role="status">Dự án đã được mở lại. Đóng hộp thoại và tải lại trang để xem trạng thái mới.</p>}
   <p className="admin-definition">Đã kiểm tra lúc {time(current.asOf)}. Điều kiện và quyền được kiểm tra lại khi lưu.</p>
  </>}
  {error&&<div className="admin-error" role="alert"><p>{error.message}</p>{uncertain&&<p>Chưa xác định thao tác đã được lưu hay chưa. Thử lưu lại gửi cùng yêu cầu, không tạo thêm quyết định.</p>}{error.status===403&&<p>Quyền của tài khoản không còn cho phép thao tác này. Kiểm tra lại quyền trước khi tiếp tục.</p>}</div>}
  <form className="admin-form" onSubmit={submit}>
   <label>{reopening?'Lý do mở lại':'Lý do lưu trữ'}<textarea required maxLength={2000} value={reason} disabled={busy||uncertain} onChange={e=>{setReason(e.target.value);if(error?.status===422)setError(null);}} aria-describedby="lifecycle-reason-help"/></label>
   <small id="lifecycle-reason-help">Bắt buộc, tối đa 2.000 ký tự. Lý do và người thực hiện được lưu trong nhật ký.</small>
   <div className="admin-actions"><button type="submit" disabled={busy||state.loading||!applicable||needsReview||!reason.trim()}>{busy?'Đang lưu…':label}</button>
    {uncertain&&<button type="button" disabled={busy} onClick={()=>submit(null,true)}>Thử lưu lại</button>}
    <button type="button" disabled={busy||state.loading} onClick={refresh}>Kiểm tra lại, giữ lý do</button>
   </div>
  </form>
 </section></div>;
}
