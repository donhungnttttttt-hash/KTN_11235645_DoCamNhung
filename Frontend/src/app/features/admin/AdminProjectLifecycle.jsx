import React,{useCallback,useEffect,useRef,useState} from 'react';
import {adminApi} from '../../services/api/admin';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {useAdminRead,ReadState} from './shared';

const time=value=>value?new Date(value).toLocaleString('vi-VN'):'Chưa ghi nhận';
const legacyLabels={UNFINISHED_CYCLES:'Đợt kiểm thử chưa chốt',OPEN_RETESTS:'Yêu cầu kiểm thử lại còn mở'};
const acknowledgement='Tôi xác nhận lưu trữ dù còn đợt kiểm thử/yêu cầu kiểm thử lại thuộc luồng cũ; dữ liệu và lịch sử được giữ nguyên.';
const guidance={
 ACTIVE_SESSIONS:'Phiên thuộc luồng cũ cần Admin và PM đối soát; hiện không có thao tác hoàn tất phiên cũ trên giao diện. Mục này vẫn chặn lưu trữ, không được xác nhận ngoại lệ.',
 OPEN_WORK_ITEMS:'PM và USER xử lý Ticket theo trách nhiệm, gồm xác nhận và xác minh hiện hành. Ticket đã xóa hoặc nằm trong Feature/file ẩn và công việc cũ cần Admin và PM đối soát; vẫn chặn lưu trữ, không được xác nhận ngoại lệ.',
 UNFINISHED_CYCLES:'Đợt kiểm thử thuộc luồng cũ. Admin tổng có thể xác nhận ngoại lệ khi đủ điều kiện; dữ liệu và lịch sử được giữ nguyên.',
 OPEN_RETESTS:'Yêu cầu kiểm thử lại thuộc luồng cũ. Admin tổng có thể xác nhận ngoại lệ khi đủ điều kiện; dữ liệu và lịch sử được giữ nguyên.',
 PENDING_PUBLICATIONS:'Admin và PM đối soát tác vụ Redmine đang gửi hoặc chờ thử lại. Mục này vẫn chặn lưu trữ, không được xác nhận ngoại lệ.',
};

function LegacyDecision({exception}) {
 if(!exception)return null;
 return <div><strong>Ngoại lệ tồn đọng luồng cũ</strong><ul>{exception.blockers.map(blocker=><li key={blocker.code}>{legacyLabels[blocker.code]||blocker.code} ({blocker.code}): {blocker.count}</li>)}</ul></div>;
}

export function AdminProjectLifecycle({projectId,api=adminApi,onSaved,pendingChanges=false}) {
 const [dialogMode,setDialogMode]=useState(null),[receipt,setReceipt]=useState(null),[notice,setNotice]=useState('');
 const load=useCallback(signal=>api.archiveReadiness(projectId,{signal}),[api,projectId]);
 const state=useAdminRead(`lifecycle:${projectId}`,load);
 const current=receipt||state.data;
 function saved(result){setReceipt(result);setDialogMode(null);setNotice(result.archived?'Đã lưu trữ dự án. Dữ liệu đã lưu vẫn có thể xem và xuất.':'Dự án đang hoạt động. Có thể tiếp tục công việc theo quyền hiện hành.');onSaved?.(result);}
 return <section className="admin-card admin-lifecycle" aria-label="Vòng đời dự án">
  <div className="admin-page-heading"><h2>Vòng đời dự án</h2>{current&&<span className={`admin-lifecycle-state ${current.archived?'is-archived':''}`}>{current.archived?'Đã lưu trữ':'Đang hoạt động'}</span>}</div>
  {notice&&<p role="status">{notice}</p>}
  {!current&&<ReadState {...state}/>}
  {current&&<>
   <p>{current.archived?'Dự án chỉ đọc. Vẫn xem và xuất được dữ liệu đã lưu; mở lại để tiếp tục công việc.':'Lưu trữ sau khi xử lý xong việc tồn và thu hồi thiết bị. Chỉ Admin thực hiện; hệ thống kiểm tra lại khi xác nhận.'}</p>
   {current.latestDecision&&<div className="admin-lifecycle-decision"><strong>{current.latestDecision.action==='ARCHIVE'?'Lưu trữ':'Mở lại'} · {current.latestDecision.actorName}</strong><small>{time(current.latestDecision.decidedAt)}</small><p>{current.latestDecision.reason}</p><LegacyDecision exception={current.latestDecision.legacyException}/></div>}
   {pendingChanges&&<p>Hoàn tất hoặc hủy chỉnh sửa dự án và bỏ chọn thành viên trước khi đổi trạng thái dự án.</p>}
   <div className="admin-actions"><button type="button" disabled={pendingChanges} onClick={()=>setDialogMode(current.archived?'REOPEN':'ARCHIVE')}>{current.archived?'Mở lại dự án':'Kiểm tra lưu trữ'}</button><a href={`#/admin/audit?projectId=${encodeURIComponent(projectId)}`}>Xem nhật ký dự án</a></div>
   {api.lifecycleDecisions&&<LifecycleHistory key={current.version} projectId={projectId} api={api}/>}
  </>}
  {dialogMode&&<LifecycleDialog projectId={projectId} mode={dialogMode} api={api} onCancel={()=>setDialogMode(null)} onSaved={saved}/>}
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
  {state.data.items.length?<ol className="admin-lifecycle-decisions">{state.data.items.map(decision=><li key={decision.id}><strong>{decision.action==='ARCHIVE'?'Lưu trữ':'Mở lại'} · {decision.actorName}</strong><small>{time(decision.decidedAt)}</small><p>{decision.reason}</p><LegacyDecision exception={decision.legacyException}/></li>)}</ol>:<p>Chưa có quyết định lưu trữ hoặc mở lại.</p>}
  <div className="admin-pagination"><span>{state.data.totalElements} quyết định · Trang {page+1}</span><button type="button" disabled={!page} onClick={()=>setPage(value=>value-1)}>Lịch sử trước</button><button type="button" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(value=>value+1)}>Lịch sử sau</button></div>
 </>}</section>;
}

function LifecycleDialog({projectId,mode,api,onCancel,onSaved}) {
 const reopening=mode==='REOPEN';
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(null);
 const [acknowledged,setAcknowledged]=useState(false),[denied,setDenied]=useState(false);
 const [needsReview,setNeedsReview]=useState(false),[uncertain,setUncertain]=useState(false),[revision,setRevision]=useState(0);
 const lock=useRef(false),live=useRef(true),command=useRef(null);
 const dialogRef=useDialogFocus(onCancel,busy);
 const load=useCallback(signal=>api.archiveReadiness(projectId,{signal}),[api,projectId]);
 const state=useAdminRead(`decision:${projectId}:${revision}`,load);
 const current=state.data;
 const exceptionAvailable=!reopening&&current&&!current.archived&&current.canArchiveWithLegacyException===true&&!!current.legacyExceptionFingerprint;
 const applicable=!denied&&current&&(reopening?current.archived&&current.canReopen:!current.archived&&(current.canArchive||(exceptionAvailable&&acknowledged)));
 const validReason=reason.trim().length>0&&reason.trim().length<=2000;
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{setAcknowledged(false);},[current]);
 function refresh(){if(lock.current)return;if(!denied)setError(null);setAcknowledged(false);command.current=null;setNeedsReview(false);setUncertain(false);setRevision(n=>n+1);}
 async function submit(event,retry=false) {
  event?.preventDefault();
  if(lock.current||denied||state.loading||(!retry&&(!applicable||!validReason||needsReview))||(retry&&(!uncertain||!command.current)))return;
  lock.current=true;setBusy(true);setError(null);
  if(!retry){
   const draft={expectedVersion:current.version,reason:reason.trim(),...(!reopening&&!current.canArchive&&exceptionAvailable&&acknowledged?{legacyException:{acknowledged:true,snapshotFingerprint:current.legacyExceptionFingerprint}}:{})};
   const fingerprint=JSON.stringify({mode,...draft});
   if(command.current?.fingerprint!==fingerprint)command.current={fingerprint,input:{...draft,requestKey:crypto.randomUUID()}};
  }
  try {
   const result=await (reopening?api.reopenProject:api.archiveProject)(projectId,command.current.input);
   if(live.current)onSaved(result);
  }catch(e){if(live.current){
   setError(e);const unknown=!e.status||e.status>=500;setUncertain(unknown);setNeedsReview(unknown||e.status!==422);
   if(e.status===401||e.status===403){setDenied(true);setAcknowledged(false);command.current=null;}
   if(e.status===409){setAcknowledged(false);command.current=null;setRevision(n=>n+1);}
  }}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 const label=reopening?'Xác nhận mở lại':'Xác nhận lưu trữ';
 const disabledReason=busy?'Đang lưu quyết định.':denied?'Quyền của tài khoản không còn cho phép thao tác này.':state.loading?'Chờ tải điều kiện và quyền hiện tại.':uncertain?'Chưa rõ kết quả; dùng Thử lưu lại để gửi nguyên yêu cầu.':!applicable?(exceptionAvailable?'Cần xác nhận ngoại lệ luồng cũ trước khi lưu trữ.':'Chưa đủ điều kiện hoặc quyền để xác nhận; các mục chặn vẫn phải được xử lý.'):needsReview?'Kiểm tra lại điều kiện trước khi xác nhận.':!validReason?'Nhập lý do từ 1 đến 2.000 ký tự sau khi bỏ khoảng trắng đầu cuối.':'Điều kiện và quyền được kiểm tra lại khi lưu.';
 return <div className="admin-lifecycle-overlay"><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="lifecycle-title" aria-describedby="lifecycle-help" tabIndex={-1} className="admin-lifecycle-dialog">
  <header className="admin-page-heading"><h2 id="lifecycle-title">{reopening?'Mở lại dự án':'Kiểm tra trước khi lưu trữ'}</h2><button type="button" disabled={busy} onClick={onCancel}>Hủy</button></header>
  <p id="lifecycle-help">{reopening?'Lịch sử và dữ liệu đã lưu được giữ nguyên. Các thành viên có thể tiếp tục làm việc theo quyền hiện hành.':'Dữ liệu đã lưu vẫn xem và xuất được. Lưu trữ khóa thay đổi nghiệp vụ, không xóa lịch sử. Chỉ hai loại tồn đọng luồng cũ được đánh dấu mới có thể được Admin tổng xác nhận ngoại lệ; các mục chặn khác vẫn giữ nguyên.'}</p>
  <ReadState {...state}/>
  {current&&<>
   <p><strong>{current.projectCode} · {current.projectName}</strong></p>
   {!reopening&&<><p className="admin-lifecycle-check" role="status">{current.archived?'Dự án đã được lưu trữ. Đóng hộp thoại và tải lại trang để xem trạng thái mới.':current.blockers.length?'Cần xử lý các mục sau trước khi lưu trữ:':'Đã đáp ứng các điều kiện bắt buộc để lưu trữ.'}</p>
    {current.blockers.length>0&&<ul className="admin-lifecycle-blockers">{current.blockers.map(blocker=><li key={blocker.code}><div><strong>{blocker.label}</strong><span aria-label={`${blocker.count} mục`}>{blocker.count}</span></div><p>{blocker.exceptionEligible?'Có thể xác nhận ngoại lệ luồng cũ':'Bắt buộc xử lý · Không được xác nhận ngoại lệ'}</p>{blocker.code==='ALLOCATED_DEVICES'?<a href={`#/admin/devices?projectId=${encodeURIComponent(projectId)}`}>Thu hồi thiết bị</a>:<p>{guidance[blocker.code]||'Cần Admin và PM đối soát mục còn tồn; chưa có hướng xử lý được xác nhận, vẫn giữ chặn lưu trữ.'}</p>}</li>)}</ul>}
    {current.warnings?.length>0&&<section className="admin-lifecycle-warnings" aria-label="Lưu ý trước khi lưu trữ"><h3>Lưu ý · Không chặn lưu trữ</h3><ul>{current.warnings.map(warning=><li key={warning.code}><strong>{warning.label}: {warning.count}</strong>{warning.code==='PUBLICATION_REVIEW'&&<p>Các lượt công bố thất bại, chưa rõ kết quả hoặc có xung đột vẫn được giữ lại. Sau khi lưu trữ, Admin cần mở lại dự án để PM đối chiếu hoặc gửi lại.</p>}</li>)}</ul></section>}
   </>}
   {reopening&&!current.archived&&<p role="status">Dự án đã được mở lại. Đóng hộp thoại và tải lại trang để xem trạng thái mới.</p>}
   <p className="admin-definition">Đã kiểm tra lúc {time(current.asOf)}. Điều kiện và quyền được kiểm tra lại khi lưu.</p>
  </>}
  {error&&<div className="admin-error" role="alert"><p>{error.message}</p>{uncertain&&<p>Chưa xác định thao tác đã được lưu hay chưa. Thử lưu lại gửi cùng yêu cầu, không tạo thêm quyết định.</p>}{error.status===403&&<p>Quyền của tài khoản không còn cho phép thao tác này. Kiểm tra lại quyền trước khi tiếp tục.</p>}</div>}
  <form className="admin-form" onSubmit={submit}>
   {exceptionAvailable&&<label className="admin-check"><input type="checkbox" checked={acknowledged} disabled={busy||uncertain||denied} onChange={e=>{setAcknowledged(e.target.checked);setNeedsReview(false);}}/><span>{acknowledgement}</span></label>}
   <label>{reopening?'Lý do mở lại':'Lý do lưu trữ'}<textarea required maxLength={2000} value={reason} disabled={busy||uncertain} onChange={e=>{setReason(e.target.value);if(error?.status===422)setError(null);}} aria-describedby="lifecycle-reason-help"/></label>
   <small id="lifecycle-reason-help">Bắt buộc, tối đa 2.000 ký tự. Lý do và người thực hiện được lưu trong nhật ký.</small>
   <p id="lifecycle-submit-help">{disabledReason}</p>
   <div className="admin-actions"><button type="submit" aria-describedby="lifecycle-submit-help" disabled={busy||state.loading||!applicable||needsReview||!validReason}>{busy?'Đang lưu…':label}</button>
    {uncertain&&<button type="button" disabled={busy} onClick={()=>submit(null,true)}>Thử lưu lại</button>}
    <button type="button" disabled={busy||state.loading} onClick={refresh}>Kiểm tra lại, giữ lý do</button>
   </div>
  </form>
 </section></div>;
}
