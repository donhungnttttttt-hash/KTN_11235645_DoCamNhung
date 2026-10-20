const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const env=Object.fromEntries(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8').split(/\r?\n/).filter(line=>/^[A-Z_][A-Z_0-9]*=/.test(line)).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
const key=env.OPENAI_API_KEY,base=env.TMS_OPENAI_BASE_URL;
if(!key||base!=='https://caheoai.com/v1')throw Error('Expected approved configured provider');
const instructions='You are a report writer, not a coding agent. No tools are available. Do not call functions or tools or request commands. Return your final answer as an assistant text message. Write a short Vietnamese project report as plain Markdown text, not JSON. Use only the supplied synthetic facts. Include counts and state that no acceptance conclusion can be made. Do not add unsupported facts.';
const data={scope:'PUBLIC_SYNTHETIC_DIAGNOSTIC',project:'Ví dụ kiểm tra kết nối',total:2,tested:1,ok:1,ng:0,pending:0,na:0,notRun:1};
const body={model:env.TMS_OPENAI_MODEL,store:false,max_output_tokens:Number(env.TMS_OPENAI_MAX_OUTPUT_TOKENS||1536),instructions,input:JSON.stringify(data),tools:[],tool_choice:'none',text:{format:{type:'text'}}};
const safe=value=>String(value??'').split(key).join('[REDACTED]').replace(/Bearer\s+\S+|sk-[A-Za-z0-9_-]+/gi,'[REDACTED]').slice(0,300);
(async()=>{
 const response=await fetch(base+'/responses',{method:'POST',redirect:'error',signal:AbortSignal.timeout(25000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
 const raw=await response.text();let parsed;try{parsed=JSON.parse(raw);}catch{parsed={};}
 const parts=(parsed.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text||'');
 const output=parts.join('');
 const result={at:new Date().toISOString(),status:response.status,model:env.TMS_OPENAI_MODEL,context:'synthetic data only; no project data',mode:'text',responseStatus:parsed.status,outputTypes:parsed.output?.map(item=>item.type),textLength:output.length,nonBlank:!!output.trim(),error:response.ok?undefined:{type:safe(parsed.error?.type),code:safe(parsed.error?.code),message:safe(parsed.error?.message)}};
 fs.writeFileSync(path.join(__dirname,'provider-text-probe.json'),JSON.stringify(result,null,2));
 const sanitized=JSON.stringify(parsed.output||[]).split(key).join('[REDACTED]').replace(/Bearer\s+\S+|sk-[A-Za-z0-9_-]+/gi,'[REDACTED]');
 fs.writeFileSync(path.join(__dirname,'synthetic-provider-output.json'),sanitized);
 if(response.ok&&output.trim())fs.writeFileSync(path.join(__dirname,'synthetic-provider-report.md'),output);
 console.log(JSON.stringify(result));
})().catch(error=>{const result={at:new Date().toISOString(),failed:true,type:error.name};fs.writeFileSync(path.join(__dirname,'provider-text-probe.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=1;});
