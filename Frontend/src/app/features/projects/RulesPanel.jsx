import React, { useEffect, useState } from 'react';
import { projectsApi } from '../../services/api/projects';
import { formatTime } from '../test-execution/components';

const requiredFields=['title','steps','expectedResult','actualResult','buildId','environmentId','deviceId'];
export function RulesPanel({projectId,canEdit}) {
  const [rules,setRules]=useState(null),[versions,setVersions]=useState([]),[reload,setReload]=useState(0);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[source,setSource]=useState('ADR-006 — Quy tắc bug nội bộ'),[prefix,setPrefix]=useState('');
  useEffect(()=>{
    let live=true;setError('');setRules(null);setVersions([]);
    projectsApi.listRules(projectId).then(async data=>{
      const rule=data.find(item=>item.code==='INTERNAL_DEMO');
      const history=rule?await projectsApi.listRuleVersions(projectId,rule.id):[];
      if(live){setRules(data);setVersions(history);}
    }).catch(failure=>{if(live)setError(failure.message);});
    return()=>{live=false;};
  },[projectId,reload]);
  const rule=rules?.find(item=>item.code==='INTERNAL_DEMO');
  async function mutate(action){setBusy(true);setError('');try{await action();setReload(x=>x+1);}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  return <section>
    <h2>Quy tắc báo lỗi</h2>
    <p className="settings-hint">Bộ quy tắc thử nghiệm nội bộ (DEMO). Chưa dùng thay cho quy tắc chính thức của khách hàng.</p>
    {error && <p role="alert" className="text-danger">{error} <button className="cat-btn" disabled={busy} onClick={()=>setReload(x=>x+1)}>Tải lại quy tắc</button></p>}
    {!rules ? !error && <p>Đang tải quy tắc…</p> : !rule ? <>
      <p>Chưa có bộ quy tắc nội bộ.</p>{canEdit && <button className="cat-btn primary" disabled={busy} onClick={()=>mutate(()=>projectsApi.createRuleset(projectId,{code:'INTERNAL_DEMO',name:'Quy tắc báo lỗi nội bộ DEMO'}))}>Tạo bộ quy tắc nội bộ</button>}
    </> : <>
      <p>Đang áp dụng: {rule.activeVersion?`Phiên bản ${rule.activeVersion.versionNo}`:'Chưa công bố phiên bản bổ sung'}.</p>
      {canEdit && <form className="settings-editor" onSubmit={event=>{event.preventDefault();mutate(()=>projectsApi.createRuleVersion(projectId,rule.id,{contentJson:JSON.stringify({schemaVersion:1,scope:'INTERNAL_DEMO',sourceReference:source,titlePrefix:prefix,requiredFields})}));}}>
        <h3>Thêm phiên bản quy tắc</h3><fieldset disabled={busy}>
          <label className="form-group">Nguồn quy tắc<input required maxLength={500} value={source} onChange={e=>setSource(e.target.value)}/></label>
          <label className="form-group">Tiền tố tiêu đề (tùy chọn)<input maxLength={60} value={prefix} onChange={e=>setPrefix(e.target.value)}/></label>
          <p>Các trường bắt buộc: tiêu đề, bước tái hiện, kết quả mong đợi/thực tế, bản build, môi trường, thiết bị. Liên kết case/lần chạy và ngoại lệ PM giữ theo quy định nội bộ đã chốt.</p>
        </fieldset><button className="cat-btn primary" disabled={busy}>Lưu bản nháp</button>
      </form>}
      <h3>Lịch sử phiên bản</h3>{!versions.length && <p>Chưa có phiên bản.</p>}
      {versions.map(version=><RuleVersion key={version.id} version={version} active={rule.activeVersion?.id===version.id} busy={busy} canEdit={canEdit} onPublish={()=>{if(window.confirm(`Công bố phiên bản ${version.versionNo} cho bug mới trong dự án?`))mutate(()=>projectsApi.publishRule(projectId,rule.id,version.id,rule.activeVersion?.id || 0));}}/>)}
    </>}
  </section>;
}
function RuleVersion({version,active,busy,canEdit,onPublish}) {
  let content;
  try{content=JSON.parse(version.contentJson);}catch{content=null;}
  return <article className="handbook-revision"><div className="settings-heading"><strong>Phiên bản {version.versionNo} · {active?'Đang áp dụng':version.publishedAt?'Đã công bố':'Bản nháp'}</strong>{canEdit && !version.publishedAt && <button className="cat-btn" disabled={busy} onClick={onPublish}>Công bố phiên bản {version.versionNo}</button>}</div>
    <p>Nguồn: {content?.sourceReference || 'Chưa xác định'}</p><p>Tiền tố: {content?.titlePrefix || 'Không bắt buộc'}</p><p className="settings-hint">Tạo lúc {formatTime(version.createdAt)} (UTC) · Thành viên #{version.createdBy}{version.publishedAt && ` · Công bố bởi #${version.publishedBy} lúc ${formatTime(version.publishedAt)} (UTC)`}</p>
  </article>;
}
