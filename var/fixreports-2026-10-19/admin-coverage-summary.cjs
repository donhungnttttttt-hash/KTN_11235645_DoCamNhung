const fs=require('node:fs');
const file=process.argv[2],xml=fs.readFileSync(file,'utf8');
const wanted=new Set(process.argv.length>3?process.argv.slice(3):['AdminOverviewService','ProjectDeadlines','ProjectStatusReportService','ProjectStatusReportController']);
const result=[];
for(const match of xml.matchAll(/<class name="vn\/syp\/tms\/admin\/([^"]+)"[^>]*>([\s\S]*?)<\/class>/g)){
 if(!wanted.has(match[1]))continue;
 const tail=match[2].slice(match[2].lastIndexOf('</method>')+9),out={class:match[1]};
 for(const value of tail.matchAll(/<counter type="([^"]+)" missed="(\d+)" covered="(\d+)"\/>/g)){const missed=+value[2],covered=+value[3];out[value[1]]={missed,covered,percent:+(100*covered/(missed+covered||1)).toFixed(2)};}
 result.push(out);
}
console.log(JSON.stringify(result,null,2));
