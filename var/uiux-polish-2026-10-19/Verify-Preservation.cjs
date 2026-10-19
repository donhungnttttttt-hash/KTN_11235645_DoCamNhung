const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const baselinePath=path.join(__dirname,'baseline.json');
const outputPath=path.join(__dirname,'preservation-and-links.json');
const relative=p=>path.relative(root,p).replaceAll('\\','/');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const baselineHash=hash(baselinePath);
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
function git(...args){return spawnSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024,windowsHide:true});}
// Count this receipt as a new file, but do not attempt a self-referential hash.
if(!fs.existsSync(outputPath))fs.writeFileSync(outputPath,'{}\n',{flag:'wx'});
const listed=git('ls-files','-co','--exclude-standard','-z');
if(listed.status!==0)throw new Error('Cannot enumerate repository files; no baseline changes made.');
const currentPaths=[...new Set(listed.stdout.split('\0').filter(Boolean))].filter(p=>fs.existsSync(path.join(root,p))&&fs.statSync(path.join(root,p)).isFile()).sort();
const baselineFiles=new Map(baseline.files.map(item=>[item.path,item.sha256]));
const changed=[],missing=[],unchanged=[];
for(const [p,before] of baselineFiles){
 const absolute=path.join(root,p);
 if(!fs.existsSync(absolute)){missing.push({path:p,baselineSha256:before});continue;}
 const after=hash(absolute);
 if(before===after)unchanged.push(p);
 else changed.push({path:p,baselineSha256:before,currentSha256:after});
}
const added=currentPaths.filter(p=>!baselineFiles.has(p)).map(p=>({path:p,sha256:path.join(root,p)===outputPath?null:hash(path.join(root,p)),...(path.join(root,p)===outputPath?{note:'Self-report hash intentionally omitted.'}:{})}));
const category=p=>p.startsWith('Frontend/src/')?'UI_SOURCE':p.startsWith('docs/')?'DOCS':p.startsWith('var/')?'EVIDENCE':'OUTSIDE_UI_DOCS_EVIDENCE';
const changesByCategory={};
for(const item of [...changed,...added]){const key=category(item.path);(changesByCategory[key]??=[]).push(item.path);}
const config=p=>p.startsWith('infra/')||/^\.env(?:\.|$)/.test(p)||/^\.git(?:ignore|attributes)$/.test(p)||/^compose[^/]*\.ya?ml$/.test(p)||/^Frontend\/(?:[^/]*config\.[^/]+|\.npmrc|\.env[^/]*|package(?:-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/.test(p)||p==='Frontend/src/test/setup.js'||p==='Backend/pom.xml'||p.startsWith('Backend/.mvn/')||/^Backend\/src\/main\/resources\/application[^/]*\.ya?ml$/.test(p);
function protectedSummary(predicate){
 const paths=[...baselineFiles.keys()].filter(predicate);
 const mutations=changed.filter(item=>predicate(item.path));
 const deletions=missing.filter(item=>predicate(item.path));
 const additions=added.filter(item=>predicate(item.path));
 return {baselineCount:paths.length,unchanged:mutations.length===0&&deletions.length===0&&additions.length===0,changed:mutations.map(item=>item.path),missing:deletions.map(item=>item.path),added:additions.map(item=>item.path)};
}
const reportPaths=['docs/reviews/2026-10-19-uiux-polish.md','docs/planning/2026-10-19-uiux-polish.md',...fs.readdirSync(__dirname).filter(p=>p.endsWith('.md')).map(p=>relative(path.join(__dirname,p)))];
const linkResults=[];
for(const p of reportPaths){
 if(!fs.existsSync(path.join(root,p))){linkResults.push({report:p,reportMissing:true});continue;}
 const markdown=fs.readFileSync(path.join(root,p),'utf8').replace(/```[\s\S]*?```/g,block=>'\n'.repeat((block.match(/\n/g)||[]).length));
 const links=[];
 for(const match of markdown.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)){
  const target=match[1].replace(/^<|>$/g,'');
  if(/^(?:https?:|mailto:|app:|plugin:|data:|#)/i.test(target)){links.push({target,kind:'EXTERNAL_OR_FRAGMENT_NOT_FETCHED'});continue;}
  let local=target.split('#')[0].split('?')[0].replace(/:\d+$/,'');
  try{local=decodeURIComponent(local);}catch{}
  const resolved=path.isAbsolute(local)?local:path.resolve(path.dirname(path.join(root,p)),local);
  links.push({target,kind:'LOCAL_FILE',resolved:relative(resolved),exists:fs.existsSync(resolved)});
 }
 linkResults.push({report:p,localCount:links.filter(link=>link.kind==='LOCAL_FILE').length,missing:links.filter(link=>link.kind==='LOCAL_FILE'&&!link.exists),links});
}
const diff=git('diff','--check');
const safeDiffDiagnostics=(diff.stdout+'\n'+diff.stderr).split(/\r?\n/).filter(line=>/^.+:\d+: (?:trailing whitespace|new blank line at EOF|space before tab in indent)/.test(line));
const unexpected=[...changed,...added].filter(item=>category(item.path)==='OUTSIDE_UI_DOCS_EVIDENCE').map(item=>item.path);
const receipt={
 capturedAt:new Date().toISOString(),baseline:{path:relative(baselinePath),capturedAt:baseline.capturedAt,branch:baseline.branch,fileCount:baseline.files.length,sha256:baselineHash,preserved:hash(baselinePath)===baselineHash},
 discovery:'Same git ls-files -co --exclude-standard enumeration as Capture-Baseline.cjs; ignored build/node_modules/runtime files are outside this snapshot. File bytes are hashed, never printed.',
 summary:{baselineFiles:baseline.files.length,unchangedExisting:unchanged.length,changedExisting:changed.length,newFiles:added.length,missing:missing.length,currentEnumerated:currentPaths.length},
 protected:{backend:protectedSummary(p=>p.startsWith('Backend/')),configuration:protectedSummary(config),packages:protectedSummary(p=>/^Frontend\/(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/.test(p)||p==='Backend/pom.xml')},
 changedExisting:changed,newFiles:added,missing,changesByCategory,unexpectedOutsideUiDocsEvidence:unexpected,
 gitDiffCheck:{exitCode:diff.status,pass:diff.status===0,diagnostics:safeDiffDiagnostics},
 documentLinks:{checkedReports:reportPaths.length,missingReports:linkResults.filter(item=>item.reportMissing).map(item=>item.report),localLinks:linkResults.reduce((sum,item)=>sum+(item.localCount||0),0),missingLocalLinks:linkResults.flatMap(item=>(item.missing||[]).map(link=>({report:item.report,...link}))),anchorExistenceChecked:false,externalLinksFetched:false,reports:linkResults},
};
fs.writeFileSync(outputPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({receipt:relative(outputPath),...receipt.summary,backendUnchanged:receipt.protected.backend.unchanged,configurationUnchanged:receipt.protected.configuration.unchanged,packagesUnchanged:receipt.protected.packages.unchanged,unexpected:unexpected.length,diffCheckPass:receipt.gitDiffCheck.pass,missingReports:receipt.documentLinks.missingReports.length,missingLocalLinks:receipt.documentLinks.missingLocalLinks.length,baselinePreserved:receipt.baseline.preserved}));
if(missing.length||unexpected.length||!receipt.gitDiffCheck.pass||receipt.documentLinks.missingReports.length||receipt.documentLinks.missingLocalLinks.length||Object.values(receipt.protected).some(group=>!group.unchanged))process.exitCode=1;
