import React,{useEffect,useState} from 'react';
import {useProject} from '../projects/ProjectProvider';
import {fileWorkApi} from '../../services/api/fileWork';
import {documentDate} from '../test-cases/documentDownload';
import {Field,Pager,WorkError,fileStateLabels} from './FileWorkPage';
import {useRefreshingResource} from '../../hooks/useRefreshingResource';

const kinds={FILE:'File kiểm thử',QA:'Câu hỏi QA',BUG:'Bug đang mở',RETEST:'Kiểm thử lại'};
function nextAction(item) {
 if(item.kind==='FILE')return fileStateLabels[item.status] || item.status;
 if(item.kind==='RETEST')return 'Cần kiểm thử lại';
 if(item.kind==='QA')return ({open:'Cần tiếp nhận câu hỏi',progress:'Dev đang xác minh',clarify:'Cần bổ sung thông tin',resolved:'Cần xác nhận câu trả lời',recheck:'PM cần xem xét kết thúc'})[item.status] || item.status;
 return 'Xem tiến độ xử lý bug';
}
function responsibility(item) {
 if(item.kind==='QA' && item.status==='recheck')return `PM dự án cần xem xét · Dev được giao: ${item.ownerName || 'Chưa có'}`;
 return item.ownerName || 'Chưa có người phụ trách';
}
export function ActionInbox({navigate}) {
 const {currentProject}=useProject() || {};
 if(!currentProject)return <div className="fw-page"><h2>Việc cần xử lý</h2><p>Chọn dự án để xem công việc.</p></div>;
 return <Inbox key={currentProject.id} project={currentProject} navigate={navigate}/>;
}
function Inbox({project,navigate}) {
 const [page,setPage]=useState(0),[kind,setKind]=useState(''),[reload,refresh]=useState(0);
 const data=useRefreshingResource(options=>fileWorkApi.inbox(project.id,{page,size:20,kind},options),JSON.stringify([project.id,page,kind]),reload);
 useEffect(()=>{
   if(!data.loading && data.data && page>0 && page>=data.data.totalPages)setPage(Math.max(0,data.data.totalPages-1));
 },[data.data,data.loading,page]);
 useEffect(()=>{
   const tick=()=>{if(document.visibilityState==='visible')refresh(n=>n+1);};
   const interval=setInterval(tick,60000);document.addEventListener('visibilitychange',tick);
   return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',tick);};
 },[]);
 return <div className="fw-page fw-inbox"><header className="fw-heading"><div><h2>Việc cần xử lý · {project.name}</h2><p>{data.data?.projectWide?'Công việc đang chờ trong dự án để PM theo dõi và điều phối.':'File, câu hỏi và yêu cầu cần xử lý theo vai trò của bạn.'}</p></div><button onClick={()=>refresh(n=>n+1)}>Cập nhật danh sách</button></header>
  <p>Danh sách cập nhật mỗi phút khi mở màn hình. Mở xem một mục không tự hoàn thành công việc đó.</p>
  <Field label="Loại việc cần xử lý"><select value={kind} onChange={e=>{setKind(e.target.value);setPage(0);}}><option value="">Tất cả</option>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
  <WorkError error={data.error} focusOnError={!data.data} retry={()=>refresh(n=>n+1)}/>{data.error && data.data && <p>Đang hiển thị lần cập nhật gần nhất. Thử lại để lấy thông tin mới.</p>}{data.loading && <p role="status">Đang cập nhật công việc…</p>}
   {data.data && <><p>Cập nhật lúc: {documentDate(data.data.asOf,project.timezone)}</p><ul className="fw-inbox-list" aria-busy={data.loading}>{data.data.items.map(item=><li key={`${item.kind}-${item.id}`}><div><span className="fw-inbox-kind">{kinds[item.kind]}</span><h3><button className="fw-link" onClick={()=>navigate(item.kind==='FILE'?`/tests/file-work/${item.id}`:`/board/issue/${item.targetId || item.id}?view=list`)}>{item.title}</button></h3><p>{nextAction(item)}</p><small>{responsibility(item)} · {documentDate(item.updatedAt,project.timezone)}</small></div></li>)}</ul>
  {!data.data.items.length && <p>{data.data.archived?'Dự án đã lưu trữ. Bạn vẫn có thể xem lịch sử ở các màn nghiệp vụ.':kind?'Không có công việc thuộc loại này đang chờ xử lý.':'Không có công việc đang chờ trong phạm vi của bạn.'}</p>}<Pager data={data.data} onChange={setPage}/></>}
 </div>;
}
