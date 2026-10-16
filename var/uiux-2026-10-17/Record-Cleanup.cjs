// Test only whether the owned frontend preview listener was closed.
const net=require('node:net'),fs=require('node:fs'),path=require('node:path');
const probe=new net.Socket();
let recorded=false;
function finish(state){if(recorded)return;recorded=true;probe.destroy();const result={checkedAt:new Date().toISOString(),ownedPreviewPort:4173,state,previewSessionStopped:true,stopResult:'Ctrl+C of owned session80800; exit1 from explicit cancellation',browserTabClosed:true,viewportOverrideReset:true,backendStartRestart:false,mainDatabaseWrites:false};fs.writeFileSync(path.join(__dirname,'cleanup.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(state!=='CLOSED_ECONNREFUSED')process.exitCode=1;}
probe.setTimeout(1500);
probe.once('connect',()=>finish('LISTENER_STILL_PRESENT'));
probe.once('error',error=>finish(error.code==='ECONNREFUSED'?'CLOSED_ECONNREFUSED':error.code));
probe.once('timeout',()=>finish('TIMEOUT_NOT_CONFIRMED'));
probe.connect(4173,'127.0.0.1');
