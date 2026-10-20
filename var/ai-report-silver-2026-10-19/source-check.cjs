const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),mode=process.argv[2]||'before';
const files={};
function scan(relative){for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){const name=relative+'/'+entry.name;if(entry.isDirectory())scan(name);else files[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');}}
scan('Frontend/src');scan('Backend/src');
const output={at:new Date().toISOString(),files};
if(mode==='after'){const before=JSON.parse(fs.readFileSync(path.join(__dirname,'source-before.json'),'utf8')).files;output.changed=Object.keys(before).filter(p=>files[p]&&files[p]!==before[p]);output.added=Object.keys(files).filter(p=>!before[p]);output.deleted=Object.keys(before).filter(p=>!files[p]);}
fs.writeFileSync(path.join(__dirname,`source-${mode}.json`),JSON.stringify(output,null,2));
console.log(JSON.stringify({mode,count:Object.keys(files).length,changed:output.changed,added:output.added,deleted:output.deleted}));
