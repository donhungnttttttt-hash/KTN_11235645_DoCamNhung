import React,{useEffect,useRef,useState} from 'react';
import {notesApi} from '../../services/api/notes';
import './project-notes.css';

const savedTime=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';

export function ProjectNotes({projectId,canEdit=false,api=notesApi}) {
  if(!projectId)return <p role="status">Chọn dự án để xem Note.</p>;
  return <Notes key={`${projectId}/${canEdit}`} projectId={projectId} canEdit={canEdit} api={api}/>;
}

function Notes({projectId,canEdit,api}) {
  const [page,setPage]=useState(0),[revision,setRevision]=useState(0),[data,setData]=useState(null);
  const [loading,setLoading]=useState(true),[listError,setListError]=useState(''),[actionError,setActionError]=useState('');
  const [editor,setEditor]=useState(null),[removing,setRemoving]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [needsReview,setNeedsReview]=useState(false),[latest,setLatest]=useState(null);
  const lifetime=useRef(null),lock=useRef(false),focusAfter=useRef(null),addButton=useRef(null);
  useEffect(()=>{const abort=new AbortController();lifetime.current=abort;return()=>abort.abort();},[]);
  useEffect(()=>{
    const abort=new AbortController();setLoading(true);setListError('');setData(null);
    api.list(projectId,{page,size:20},{signal:abort.signal}).then(value=>{
      if(abort.signal.aborted)return;
      if(page>0&&!value.items.length&&page>=value.totalPages){setPage(Math.max(0,value.totalPages-1));return;}
      setData(value);
    }).catch(error=>{if(!abort.signal.aborted)setListError(error.message);})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[projectId,api,page,revision]);
  function closeEditor(){setEditor(null);setActionError('');setNeedsReview(false);setLatest(null);focusAfter.current?.focus();}
  function openEditor(note,event){focusAfter.current=event.currentTarget;setEditor({note,title:note?.title||'',body:note?.body||''});setRemoving(null);setActionError('');setNotice('');setNeedsReview(false);setLatest(null);}
  async function compareLatest(){
    if(lock.current||!editor?.note)return;
    lock.current=true;setBusy(true);setActionError('');const signal=lifetime.current.signal;
    try{const current=await api.get(projectId,editor.note.id,{signal});if(!signal.aborted)setLatest(current);}
    catch(error){if(!signal.aborted)setActionError(error.status===404?'Note không còn trong danh sách. Giữ lại nội dung nháp trước khi hủy chỉnh sửa.':error.message);}
    finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
  }
  async function mutate(action,message,editing=false) {
    if(lock.current||!canEdit)return;
    lock.current=true;setBusy(true);setActionError('');setNotice('');const signal=lifetime.current.signal;
    try {
      await action({signal});if(signal.aborted)return;
      setEditor(null);setRemoving(null);setNeedsReview(false);setLatest(null);setNotice(message);setRevision(value=>value+1);addButton.current?.focus();
    }catch(error){if(!signal.aborted){setActionError(error.message);if(editing&&error.status===409){setNeedsReview(true);setLatest(null);}}}
    finally{if(!signal.aborted){lock.current=false;setBusy(false);}}
  }
  function save(event) {
    event.preventDefault();if(!editor||needsReview)return;
    const body={title:editor.title,body:editor.body};
    mutate(options=>editor.note?api.update(projectId,editor.note.id,{...body,expectedVersion:editor.note.version},options):api.create(projectId,body,options),'Đã lưu Note.',true);
  }
  return <section className="project-notes" aria-label="Note chung của dự án">
    <div className="project-notes-toolbar"><p>Ghi chú chung để các thành viên cùng theo dõi.</p>
      <div className="project-notes-actions"><button type="button" className="cat-btn" disabled={loading||busy} onClick={()=>setRevision(value=>value+1)}>Tải lại Note</button>
        {canEdit&&<button ref={addButton} type="button" className="cat-btn primary" disabled={loading||busy||!!editor||!!listError} onClick={event=>openEditor(null,event)}>Thêm Note</button>}</div>
    </div>
    {notice&&<p role="status">{notice}</p>}
    {listError&&<p role="alert">{listError}</p>}{actionError&&<p role="alert">{actionError}</p>}
    {canEdit&&editor&&<form className="project-notes-editor" onSubmit={save}>
      <h2>{editor.note?'Sửa Note':'Note mới'}</h2>
      <fieldset disabled={busy}><label>Tiêu đề Note<input autoFocus required maxLength={200} value={editor.title} onChange={event=>setEditor({...editor,title:event.target.value})}/></label>
        <label>Nội dung Note<textarea required maxLength={10000} rows={8} value={editor.body} onChange={event=>setEditor({...editor,body:event.target.value})}/></label></fieldset>
      {needsReview&&<div className="project-note-conflict" role="group" aria-label="Đối chiếu thay đổi của Note"><p>Note đã được thay đổi. Bản nháp của bạn vẫn còn; đọc bản mới nhất trước khi lưu lại.</p>
        <button type="button" className="cat-btn" disabled={busy} onClick={compareLatest}>{busy?'Đang tải bản mới…':'Đối chiếu bản mới của Note'}</button>
        {latest&&<section className="project-note-current" aria-label="Bản Note hiện tại trên server"><h3>{latest.title}</h3><p className="project-note-time">Phiên bản {latest.version} · {savedTime(latest.updatedAt)} · giờ Việt Nam</p><div className="project-note-body" role="region" tabIndex={0} aria-label="Nội dung Note hiện tại">{latest.body}</div><p>Lưu lại sẽ thay nội dung trên bằng bản nháp bạn đang nhập.</p>
          <button type="button" className="cat-btn" disabled={busy} onClick={()=>{setEditor(current=>({...current,note:latest}));setNeedsReview(false);setLatest(null);setActionError('');}}>Đã đối chiếu, giữ nháp để lưu lại</button>
        </section>}
      </div>}
      <div className="project-notes-actions"><button className="cat-btn primary" disabled={busy||needsReview||!editor.title.trim()||!editor.body.trim()}>{busy?(needsReview?'Đang đối chiếu…':'Đang lưu…'):'Lưu Note'}</button><button type="button" className="cat-btn" disabled={busy} onClick={closeEditor}>Hủy chỉnh sửa</button></div>
    </form>}
    {loading&&<p role="status">Đang tải Note…</p>}
    {!loading&&data&&!data.items.length&&<p>Chưa có Note trong dự án.</p>}
    {data&&<><div className="project-notes-list">{data.items.map(note=><article key={note.id} className="project-note">
      <div className="project-note-heading"><h2>{note.title}</h2>{canEdit&&<div className="project-notes-actions">
        <button type="button" className="cat-btn" aria-label={`Sửa Note ${note.title}`} disabled={busy||!!editor} onClick={event=>openEditor(note,event)}>Sửa</button>
        <button type="button" className="cat-btn" aria-label={`Xóa Note ${note.title}`} disabled={busy||!!editor} onClick={()=>{setRemoving(note);setActionError('');setNotice('');}}>Xóa</button>
      </div>}</div>
      <p className="project-note-time">Cập nhật {savedTime(note.updatedAt)} · giờ Việt Nam</p><p className="project-note-body">{note.body}</p>
      {canEdit&&removing?.id===note.id&&<div className="project-note-confirm" role="group" aria-label={`Xác nhận xóa Note ${note.title}`}>
        <p>Xóa Note “{note.title}” khỏi danh sách? Nội dung vẫn được lưu trữ.</p><div className="project-notes-actions"><button type="button" className="cat-btn" disabled={busy} onClick={()=>mutate(options=>api.remove(projectId,note.id,note.version,options),'Đã xóa Note.')}>{busy?'Đang xóa…':'Xác nhận xóa Note'}</button><button type="button" className="cat-btn" disabled={busy} onClick={()=>{setRemoving(null);setActionError('');}}>Giữ Note</button></div>
      </div>}
    </article>)}</div>
      <nav className="project-notes-pagination" aria-label="Phân trang Note"><span>{data.totalItems} Note · Trang {page+1}/{Math.max(1,data.totalPages)}</span><div className="project-notes-actions"><button type="button" className="cat-btn" aria-label="Trang Note trước" disabled={!page||busy||!!editor} onClick={()=>setPage(value=>value-1)}>Trước</button><button type="button" className="cat-btn" aria-label="Trang Note sau" disabled={page+1>=data.totalPages||busy||!!editor} onClick={()=>setPage(value=>value+1)}>Sau</button></div></nav>
    </>}
  </section>;
}
