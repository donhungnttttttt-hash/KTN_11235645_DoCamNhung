// Frontend-only component verification. Existing app/backend services are untouched.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createServer} from '../../Frontend/node_modules/vite/dist/node/index.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),frontend=path.join(root,'Frontend');
process.chdir(frontend);
const server=await createServer({
 configFile:path.join(frontend,'vite.config.js'),root:frontend,
 resolve:{dedupe:['react','react-dom'],alias:{react:path.join(frontend,'node_modules/react'),'react-dom':path.join(frontend,'node_modules/react-dom')}},
 plugins:[{name:'uiux-no-business-api',configureServer(instance){instance.middlewares.use((req,res,next)=>{
  if(/^\/(api|actuator)(\/|$)/.test(req.url||'')){res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'API bị chặn trong phiên kiểm chứng component.'}));return;}next();
 });}}],
 server:{host:'127.0.0.1',port:4173,strictPort:true,open:false,fs:{allow:[root]}},
});
await server.listen();
console.log('Frontend component fixture only; API requests blocked; no backend/database.');
console.log('http://127.0.0.1:4173/@fs/'+path.join(root,'var/uiux-2026-10-17/preview/index.html').replaceAll('\\','/'));
for(const event of ['SIGINT','SIGTERM'])process.once(event,async()=>{await server.close();process.exit(0);});
