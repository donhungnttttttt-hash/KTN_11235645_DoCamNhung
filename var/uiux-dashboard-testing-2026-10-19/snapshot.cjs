const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),files={};
function visit(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+e.name;if(e.isDirectory())visit(name);else files[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');}}
visit('Frontend/src');visit('Backend/src');
fs.writeFileSync(path.join(__dirname,process.argv[2]+'.json'),JSON.stringify({at:new Date().toISOString(),files},null,2));
console.log(JSON.stringify({files:Object.keys(files).length,snapshot:process.argv[2]}));
