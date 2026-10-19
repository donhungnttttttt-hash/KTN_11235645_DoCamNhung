const fs=require('fs');
const path='Frontend/src/app/features/ai/AiChat.jsx';
let source=fs.readFileSync(path,'utf8');
const replacements=[
 ["setQuery(new FormData(e.currentTarget).get('search').trim());", "setQuery(new FormData(e.currentTarget).get('search').trim());retryTargets(value=>value+1);"],
 ['<button className="ai-button" disabled={busy||!!pending}>Tìm</button>', '<button className="ai-button" disabled={busy||!!pending||targetLoading}>{targetLoading?\'Đang tìm…\':\'Tìm\'}</button>'],
];
for(const [old,next]of replacements){if(!source.includes(old))throw new Error('Missing source anchor');source=source.replace(old,next);}
fs.writeFileSync(path,source);
