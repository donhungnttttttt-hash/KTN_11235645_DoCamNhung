// Archive only: copy alongside browser-fixture.html under the documented temporary Frontend names to reproduce.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ProjectNotes} from './src/app/features/projects/ProjectNotes';
import {HandbookPanel} from './src/app/features/projects/HandbookPanel';
import {AdminProjectForm} from './src/app/features/admin/AdminProjectForm';
import {projectsApi} from './src/app/services/api/projects';
import {ApiError} from './src/app/services/api/client';
import './src/app/styles/global.css';
import './src/app/features/projects/projects.css';
import './src/app/features/admin/admin.css';

// Disposable browser fixture; all API calls are synthetic and cannot reach the backend.
window.fetch=()=>Promise.reject(new Error('Fixture blocks network API calls'));
const pause=value=>new Promise(resolve=>setTimeout(()=>resolve(value),300));
let notes=[{id:1,title:'Note giả lập',body:'Nội dung để kiểm tra focus.',version:1,updatedAt:'2026-10-19T00:00:00Z'}];
const notesApi={list:()=>pause({items:notes,totalItems:notes.length,totalPages:1}),
 create:async(_id,body)=>{const note={id:2,...body,version:1,updatedAt:'2026-10-19T00:00:00Z'};notes=[...notes,note];return pause(note);},
 update:async(_id,id,body)=>{notes=notes.map(note=>note.id===id?{...note,...body,version:note.version+1}:note);return pause(notes.find(note=>note.id===id));}};
const handbook={id:1,name:'Hướng dẫn giả lập',code:'UI-1',archived:false,currentRevision:{id:1,revisionNo:1,contentHtml:'Nội dung hướng dẫn giả lập',createdAt:'2026-10-19T00:00:00Z'},history:[]};
projectsApi.listHandbook=()=>pause([handbook]);
projectsApi.getHandbook=()=>pause(handbook);
projectsApi.createHandbook=()=>pause(handbook);
projectsApi.addRevision=()=>pause(handbook);
const project={id:1,code:'UI',name:'Dự án giả lập',description:'Không có dữ liệu thật.',timezone:'Asia/Ho_Chi_Minh',version:1};
const projectApi={updateProject:async()=>{throw new ApiError('Phiên bản đã thay đổi (giả lập).',{status:409,code:'VERSION_CONFLICT'});},project:()=>pause({...project,version:2})};
function Fixture(){
 const [view,setView]=useState('notes'),[editing,setEditing]=useState(false);
 return <main className="page-container" style={{maxWidth:1100,margin:'0 auto',padding:24}}><h1>Kiểm chứng điều khiển</h1><p>Component/CSS thật · dữ liệu giả lập · không gọi backend/AI.</p>
 <nav aria-label="Màn kiểm chứng" style={{display:'flex',gap:12,margin:'24px 0'}}>{[['notes','Note'],['handbook','Sổ tay'],['project','Dự án']].map(([id,label])=><button type="button" className="cat-btn" key={id} onClick={()=>setView(id)}>{label}</button>)}</nav>
 {view==='notes'&&<ProjectNotes projectId={1} canEdit api={notesApi}/>}
 {view==='handbook'&&<HandbookPanel projectId={1} canEdit/>}
 {view==='project'&&<><button type="button" className="cat-btn" onClick={()=>setEditing(true)}>Sửa dự án giả lập</button>{editing&&<AdminProjectForm project={project} api={projectApi} onCancel={()=>setEditing(false)} onSaved={()=>setEditing(false)}/>}</>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
