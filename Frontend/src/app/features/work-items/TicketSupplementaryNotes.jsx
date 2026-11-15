import React from 'react';
import {ticketClosureLabel} from './ticketWorkflow';

function NoteRow({label,children,wide=false}){
 return <div className={`ticket-note-row${wide?' is-wide':''}`}><dt>{label}</dt><dd>{children}</dd></div>;
}

export function TicketSupplementaryNotes({item,projectId,editing,editField}){
 const featureName=item.featureName?.trim()||`Đợt kiểm thử #${item.featureId}`;
 return <section className="ticket-supplementary-notes ticket-content-section" aria-label="Ghi chú bổ sung">
  <h4>Ghi chú bổ sung</h4>
  {item.featureId&&<section aria-label="Thông tin Đợt kiểm thử hiện tại">
   <dl className="ticket-notes-fields">
    <NoteRow label="Tên Đợt kiểm thử"><a aria-label={`Mở Đợt kiểm thử ${featureName}`} href={`#/board/testing/features/${item.featureId}?projectId=${projectId}`}>{featureName}</a></NoteRow>
    <NoteRow label="Môi trường / server">{item.featureEnvironment?.trim()||'Chưa ghi môi trường / server'}</NoteRow>
    <NoteRow label="Mô tả Đợt kiểm thử" wide>{item.featureDescription?.trim()||'Chưa có mô tả Đợt kiểm thử'}</NoteRow>
   </dl>
  </section>}
  <section aria-label="Nguồn lúc phát hiện">
   <dl className="ticket-notes-fields">
    <NoteRow label="Version lúc phát hiện"><span className="ticket-note-value">{item.testVersionName||'Chưa ghi version lúc phát hiện'}</span></NoteRow>
    <NoteRow label="Ngày thực hiện">{item.executedOn||'Chưa ghi'}</NoteRow>
    <NoteRow label="Đối tượng test">{item.testObject||'Chưa ghi'}</NoteRow>
    <NoteRow label="Case tham chiếu">{item.monkey?'Monkey độc lập':item.featureId&&item.documentId&&item.rowId?<a aria-label={`Mở case ${item.caseReference||item.caseNo||`#${item.rowId}`}`} href={`#/board/testing/features/${item.featureId}/documents/${item.documentId}?projectId=${projectId}&caseId=${item.rowId}`}>{item.caseReference||item.caseNo||`#${item.rowId}`}</a>:item.caseReference||'Chưa ghi'}</NoteRow>
    {!item.monkey&&item.featureId&&item.documentId&&<NoteRow label="File test case" wide><a aria-label={`Mở file ${item.fileName||`#${item.documentId}`}`} href={`#/board/testing/features/${item.featureId}/documents/${item.documentId}?projectId=${projectId}`}>{item.fileName||`#${item.documentId}`}</a></NoteRow>}
   </dl>
  </section>
  <dl className="ticket-notes-fields">
   {[['frequency','Tần suất tái hiện'],['environment','Môi trường phát hiện'],['device','Thiết bị phát hiện']].map(([key,label])=><NoteRow key={key} label={label} wide={key==='device'}>{editing?editField(key,label):item[key]||'Chưa ghi'}</NoteRow>)}
  </dl>
  {item.legacyWorkflow&&<p role="status">Ticket lịch sử cần đối chiếu. Không suy diễn lý do đóng hay bằng chứng Đã sửa.</p>}
  {item.awaitingVerification&&<p className="ticket-awaiting">Đang chờ tester xác nhận · Chưa hoàn tất</p>}
  {item.finalized&&!item.legacyWorkflow&&<p>Đã hoàn tất · {ticketClosureLabel(item.closureReason)}</p>}
  {item.convertedFromQa&&<p className="wi-note">Chuyển từ QA. Bằng chứng Bug còn thiếu được giữ nguyên để bổ sung dần.</p>}
 </section>;
}
