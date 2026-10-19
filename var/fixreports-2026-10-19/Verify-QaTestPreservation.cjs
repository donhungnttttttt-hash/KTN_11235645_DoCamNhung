const fs=require('fs'),crypto=require('crypto'),parser=require('../../Frontend/node_modules/@babel/parser');
const source=fs.readFileSync('Frontend/src/app/features/qa/qa-glue.test.jsx','utf8'),ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
const current=ast.program.body.filter(node=>node.type==='ExpressionStatement'&&source.slice(node.start,node.end).startsWith('it')).map(node=>crypto.createHash('sha256').update(source.slice(node.start,node.end)).digest('hex'));
const manifest=JSON.parse(fs.readFileSync('var/fixreports-2026-10-19/qa-glue-preservation-manifest.json','utf8'));
const historical=manifest.tests.filter(item=>item.disposition==='preserve-exact-test-body'),missing=historical.filter(item=>!current.includes(item.sha256));
console.log(JSON.stringify({original:manifest.originalTests,replacedRetiredCases:manifest.replaced,preservedHistoricalCases:manifest.preserved,preservedDeclarations:historical.length,missing},null,2));
if(missing.length)process.exitCode=1;
