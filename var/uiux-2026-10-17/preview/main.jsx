// Browser fixture imports production components/styles. All data below is synthetic.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SelectionTable} from '../../../Frontend/src/app/components/SelectionTable';
import {KpiSummaryBar} from '../../../Frontend/src/app/modules/KpiSummaryBar';
import {Modal} from '../../../Frontend/src/app/features/work-items/components';
import {AdminProjectDetail} from '../../../Frontend/src/app/features/admin/AdminProjectDetail';
import {CoverageEditor} from '../../../Frontend/src/app/features/retest/CoverageEditor';
import {retestApi} from '../../../Frontend/src/app/services/api/retest';
import '../../../Frontend/src/app/styles/global.css';
import '../../../Frontend/src/app/features/work-items/work-items.css';
import '../../../Frontend/src/app/features/work-items/work-items-live.css';
import '../../../Frontend/src/app/features/admin/admin.css';
import '../../../Frontend/src/app/features/reports/reports.css';
import '../../../Frontend/src/app/features/retest/retest.css';
import '../../../Frontend/src/app/features/test-execution/execution.css';
import './preview.css';
const project={id:7,code:'UX-FIXTURE',name:'Dự án kiểm chứng giao diện',description:'Dữ liệu mô phỏng, không kết nối backend.',timezone:'Asia/Ho_Chi_Minh',version:3,archivedAt:null,metrics:{},milestones:[],verificationBugs:[]};
let members=[{userId:'tester-1',displayName:'Tester Alpha',username:'tester.alpha',systemRole:'TESTER',projectRole:'TESTER',version:1},{userId:'tester-2',displayName:'Tester Beta',username:'tester.beta',systemRole:'TESTER',projectRole:'TESTER',version:1}];
const api={project:async()=>project,members:async()=>members,users:async()=>({items:[],totalElements:0}),
 setMember:async(_id,userId,input)=>{members=members.map(m=>m.userId===userId?{...m,projectRole:input.projectRole,version:m.version+1}:m);},
 removeMember:async(_id,userId)=>{members=members.filter(m=>m.userId!==userId);},
 archiveReadiness:async()=>({projectId:7,version:3,archived:false,canArchive:true,canReopen:false,blockers:[]})};
const rows=[
 {id:'a',name:'Tester Alpha',description:'Kiểm thử iPad · TESTER'},
 {id:'b',name:'Tester Beta — phụ trách đối chiếu nội dung và cấu hình kiểm thử trên nhiều thiết bị',description:'Kiểm thử hồi quy · TESTER'},
 {id:'c',name:'Tester Gamma',description:'Đã là thành viên · Không thể chọn lại',disabled:true},
];
let readCalls=0,finishRead,notifyPending=()=>{};
retestApi.candidates=async()=>{
 if(readCalls++===0)throw new Error('Không tải được phạm vi kiểm thử (lỗi mạng mô phỏng).');
 notifyPending(true);
 return new Promise(resolve=>{finishRead=()=>{resolve({items:[{id:71,caseNo:'CASE-071',titleVi:'Giữ phạm vi và lý do khi tải lại',cycleName:'Đợt mô phỏng',environmentName:'QA',deviceName:'iPad',assigneeName:'Tester Alpha'}],page:0,totalPages:1,totalElements:1});notifyPending(false);};});
};
function ReadFixture(){
 const [pending,setPending]=useState(false),[submitted,setSubmitted]=useState(false);notifyPending=setPending;
 return <section className="review-section dashboard-board work-items"><h2>Phạm vi retest · PM mô phỏng</h2><p>Request đọc đầu lỗi; bấm Thử lại rồi Hoàn tất phản hồi mô phỏng để kiểm tra trạng thái chờ.</p><button className="cat-btn" disabled={!pending} onClick={()=>finishRead?.()}>Hoàn tất phản hồi mô phỏng</button><CoverageEditor projectId={7} items={[{runItemId:71}]} busy={false} onSubmit={()=>setSubmitted(true)}/>{submitted&&<p role="status">Đã nhận dữ liệu mô phỏng tại fixture; không gọi API ghi.</p>}</section>;
}
function App(){
 const [selected,setSelected]=useState(['another-page']),[page,setPage]=useState(0),[open,setOpen]=useState(false);
 const surface=new URLSearchParams(location.search).get('surface')||'selection';
 return <main className="review-shell"><header className="review-header"><h1>Kiểm chứng giao diện TMS</h1><p>Component và CSS thật · Dữ liệu mô phỏng · API bị chặn · Không kiểm chứng tích hợp backend.</p><nav aria-label="Màn kiểm chứng"><a href="?surface=selection">Bảng và bộ lọc</a><a href="?surface=members">Thành viên dự án</a></nav></header>
 {surface==='read-state'?<ReadFixture/>:surface==='members'?<div className="admin-shell"><AdminProjectDetail id="7" api={api}/></div>:<>
 <section className="review-section rp-page"><h2>Kết quả kiểm thử · dữ liệu mô phỏng</h2><KpiSummaryBar metrics={{notRun:120,ng:7,pending:5,ok:80,na:3,awaitingVerification:4}}/></section>
 <section className="review-section"><h2>Chọn Tester</h2><SelectionTable label="Tester của dự án" pageScope rows={page? [{id:'another-page',name:'Tester Delta',description:'Lựa chọn được giữ từ trang khác'}]:rows} selected={selected} onChange={setSelected}/><div className="ui-actions"><button type="button" className="cat-btn" disabled={!page} onClick={()=>setPage(0)}>Trang trước</button><span>Trang {page+1}/2</span><button type="button" className="cat-btn" disabled={!!page} onClick={()=>setPage(1)}>Trang sau</button></div></section>
 <section className="review-section dashboard-board work-items"><h2>Điều hướng bàn phím trong modal</h2><button className="cat-btn" onClick={()=>setOpen(true)}>Mở hộp thoại kiểm chứng</button>{open&&<Modal title="Chi tiết kiểm chứng bàn phím" onClose={()=>setOpen(false)}><button className="cat-btn">Thao tác đầu</button><label className="ui-field">Nội dung<input className="cat-input" defaultValue="Bản nháp được giữ"/></label><button className="cat-btn">Hoàn tất</button><details><summary>Lịch sử và chứng cứ</summary><button className="cat-btn">Tải lại lịch sử</button></details><div hidden><button>Không được nhận focus</button></div></Modal>}</section>
 </>}
 </main>;
}
// Reuse the fixture root on Vite HMR; production bootstrap is unchanged.
const previewRoot=import.meta.hot?.data.root || createRoot(document.getElementById('root'));
if(import.meta.hot)import.meta.hot.data.root=previewRoot;
previewRoot.render(<App/>);
