'use strict';
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'backend-full-units-jacoco.xml'),xml=fs.readFileSync(file,'utf8');
const end=xml.lastIndexOf('</package>');if(end<0)throw Error('Expected JaCoCo package report');
const counters={};
for(const value of xml.slice(end+10).matchAll(/<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g)){
 const missed=+value[2],covered=+value[3];counters[value[1]]={missed,covered,percent:+(100*covered/(missed+covered||1)).toFixed(2)};
}
if(!counters.INSTRUCTION||!counters.BRANCH||!counters.LINE)throw Error('Root coverage counters missing');
const result={scope:'Entire instrumented production bundle, offline unit run only; native/browser coverage not merged',counters};
fs.writeFileSync(path.join(__dirname,'backend-full-units-coverage-summary.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
