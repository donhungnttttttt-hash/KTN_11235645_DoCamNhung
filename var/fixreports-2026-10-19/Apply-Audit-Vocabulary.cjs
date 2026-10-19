// Do not run until root grants the source/Maven slot. Install tests before observing RED, then labels.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),candidate=path.join(__dirname,'audit-vocabulary-candidate');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function existing(file){return fs.existsSync(file)?fs.readFileSync(file):null;}
function plan(relative,candidateName,baselineHash){
 const file=path.join(root,relative),before=existing(file),after=fs.readFileSync(path.join(candidate,candidateName));
 if(before&&hash(before)===hash(after))return {file,before,after,changed:false};
 if(baselineHash?(!before||hash(before)!==baselineHash):before!==null)throw Error('Source differs from staged baseline: '+relative);
 return {file,before,after,changed:true};
}
function atomic(file,bytes){const temp=file+'.fr-audit-'+process.pid+'.tmp';try{fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
try{
 const mode=process.argv[2];if(process.argv.length!==3)throw Error('One explicit mode is required');
 const labels=JSON.parse(fs.readFileSync(path.join(candidate,'baseline.json'),'utf8'));
 const native=JSON.parse(fs.readFileSync(path.join(candidate,'native-baseline.json'),'utf8'));
 let plans;
 if(mode==='--tests-slot-granted')plans=[plan('Backend/src/test/java/vn/syp/tms/admin/AdminAuditLabelsTest.java','AdminAuditLabelsTest.java',null),plan(native.relative,'AdminNativeIntegrationTest.java',native.sha256)];
 else if(mode==='--labels-observed-red')plans=[plan(labels.relative,'AdminAuditLabels.java',labels.sha256)];
 else throw Error('Use --tests-slot-granted or --labels-observed-red only after root coordination');
 for(const item of plans)if(item.changed){const current=existing(item.file);if((current===null)!==(item.before===null)||current&&hash(current)!==hash(item.before))throw Error('Concurrent source edit: '+item.file);}
 const applied=[];
 try{for(const item of plans)if(item.changed){atomic(item.file,item.after);applied.push(item);}}
 catch(error){for(const item of applied.reverse())if(hash(fs.readFileSync(item.file))===hash(item.after)){if(item.before===null)fs.unlinkSync(item.file);else atomic(item.file,item.before);}throw error;}
 console.log(JSON.stringify({status:'APPLIED',mode,changed:applied.length}));
}catch(error){console.error('Audit candidate apply refused/failed: '+error.message);process.exitCode=1;}
