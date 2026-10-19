const fs=require('fs');
function edit(p,fn){let s=fs.readFileSync(p,'utf8'),n=fn(s);if(s===n)throw Error(p);fs.writeFileSync(p,n);}
const base='Frontend/src/app/';
for(const [p,from,to,importPath] of [
 ['features/projects/CatalogPage.jsx','!!currentProject && !currentProject.archived && (hasRole("ADMIN") || currentProject.projectRole === "PM")','canManageProjectWork(currentProject, hasRole)','./projectAccess'],
 ['features/projects/ProjectSettingsPage.jsx',"!currentProject.archived && (hasRole('ADMIN') || currentProject.projectRole === 'PM')",'canManageProjectWork(currentProject, hasRole)','./projectAccess'],
 ['pages/TestSpecsPage.jsx',"!!currentProject && (currentProject.projectRole === 'PM' || hasRole?.('ADMIN'))",'canManageProjectWork(currentProject, hasRole)','../features/projects/projectAccess'],
 ['features/test-cases/TestDocumentsPage.jsx',"project.projectRole === 'PM' || hasRole?.('ADMIN')",'canManageProjectWork(project, hasRole)','../projects/projectAccess'],
 ['features/test-execution/TestCyclesPage.jsx',"project && !project.archived && (project.projectRole === 'PM' || hasRole?.('ADMIN'))",'canManageProjectWork(project, hasRole)','../projects/projectAccess'],
 ['features/test-execution/ExecutionRunnerPage.jsx',"!dev && project && !project.archived && (project.projectRole === 'PM' || hasRole?.('ADMIN'))",'canManageProjectWork(project, hasRole)','../projects/projectAccess'],
])edit(base+p,s=>{if(!s.includes(from))throw Error('Missing '+p);return `import { canManageProjectWork } from '${importPath}';\n`+s.replace(from,to);});
for(const p of ['features/test-cases/TestDocumentPage.jsx','features/test-cases/DocumentExecution.jsx'])edit(base+p,s=>{
 s="import { isProjectObserver } from '../projects/projectAccess';\n"+s;
 const line=s.split('\n').find(l=>l.includes('const dev='));
 s=s.replace(line,line+'\n  const readOnly=dev || isProjectObserver(project, hasRole);');
 s=s.replace('disabled={dev || loading','disabled={readOnly || loading').replace('readOnly={dev || e.requested','readOnly={readOnly || e.requested');
 s=s.replace("{customer ? 'Bấm ô", "{customer && readOnly ? 'Chế độ xem: bạn có thể xem kết quả, lịch sử và xuất tài liệu.' : customer ? 'Bấm ô");
 s=s.replace('>Thiết lập đợt / phân công</button>',">{readOnly ? 'Xem đợt kiểm thử' : 'Thiết lập đợt / phân công'}</button>");
 return s;
});
edit(base+'features/work-items/ProjectData.jsx',s=>s.replace('writable: !!projectId && !currentProject?.archived','writable: !!projectId && !currentProject?.archived && current.metadata?.membershipId !== 0'));
edit('Frontend/src/App.jsx',s=>"import { ProjectAccessNotice } from './app/features/projects/ProjectAccessNotice';\n"+s.replace('      <AppRouter','      <ProjectAccessNotice/>\n      <AppRouter'));
