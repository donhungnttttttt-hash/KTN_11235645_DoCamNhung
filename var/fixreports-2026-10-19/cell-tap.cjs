const fs=require('node:fs'),p='Frontend/src/app/features/testing/TestingDocumentPage.jsx';
fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace("onDoubleClick={()=>edit(row,index)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();edit(row,index);}}}","onClick={()=>edit(row,index)}"));
