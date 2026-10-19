// Local markdown structure/reference checks only. No HTTP, browser, Maven or DB.
const fs=require('fs'),path=require('path');
const files=['docs/business/metrics.md','docs/business/permissions.md','docs/api/test-documents.md','docs/api/work-items.md','docs/api/file-work.md','docs/api/reporting.md','docs/api/ai-chat.md','docs/api/fixreports-contract.md'];
const slug=text=>text.toLowerCase().replace(/<[^>]+>/g,'').replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
const failures=[],warnings=[],counts={files:files.length,localLinks:0,anchors:0,tables:0};
for(const file of files){const source=fs.readFileSync(file,'utf8'),lines=source.split(/\r?\n/);if(!/^# /.test(lines[0]))failures.push({file,reason:'Missing document title'});
 if(lines.filter(line=>/^# /.test(line)).length>1)warnings.push({file,reason:'Preserved historical extra h1; no unrelated rewrite'});
 if(!source.includes('19/10/2026')&&!source.includes('2026-10-19'))failures.push({file,reason:'Missing dated FixReports section'});
 let fenced=false,columns=null;
 for(let n=0;n<lines.length;n++){const line=lines[n];if(/^```/.test(line)){fenced=!fenced;columns=null;continue;}if(fenced)continue;
  if(line.startsWith('|')){const width=line.split('|').length; if(columns===null){columns=width;counts.tables++;}else if(columns!==width)failures.push({file,line:n+1,reason:'Inconsistent table column separators',expected:columns,actual:width});}else columns=null;
 }
 if(fenced)failures.push({file,reason:'Unclosed code fence'});
 for(const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){let target=match[1].replace(/^<|>$/g,'');if(/^(https?:|mailto:|app:|plugin:)/i.test(target))continue;
  const [relative,fragment]=target.split('#');const resolved=relative?path.resolve(path.dirname(file),decodeURIComponent(relative)):path.resolve(file);counts.localLinks++;
  if(!fs.existsSync(resolved)){failures.push({file,target,reason:'Missing local target'});continue;}
  if(fragment&&/\.md$/i.test(resolved)){counts.anchors++;const headings=fs.readFileSync(resolved,'utf8').split(/\r?\n/).filter(line=>/^#{1,6} /.test(line)).map(line=>slug(line.replace(/^#{1,6} /,'')));if(!headings.includes(decodeURIComponent(fragment)))failures.push({file,target,reason:'Missing local heading fragment'});}
 }
}
const result={kind:'LOCAL_STRUCTURE_ONLY_NOT_HTTP_OR_UAT',...counts,warnings,failures};fs.writeFileSync(path.join(__dirname,'fr11-docs-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
