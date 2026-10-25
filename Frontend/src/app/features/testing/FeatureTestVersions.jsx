import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Trash2} from 'lucide-react';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {featuresApi} from '../../services/api/features';

function DeleteVersionConfirmation({version,busy,error,onCancel,onConfirm,opener}) {
 const title=useId(),description=useId(),ref=useDialogFocus(onCancel,busy,true,opener);
 return createPortal(<div className="testing-version-confirm-overlay"><section ref={ref} className="testing-version-confirm" role="dialog" aria-modal="true" aria-labelledby={title} aria-describedby={description} aria-busy={busy} tabIndex={-1}>
  <h2 id={title}>Xóa version test?</h2>
  <p id={description}>Version <strong>{version.name}</strong> sẽ được ẩn khỏi danh sách chọn. Kết quả và lịch sử kiểm thử cũ vẫn được giữ nguyên.</p>
  {error&&<p role="alert" className="td-error">{error}</p>}
  <div className="testing-version-confirm-actions"><button className="cat-btn" data-dialog-initial-focus disabled={busy} onClick={onCancel}>Hủy</button><button className="cat-btn testing-version-confirm-delete" disabled={busy} onClick={onConfirm}>{busy?'Đang xóa…':'Xóa'}</button></div>
 </section></div>,document.body);
}

export function FeatureTestVersions({projectId,featureId,canManage,api=featuresApi}) {
 const [open,setOpen]=useState(false),[selected,setSelected]=useState(null),[items,setItems]=useState([]);
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [loading,setLoading]=useState(false),[loadError,setLoadError]=useState(''),[reload,setReload]=useState(0);
 const [deleting,setDeleting]=useState(null),[deleteError,setDeleteError]=useState(''),[notice,setNotice]=useState('');
 const deleteOpener=useRef(null);
 const root=useRef(null),trigger=useRef(null),input=useRef(null),lock=useRef(false),command=useRef(null),live=useRef(true),returnFocus=useRef(false),panelId=useId();
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{
  if(!open||!canManage)return;
  let current=true;setLoading(true);setLoadError('');input.current?.focus();
  api.testVersions(projectId,featureId).then(values=>{if(current)setItems(values);}).catch(e=>{if(current)setLoadError(e.message||'Chưa tải được version.');}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[open,canManage,api,projectId,featureId,reload]);
 useEffect(()=>{
  if(!open)return;
  const outside=e=>{if(!root.current?.contains(e.target)&&!lock.current&&!deleting)setOpen(false);};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[open,deleting]);
 function close(){if(lock.current||deleting)return;setOpen(false);trigger.current?.focus();}
 function cancelDelete(){if(!lock.current){setDeleting(null);setDeleteError('');}}
 async function remove(){
  if(lock.current||!deleting||!canManage)return;
  lock.current=true;setBusy(true);setDeleteError('');
  try{await api.deleteTestVersion(projectId,featureId,deleting.id);if(live.current){setItems(old=>old.filter(v=>v.id!==deleting.id));setSelected(old=>old?.id===deleting.id?null:old);setNotice(`Đã xóa version ${deleting.name}.`);setDeleting(null);}}
  catch(e){if(live.current)setDeleteError(e.message||'Chưa xóa được version. Hãy thử lại.');}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 useEffect(()=>{if(notice&&!deleting&&!busy)input.current?.focus();},[notice,deleting,busy]);
 function selectVersion(value){if(lock.current)return;setSelected(value);close();}
 async function save(event){event.preventDefault();if(lock.current||!canManage||!name.trim())return;
  lock.current=true;setBusy(true);setError('');
  if(command.current?.name!==name.trim())command.current={name:name.trim(),requestKey:crypto.randomUUID()};
  try{const result=await api.createTestVersion(projectId,featureId,command.current);if(live.current){setSelected(result);setItems(old=>[result,...old.filter(v=>v.id!==result.id)]);setName('');command.current=null;returnFocus.current=true;setOpen(false);}}
  catch(e){if(live.current)setError(e.message||'Chưa tạo được version test.');}finally{lock.current=false;if(live.current)setBusy(false);}
 }
 useEffect(()=>{if(returnFocus.current&&!open&&!busy){trigger.current?.focus();returnFocus.current=false;}},[open,busy]);
 if(!canManage)return null;
 return <div ref={root} className="testing-version-action" onKeyDown={e=>{if(e.key==='Escape'&&open&&!deleting){e.preventDefault();e.stopPropagation();close();}}} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget)&&!lock.current&&!deleting)setOpen(false);}}>
  <button ref={trigger} className="cat-btn testing-version-trigger" title={selected?.name} aria-expanded={open} aria-controls={open?panelId:undefined} disabled={busy} onClick={()=>{if(open)close();else{setLoading(true);setLoadError('');setOpen(true);}}}><span>{selected?.name||'Thêm version test'}</span><span aria-hidden="true">▾</span></button>
  {open&&<section id={panelId} className="testing-version-dropdown" role="region" aria-label="Version test" aria-busy={busy||loading}>
   {loading&&<p role="status" className="testing-version-empty">Đang tải version…</p>}
   {loadError&&<div role="alert" className="td-error">{loadError} <button className="cat-btn" disabled={busy} onClick={()=>setReload(n=>n+1)}>Thử lại</button></div>}
   {!loading&&!loadError&&(!items.length?<p className="testing-version-empty">Chưa có version</p>:<ul className="testing-version-list">{items.map(v=><li key={v.id}><button className="testing-version-option" type="button" aria-pressed={selected?.id===v.id} disabled={busy} onClick={()=>selectVersion(v)}>{v.name}</button><button className="testing-version-trash" type="button" aria-label={`Xóa version ${v.name}`} title={`Xóa version ${v.name}`} disabled={busy} onClick={e=>{deleteOpener.current=e.currentTarget;setNotice('');setDeleteError('');setDeleting(v);}}><Trash2 size={17} aria-hidden="true"/></button></li>)}</ul>)}
   <form onSubmit={save} className="testing-version-add"><input ref={input} aria-label="Tên version test" placeholder="Nhập version mới" required maxLength={255} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/><button className="cat-btn cat-btn-mint" disabled={busy||!name.trim()}>{busy?'Đang thêm…':'Thêm'}</button></form>
   {error&&<p role="alert" className="td-error">{error}</p>}
   {notice&&<p role="status" className="testing-version-empty">{notice}</p>}
  </section>}
  {deleting&&<DeleteVersionConfirmation version={deleting} busy={busy} error={deleteError} onCancel={cancelDelete} onConfirm={remove} opener={deleteOpener}/>}
 </div>;
}
