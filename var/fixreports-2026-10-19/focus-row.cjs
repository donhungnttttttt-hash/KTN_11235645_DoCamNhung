const fs=require('node:fs');
const p='Frontend/src/app/features/testing/TestingDocumentPage.jsx';
fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('<tr key={row.rowId}>','<tr key={row.rowId} ref={row.rowId===linkedRow?.rowId?focusedRow:undefined} tabIndex={row.rowId===linkedRow?.rowId?-1:undefined} aria-current={row.rowId===linkedRow?.rowId?true:undefined}>'));
fs.appendFileSync('Frontend/src/app/features/testing/testing.css','\n.testing-document tr[aria-current=true]{outline:2px solid #2563eb;outline-offset:-2px;background:#eff6ff;}\n');
