import React from 'react';

export function CatHandbook() {
  return (
    <div className="cat-handbook-box space-y-4">
      <div className="cat-handbook-title flex items-center justify-between">
        <span>Sổ tay hướng dẫn thực thi CAT</span>
        <span className="text-xs text-slate-400 font-normal">Tài liệu hướng dẫn thực thi hệ thống</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="cat-handbook-section">1. Mục đích</div>
          <p className="text-slate-600 leading-relaxed text-xs">
            Tài liệu này nêu rõ các quy trình và quy tắc để tiến hành kiểm thử hệ thống và kiểm thử hồi quy một cách suôn sẻ trong quá trình phát triển hệ thống. Mục tiêu là duy trì chất lượng kiểm thử nhất quán, phát hiện lỗi sớm và đảm bảo quản lý đáng tin cậy.
          </p>
        </div>

        <div>
          <div className="cat-handbook-section">2. Luồng thực thi kiểm thử</div>
          <p className="text-xs text-slate-500 mb-2">Chu trình thực thi cơ bản như sau:</p>
          <div className="space-y-3 pl-2 text-xs">
            <div>
              <span className="font-bold text-slate-800 text-sm block">① Kiểm tra các trường hợp thử nghiệm</span>
              <p className="text-slate-600">Vui lòng kiểm tra tài liệu đặc tả kiểm thử thông qua liên kết trong phiếu thực hiện kiểm thử trong danh sách công việc tồn đọng. Nếu có bất kỳ thắc mắc nào, vui lòng tham khảo ý kiến của trưởng nhóm kiểm thử hoặc người thiết kế kiểm thử trước khi thực hiện.</p>
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm block">② Thực hiện thao tác</span>
              <p className="text-slate-600">Hãy làm theo "quy trình" được nêu trong tài liệu đặc tả thử nghiệm để vận hành hệ thống thực tế.</p>
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm block">③ Xác định kết quả</span>
              <p className="text-slate-600 mb-1.5">Chúng tôi sẽ so sánh màn hình và hoạt động thực tế với "giá trị kỳ vọng".</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li><strong>Chưa chạy:</strong> Trạng thái ban đầu khi chưa có thao tác kiểm thử nào được thực hiện.</li>
                <li><strong>OK (Đạt):</strong> Khi giá trị mong đợi khớp chính xác.</li>
                <li><strong>NG (Thất bại):</strong> Kết quả khác với giá trị mong đợi.</li>
                <li><strong>Đang chờ xử lý:</strong> Điều này cho biết các điều kiện tiên quyết chưa được đáp ứng hoặc việc xác minh không thể thực hiện được do lỗi trong các chức năng khác. <span className="font-semibold text-slate-800">Vui lòng ghi rõ số QA và lý do đang chờ xử lý trong phần ghi chú.</span></li>
                <li><strong>Đã khắc phục:</strong> Sau báo cáo của NG, phiên bản đã được sửa lỗi đã được triển khai và sự cố đã được giải quyết thông qua việc kiểm tra lại. <span className="font-semibold text-slate-800">Vui lòng ghi rõ số QA hoặc số vé trong phần ghi chú.</span></li>
                <li><strong>Không áp dụng (N/A):</strong> Các trường hợp việc triển khai không còn cần thiết do thay đổi thông số kỹ thuật hoặc loại bỏ tính năng.</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <div className="cat-handbook-section">3. Các quy tắc thu thập bằng chứng (thủ tục chứng cứ)</div>
          <p className="text-xs text-slate-600 mb-2">Để chứng minh rằng cuộc thử nghiệm đã được thực hiện, chúng tôi sẽ lưu giữ bằng chứng theo các quy tắc sau:</p>
          <table className="cat-table text-xs">
            <thead>
              <tr>
                <th className="w-1/4">Mục</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold bg-[#FAFAFA]">thời gian</td>
                <td>Dữ liệu được thu thập không chỉ từ màn hình kết quả cuối cùng mà còn từ mỗi điểm đánh giá quan trọng.</td>
              </tr>
              <tr>
                <td className="font-bold bg-[#FAFAFA]">phạm vi</td>
                <td>Ảnh chụp màn hình đầy đủ hiển thị URL trình duyệt, ngày tháng hệ thống và các thao tác đã thực hiện. Hoặc một video.</td>
              </tr>
              <tr>
                <td className="font-bold bg-[#FAFAFA]">tên tệp</td>
                <td><code className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">ケースID_連番_ステータス.png</code> (ví dụ: <code className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">ID1_01_NG.png</code>)</td>
              </tr>
              <tr>
                <td className="font-bold bg-[#FAFAFA]">Lưu điểm đến</td>
                <td>Các trường hợp kiểm thử mục tiêu, các phiếu báo lỗi mục tiêu</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div className="cat-handbook-section">4. Quy trình báo cáo lỗi</div>
          <p className="text-xs text-slate-600 mb-2">Nếu xảy ra lỗi, chúng tôi sẽ báo cáo ngay lập tức như sau:</p>
          <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700">
            <li>Thu thập bằng chứng và đính kèm vào hồ sơ vụ án.</li>
            <li>Hãy báo cáo lỗi bằng cách sử dụng biểu mẫu QA. (Vui lòng chia sẻ cả đường dẫn đến trường hợp này.)
              <br/>
              <a href="https://docs.google.com/document/d/1mXJzjmqm9oooV9_Dt9b2V4ThlfJVxl0fYGY3-JHnD6c/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" className="cat-link font-semibold flex items-center gap-1 mt-0.5">
                [Bộ phận chính S+] Vận hành danh sách QA thực thi
              </a>
            </li>
            <li>Nếu phát hiện lỗi, báo cáo lỗi sẽ được tạo trong Backlog.
              <br/>
              <a href="https://docs.google.com/document/d/1U5L7tSAj71_yTXka9G1op0KqWJmIkP5f3XiI_A5IA4I/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" className="cat-link font-semibold flex items-center gap-1 mt-0.5">
                [S+ Main Unit] Cách tạo phiếu yêu cầu trong Backlog
              </a>
            </li>
            <li>Hãy tạo phiếu yêu cầu theo mẫu và thông báo cho trưởng nhóm kiểm thử qua Slack rằng bạn đã tạo phiếu yêu cầu.</li>
          </ol>
        </div>

        <div>
          <div className="cat-handbook-section">5. Tiêu chí hoàn thành</div>
          <p className="text-xs text-slate-600 mb-2">Quá trình thực thi kiểm thử sẽ được coi là hoàn tất khi đáp ứng các điều kiện sau:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
            <li>Tất cả các trường hợp kiểm thử phải được đánh giá là "OK" hoặc "Đã sửa".</li>
            <li>Tất cả các báo cáo lỗi mà bạn đã gửi phải được giải quyết. (Điều này bao gồm cả những lỗi đã được xác định là không cần khắc phục trong bản phát hành.)</li>
            <li>Tất cả bằng chứng phải được lưu trữ trong hồ sơ vụ việc và phiếu báo lỗi tương ứng.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

