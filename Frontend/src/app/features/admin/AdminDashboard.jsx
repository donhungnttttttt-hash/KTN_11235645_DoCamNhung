import {roleLabels} from '../auth/accountTypes';
import React, { useCallback } from 'react';
import {MetricBars} from './MetricBars';
import {StatusDistribution,InventoryStacks} from './AdminOverviewCharts';
import { AdminHealthCharts } from './AdminHealthCharts';
import { adminApi } from '../../services/api/admin';
import { useAdminRead, ReadState, ProjectTable, percent } from './shared';

export function AdminDashboard({projectId,api=adminApi}) {
  const load=useCallback(signal=>api.overview(projectId,{signal}),[api,projectId]);
  const state=useAdminRead(`overview:${projectId || 'all'}`,load);
  const data=state.data;
  if (!data) return <ReadState {...state}/>;
  const scope=projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const inventory=data.inventory;
  const activeProjects=data.byProject.filter(p=>!p.archivedAt);
  return <>
    <div className="admin-page-heading"><div><h1>Tổng quan hệ thống</h1><p>{projectId ? 'Phạm vi dự án được chọn' : 'Tất cả dự án'} · Cập nhật {new Date(data.asOf).toLocaleString('vi-VN')}</p></div></div>
    <div className="admin-kpis">
      {[['Dự án hoạt động',data.activeProjects,`${data.totalProjects-data.activeProjects} dự án đã lưu trữ`],['Tài khoản hoạt động',data.enabledUsers,`${data.totalUsers} tài khoản duy nhất`],['Bug chưa kết thúc',data.openBugs,`${data.awaitingVerification} đã xử lý, chờ xác minh`]].map(([label,value,note])=><article className="admin-card" key={label}><h2>{label}</h2><strong>{value}</strong><p>{note}</p></article>)}
      {inventory&&<article className="admin-card"><h2>Máy đã bàn giao / sẵn sàng</h2><strong>{inventory.allocated} / {inventory.available}</strong><p>{inventory.maintenance} bảo trì · {inventory.retired} ngừng sử dụng (ngoài tồn kho)</p></article>}
    </div>
    <div className="admin-chart-grid">
      <section className="admin-card"><h2>Tiến độ theo dự án</h2><p>Hiển thị {activeProjects.length}/{data.activeProjects} dự án đang hoạt động.</p>
        {activeProjects.length === 0 && <p>Chưa có dự án.</p>}
        {activeProjects.map(p=><div className="admin-progress" key={p.id}><a href={`#/admin/projects/${p.id}${scope}`}>{p.name}</a><div className="admin-bar-track admin-project-progress"><span aria-hidden="true" style={{width:`${p.metrics.executionPercent ?? 0}%`}}/><strong className="admin-project-progress-label">{percent(p.metrics.executionPercent)}</strong></div></div>)}
      </section>
      <section className="admin-card"><h2>Status test case</h2><p>NA và P đều tính là đã test; NA vẫn thuộc tổng số case.</p>
        <StatusDistribution metrics={data.metrics}/><div className="admin-result-chart" aria-label="Phân bố kết quả thực thi">{[['OK','ok'],['NG','ng'],['P','pending'],['Chưa chạy','notRun'],['NA','na']].map(([label,key])=><div key={key}><span>{label}: {data.metrics[key]}</span><div className="admin-bar-track"><span className={`result-${key}`} style={{width:`${data.metrics.total ? data.metrics[key]/data.metrics.total*100 : 0}%`}}/></div></div>)}</div>
        <p>Tỷ lệ đạt: {percent(data.metrics.passPercent)}</p>
      </section>
      <section className="admin-card"><h2>Tài khoản theo vai trò hệ thống</h2><table><thead><tr><th>Vai trò</th><th>Tổng</th><th>Hoạt động</th></tr></thead><tbody>{data.byRole.map(r=><tr key={r.role}><th>{roleLabels[r.role]||r.role}</th><td>{r.total}</td><td>{r.enabled}</td></tr>)}</tbody></table><h3>Membership hoạt động theo dự án</h3><MetricBars groupLabel="Tên dự án" label="Membership theo dự án" rows={activeProjects.map(p=>({key:p.id,label:p.name,value:p.activeMembers}))}/><p>Thành viên từng dự án được đếm theo membership; một người có thể tham gia nhiều dự án.</p></section>
      <section className="admin-card"><h2>Kho thiết bị</h2>{inventory?<><InventoryStacks groups={inventory.byTypeAndStatus}/><p>Chỉ tính máy vật lý; mỗi máy đang giao thuộc một dự án. Ngừng sử dụng hiển thị riêng, ngoài tồn kho.</p><a href={'#/admin/devices'+scope}>Mở kho máy</a></>:<p>Chưa nhận được số liệu kho máy.</p>}</section>
    </div>
    <section className="admin-card"><h2>Dự án trong biểu đồ</h2>{activeProjects.length ? <ProjectTable items={activeProjects} scope={scope}/> : <p>Chưa có dự án.</p>}<a href={`#/admin/projects${scope}`}>Xem toàn bộ dự án</a></section>
    <p className="admin-definition">Đã test = (OK + NG + P + NA) / tổng case của file và Đợt kiểm thử đang hoạt động. Tỷ lệ OK = OK / tổng case. File rỗng có tiến độ 0%. Đóng Ticket không tự đổi Status case.</p>
    <AdminHealthCharts overview={data} projectId={projectId} api={api}/>
  </>;
}
