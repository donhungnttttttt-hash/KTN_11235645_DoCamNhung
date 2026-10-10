import React, { useEffect, useState } from 'react';
import { projectsApi } from '../../services/api/projects';
import { formatTime } from '../test-execution/components';

export function HandbookPanel({projectId,canEdit=false}) {
  const [items,setItems]=useState(null);
  const [selected,setSelected]=useState(null);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  const [editor,setEditor]=useState(null);
  useEffect(()=>{
    let live=true;setItems(null);setError('');
    projectsApi.listHandbook(projectId).then(data=>{if(live)setItems(data);}).catch(failure=>{if(live)setError(failure.message);});
    return()=>{live=false;};
  },[projectId,reload]);
  return <section>
    <div className="settings-heading"><h2>Sổ tay dự án</h2>{canEdit && <button className="cat-btn primary" disabled={!!editor} onClick={()=>setEditor({item:null})}>Thêm tài liệu</button>}</div>
    <p className="settings-hint">Hướng dẫn nội bộ và nguồn đặc tả. Chỉ lưu thông tin tham chiếu nơi cấp phát tài khoản, không ghi mật khẩu hoặc khóa truy cập.</p>
    {error && <p role="alert" className="text-danger">{error} <button className="cat-btn" onClick={()=>setReload(x=>x+1)}>Thử lại</button></p>}
    {editor && <HandbookEditor key={editor.item?.id || 'new'} projectId={projectId} item={editor.item} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setSelected(null);setReload(x=>x+1);}}/>}
    {!items ? !error && <p>Đang tải sổ tay…</p> : !items.length ? <p>Chưa có tài liệu trong dự án.</p> : <div className="handbook-layout">
      <nav className="handbook-list" aria-label="Tài liệu dự án">{items.map(item=><button key={item.id} className="cat-btn" aria-current={selected===item.id?'page':undefined} onClick={()=>setSelected(item.id)}>{item.name} · v{item.currentRevision?.revisionNo}</button>)}</nav>
      {selected && <HandbookDetail key={selected} projectId={projectId} id={selected} canEdit={canEdit && !editor} onEdit={item=>setEditor({item})}/>}
    </div>}
  </section>;
}
function HandbookDetail({projectId,id,canEdit,onEdit}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
  useEffect(()=>{let live=true;setError('');projectsApi.getHandbook(projectId,id).then(value=>{if(live)setData(value);}).catch(failure=>{if(live)setError(failure.message);});return()=>{live=false;};},[projectId,id,reload]);
  if(error)return <p role="alert">{error} <button className="cat-btn" onClick={()=>setReload(x=>x+1)}>Thử lại</button></p>;
  if(!data)return <p>Đang tải nội dung…</p>;
  return <article className="handbook-detail"><div className="settings-heading"><h3>{data.name}</h3>{canEdit && !data.archived && <button className="cat-btn" onClick={()=>onEdit(data)}>Thêm phiên bản</button>}</div>
    <p className="settings-hint">Nội bộ · Phiên bản {data.currentRevision?.revisionNo} · {formatTime(data.currentRevision?.createdAt)} (UTC)</p>
    <pre className="handbook-text">{data.currentRevision?.contentHtml}</pre>
    <details><summary>Lịch sử chỉnh sửa ({data.history.length})</summary>{data.history.map(revision=><section key={revision.id} className="handbook-revision"><strong>Phiên bản {revision.revisionNo}</strong><p>{formatTime(revision.createdAt)} (UTC) · Thành viên #{revision.editedBy}</p><pre className="handbook-text">{revision.contentHtml}</pre></section>)}</details>
  </article>;
}
function HandbookEditor({projectId,item,onSaved,onClose}) {
  const [form,setForm]=useState({code:'',name:'',resourceType:'GUIDE',contentHtml:item?.currentRevision?.contentHtml || ''});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function save(event){event.preventDefault();setBusy(true);setError('');try{
    if(item)await projectsApi.addRevision(projectId,item.id,{contentHtml:form.contentHtml,visibility:'INTERNAL',expectedCurrentRevisionId:item.currentRevision.id});
    else await projectsApi.createHandbook(projectId,{...form,visibility:'INTERNAL'});
    onSaved();
  }catch(failure){setError(failure.message);}finally{setBusy(false);}}
  return <form className="settings-editor" onSubmit={save}>
    <h3>{item?`Phiên bản mới: ${item.name}`:'Tài liệu mới'}</h3>{error && <p role="alert" className="text-danger">{error}</p>}
    <fieldset disabled={busy}>
      {!item && <div className="settings-fields"><label className="form-group">Mã tài liệu<input autoFocus required maxLength={32} value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label><label className="form-group">Tên tài liệu<input required maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label className="form-group">Loại tài liệu<select value={form.resourceType} onChange={e=>setForm({...form,resourceType:e.target.value})}><option value="GUIDE">Hướng dẫn</option><option value="SPEC_REFERENCE">Nguồn đặc tả</option><option value="TEST_ACCOUNT_REFERENCE">Nơi cấp tài khoản kiểm thử</option></select></label></div>}
      <label className="form-group">Nội dung<textarea required rows={9} maxLength={10000} value={form.contentHtml} onChange={e=>setForm({...form,contentHtml:e.target.value})}/></label>
    </fieldset>
    <div className="settings-actions"><button className="cat-btn primary" disabled={busy}>Lưu tài liệu</button><button type="button" className="cat-btn" disabled={busy} onClick={onClose}>Hủy</button></div>
  </form>;
}
