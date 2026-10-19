const fs=require('node:fs');const file='Frontend/src/app/features/file-work/FileWorkPage.jsx';let s=fs.readFileSync(file,'utf8');
function rep(a,b){if(!s.includes(a))throw Error('Missing anchor '+a);s=s.replace(a,b);}
rep('retry={()=>{setApprovedIds([]);refresh(v=>v+1);}}','retry={()=>{setApprovedIds([]);setRevisions([]);invalidate();refresh(v=>v+1);}}');
rep('<Field label="Đợt bản nháp"><select value={cycleId}', '<Field label="Đợt bản nháp"><select disabled={!!initialCycleId} value={cycleId}');
rep('<option value="">Chọn đợt</option>{cycles.data?', '<option value="">Chọn đợt</option>{cycle.data&&!cycles.data?.items.some(c=>String(c.id)===cycleId)&&<option value={cycleId}>{cycle.data.name}</option>}{cycles.data?');
rep('<Pager data={cycles.data} label="đợt" onChange={setCyclePage}/>', '{!initialCycleId&&<Pager data={cycles.data} label="đợt" onChange={setCyclePage}/>}');
rep('busy={busy} onBusy={setBusy}/>','onReload={()=>{setApprovedIds([]);setRevisions([]);invalidate();refresh(v=>v+1);}} busy={busy||!authorized} onBusy={setBusy}/>');
fs.writeFileSync(file,s);
