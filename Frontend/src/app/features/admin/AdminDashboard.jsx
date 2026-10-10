import React, { useCallback } from 'react';
import {MetricBars} from './MetricBars';
import { adminApi } from '../../services/api/admin';
import { useAdminRead, ReadState, ProjectTable, percent } from './shared';

export function AdminDashboard({projectId,api=adminApi}) {
  const load=useCallback(signal=>api.overview(projectId,{signal}),[api,projectId]);
  const state=useAdminRead(`overview:${projectId || 'all'}`,load);
  const data=state.data;
  if (!data) return <ReadState {...state}/>;
  const scope=projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const attention=data.attention;
  const inventory=data.inventory;
  const statusLabels={AVAILABLE:'Sẵn sàng',ALLOCATED:'Đang bàn giao',MAINTENANCE:'Bảo trì',RETIRED:'Ngừng sử dụng'};
  return <>
    <div className="admin-page-heading"><div><h1>Tổng quan hệ thống</h1><p>{projectId ? 'Phạm vi dự án được chọn' : 'Tất cả dự án'} · Cập nhật {new Date(data.asOf).toLocaleString('vi-VN')}</p></div><button onClick={state.retry}>Tải lại</button></div>
    <div className="admin-kpis">
      {[['Dự án hoạt động',data.activeProjects,`${data.totalProjects} dự án trong phạm vi`],['Tài khoản hoạt động',data.enabledUsers,`${data.totalUsers} tài khoản duy nhất`],['Tiến độ thực thi',percent(data.metrics.executionPercent),`${data.metrics.ok + data.metrics.ng}/${data.metrics.applicable} lượt áp dụng`],['Bug chưa kết thúc',data.openBugs,`${data.awaitingVerification} đã xử lý, chờ xác minh`]].map(([label,value,note])=><article className="admin-card" key={label}><h2>{label}</h2><strong>{value}</strong><p>{note}</p></article>)}
      {inventory&&<article className="admin-card"><h2>Máy đang bàn giao / sẵn sàng</h2><strong>{inventory.allocated} / {inventory.available}</strong><p>{inventory.maintenance} bảo trì · {inventory.retired} ngừng sử dụng (ngoài tồn kho)</p></article>}
    </div>
    <div className="admin-chart-grid">
      <section className="admin-card"><h2>Tiến độ theo dự án</h2><p>Hiển thị {data.byProject.length}/{data.totalProjects} dự án; KPI tính trên toàn phạm vi.</p>
        {data.byProject.length === 0 && <p>Chưa có dự án.</p>}
        {data.byProject.map(p=><div className="admin-progress" key={p.id}><a href={`#/admin/projects/${p.id}${scope}`}>{p.name}</a><div className="admin-bar-track"><span style={{width:`${p.metrics.executionPercent ?? 0}%`}}/></div><small>{percent(p.metrics.executionPercent)}</small></div>)}
      </section>
      <section className="admin-card"><h2>Kết quả thực thi</h2><p>NA hiển thị riêng và loại khỏi mẫu số. P chưa tính là đã thực thi.</p>
        <div className="admin-result-chart" aria-label="Phân bố kết quả thực thi">{[['OK','ok'],['NG','ng'],['P','pending'],['Chưa chạy','notRun'],['NA','na']].map(([label,key])=><div key={key}><span>{label}: {data.metrics[key]}</span><div className="admin-bar-track"><span className={`result-${key}`} style={{width:`${data.metrics.total ? data.metrics[key]/data.metrics.total*100 : 0}%`}}/></div></div>)}</div>
        <p>Tỷ lệ đạt: {percent(data.metrics.passPercent)}</p>
      </section>
      <section className="admin-card"><h2>Tài khoản theo vai trò hệ thống</h2><table><thead><tr><th>Vai trò</th><th>Tổng</th><th>Hoạt động</th></tr></thead><tbody>{data.byRole.map(r=><tr key={r.role}><th>{r.role}</th><td>{r.total}</td><td>{r.enabled}</td></tr>)}</tbody></table><MetricBars label="Phân bố vai trò hệ thống" rows={data.byRole.map(r=>({label:r.role,value:r.total}))}/><h3>Membership hoạt động theo dự án</h3><MetricBars label="Membership theo dự án" rows={data.byProject.map(p=>({key:p.id,label:p.name,value:p.activeMembers}))}/><p>Thành viên từng dự án được đếm theo membership; một người có thể tham gia nhiều dự án.</p></section>
      <section className="admin-card"><h2>Kho thiết bị</h2>{inventory?<><MetricBars label="Máy theo loại và tình trạng" rows={inventory.byTypeAndStatus.map(r=>({label:r.type+' · '+statusLabels[r.status],value:r.total}))}/><p>Chỉ tính máy vật lý; mỗi máy đang giao thuộc một dự án. Ngừng sử dụng hiển thị riêng, ngoài tồn kho.</p><a href={'#/admin/devices'+scope}>Mở kho máy</a></>:<p>Chưa nhận được số liệu kho máy.</p>}</section>
    </div>
    <section className="admin-card"><h2>Dự án trong biểu đồ</h2>{data.byProject.length ? <ProjectTable items={data.byProject} scope={scope}/> : <p>Chưa có dự án.</p>}<a href={`#/admin/projects${scope}`}>Xem toàn bộ dự án</a></section>
    <section className="admin-card"><h2>Cần chú ý</h2><div className="admin-attention-grid">
      <div><h3>Mốc quá hạn ({attention.overdueMilestoneCount ?? attention.overdueMilestones.length})</h3>{attention.overdueMilestones.length ? <ul>{attention.overdueMilestones.map(m=><li key={m.id}><a href={`#/admin/projects/${m.projectId}${scope}`}>{m.projectName} · {m.name}</a> — {m.dueOn}</li>)}</ul> : <p>Không có cảnh báo quá hạn.</p>}<p>{attention.insufficientMilestoneData ?? 0} mốc chưa đủ dữ liệu về hạn hoặc phạm vi.</p></div>
      <div><h3>Chưa có PM hoạt động ({attention.withoutPmCount ?? attention.withoutPm.length})</h3>{attention.withoutPm.length ? <ul>{attention.withoutPm.map(p=><li key={p.id}><a href={`#/admin/projects/${p.id}${scope}`}>{p.name}</a></li>)}</ul> : <p>Không có dự án cần bổ sung PM.</p>}</div>
      <div><h3>Đã xử lý, chờ xác minh ({data.awaitingVerification})</h3>{attention.awaitingVerification.length ? <ul>{attention.awaitingVerification.map(b=><li key={b.id}><a href={`#/admin/projects/${b.projectId}${scope}`}>{b.projectName} · {b.itemKey}</a> — {b.title}</li>)}</ul> : <p>Không có bug chờ xác minh.</p>}<p>Danh sách chú ý hiển thị tối đa 20 mục mỗi nhóm.</p></div>
      <div><h3>Máy quá hạn trả ({attention.overdueReturnCount??0})</h3>{attention.overdueReturns?.length?<ul>{attention.overdueReturns.map(a=><li key={a.id}><a href={`#/admin/devices?projectId=${a.projectId}`}>{a.assetCode} · {a.projectName}</a> — {a.expectedReturnOn}</li>)}</ul>:<p>Không có máy quá hạn trả.</p>}</div>
    </div></section>
    <p className="admin-definition">Đã thực thi = (OK + NG) / (tổng lượt ngoài DRAFT − NA). Tỷ lệ đạt = OK / cùng mẫu số. Fixed của bug không tự thành OK của test case.</p>
  </>;
}
