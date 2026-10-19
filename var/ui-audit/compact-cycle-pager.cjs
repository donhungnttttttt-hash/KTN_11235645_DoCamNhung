const fs=require('fs');const p='Frontend/src/app/features/file-work/FileWorkPage.jsx';let s=fs.readFileSync(p,'utf8');
s=s.replace("export function Pager({data,onChange,label='công việc'})", "export function Pager({data,onChange,label='công việc',compact=false})");
s=s.replace('<div className="fw-pager"><span>{data.totalItems} {label} · Trang {data.page+1}/{Math.max(1,data.totalPages)}</span>', '<div className={`fw-pager${compact?\' fw-pager-compact\':\'\'}`}><span>{!compact&&`${data.totalItems} ${label} · Trang `}{data.page+1}/{Math.max(1,data.totalPages)}</span>');
s=s.replace('onClick={()=>onChange(data.page-1)}>Trước</button>', "onClick={()=>onChange(data.page-1)}>{compact?'‹':'Trước'}</button>");
s=s.replace('onClick={()=>onChange(data.page+1)}>Sau</button>', "onClick={()=>onChange(data.page+1)}>{compact?'›':'Sau'}</button>");
s=s.replace('label="đợt lọc"/>','label="đợt lọc" compact/>');fs.writeFileSync(p,s);
