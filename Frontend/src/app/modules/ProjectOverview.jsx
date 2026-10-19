import React,{useEffect,useState} from 'react';
import {useProject} from '../features/projects/ProjectProvider';
import {ProjectInformation} from '../features/projects/ProjectInformation';
import {featureIssuesApi} from '../services/api/featureIssues';
import {projectsApi} from '../services/api/projects';
import {statuses} from '../features/work-items/data';
import '../features/work-items/work-items.css';
import '../styles/work-board.css';
import '../styles/project-overview.css';
import '../features/projects/projects.css';

function OverviewSummary({projectId,navigate}) {
  const [counts,setCounts]=useState({loading:true}),[milestones,setMilestones]=useState({loading:true});
  const [statusRevision,setStatusRevision]=useState(0),[milestoneRevision,setMilestoneRevision]=useState(0);
  useEffect(()=>{
    const abort=new AbortController();setCounts({loading:true});
    // Each response contributes its server total, never a page length or demo count.
    // Requests are bounded by the status catalog, independent of project size.
    Promise.all(statuses.map(async({id,label,color})=>{
      const page=await featureIssuesApi.list(projectId,{status:id,page:0,size:1},{signal:abort.signal});
      const count=Number(page.totalItems);
      if(!Number.isSafeInteger(count)||count<0)throw new Error('Không đọc được số lượng Issue. Hãy tải lại trạng thái.');
      return {id,label,color,count};
    })).then(items=>{if(!abort.signal.aborted)setCounts({items,loading:false});})
      .catch(error=>{if(!abort.signal.aborted)setCounts({error:error.message,loading:false});});
    return()=>abort.abort();
  },[projectId,statusRevision]);
  useEffect(()=>{
    let current=true;setMilestones({loading:true});
    projectsApi.listCatalog(projectId,'milestones').then(items=>{
      if(current)setMilestones({items:items.filter(item=>!item.archived),loading:false});
    }).catch(error=>{if(current)setMilestones({error:error.message,loading:false});});
    return()=>{current=false;};
  },[projectId,milestoneRevision]);
  const total=counts.items?.reduce((sum,item)=>sum+item.count,0)||0;
  const completed=counts.items?.find(item=>item.id==='closed')?.count||0;
  return <aside className="d-home-aside">
    <section aria-labelledby="overview-status-heading">
      <h2 id="overview-status-heading">Trạng thái công việc</h2>
      <div className="d-summary-box">
        <p className="d-muted">Bug và QA trong các Feature đang sử dụng.</p>
        {counts.loading&&<p role="status">Đang tải trạng thái Issue…</p>}
        {counts.error&&<div><p role="alert">{counts.error}</p><button type="button" className="cat-btn" onClick={()=>setStatusRevision(value=>value+1)}>Tải lại trạng thái</button></div>}
        {counts.items&&<>
          <div className="d-progress-track" aria-hidden="true">{counts.items.filter(item=>item.count>0).map(item=><span key={item.id} style={{flex:item.count,background:item.color}}/>)}</div>
          <p className="d-completion">{completed}/{total} Issue ở trạng thái Hoàn thành · {total?Math.round(completed/total*100):0}%</p>
          {!total&&<p>Chưa có Bug hoặc QA trong dự án.</p>}
          <div className="d-status-summary">{counts.items.map(item=><button type="button" key={item.id} onClick={()=>navigate(`/board/list?projectId=${projectId}&status=${encodeURIComponent(item.id)}`)}><span>{item.label}</span><b style={{background:item.color}}>{item.count}</b></button>)}</div>
        </>}
      </div>
    </section>
    <section aria-labelledby="overview-milestone-heading">
      <h2 id="overview-milestone-heading">Mốc phát hành</h2>
      <p className="d-muted">Các mốc đã cấu hình của dự án.</p>
      {milestones.loading&&<p role="status">Đang tải mốc phát hành…</p>}
      {milestones.error&&<div><p role="alert">{milestones.error}</p><button type="button" className="cat-btn" onClick={()=>setMilestoneRevision(value=>value+1)}>Tải lại mốc phát hành</button></div>}
      {milestones.items&&!milestones.items.length&&<p>Chưa có mốc phát hành được cấu hình.</p>}
      {!!milestones.items?.length&&<div className="d-milestone-panel" role="region" aria-label="Danh sách mốc phát hành" tabIndex={0}>{milestones.items.map(item=><article className="overview-milestone" key={item.id}><h3>{item.name}</h3><p>{item.dueOn?<>Hạn phát hành: <time dateTime={item.dueOn}>{item.dueOn.split('-').reverse().join('/')}</time></>:'Chưa đặt hạn phát hành'}</p></article>)}</div>}
    </section>
  </aside>;
}

export function ProjectOverview({navigate=()=>{}}) {
  const {currentProject,loading,error,refreshProjects}=useProject()||{};
  if(loading)return <div className="page-container"><p role="status">Đang tải thông tin dự án…</p></div>;
  if(error)return <div className="page-container"><p role="alert">{error}</p>{refreshProjects&&<button type="button" className="cat-btn" onClick={()=>refreshProjects()}>Tải lại dự án</button>}</div>;
  if(!currentProject)return <div className="page-container"><p>Chọn dự án để xem thông tin.</p></div>;
  return <div className="page-container work-items dashboard-board project-overview" data-lenis-prevent>
    <header className="wb-heading"><div><h1>Tổng quan dự án <span className="settings-project-name">· {currentProject.name}</span></h1><p className="overview-subtitle">Thông tin dự án, trạng thái công việc và mốc phát hành.</p></div></header>
    <div className="d-home-grid">
      <section className="d-home-main" aria-labelledby="overview-information-heading"><div className="d-section-heading"><h2 id="overview-information-heading">Thông tin dự án</h2></div><div className="overview-information-panel"><ProjectInformation project={currentProject} headingLevel={3}/></div></section>
      <OverviewSummary key={currentProject.id} projectId={currentProject.id} navigate={navigate}/>
    </div>
  </div>;
}
