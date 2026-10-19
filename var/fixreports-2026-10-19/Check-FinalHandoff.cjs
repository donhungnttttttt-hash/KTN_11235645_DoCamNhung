// Read-only source checks plus evidence output; no runtime/database mutation.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const git=(...args)=>{const r=spawnSync('rtk',['proxy','git',...args],{cwd:root,encoding:'utf8',shell:false,windowsHide:true});if(r.status!==0)throw Error('Git check failed');return r.stdout;};
const branch=git('branch','--show-current').trim();if(branch!=='system-design')throw Error('Working branch changed');
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline.json'),'utf8')),missingBaseline=baseline.files.filter(f=>!fs.existsSync(path.join(root,f.path))).map(f=>f.path);
const paths=git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean).filter(p=>/^(Backend\/src\/|Frontend\/src\/|docs\/|tasks\/|GLOSSARY\.md$|FixReports\.md$)/.test(p));
const old=new Set(baseline.files.map(f=>f.path)),newFiles=paths.filter(p=>!old.has(p)),whitespace=[];
for(const file of newFiles)fs.readFileSync(path.join(root,file),'utf8').split(/\r?\n/).forEach((line,i)=>{if(/[\t ]+$/.test(line))whitespace.push({file,line:i+1});});
const files=['docs/reviews/2026-10-19-fixreports-implementation-review.md','docs/planning/2026-10-19-fixreports-implementation-plan.md','docs/planning/2026-10-19-fixreports-clarification.md','docs/prompts/2026-10-19-fixreports-codex-prompt.md','docs/content/spider-plus-project-overview.md'];
let links=0,tables=0;const linkFailures=[],tableFailures=[];
for(const file of files){const source=fs.readFileSync(path.join(root,file),'utf8');let fenced=false,width=null;
 for(const [index,line]of source.split(/\r?\n/).entries()){if(/^```/.test(line)){fenced=!fenced;width=null;continue;}if(fenced)continue;if(line.startsWith('|')){const current=line.split('|').length;if(width===null){width=current;tables++;}else if(width!==current)tableFailures.push({file,line:index+1});}else width=null;}
 for(const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const href=match[1].replace(/^<|>$/g,'');if(/^(?:https?:|mailto:|plugin:|app:)/i.test(href))continue;const target=href.split('#')[0];if(!target)continue;links++;if(!fs.existsSync(path.resolve(root,path.dirname(file),decodeURIComponent(target))))linkFailures.push({file,target});}
}
const changedAppliedMigrations=git('diff','--name-only','HEAD','--','Backend/src/main/resources/db/migration').trim();
const result={capturedAt:new Date().toISOString(),branch,baselineFiles:baseline.files.length,missingBaseline,newFilesChecked:newFiles.length,newFileWhitespace:whitespace,documentsChecked:files.length,localLinksChecked:links,tablesChecked:tables,linkFailures,tableFailures,trackedAppliedMigrationsChanged:changedAppliedMigrations?changedAppliedMigrations.split('\n'):[],notAFullSecretScan:true};
fs.writeFileSync(path.join(__dirname,'final-handoff-check.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'new-file-whitespace.json'),JSON.stringify({newFilesChecked:newFiles.length,whitespace,scope:'New untracked source/docs/tasks outside captured baseline; git diff --check separately covers tracked edits'},null,2)+'\n');
console.log(JSON.stringify(result));if(missingBaseline.length||whitespace.length||linkFailures.length||tableFailures.length||changedAppliedMigrations)process.exitCode=1;
