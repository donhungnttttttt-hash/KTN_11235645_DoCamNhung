import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import HomePage from '../features/work-items/HomePage';
import { Button } from '../features/work-items/components';
import { presentItem, useProjectData } from '../features/work-items/ProjectData';
import { workItemsApi } from '../services/api/workItems';
import { WorkError } from '../features/work-items/WorkItemForm';
import { HandoffPanel } from '../features/qa/HandoffPanel';
import '../features/work-items/work-items.css';
import '../features/work-items/work-items-live.css';
import '../styles/work-board.css';
import '../styles/project-overview.css';

export function ProjectOverview({ navigate }) {
  const { projectId, writable, metadata, loading, error: projectError } = useProjectData();
  const [read,setRead]=useState({}),[revision,setRevision]=useState(0),[notice,setNotice]=useState('');
  useEffect(()=>{
    let current=true;setRead({projectId});
    if(projectId)workItemsApi.overview(projectId).then(data=>{if(current)setRead({projectId,data});}).catch(e=>{if(current)setRead({projectId,error:e.message});});
    return()=>{current=false;};
  },[projectId,revision]);
  const currentRead=read.projectId===projectId?read:{};
  const result=currentRead.data,error=currentRead.error;
  const permissionsReady=!loading && !projectError;
  const items=(result?.items||[]).map(presentItem);
  const activities=items.map(item=>({id:item.serverId,issueId:item.id,user:item.creator,kind:'created',timestamp:item.createdAt,text:'',status:item.status}));
  function go(route){
    if(route.startsWith('/board/issue/')){const item=items.find(i=>i.id===route.split('/')[3]);navigate('/board/issue/'+(item?.serverId||route.split('/')[3]));}
    else navigate(route);
  }
  if(!projectId)return <div className="cat-container">Chọn dự án để xem tổng quan.</div>;
  return <div className="work-items dashboard-board project-overview" data-lenis-prevent>
    <header className="wb-heading"><div><h1>Tổng quan dự án</h1><p className="overview-subtitle">Theo dõi công việc và mốc phát hành của dự án.</p></div><a className="d-button" href="#/tests/file-work" onClick={e=>{if(!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button===0){e.preventDefault();navigate('/tests/file-work');}}}>Công việc theo file</a><Button primary icon={Plus} disabled={!permissionsReady || !writable || metadata?.canCreate!==true} onClick={()=>navigate('/board/new')}>Thêm công việc</Button></header>
    <WorkError error={error} retry={()=>setRevision(v=>v+1)}/>{!result&&!error&&<p>Đang tải tổng quan…</p>}
    {result&&<HomePage issues={items} activities={activities} activitySource="created" statusCounts={result.statuses} milestoneCounts={result.milestones} navigate={go} notify={setNotice}/>}
    {permissionsReady && metadata?.canTriage===true && <HandoffPanel key={projectId} projectId={projectId} navigate={navigate}/>}
    {notice&&<p role="status">{notice}</p>}
  </div>;
}
