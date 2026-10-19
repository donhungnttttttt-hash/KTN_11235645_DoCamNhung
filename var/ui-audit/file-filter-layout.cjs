const fs=require('fs');
const path='Frontend/src/app/features/file-work/FileWorkPage.jsx';
const before=fs.readFileSync(path,'utf8');
const after=before.replace('<div className="fw-actions"><Field label="Tìm tên file">','<div className="fw-actions fw-filter-controls"><Field label="Tìm tên file">');
if(after===before)throw new Error('File filter row not found');
fs.writeFileSync(path,after);
const css='Frontend/src/app/features/file-work/file-work.css';
fs.writeFileSync(css,fs.readFileSync(css,'utf8').replace('.fw-filter-controls{align-items:end}', '.fw-filter-controls{align-items:flex-start}'));
