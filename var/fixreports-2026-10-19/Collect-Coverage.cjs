const fs=require('node:fs'),path=require('node:path');
const names=new Set(['vn/syp/tms/notes/ProjectNotesService','vn/syp/tms/notes/ProjectNotesStore','vn/syp/tms/reporting/ManagementReportService','vn/syp/tms/workitem/FeatureIssueService','vn/syp/tms/feature/FeatureService','vn/syp/tms/ai/FeatureFacts','vn/syp/tms/ai/AiPortfolioContext']);
function counters(fragment){return Object.fromEntries([...fragment.matchAll(/<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g)].map(match=>{const missed=Number(match[2]),covered=Number(match[3]);return [match[1],{missed,covered,percent:covered+missed?Math.round(10000*covered/(missed+covered))/100:null}];}));}
for(const prefix of ['final-native','backend-full-units']){
 const file=path.join(__dirname,prefix+'-jacoco.xml');if(!fs.existsSync(file))continue;
 const xml=fs.readFileSync(file,'utf8'),classes={};
 for(const match of xml.matchAll(/<class name="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g)){if(names.has(match[1]))classes[match[1]]=counters(match[2].slice(match[2].lastIndexOf('</method>')+9));}
 const proof={scope:prefix==='final-native'?'Native14 only':'All explicitly selected offline74 classes only',mergedCoverage:false,reportCounters:counters(xml.slice(xml.lastIndexOf('</package>')+10)),classes};
 fs.writeFileSync(path.join(__dirname,prefix+'-coverage.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({scope:proof.scope,report:proof.reportCounters,classes:Object.fromEntries(Object.entries(classes).map(([key,value])=>[key,{lines:value.LINE?.percent,branches:value.BRANCH?.percent}]))}));
}
