const fs=require('fs'),path=require('path');
const root=path.resolve('Frontend'),parser=require(path.join(root,'node_modules/@babel/parser')),postcss=require(path.join(root,'node_modules/postcss'));
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p);}}walk(path.join(root,'src'));
const labels={AdminProjectDetail:'Thành viên dự án',AdminDashboard:'Danh sách dự án cần chú ý',AdminDevices:'Thiết bị',AdminAudit:'Nhật ký quản trị',AdminProjects:'Mốc phát hành',shared:'Bảng dữ liệu',AdminUsers:'Tài khoản hệ thống',FileCaseView:'Case thực thi chính thức',FileWorkPage:'Công việc theo file',CatalogPage:'Danh mục dự án',ProjectMembers:'Thành viên dự án',RetestQueuePage:'Yêu cầu kiểm thử lại',ReportsPage:'Số liệu báo cáo',TestCyclesPage:'Đợt kiểm thử',ScopeSetup:'Phạm vi test case',ExecutionRunnerPage:'Lượt kiểm thử',DocumentResultHistory:'Lịch sử kết quả',CaseHistoryDialog:'Lịch sử phiên bản case',TestDocumentsPage:'Danh sách tài liệu test',ImportExcelDialog:'Xem trước dữ liệu Excel',TestSpecsPage:'Thư viện test case',IssuesPage:'Danh sách lỗi',WorkBoardPage:'Danh sách công việc'};
for(const file of files.filter(f=>f.endsWith('.jsx')&&!f.endsWith('.test.jsx'))){
 const source=fs.readFileSync(file,'utf8'),ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});const edits=[];
 function visit(node){if(!node||typeof node!=='object')return;
  if(node.type==='JSXElement'&&node.openingElement.name.name==='div'){
   const open=node.openingElement,attr=open.attributes.find(a=>a.name?.name==='className'),value=attr?.value?.value;
   const containsTable=node.children.some(n=>n.type==='JSXElement'&&n.openingElement.name.name==='table');
   if(typeof value==='string'&&containsTable&&/(?:table-scroll|table-wrap|overflow-x-auto)/.test(value)){
    if(!labels[path.basename(file,'.jsx')])throw Error('Missing label '+file);
    const labelled=open.attributes.some(a=>a.name?.name==='aria-label');
    edits.push([open.name.start,open.name.end,'TableScroll'+(labelled?'':` label="${labels[path.basename(file,'.jsx')]}"`)]);
    edits.push([node.closingElement.name.start,node.closingElement.name.end,'TableScroll']);
   }
  }
  for(const [key,value]of Object.entries(node)){if(key==='loc'||key==='tokens'||key==='comments')continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
 }
 visit(ast);
 if(edits.length){let out=source;for(const [start,end,text]of edits.sort((a,b)=>b[0]-a[0]))out=out.slice(0,start)+text+out.slice(end);let relative=path.relative(path.dirname(file),path.join(root,'src/app/components/TableScroll')).replaceAll('\\','/');if(!relative.startsWith('.'))relative='./'+relative;out=`import {TableScroll} from '${relative}';\n`+out;fs.writeFileSync(file,out);console.log(path.relative(root,file)+' '+edits.length/2+' regions');}
}
let fonts=0;
for(const file of files.filter(f=>f.endsWith('.css')&&!f.endsWith('table-scroll.css'))){
 const source=fs.readFileSync(file,'utf8'),css=postcss.parse(source);let changed=false;
 css.walkDecls('font-size',decl=>{
  if(!/^\d+px$/.test(decl.value))return;
  const size=parseInt(decl.value),selector=decl.parent.selector||'';
  let token=size<=11?'caption':size===12?'table':size<=14?'body':size<=17?'section':'title';
  if(/(?:kpis|kpi|rp-rates).*strong|d-summary-number|d-summary-total/.test(selector)||size>=28)token='metric';
  else if(/(?:brand|header strong|app-logo)/.test(selector))token='brand';
  else if(/\bh1\b|\.fw-page h2|\.ex-heading h2|\.rp-page h2/.test(selector))token='title';
  else if(/\bh2\b|\bh3\b/.test(selector)&&size>=14)token='section';
  if(selector.includes('admin-project-dropdown-search input'))return; // Search fields remain 16px to avoid mobile zoom.
  decl.value=`var(--text-${token})`;changed=true;fonts++;
 });
 if(changed)fs.writeFileSync(file,css.toString());
}
console.log('font declarations normalized: '+fonts);
