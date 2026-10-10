import React,{useState} from 'react';
import { fileWorkApi } from '../../services/api/fileWork';
import { documentDate } from '../test-cases/documentDownload';
import { useResource, WorkError } from './FileWorkPage';

const steps = [
  ['documents', 'Tài liệu test case', 'Chưa có tài liệu được nhập', 'Nhập và duyệt test case', '/tests'],
  ['approvedCases', 'Case nguồn đã duyệt', 'Chưa có case nguồn đã duyệt', 'Xem thư viện case', '/tests/cases'],
  ['testers', 'Tester hoạt động', 'Liên hệ Admin để thêm Tester vào dự án', 'Xem thành viên', '/settings/members'],
  ['configuredDraftCycles', 'Đợt nháp có cấu hình dùng được', 'Cần đợt nháp, môi trường, thiết bị và build hoạt động', 'Chuẩn bị đợt kiểm thử', '/tests/cycles'],
  ['allocatedDevices', 'Máy đang được cấp', 'Liên hệ Admin để bàn giao máy cho người thực hiện', 'Xem thiết bị dự án', '/settings/members'],
];

export function FilePreparation({project,navigate,reload}) {
  const resource=useResource(options=>fileWorkApi.preparation(project.id,options),[project.id,reload]);
  const [expanded,setExpanded]=useState(null);
  const open=expanded ?? (!!resource.data && resource.data.counts.assignedGroups===0);
  return <section className="fw-panel fw-preparation">
    <h3><button type="button" aria-expanded={open} onClick={()=>setExpanded(!open)}>Chuẩn bị giao việc</button></h3>
    <WorkError error={resource.error}/>
    {resource.loading && <p role="status">Đang kiểm tra điều kiện…</p>}
    {!open && resource.data && <p>{resource.data.counts.documents} tài liệu · {resource.data.counts.assignedGroups} nhóm file đã giao. Mở checklist khi cần giao thêm file.</p>}
    {open && <>
    <p>Kiểm tra dữ liệu của dự án trước khi giao file. Khi giao, hệ thống sẽ kiểm tra lại đúng case, đợt, cấu hình và người nhận đã chọn.</p>
    {resource.data && <><ol>{steps.map(([key,title,missing,action,path])=><li key={key}>
      <div><strong>{title}</strong><p>{resource.data.counts[key]>0?`${resource.data.counts[key]} đã có`:missing}</p></div>
      <button type="button" onClick={()=>navigate(path)}>{action}</button>
    </li>)}</ol><p>Đã giao {resource.data.counts.assignedGroups} nhóm file. Máy phù hợp được kiểm tra riêng khi Tester bắt đầu phiên.</p>
    <small>Cập nhật: {documentDate(resource.data.asOf,project.timezone)}</small></>}
    </>}
  </section>;
}
