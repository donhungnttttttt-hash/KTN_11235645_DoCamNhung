const fs=require('fs'),crypto=require('crypto'),parser=require('../../Frontend/node_modules/@babel/parser');
const p='Frontend/src/app/features/qa/qa-glue.test.jsx',source=fs.readFileSync(p,'utf8'),ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
const tests=ast.program.body.filter(node=>node.type==='ExpressionStatement'&&source.slice(node.start,node.end).startsWith('it'));
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const manifest=tests.map(node=>{const text=source.slice(node.start,node.end);const call=node.expression,each=call.callee?.type==='CallExpression'&&call.callee.callee?.type==='MemberExpression'&&call.callee.callee.property.name==='each';return {line:node.loc.start.line,label:text.split('\n')[0],expandedCount:each?call.callee.arguments[0].elements.length:1,disposition:text.includes('<WorkBoardPage')?'replace-retired-workboard-with-feature-context-and-retirement-tests':'preserve-exact-test-body',sha256:hash(text)};});
let next=source;
for(const node of tests.filter(node=>source.slice(node.start,node.end).includes('<WorkBoardPage')).reverse())next=next.slice(0,node.start)+next.slice(node.end);
fs.writeFileSync(p,next);
fs.writeFileSync('var/fixreports-2026-10-19/qa-glue-preservation-manifest.json',JSON.stringify({originalTests:manifest.reduce((sum,item)=>sum+item.expandedCount,0),replaced:manifest.filter(item=>item.disposition.startsWith('replace')).reduce((sum,item)=>sum+item.expandedCount,0),preserved:manifest.filter(item=>item.disposition.startsWith('preserve')).reduce((sum,item)=>sum+item.expandedCount,0),tests:manifest},null,2));
