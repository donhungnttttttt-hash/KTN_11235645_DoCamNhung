import React,{useRef,useState} from 'react';
import {useDialogFocus} from '../../hooks/useDialogFocus';
import {featuresApi} from '../../services/api/features';
import {requestKey} from './testingState';

export function FeatureForm({projectId,feature,onClose,onSaved}) {
  const [name,setName]=useState(feature?.name||''),[environment,setEnvironment]=useState(feature?.environment||''),[description,setDescription]=useState(feature?.description||'');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false),key=useRef(requestKey()),live=useRef(true);
  const [version,setVersion]=useState(feature?.version),[conflict,setConflict]=useState(false),[current,setCurrent]=useState(null),[blocked,setBlocked]=useState(false);
  React.useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const focus=useDialogFocus(onClose,busy);
  async function reload(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const fresh=await featuresApi.get(projectId,feature.id);if(live.current){setCurrent(fresh);setVersion(fresh.version);setConflict(false);if(fresh.archivedAt){setBlocked(true);setError('Feature đã lưu trữ. Bản nháp được giữ để đối chiếu.');}}}catch(err){if(live.current){setError(err.message||'Chưa tải được Feature hiện hành.');if([401,403,404].includes(err.status))setBlocked(true);}}finally{lock.current=false;if(live.current)setBusy(false);}}
  async function save(event){event.preventDefault();if(lock.current||conflict||blocked)return;if(!name.trim()){setError('Nhập tên Feature.');return;}lock.current=true;setBusy(true);setError('');
    try{const input={name:name.trim(),environment,description};const result=feature?await featuresApi.update(projectId,feature.id,{...input,expectedVersion:version}):await featuresApi.create(projectId,{...input,requestKey:key.current});if(live.current){await onSaved(result);onClose();}}
    catch(err){if(live.current){setError(err.message||'Chưa lưu được Feature. Bản nhập được giữ lại.');setConflict(!!feature&&err.status===409);if([401,403,404].includes(err.status))setBlocked(true);}}
    finally{lock.current=false;if(live.current)setBusy(false);}
  }
  return <div className="ex-modal"><section ref={focus} className="td-case-dialog testing-form" role="dialog" aria-modal="true" aria-label={feature?'Sửa Feature':'Tạo Feature'} tabIndex={-1}>
    <header><h2>{feature?'Sửa Feature':'Tạo Feature'}</h2><button className="cat-btn" disabled={busy} onClick={onClose}>Đóng</button></header>
    <form onSubmit={save} className="testing-fields"><label>Tên Feature<input data-dialog-initial-focus value={name} maxLength={255} onChange={e=>setName(e.target.value)} required disabled={busy}/></label>
      <label>Môi trường / server<input value={environment} maxLength={1000} onChange={e=>setEnvironment(e.target.value)} disabled={busy}/></label>
      <label>Mô tả<textarea value={description} maxLength={4000} rows={4} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
      {error&&<p className="td-error" role="alert">{error}</p>}{conflict&&<button type="button" className="cat-btn" disabled={busy||blocked} onClick={reload}>Tải bản hiện hành, giữ bản nháp</button>}
      {current&&<section className="testing-current-values" aria-label="Feature hiện hành"><strong>Đối chiếu bản hiện hành trước khi lưu lại</strong><p>{current.name}</p><p>{current.environment||'Chưa ghi môi trường'}</p><p>{current.description||'Chưa có mô tả'}</p></section>}
      <button className="cat-btn cat-btn-mint" disabled={busy||conflict||blocked}>{busy?'Đang lưu…':'Lưu Feature'}</button>
    </form></section></div>;
}
