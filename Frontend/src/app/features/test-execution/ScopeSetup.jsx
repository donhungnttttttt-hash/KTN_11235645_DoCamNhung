import {TableScroll} from '../../components/TableScroll';
import React, { useEffect, useState } from 'react';
import { testCasesApi } from '../../services/api/testCases';
import { executionApi } from '../../services/api/execution';
import { Select, Pager, ErrorNotice } from './components';

export function ScopeSetup({ projectId, cycle, configs, catalogs, members, onSaved, refreshKey = 0 }) {
  const [config, setConfig] = useState({ environmentId: '', deviceId: '', buildId: '' });
  const [configurationId, setConfigurationId] = useState(''), [assignee, setAssignee] = useState('');
  const [selected, setSelected] = useState({}), [cases, setCases] = useState(null), [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true; setCases(null); setError('');
    testCasesApi.listCases(projectId, undefined, { page }).then(x => { if (live) setCases(x); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [projectId, page, retry, refreshKey]);
  async function save(e, kind) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (kind === 'config') {
        await executionApi.configure(projectId, cycle.id, { ...Object.fromEntries(Object.entries(config).map(([k, v]) => [k, Number(v)])), expectedVersion: cycle.version });
      } else {
        await executionApi.scope(projectId, cycle.id, { configurationId: Number(configurationId), revisionIds: Object.keys(selected).map(Number), assigneeMembershipId: Number(assignee), expectedVersion: cycle.version });
        setSelected({});
      }
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const eligible = members.filter(m => m.active && ['PM', 'TESTER'].includes(m.projectRole) && m.systemRole !== 'UNKNOWN');
  return <section className="ex-panel" aria-label="Chuẩn bị đợt kiểm thử">
    <h3 className="font-semibold text-teal-800">1. Cấu hình kiểm thử</h3>
    <p className="ex-help">Mỗi cặp môi trường và thiết bị là một cấu hình. Nếu cần danh mục mới, thêm tại <a href="#/settings/catalogs" className="text-teal-700 underline">Cấu hình dự án</a>.</p>
    <ErrorNotice error={error} retry={() => setRetry(x => x + 1)} />
    <form className="ex-fields" onSubmit={e => save(e, 'config')}>
      <Select label="Môi trường" value={config.environmentId} items={catalogs.environments.filter(x => x.active)} onChange={v => setConfig({ ...config, environmentId: v })} />
      <Select label="Thiết bị" value={config.deviceId} items={catalogs.devices.filter(x => x.active)} onChange={v => setConfig({ ...config, deviceId: v })} />
      <Select label="Build mặc định" value={config.buildId} items={catalogs.builds} describe={x => `${x.platform} · ${x.versionLabel} (${x.buildNumber || '—'})`} onChange={v => setConfig({ ...config, buildId: v })} />
      <button disabled={busy} className="cat-btn">Thêm cấu hình</button>
    </form>
    <h3 className="font-semibold text-teal-800 mt-5">2. Chọn case và phân công</h3>
    <p className="ex-help">Chỉ phiên bản đã được PM duyệt mới được đưa vào đợt. Đã chọn {Object.keys(selected).length} case.</p>
    <form onSubmit={e => save(e, 'scope')}>
      <div className="ex-fields">
        <Select label="Cấu hình chạy" value={configurationId} items={configs} describe={x => `${x.environmentName} / ${x.deviceName}`} onChange={setConfigurationId} />
        <Select label="Người thực hiện" value={assignee} items={eligible} describe={x => x.displayName} onChange={setAssignee} />
        <button className="cat-btn cat-btn-mint" disabled={busy || !Object.keys(selected).length || Object.keys(selected).length > 100}>Thêm case vào phạm vi</button>
      </div>
      <TableScroll label="Phạm vi test case" className="ex-table-wrap mt-3"><table className="ex-table"><thead><tr><th>Chọn</th><th>Mã case</th><th>Tiêu đề phiên bản hiện tại</th><th>Phê duyệt</th></tr></thead><tbody>
        {cases?.items.map(c => <tr key={c.id}><td><input type="checkbox" aria-label={`Chọn ${c.caseNo}`} disabled={!c.approved} checked={!!selected[c.currentRevisionId]} onChange={e => setSelected(prev => { const next = { ...prev }; if (e.target.checked) next[c.currentRevisionId] = true; else delete next[c.currentRevisionId]; return next; })} /></td><td>{c.caseNo}</td><td>{c.titleVi}</td><td>{c.approved ? 'Đã duyệt' : 'Chờ PM duyệt'}</td></tr>)}
        {cases && !cases.items.length && <tr><td colSpan={4}>Chưa có test case. Tạo hoặc nhập tại Thư viện test case.</td></tr>}
      </tbody></table></TableScroll>
    </form>
    {cases && <Pager data={cases} onChange={setPage} />}
  </section>;
}
