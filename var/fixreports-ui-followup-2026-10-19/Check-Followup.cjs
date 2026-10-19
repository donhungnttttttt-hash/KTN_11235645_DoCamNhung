const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline-source-hashes.json'),'utf8'));
const changed=baseline.filter(item=>!fs.existsSync(path.join(root,item.path))||sha(fs.readFileSync(path.join(root,item.path)))!==item.sha256).map(item=>item.path);
const files=['docs/reviews/2026-10-19-fixreports-ui-followup.md'],failures=[];let localLinks=0;
for(const file of files){const text=fs.readFileSync(path.join(root,file),'utf8');let width=null;for(const [lineIndex,line] of text.split(/\r?\n/).entries()){if(/[\t ]+$/.test(line))failures.push({file,line:lineIndex+1,type:'WHITESPACE'});if(line.startsWith('|')){const size=line.split('|').length;if(width!==null&&size!==width)failures.push({file,line:lineIndex+1,type:'TABLE_WIDTH'});width=size;}else width=null;}
 for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const target=match[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;localLinks++;if(!fs.existsSync(path.resolve(root,path.dirname(file),target)))failures.push({file,target,type:'MISSING_LOCAL_LINK'});}}
const diff=spawnSync('rtk',['git','diff','--check'],{cwd:root,encoding:'utf8',shell:false,windowsHide:true});
const proof={capturedAt:new Date().toISOString(),changedExistingSourceDocs:changed,backendSourceChanged:changed.filter(p=>p.startsWith('Backend/')),frontendSourceChanged:changed.filter(p=>p.startsWith('Frontend/src/')),localLinksChecked:localLinks,failures,gitDiffCheck:diff.status===0?'PASS':'FAIL',mainRestarted:false,mainMigrated:false};
fs.writeFileSync(path.join(__dirname,'final-source-check.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));if(diff.status!==0||failures.length||proof.backendSourceChanged.length)process.exitCode=1;
