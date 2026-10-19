import React from 'react';
import {TableScroll} from '../../components/TableScroll';
import './project-information.css';

// Approved content: docs/content/spider-plus-project-overview.md.
// This code is an explicit project identity binding, never a fuzzy name match.
export function ProjectInformation({project,headingLevel=2}) {
  const Heading=headingLevel===3?'h3':'h2';
  if(project.code!=='SPIDER-PLUS')return <div className="project-information"><Heading>Giới thiệu</Heading><p className="project-information-description">{project.description?.trim()?project.description:'Dự án chưa có mô tả.'}</p></div>;
  return <article className="project-information">
    <section><Heading>Giới thiệu</Heading><p>Spider Plus hỗ trợ kiểm tra và quản lý các hạng mục tại công trường xây dựng, từ bản vẽ, shiteki đến điện, cốt thép và độ rọi. Dự án kiểm thử tập trung vào ứng dụng Flutter sau đợt cải tiến giao diện và chức năng, nhằm đánh giá khả năng đáp ứng các nghiệp vụ sử dụng thực tế.</p></section>
    <section><Heading>Mục tiêu và phạm vi</Heading><p>Thực hiện System Test dựa trên bộ test case do SHIFT cung cấp. Phạm vi chính gồm ứng dụng trên iPad, iPhone, máy tính bảng Android và điện thoại Android; phần Web PC chủ yếu được giữ nguyên.</p><p>Mỗi Feature đại diện cho một đợt kiểm thử. Các file test case, phân công, kết quả và Bug/QA được theo dõi trong đúng Feature để thuận tiện kiểm tra tiến độ và đối chiếu kết quả.</p></section>
    <section><Heading>Các bên tham gia</Heading><ul><li><strong>Spider Plus:</strong> khách hàng và đơn vị sở hữu sản phẩm.</li><li><strong>SHIFT:</strong> cung cấp test case, điều phối tiến độ và giải đáp các câu hỏi nghiệp vụ.</li><li><strong>SYP:</strong> thực hiện kiểm thử, ghi nhận kết quả và trao đổi các vấn đề phát sinh.</li></ul></section>
    <section><Heading>Tài liệu làm việc</Heading><p>Sử dụng tài liệu khách hàng cung cấp và bản nội bộ tương ứng để tra cứu trong quá trình kiểm thử.</p>
      <TableScroll label="Tài liệu làm việc Spider Plus" className="project-information-documents"><table><thead><tr><th scope="col">Nhóm tài liệu</th><th scope="col">Nguồn khách hàng</th><th scope="col">Bản nội bộ</th></tr></thead><tbody>
        <tr><th scope="row">Test case Pack tiêu chuẩn</th><td><a href="https://drive.google.com/drive/u/3/folders/1SRWqL-34eZN-VnN6Cut3SeGXA0X4jFvt" target="_blank" rel="noopener noreferrer" aria-label="Google Drive · Pack tiêu chuẩn">Google Drive</a></td><td><a href="https://sypvn.sharepoint.com/:f:/s/SPPClassic/IgBcqSybLePRQpWl8mU7SgBwASj_t7I5LLM8uLkEBTNfBFs?e=OgyDKh" target="_blank" rel="noopener noreferrer" aria-label="SharePoint · Pack tiêu chuẩn">SharePoint</a></td></tr>
        <tr><th scope="row">Test case Pack điện</th><td><a href="https://drive.google.com/drive/u/3/folders/15E_T5W8pQEhaU-sDj7Gv6nzcoGuhMkCl" target="_blank" rel="noopener noreferrer" aria-label="Google Drive · Pack điện">Google Drive</a></td><td><a href="https://sypvn.sharepoint.com/:f:/s/SPPClassic/IgAt7vjUXeFjQ79IB5ZbjjfBAcS1XQ-I8GsBzcHqOVtpivs?e=jDBhU4" target="_blank" rel="noopener noreferrer" aria-label="SharePoint · Pack điện">SharePoint</a></td></tr>
      </tbody></table></TableScroll>
    </section>
    <section><Heading>Kết quả và bàn giao</Heading><p>Kết quả được ghi nhận theo từng test case; lỗi và câu hỏi cần làm rõ được theo dõi bằng Bug/QA. Lỗi cần có mô tả, ngữ cảnh và chứng cứ phù hợp để các bên có thể kiểm tra, xử lý và đối chiếu khi kiểm thử lại.</p><p>Khi bàn giao, kết quả được cập nhật lên CAT theo quy trình của SHIFT. Báo cáo dự án tổng hợp tình hình kiểm thử và các vấn đề còn tồn tại; việc xác nhận nghiệm thu thực hiện theo quy trình đã thống nhất với các bên liên quan.</p></section>
  </article>;
}
