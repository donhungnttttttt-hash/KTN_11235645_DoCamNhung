const fs=require('fs'),path=require('path');
const base='Frontend/src/app';
function edit(file,change){const p=path.join(base,file),before=fs.readFileSync(p,'utf8'),after=change(before);if(before===after)throw Error('No change '+file);fs.writeFileSync(p,after);}
edit('features/admin/admin.css',s=>s.replace('font:inherit;min-height:44px;line-height:1.5','font:inherit;min-height:36px;line-height:1.5').replace('padding:12px 10px;border-bottom:1px solid #e1e9e6','padding:8px 10px;border-bottom:1px solid #e1e9e6'));
edit('features/file-work/file-work.css',s=>s.replace('.fw-page button{min-height:44px','.fw-page button{min-height:36px'));
edit('features/reports/ReportsPage.jsx',s=>{const labels=['"Lịch sử thực thi"','{title}','"Lỗi trong phạm vi báo cáo"','"Dữ liệu nguồn báo cáo"'];return s.replaceAll('label="Số liệu báo cáo"',()=>`label=${labels.shift()}`);});
edit('features/retest/shared.jsx',s=>s.replace('label="Bảng dữ liệu"','label="Lượt kiểm thử cần xác minh"'));
edit('features/projects/ProjectSelector.jsx',s=>s.replace('fontSize: "14px"','fontSize: "var(--text-body)"'));
for(const file of ['pages/IssuesPage.jsx','pages/TestSpecsPage.jsx','features/test-cases/CaseDetailModal.jsx','features/test-cases/ImportExcelDialog.jsx'])edit(file,s=>s.replaceAll(/text-\[(?:10|11)px\]/g,'ui-caption'));
edit('pages/TestSpecsPage.jsx',s=>s.replace('className="text-sm font-bold text-slate-900"','className="ui-page-title text-slate-900"'));
// Existing Excel preview and Redmine comparison also use the common named region.
for(const [file,css,label]of [['features/test-cases/ImportExcelDialog.jsx','max-h-60 overflow-auto border border-slate-200 rounded','Các dòng xem trước'],['features/integrations/RedminePanel.jsx','rm-compare','Đối chiếu Redmine']]){
 edit(file,s=>{
  const parser=require(path.resolve('Frontend/node_modules/@babel/parser')),ast=parser.parse(s,{sourceType:'module',plugins:['jsx']});let node;
  function visit(n){if(!n||typeof n!=='object')return;if(n.type==='JSXElement'&&n.openingElement.name.name==='div'&&n.openingElement.attributes.some(a=>a.name?.name==='className'&&a.value?.value===css))node=n;for(const [k,v]of Object.entries(n)){if(k==='loc')continue;if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}
  visit(ast);if(!node)throw Error('wrapper missing');
  const o=node.openingElement,c=node.closingElement;let out=s.slice(0,c.name.start)+'TableScroll'+s.slice(c.name.end);out=out.slice(0,o.name.start)+`TableScroll label="${label}"`+out.slice(o.name.end);return `import {TableScroll} from '../../components/TableScroll';\n`+out;
 });
}
edit('features/integrations/redmine.css',s=>s.replace('.rm-compare table { width: 100%;','.rm-compare table { width: 100%; min-width:600px;'));
edit('modules/CatHandbook.jsx',s=>`import {TableScroll} from '../components/TableScroll';\n`+s.replace('<table className="cat-table text-xs">','<TableScroll label="Quy định chứng cứ"><table className="cat-table text-xs">').replace('</table>','</table></TableScroll>'));
console.log('Remaining typography and table wrappers updated');
