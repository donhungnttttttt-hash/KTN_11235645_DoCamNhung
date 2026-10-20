const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline.json'),'utf8'));
const hash=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
const missing=[],changed=[];
for(const [name,value] of Object.entries(baseline.files)){if(!fs.existsSync(path.join(root,name)))missing.push(name);else if(hash(name)!==value)changed.push(name);}
const preservedPaths=['Frontend/src/AppEntry.jsx','Frontend/src/app/features/admin/AdminProjectForm.jsx','Frontend/src/app/features/admin/admin-management.test.jsx','Frontend/src/app/features/ai/AiConnections.jsx','Frontend/src/app/features/ai/AiConnections.test.jsx','Frontend/src/app/features/auth/AccountMenu.jsx','Frontend/src/app/features/auth/AuthBoundary.jsx','Frontend/src/app/features/auth/auth.css','Frontend/src/app/features/auth/auth.test.jsx','Frontend/src/app/features/projects/HandbookPanel.jsx','Frontend/src/app/features/projects/ProjectNotes.jsx','Frontend/src/app/features/projects/ProjectNotes.test.jsx','Frontend/src/app/features/projects/handbook-editor-focus.test.jsx','Frontend/src/app/features/admin/project-form-recovery.test.jsx','Frontend/src/app/features/auth/AccountMenu.pending.test.jsx'];
const protectedMismatch=preservedPaths.filter(name=>!baseline.files[name]||!fs.existsSync(path.join(root,name))||hash(name)!==baseline.files[name]);
const reports=Object.keys(baseline.files).filter(name=>name.startsWith('docs/reports/'));
const migrationChanges=changed.concat(missing).filter(name=>name.startsWith('Backend/src/main/resources/db/migration/'));
const result={at:new Date().toISOString(),baselineFiles:Object.keys(baseline.files).length,changed,missing,protectedExistingFiles:preservedPaths.length,protectedMismatch,existingReports:reports.length,changedReports:reports.filter(name=>changed.includes(name)||missing.includes(name)),migrationChanges,dependenciesChanged:changed.filter(name=>/package(-lock)?\.json$|pom\.xml$/.test(name))};
fs.writeFileSync(path.join(__dirname,'preservation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
if(missing.length||protectedMismatch.length||result.changedReports.length||migrationChanges.length||result.dependenciesChanged.length)process.exitCode=1;
