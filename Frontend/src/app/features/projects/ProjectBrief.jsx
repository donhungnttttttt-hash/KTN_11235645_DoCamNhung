import React from 'react';
import {TableScroll} from '../../components/TableScroll';

export function ProjectBrief({project,headingLevel=2}) {
 const Heading=headingLevel===3?'h3':'h2',Subheading=headingLevel===3?'h4':'h3';
 const sample=project.code==='T11-15';
 const areas=sample?['Đăng nhập đồng thời','Chỉnh sửa ghi chú bảng đen','Danh sách bảng đen','Tạo bảng đen']:[];
 return <article className="project-information project-brief">
  <section><Heading>I. Giới thiệu</Heading>
   <Subheading>1. Bối cảnh</Subheading><p className="project-information-description">{project.description?.trim()||'Dự án chưa có mô tả.'}</p>
   <Subheading>2. Nội dung công việc</Subheading><p>{sample?'Kiểm thử hệ thống ứng dụng Flutter trên tablet, tập trung vào đăng nhập và nhóm chức năng bảng đen. Nội dung case lấy từ bốn workbook đã cung cấp.':'Tổ chức test case theo Đợt kiểm thử, phân công người thực hiện, ghi kết quả theo môi trường và version, theo dõi sai lệch bằng Bug/QA.'}</p>
   <ul><li>Chuẩn bị dữ liệu, thiết bị và môi trường kiểm thử trước khi thực hiện.</li><li>Ghi nhận kết quả từng case; bổ sung bước tái hiện, thực tế và kỳ vọng cho Ticket.</li><li>Kiểm thử lại sau xử lý, đối chiếu lịch sử và tổng hợp báo cáo theo mốc phát hành.</li></ul>
   <Subheading>3. Thông tin về khách hàng</Subheading><p>{sample?'Bộ dữ liệu minh họa nghiệp vụ Spider Plus; test case là tài liệu đầu vào của đợt kiểm thử. Các kết quả, Ticket và kế hoạch trong dự án là dữ liệu mẫu.':'Khách hàng theo dõi tiến độ, chất lượng và báo cáo được công bố trong phạm vi dự án đã chia sẻ.'}</p><p>Đầu mối liên hệ và phạm vi nghiệm thu: chờ quản lý dự án xác nhận.</p>
  </section>
  <section><Heading>II. Tài liệu input</Heading><p>Đối chiếu tài liệu nguồn trước khi thực hiện; thông tin liên kết và ngày nhận chỉ ghi khi đã được xác nhận.</p>
   <TableScroll label="Tài liệu đầu vào dự án"><table><thead><tr>{['STT','Chức năng','Tên tài liệu','Link KH cung cấp','Link nội bộ','Ngày nhận'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{areas.length?areas.map((area,index)=><tr key={area}><td>{index+1}</td><th scope="row">{area}</th><td>Test case Excel · Pack tiêu chuẩn</td><td>File được cung cấp trực tiếp</td><td><a href={`#/board/testing?projectId=${project.id}`}>Xem trong Đợt kiểm thử</a></td><td>Chưa ghi nhận</td></tr>):<tr><td colSpan={6}>Tài liệu kiểm thử được quản lý tại <a href={`#/board/testing?projectId=${project.id}`}>danh sách Đợt kiểm thử</a>. Chưa có danh mục bàn giao được xác nhận.</td></tr>}</tbody></table></TableScroll>
  </section>
  <section><Heading>III. Tài liệu output</Heading><ul><li>Workbook kết quả: nội dung case, Status, môi trường, version và người test.</li><li>Danh sách Bug/QA kèm nguồn phát hiện, bằng chứng và lịch sử xử lý.</li><li>Báo cáo tiến độ, chất lượng, rủi ro và các nội dung còn cần xác nhận.</li><li>Báo cáo tổng kết đợt kiểm thử để quản lý dự án rà soát trước khi công bố.</li></ul></section>
  <section><Heading>IV. Tiêu chí hoàn thành (Exit Criteria)</Heading><p className="project-brief-pending">Chưa xác nhận nghiệm thu · Các tiêu chí dưới đây là checklist đề xuất để quản lý dự án đối chiếu.</p>
   <Subheading>1. Status test case</Subheading><ul><li>Các case trong phạm vi được ghi kết quả; NA có căn cứ loại trừ.</li><li>Case Pending và case chưa thực hiện được giải quyết hoặc được chấp thuận ngoại lệ.</li></ul>
   <Subheading>2. QA & Bug</Subheading><ul><li>QA được trả lời, kết thúc hoặc chuyển thành Bug khi xác nhận là lỗi.</li><li>Bug có đủ bước tái hiện và bằng chứng; lỗi đã xử lý được kiểm thử lại.</li><li>Phân biệt Đã xử lý chờ xác nhận với Đã sửa đã được xác nhận; rủi ro còn mở được nêu rõ.</li></ul>
   <Subheading>3. Tài liệu output</Subheading><ul><li>Kết quả và báo cáo cuối đợt được quản lý dự án rà soát.</li><li>Khách hàng xác nhận chấp nhận kết quả và các ngoại lệ theo phạm vi đã thống nhất.</li></ul>
  </section>
 </article>;
}
