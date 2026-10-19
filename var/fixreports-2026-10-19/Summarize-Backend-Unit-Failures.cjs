'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),report=path.join(root,'Backend/target/surefire-reports');
const selection=JSON.parse(fs.readFileSync(path.join(__dirname,'backend-unit-selection.json'),'utf8'));
const decode=value=>value.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const attr=(text,name)=>decode(new RegExp('\\b'+name+'="([^"]*)"').exec(text)?.[1]||'');
const selected=new Set(selection.selected),failures=[];
for(const file of fs.readdirSync(report).filter(name=>name.startsWith('TEST-')&&name.endsWith('.xml'))){
 const xml=fs.readFileSync(path.join(report,file),'utf8'),head=/<testsuite\b[^>]*>/.exec(xml)?.[0]||'';
 const name=attr(head,'name');if(!selected.has(name.split('.').at(-1)))continue;
 if(!(+attr(head,'failures')||+attr(head,'errors')))continue;
 const methods=[];
 for(const failure of xml.matchAll(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/(?:failure|error)>/g)){
  const start=xml.lastIndexOf('<testcase',failure.index),testHeader=xml.slice(start,xml.indexOf('>',start)+1);
  const body=decode(failure[3]),cause=body.match(/Caused by: [^\r\n]*(?:No qualifying bean|UnsatisfiedDependency)[^\r\n]*/)?.[0];
  methods.push({name:attr(testHeader,'name'),type:attr(failure[2],'type'),reason:(cause||attr(failure[2],'message')||body.trim().split(/\r?\n/)[0]).slice(0,420)});
 }
 failures.push({class:name,tests:+attr(head,'tests'),failures:+attr(head,'failures'),errors:+attr(head,'errors'),methods});
}
const output={selectedClasses:selection.selected.length,failedClasses:failures.length,failures};
fs.writeFileSync(path.join(__dirname,'backend-unit-failure-inventory.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
