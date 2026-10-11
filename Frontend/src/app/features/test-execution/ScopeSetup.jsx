import {SelectionTable} from '../../components/SelectionTable';
import React, { useEffect, useState } from 'react';
import { testCasesApi } from '../../services/api/testCases';
import { executionApi } from '../../services/api/execution';
import { Select, Pager, ErrorNotice } from './components';
import {CreateFile} from '../file-work/FileWorkPage';

export function ScopeSetup({ projectId, cycle, configs, catalogs, members, onSaved, navigate=path=>{window.location.hash=path;}, refreshKey = 0 }) {
  const [mode,setMode]=useState('file');
  const [config, setConfig] = useState({ environmentId: '', deviceId: '', buildId: '' });
  const [configurationId, setConfigurationId] = useState(''), [assignee, setAssignee] = useState('');
  const [selected, setSelected] = useState({}), [cases, setCases] = useState(null), [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false), [readError, setReadError] = useState(''), [writeError, setWriteError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    if(mode!=='manual')return;
    let live = true; setCases(null); setReadError('');
    testCasesApi.listCases(projectId, undefined, { page }).then(x => { if (live) setCases(x); }).catch(e => { if (live) setReadError(e.message); });
    return () => { live = false; };
  }, [projectId, page, retry, refreshKey,mode]);
  async function save(e, kind) {
    e.preventDefault(); setBusy(true); setWriteError('');
    try {
      if (kind === 'config') {
        await executionApi.configure(projectId, cycle.id, { ...Object.fromEntries(Object.entries(config).map(([k, v]) => [k, Number(v)])), expectedVersion: cycle.version });
      } else {
        await executionApi.scope(projectId, cycle.id, { configurationId: Number(configurationId), revisionIds: Object.keys(selected).map(Number), assigneeMembershipId: Number(assignee), expectedVersion: cycle.version });
        setSelected({});
      }
      onSaved();
    } catch (err) { setWriteError(err.message); } finally { setBusy(false); }
  }
  const eligible = members.filter(m => m.active && m.enabled!==false && ['PM', 'TESTER'].includes(m.projectRole) && !['UNKNOWN','DEV'].includes(m.systemRole));
  return <section className="ex-panel" aria-label="Chuẩn bị đợt kiểm thử">
    <h3 className="font-semibold text-teal-800">1. Cấu hình kiểm thử</h3>
    <p className="ex-help">Mỗi cặp môi trường và thiết bị là một cấu hình. <a href="#/settings/catalogs?type=environments" className="text-teal-700 underline">Thêm môi trường</a> · <a href="#/settings/catalogs?type=devices" className="text-teal-700 underline">Thêm thiết bị kiểm thử</a> · <a href="#/settings/catalogs?type=builds" className="text-teal-700 underline">Thêm build</a>. Sau khi thêm, quay lại đợt và bấm Tải lại.</p>
    {mode==='manual' && <ErrorNotice error={readError} retry={() => setRetry(x => x + 1)} />}
    <ErrorNotice error={writeError} />
    <form className="ex-fields" onSubmit={e => save(e, 'config')}>
      <Select label="Môi trường" value={config.environmentId} items={catalogs.environments.filter(x => x.active)} onChange={v => setConfig({ ...config, environmentId: v })} />
      <Select label="Thiết bị" value={config.deviceId} items={catalogs.devices.filter(x => x.active)} onChange={v => setConfig({ ...config, deviceId: v })} />
      <Select label="Build mặc định" value={config.buildId} items={catalogs.builds} describe={x => `${x.platform} · ${x.versionLabel} (${x.buildNumber || '—'})`} onChange={v => setConfig({ ...config, buildId: v })} />
      <button disabled={busy} className="cat-btn">Thêm cấu hình</button>
    </form>
    <h3 className="font-semibold text-teal-800 mt-5">2. Giao việc kiểm thử</h3>
    <div className="ex-checks" role="group" aria-label="Cách chọn phạm vi"><button type="button" className="cat-btn" aria-pressed={mode==='file'} onClick={()=>setMode('file')}>Theo file Excel</button><button type="button" className="cat-btn" aria-pressed={mode==='manual'} onClick={()=>setMode('manual')}>Case riêng lẻ</button></div>
    {mode==='file'?<CreateFile key={`${cycle.id}:${cycle.version}`} projectId={projectId} initialCycleId={cycle.id} authorized navigate={navigate} onSaved={onSaved}/>:<>
    <p className="ex-help">Luồng cho case riêng lẻ. Admin/PM duyệt phiên bản trước khi đưa vào đợt. Đã chọn {Object.keys(selected).length} case.</p>
    <form onSubmit={e => save(e, 'scope')}>
      <div className="ex-fields">
        <Select label="Cấu hình chạy" value={configurationId} items={configs} describe={x => `${x.environmentName} / ${x.deviceName}`} onChange={setConfigurationId} />
        <Select label="Người thực hiện" value={assignee} items={eligible} describe={x => x.displayName} onChange={setAssignee} />
        <button className="cat-btn cat-btn-mint" disabled={busy || !Object.keys(selected).length || Object.keys(selected).length > 100}>Thêm case vào phạm vi</button>
        <p className="ex-help" role={Object.keys(selected).length>100?'status':undefined}>{Object.keys(selected).length}/100 case tối đa cho mỗi lần thêm.{Object.keys(selected).length>100?' Bỏ chọn bớt case để tiếp tục.':''}</p>
      </div>
      <SelectionTable label="Phạm vi test case" pageScope loading={!cases} selected={Object.keys(selected).map(Number)}
        rows={(cases?.items||[]).map(c=>({id:c.currentRevisionId||('case-'+c.id),name:c.caseNo+' · '+c.titleVi,selectLabel:'Chọn '+c.caseNo,description:c.approved?'Đã duyệt':'Chờ PM duyệt',disabled:!c.approved||!c.currentRevisionId}))}
        onChange={ids=>setSelected(Object.fromEntries(ids.map(id=>[id,true])))} empty="Chưa có test case. Tạo hoặc nhập tại Thư viện test case."/>
    </form>
    {cases && <Pager data={cases} onChange={setPage} />}</>}
  </section>;
}
