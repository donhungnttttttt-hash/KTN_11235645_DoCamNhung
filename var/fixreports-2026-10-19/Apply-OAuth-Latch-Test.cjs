// Root-approved test-only candidate. Run only after the explicit returned Maven slot.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),directory=path.join(__dirname,'oauth-latch-candidate');
const baseline=JSON.parse(fs.readFileSync(path.join(directory,'baseline.json'),'utf8'));
const file=path.join(root,baseline.relative),before=fs.readFileSync(file),after=fs.readFileSync(path.join(directory,'ChatGptOAuthClientTest.java'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
if(hash(before)===hash(after)){console.log('Already applied; no source changes.');process.exit(0);}
if(hash(before)!==baseline.sha256)throw Error('OAuth test source differs from approved baseline');
const temporary=file+'.fr-oauth-'+process.pid+'.tmp';
try{fs.writeFileSync(temporary,after,{flag:'wx'});fs.renameSync(temporary,file);}
finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log('Applied only approved OAuth deadline test; production unchanged.');
