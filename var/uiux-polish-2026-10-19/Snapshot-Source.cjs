const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const files=[];
function walk(dir){for(const item of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+item.name;if(item.isDirectory())walk(name);else files.push({path:name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')});}}
walk('Frontend/src');
for(const file of ['Frontend/package.json','Frontend/package-lock.json','Frontend/vite.config.js','Frontend/index.html'])if(fs.existsSync(path.join(root,file)))files.push({path:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')});
const target=process.argv[2];if(!/^[a-z-]+\.json$/.test(target||''))throw Error('Expected receipt filename');
fs.writeFileSync(path.join(__dirname,target),JSON.stringify({capturedAt:new Date().toISOString(),files},null,2)+'\n');console.log(JSON.stringify({target,files:files.length}));
