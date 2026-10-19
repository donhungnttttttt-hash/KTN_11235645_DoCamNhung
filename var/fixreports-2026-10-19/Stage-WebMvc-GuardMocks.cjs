// Prepared only. --check/--self-test never write Backend. Apply only after root confirms actual harness RED.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const targets=Object.freeze([
 ['config','DefaultProfileSecurityTest'],['admin','InventorySecurityTest'],['admin','AdminSecurityTest'],
 ['admin','AdminManagementSecurityTest'],['notes','ProjectNotesSecurityTest']
].map(([area,name])=>({name,file:path.join(root,'Backend/src/test/java/vn/syp/tms',area,name+'.java')})));
const declaration='    @org.springframework.test.context.bean.override.mockito.MockitoBean vn.syp.tms.feature.LegacyTestingWrites legacyTestingWrites;';

function transform(source,name){
 const anchor=new RegExp('(^[ \\t]*class '+name+' \\{)(\\r?\\n)','gm');
 const matches=[...source.matchAll(anchor)];
 if(matches.length!==1||!source.includes('@WebMvcTest('))throw Error('Unexpected controller slice shape: '+name);
 const field=/@(?:org\.springframework\.test\.context\.bean\.override\.mockito\.)?MockitoBean\s+(?:vn\.syp\.tms\.feature\.)?LegacyTestingWrites\s+legacyTestingWrites\s*;/g;
 const existing=[...source.matchAll(field)];
 if(existing.length===1)return source;
 if(existing.length>1||source.includes('LegacyTestingWrites')||/\blegacyTestingWrites\b/.test(source))throw Error('Ambiguous existing guard reference: '+name);
 const match=matches[0],offset=match.index+match[0].length;
 return source.slice(0,offset)+declaration+match[2]+source.slice(offset);
}
function plans(){return targets.map(target=>{const before=fs.readFileSync(target.file,'utf8');return {...target,before,after:transform(before,target.name)};});}
function sameSource(plan){if(fs.readFileSync(plan.file,'utf8')!==plan.before)throw Error('Slice changed since preflight: '+plan.name);}
function replaceAtomically(file,contents){
 const temporary=file+'.fr-webmvc-'+process.pid+'-'+Date.now()+'.tmp';
 try{fs.writeFileSync(temporary,contents,{encoding:'utf8',flag:'wx'});fs.renameSync(temporary,file);}
 finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
function selfTest(){
 const values=plans();
 assert.equal(values.length,5);
 for(const plan of values){
  assert.equal(transform(plan.after,plan.name),plan.after,'Second application must be byte-idempotent');
  if(plan.before!==plan.after){
   const newline=plan.before.includes('\r\n')?'\r\n':'\n';
   assert.equal(plan.after.replace(declaration+newline,''),plan.before,'Only one field declaration may be added');
  }
 }
 assert.throws(()=>transform('class Other {}\n','Other'),/Unexpected controller slice shape/);
 console.log('PASS: exact five slice inventory, byte-idempotent transform, only one fully qualified mock field added; no Backend writes.');
}
function apply(){
 const values=plans();values.forEach(sameSource); // Preflight all files before the first mutation.
 const applied=[];
 try{
  for(const plan of values){sameSource(plan);if(plan.before===plan.after)continue;replaceAtomically(plan.file,plan.after);applied.push(plan);}
 }catch(error){
  // Roll back only our exact replacement; never overwrite an intervening collaborator edit.
  for(const plan of applied.reverse())if(fs.readFileSync(plan.file,'utf8')===plan.after)replaceAtomically(plan.file,plan.before);
  throw error;
 }
 console.log(JSON.stringify({status:'APPLIED',changed:applied.length,scope:targets.map(t=>t.name)}));
}
try{
 const mode=process.argv[2]||'--check';
 if(process.argv.length>3)throw Error('One explicit mode required');
 if(mode==='--self-test')selfTest();
 else if(mode==='--check'){const values=plans();console.log(JSON.stringify({status:'PREPARED_NOT_APPLIED',wouldChange:values.filter(p=>p.before!==p.after).length,scope:targets.map(t=>t.name)}));}
 else if(mode==='--apply-confirmed-harness-red')apply();
 else throw Error('Use --check, --self-test, or root-authorized --apply-confirmed-harness-red');
}catch(error){console.error('WebMvc guard mock updater refused/failed: '+error.message);process.exitCode=1;}
