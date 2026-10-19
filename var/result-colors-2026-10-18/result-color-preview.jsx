import React from 'react';
import {createRoot} from 'react-dom/client';
import './src/app/styles/global.css';
import './src/app/features/admin/admin.css';
import './src/app/features/test-execution/execution.css';
import './src/app/features/test-cases/test-documents.css';
import './src/app/features/file-work/file-work.css';
import './src/app/features/reports/reports.css';
import './src/app/features/retest/retest.css';
import {Result} from './src/app/features/test-execution/components';
import {ResultCycleButton} from './src/app/features/test-cases/ResultCycleButton';
const h=React.createElement;
const states=[['OK','ok','ok','OK','#0dd44c'],['NG','ng','ng','NG','#b60202'],['P','pending','pending','P','#f8f835'],['Chưa chạy','not-run','unexec','NOT_RUN','#161c25'],['NA','na','na','NA','#7a7a7c']];
const mark=(element,state,kind)=>h('div',{'data-kind':kind,'data-state':state[1],className:'sample'},element);
function row(label,kind,render,wrapper='') {
 return h('section',{className:wrapper,key:kind},h('div',{className:'palette-row'},h('h2',null,label),...states.map((state,index)=>h(React.Fragment,{key:state[1]},mark(render(state,index),state,kind)))));
}
const rows=[
 row('Biểu đồ Admin','admin',s=>h('div',{className:'admin-result-chart'},h('div',{className:'admin-bar-track'},h('span',{className:'result-'+({ok:'ok',ng:'ng',pending:'pending','not-run':'notRun',na:'na'}[s[1]]),'data-swatch':true,style:{width:'100%'}})))),
 row('KPI báo cáo','reports',s=>h('div',{className:'cat-kpi-block cat-kpi-block-'+s[2],'data-swatch':true},s[0]),'rp-page'),
 row('Huy hiệu đợt','execution',s=>h(Result,{value:s[3]})),
 row('Công việc theo file','file',s=>h('button',{type:'button',className:'fw-result fw-result-'+s[3],'data-swatch':true},s[0]),'fw-page'),
 row('Ô kết quả tài liệu','document',s=>h(ResultCycleButton,{value:s[3],sourceId:s[0],onChange:()=>{}})),
 row('Ô tài liệu bị khóa','disabled-document',s=>h(ResultCycleButton,{value:s[3],sourceId:s[0],onChange:()=>{},disabled:true})),
 row('Số lượng thư viện','library',s=>h('span',{className:'td-count td-count-'+({ok:'ok',ng:'ng',pending:'p','not-run':'unexecuted',na:'na'}[s[1]]),'data-swatch':true},'12')),
 row('Nhãn dùng chung','status',s=>h('span',{className:'cat-status-'+s[2],'data-swatch':true},s[0])),
 h('section',{key:'retest'},h('div',{className:'palette-row'},h('h2',null,'Xác minh BUG'),mark(h('span',{className:'rt-verdict PASS','data-swatch':true},'Đạt'),states[0],'retest'),mark(h('span',{className:'rt-verdict FAIL','data-swatch':true},'Không đạt'),states[1],'retest'))),
];
createRoot(document.getElementById('root')).render(h('main',{className:'palette-preview'},h('h1',null,'Bộ màu kết quả kiểm thử'),h('p',null,'Mẫu kiểm tra CSS và component thật · Không ghi dữ liệu nghiệp vụ'),h('div',{className:'palette-row palette-head'},h('strong',null,'Vị trí hiển thị'),...states.map(s=>h('div',{key:s[1]},h('strong',null,s[0]),h('code',null,s[4])))),...rows));
