import {defineConfig} from '../Frontend/node_modules/vite/dist/node/index.js';
import react from '../Frontend/node_modules/@vitejs/plugin-react/dist/index.js';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('../Frontend',import.meta.url)),plugins:[react()],server:{host:'127.0.0.1',port:15173,strictPort:true,proxy:{'/api':'http://127.0.0.1:18080','/actuator':'http://127.0.0.1:18080'}}});
