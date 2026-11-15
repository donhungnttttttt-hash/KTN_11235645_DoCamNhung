import React,{useContext,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
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
 useLayoutEffect(()=>{if(preview&&visible&&!modal)positionPreview();},[preview,visible,modal,data,error]);
 useEffect(()=>{
  if(!preview||!visible)return;
  const outside=event=>{if(!popup.current?.contains(event.target)&&!button.current?.contains(event.target))setPreview(false);};
  const reposition=event=>{if(!popup.current?.contains(event.target))positionPreview();};
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',reposition);document.addEventListener('scroll',reposition,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',reposition);document.removeEventListener('scroll',reposition,true);};
 },[preview,visible]);
 function positionPreview(){
  let rect=button.current?.getBoundingClientRect();if(!rect)return;
  const gap=8,width=popup.current?.getBoundingClientRect().width||Math.min(320,window.innerWidth-16),height=popup.current?.getBoundingClientRect().height||Math.min(280,window.innerHeight-16);
  const grid=button.current.closest('.td-grid-scroll'),overflow=rect.right+gap+width+gap-window.innerWidth;
  // Keep the requested side. The table reserves trailing space while the preview
  // is open, allowing the trigger to move left without moving the preview left of it.
  if(grid&&overflow>0){grid.scrollLeft+=overflow;rect=button.current.getBoundingClientRect();}
  setPosition({position:'fixed',top:Math.max(gap,Math.min(rect.top,window.innerHeight-height-gap)),left:rect.right+gap});
 }
 function show(){clearTimeout(hideTimer.current);positionPreview();setPreview(true);}
 function hide(){hideTimer.current=setTimeout(()=>{if(!popup.current?.contains(document.activeElement)&&document.activeElement!==button.current)setPreview(false);},150);}
 function open(value){clearTimeout(hideTimer.current);setPreview(false);setModal(value);}
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
  <button ref={button} type="button" className="cat-btn case-issue-button" aria-expanded={preview} aria-controls={preview?previewId:undefined} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();clearTimeout(hideTimer.current);setPreview(false);}else if(preview&&((e.key==='Tab'&&!e.shiftKey)||e.key==='ArrowDown')){const first=previewControls()[0];if(first){e.preventDefault();first.focus();}}}} onMouseEnter={show} onMouseLeave={hide} onFocus={()=>{if(!restoringFocus.current)show();}} onBlur={hide} onClick={()=>{if(error)setReload(value=>value+1);show();}}>Ticket ({count??(error?'?':'…')})</button>
  {preview&&!modal&&createPortal(<section hidden={!visible} inert={!visible?'':undefined} id={previewId} ref={popup} className="case-issue-preview" style={position} aria-label="Ticket của case" onMouseEnter={()=>clearTimeout(hideTimer.current)} onMouseLeave={hide} onBlur={hide} onKeyDown={previewKey}>
   <strong>Ticket của case · {count??'đang tải'}</strong>
   {error?<p role="alert">{error} <button type="button" className="cat-btn" onClick={()=>setReload(value=>value+1)}>Thử lại</button></p>:!data?<p role="status">Đang tải Ticket…</p>:<>{data.items.map(item=><div key={item.id}><button type="button" className="d-issue-key" onClick={()=>open(item.id)}>{item.key} · {item.title}</button><small>{item.type} · {item.statusLabel||item.status}</small></div>)}{!data.items.length&&<p>Chưa có Ticket gắn với case này.</p>}
    {data.totalPages>1&&<div className="wi-actions"><button type="button" disabled={!page} onClick={()=>setPage(p=>p-1)}>Trước</button><span>{page+1}/{data.totalPages}</span><button type="button" disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>Tiếp</button></div>}</>}
   {canCreate&&<button type="button" className="cat-btn cat-btn-mint" onClick={()=>open('new')}>Tạo Ticket từ case</button>}
  </section>,document.body)}
  {modal&&<Modal title={modal==='new'?'Tạo Ticket từ case':'Chi tiết Ticket'} wide onClose={close}>{modal==='new'?<FeatureIssueForm key={`${projectId}/${featureId}/${documentId}/${rowId}`} {...{projectId,featureId,documentId,row,api}} authorized={canCreate} onSaved={saved} onCancel={close}/>:<FeatureIssueDetail projectId={projectId} id={modal} api={api} onChanged={()=>setReload(value=>value+1)} onDeleted={saved}/>}</Modal>}
 </>;
}
