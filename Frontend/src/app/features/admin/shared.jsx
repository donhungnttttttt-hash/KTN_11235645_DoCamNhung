import React, { useEffect, useState } from 'react';

export function useAdminRead(key, load) {
  const [attempt,setAttempt] = useState(0);
  const [state,setState] = useState({key:null,loading:true,data:null,error:null});
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    setState({key,loading:true,data:null,error:null});
    Promise.resolve().then(()=>load(controller.signal)).then(data => {
      if (live) setState({key,loading:false,data,error:null});
    }).catch(error => {
      if (live) setState({key,loading:false,data:null,error});
    });
    return () => { live = false; controller.abort(); };
  }, [key,attempt,load]);
  const {key:loadedKey,...current}=state;
  return {...(loadedKey === key ? current : {loading:true,data:null,error:null}),retry:()=>setAttempt(n=>n+1)};
}
export const percent = value => value == null ? 'Chưa có phạm vi áp dụng' : `${value}%`;
export function ReadState({loading,error,retry}) {
  if (loading) return <p role="status">Đang tải dữ liệu quản trị…</p>;
  if (error) return <div className="admin-error" role="alert"><p>{error.message}</p><button type="button" onClick={retry}>Thử lại</button></div>;
  return null;
}
export function ProjectTable({items,scope=''}) {
  return <div className="admin-table-scroll" tabIndex={0} aria-label="Bảng tổng hợp dự án"><table><thead><tr><th>Dự án</th><th>PM hoạt động</th><th>Thành viên hoạt động</th><th>Lượt áp dụng</th><th>Đã thực thi</th><th>Đạt</th><th>Bug mở</th><th>Mốc quá hạn</th><th>Máy đang giữ</th><th>Trạng thái</th></tr></thead><tbody>
    {items.map(p=><tr key={p.id}><th><a className="admin-project-link" href={`#/admin/projects/${p.id}${scope}`}>{p.code} · {p.name}</a></th><td>{p.pmNames || 'Chưa có PM hoạt động'}</td><td>{p.activeMembers}</td><td>{p.metrics.applicable}</td><td>{percent(p.metrics.executionPercent)}</td><td>{percent(p.metrics.passPercent)}</td><td>{p.openBugs}</td><td>{p.overdueMilestones ?? 0}</td><td>{p.heldDevices??0}</td><td>{p.archivedAt ? 'Lưu trữ' : 'Hoạt động'}</td></tr>)}
  </tbody></table></div>;
}
