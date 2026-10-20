const fs=require('node:fs');
const crypto=require('node:crypto');
const status=JSON.parse(fs.readFileSync('docs/planning/STATUS.json','utf8'));
const receipt=JSON.parse(fs.readFileSync('var/ai-report-silver-2026-10-19/backend-final-receipt.json','utf8'));
const mismatches=Object.entries(receipt.sourceFiles).filter(([file,hash])=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash).map(([file])=>file);
const result={at:new Date().toISOString(),statusJsonValid:true,phase:status.phase,verifiedBackendSourceMismatches:mismatches,reportScreenshotBytes:fs.statSync('var/ai-report-silver-2026-10-19/report-live-success.png').size};
fs.writeFileSync('var/ai-report-silver-2026-10-19/final-check.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
process.exitCode=mismatches.length?1:0;
