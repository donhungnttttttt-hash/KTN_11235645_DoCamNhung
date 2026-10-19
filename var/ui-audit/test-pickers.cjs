const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8');}
const root='Frontend/src/app/features/';
let p=root+'test-execution/ScopeSetup.jsx',s=read(p);
s=s.replace("import {TableScroll} from '../../components/TableScroll';","import {SelectionTable} from '../../components/SelectionTable';");
let a=s.indexOf('      <TableScroll label="Phạm vi test case"'),b=s.indexOf('</TableScroll>',a)+14;
s=s.slice(0,a)+`      <SelectionTable label="Phạm vi test case" pageScope loading={!cases} selected={Object.keys(selected).map(Number)}
        rows={(cases?.items||[]).map(c=>({id:c.currentRevisionId||('case-'+c.id),name:c.caseNo+' · '+c.titleVi,selectLabel:'Chọn '+c.caseNo,description:c.approved?'Đã duyệt':'Chờ PM duyệt',disabled:!c.approved||!c.currentRevisionId}))}
        onChange={ids=>setSelected(Object.fromEntries(ids.map(id=>[id,true])))} empty="Chưa có test case. Tạo hoặc nhập tại Thư viện test case."/>`+s.slice(b);fs.writeFileSync(p,s);
p=root+'file-work/FileWorkPage.jsx';s=read(p);s="import {SelectionTable} from '../../components/SelectionTable';\n"+s;
a=s.indexOf('    {document.data && <div className="fw-revisions">');b=s.indexOf('\n    <p>Đã chọn',a);
s=s.slice(0,a)+`    {document.data && <SelectionTable key={docId} label="Phiên bản test case" selected={revisions}
      rows={document.data.rows.map(r=>({id:r.revisionId||('row-'+r.rowId),name:r.caseNo,selectLabel:'Chọn '+r.caseNo+' revision '+r.revisionId,description:'Revision #'+r.revisionId+' · '+(r.archived?'Đã lưu trữ':r.approved?'Đã duyệt':'Chưa duyệt · không được chọn'),disabled:!r.approved||r.archived||!r.revisionId}))}
      onChange={ids=>{setRevisions(ids);invalidate();}}/>}`+s.slice(b);fs.writeFileSync(p,s);
p=root+'retest/CoverageEditor.jsx';s=read(p);s="import {SelectionTable} from '../../components/SelectionTable';\n"+s;
a=s.indexOf('<div className="rt-candidates">');b=s.indexOf('</div>',a)+6;
s=s.slice(0,a)+`<SelectionTable label="Case cho phạm vi" searchable={false} pageScope loading={!data} selected={selected} onChange={setSelected}
      rows={(data?.items||[]).map(item=>({id:item.id,name:item.caseNo+' · '+item.titleVi,description:[item.cycleName,item.environmentName,item.deviceName,item.assigneeName].filter(Boolean).join(' · ')}))}/>`+s.slice(b);fs.writeFileSync(p,s);
// Read-only coverage keeps its richer table; selectable coverage shares the picker.
p=root+'retest/shared.jsx';s=read(p);s="import {SelectionTable} from '../../components/SelectionTable';\n"+s;
s=s.replace('export function CoverageTable({ items, selected, onSelect }) {',`export function CoverageTable({ items, selected, onSelect }) {
  if(onSelect) return <SelectionTable label="Lượt kiểm thử cần xác minh" selected={selected} rows={items.map(item=>({id:item.id,name:item.caseNo+' · '+item.titleVi,selectLabel:'Chọn '+item.caseNo+' '+item.environmentName+' '+item.deviceName,description:[item.environmentName,item.deviceName,item.assigneeName,verdictLabels[item.verdict]||'Chưa xác minh'].filter(Boolean).join(' · ')}))} onChange={next=>{for(const item of items)if(next.includes(item.id)!==selected.includes(item.id))onSelect(item.id);}}/>;`);
fs.writeFileSync(p,s);
