import React,{useContext,useEffect,useId,useRef,useState} from 'react';
import {DialogVisibilityContext} from '../auth/DialogVisibilityContext';
import {createPortal} from 'react-dom';
import {Modal} from './components';
import {FeatureIssueForm} from './FeatureIssueForm';
import {FeatureIssueDetail} from './FeatureIssueDetail';
import {featureIssuesApi} from '../../services/api/featureIssues';
import './feature-issues.css';
import './case-issue-action.css';

export function CaseIssueAction({projectId,featureId,documentId,row,refresh,api=featureIssuesApi,canCreate=true}) {
 const visible=useContext(DialogVisibilityContext);
 const [data,setData]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0),[page,setPage]=useState(0),[preview,setPreview]=useState(false),[modal,setModal]=useState(null),[position,setPosition]=useState({});
 const button=useRef(null),popup=useRef(null),hideTimer=useRef(null),restoringFocus=useRef(false);
 const previewId=useId();
 const rowId=row.rowId;
 useEffect(()=>{
  const controller=new AbortController();setError('');setData(null);
  api.list(projectId,{featureId,documentId,rowId,page,size:20},{signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[api,projectId,featureId,documentId,rowId,page,reload]);
 useEffect(()=>()=>clearTimeout(hideTimer.current),[]);
 useEffect(()=>{
  if(!preview||!visible)return;
  const outside=event=>{if(!popup.current?.contains(event.target)&&!button.current?.contains(event.target))setPreview(false);};
  const reposition=event=>{if(!popup.current?.contains(event.target))positionPreview();};
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',reposition);document.addEventListener('scroll',reposition,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',reposition);document.removeEventListener('scroll',reposition,true);};
 },[preview,visible]);
 function positionPreview(){const rect=button.current?.getBoundingClientRect();if(rect)setPosition({position:'fixed',top:Math.min(rect.bottom+4,Math.max(8,window.innerHeight-300)),left:Math.max(8,Math.min(rect.left,window.innerWidth-336))});}
 function show(){clearTimeout(hideTimer.current);positionPreview();setPreview(true);}
 function hide(){hideTimer.current=setTimeout(()=>{if(!popup.current?.contains(document.activeElement)&&document.activeElement!==button.current)setPreview(false);},150);}
 function open(value){setPreview(false);setModal(value);}
 function restoreFocus(){restoringFocus.current=true;button.current?.focus();restoringFocus.current=false;}
 function close(){setModal(null);restoreFocus();}
 function saved(){close();setReload(value=>value+1);refresh?.();}
 const previewControls=()=>[...(popup.current?.querySelectorAll('button:not(:disabled),a[href]')||[])];
 function previewKey(event){
  if(event.key==='Escape'){event.preventDefault();setPreview(false);restoreFocus();return;}
  if(event.key!=='Tab')return;
  const controls=previewControls();
  if(event.shiftKey&&event.target===controls[0]){event.preventDefault();setPreview(false);restoreFocus();}
  else if(!event.shiftKey&&event.target===controls.at(-1)){
   const all=[...document.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(element=>element.tabIndex>=0&&!element.closest('[hidden],[inert]')&&!popup.current?.contains(element));
   const next=all[all.indexOf(button.current)+1];setPreview(false);if(next){event.preventDefault();next.focus();}
  }
 }
 const count=data?.totalItems;
 return <>
  <button ref={button} type="button" className="cat-btn case-issue-button" aria-expanded={preview} aria-controls={preview?previewId:undefined} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();clearTimeout(hideTimer.current);setPreview(false);}else if(preview&&((e.key==='Tab'&&!e.shiftKey)||e.key==='ArrowDown')){const first=previewControls()[0];if(first){e.preventDefault();first.focus();}}}} onMouseEnter={show} onMouseLeave={hide} onFocus={()=>{if(!restoringFocus.current)show();}} onBlur={hide} onClick={()=>{if(error){setReload(value=>value+1);show();}else if(count===0&&canCreate)open('new');else show();}}>Issue ({count??(error?'?':'…')})</button>
  {preview&&!modal&&createPortal(<section hidden={!visible} inert={!visible?'':undefined} id={previewId} ref={popup} className="case-issue-preview" style={position} aria-label="Issue của case" onMouseEnter={()=>clearTimeout(hideTimer.current)} onMouseLeave={hide} onBlur={hide} onKeyDown={previewKey}>
   <strong>Issue của case · {count??'đang tải'}</strong>
   {error?<p role="alert">{error}</p>:!data?<p role="status">Đang tải Issue…</p>:<>{data.items.map(item=><div key={item.id}><button type="button" className="d-issue-key" onClick={()=>open(item.id)}>{item.key} · {item.title}</button><small>{item.type} · {item.statusLabel||item.status}</small></div>)}{!data.items.length&&<p>Chưa có Issue gắn với case này.</p>}
    {data.totalPages>1&&<div className="wi-actions"><button type="button" disabled={!page} onClick={()=>setPage(p=>p-1)}>Trước</button><span>{page+1}/{data.totalPages}</span><button type="button" disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>Tiếp</button></div>}</>}
   {canCreate&&<button type="button" className="cat-btn cat-btn-mint" onClick={()=>open('new')}>Tạo Issue từ case</button>}
  </section>,document.body)}
  {modal&&<Modal title={modal==='new'?'Tạo Issue từ case':'Chi tiết Issue'} wide onClose={close}>{modal==='new'?<FeatureIssueForm key={`${projectId}/${featureId}/${documentId}/${rowId}`} {...{projectId,featureId,documentId,row,api}} authorized={canCreate} onSaved={saved} onCancel={close}/>:<FeatureIssueDetail projectId={projectId} id={modal} api={api} onChanged={()=>setReload(value=>value+1)} onDeleted={saved}/>}</Modal>}
 </>;
}
