# Thuật ngữ nghiệp vụ

Nguồn quyết định: FixReports và bản làm rõ ngày 19/10/2026. Thuật ngữ dưới đây không bổ sung workflow.

| Thuật ngữ | Nghĩa trong hệ thống | Không đồng nhất với |
| --- | --- | --- |
| Dự án | Phạm vi thành viên, dữ liệu và quyền quản lý | Phạm vi đọc nền của AI đối với PM/ADMIN |
| Feature | Một đợt kiểm thử, có tên, môi trường/server tự do và mô tả ngắn; lưu trữ và khôi phục được | Cycle/configuration/build/run của luồng cũ |
| File kiểm thử | Một bản workbook cùng nội dung case hiện hành thuộc duy nhất một Feature | Checksum của workbook hoặc file ở Feature khác |
| Case | Đơn vị nội dung và Status độc lập trong file | Số dòng hiển thị hoặc tên case trùng nhau |
| Phân công | Trách nhiệm hiện tại trên dải case của một Tester | Người thực sự ghi kết quả |
| Actor | Tài khoản thực sự thực hiện thao tác, được ghi lịch sử | Người được phân công khi hai người khác nhau |
| Người test đầu tiên | Người nhận trách nhiệm đầu tiên trên case | Tác giả dữ liệu Excel cũ |
| Người test lại gần nhất | Người được chuyển trách nhiệm gần nhất sau người đầu tiên | Một run mới hoặc cột người thứ ba |
| Status | Unexecuted, OK, NG, P, NA; nguồn tiến độ hiện hành của case | Trạng thái xử lý Issue hoặc nghiệm thu khách hàng |
| Đã test | Case có Status khác Unexecuted; P và NA đều tính, NA vẫn trong mẫu số | Chỉ OK/NG hoặc đã được khách hàng nghiệm thu |
| Issue | Bug hoặc QA thuộc Feature; có thể liên kết đúng file/case | Công việc TASK/REQUEST/IMPROVEMENT cũ |
| Bug monkey | Bug thuộc Feature, không bắt buộc có case, tiêu đề tự do | Một loại Issue hoặc workflow mới |
| Báo cáo đã lưu | Văn bản Markdown quản lý do PM/ADMIN tạo, chỉnh sửa và lưu riêng | Nguồn dữ liệu nghiệp vụ, nháp AI hoặc hội thoại có TTL |
| Note | Ghi chú dự án: PM/ADMIN quản lý, thành viên đọc | CMS hoặc tài liệu đính kèm |

Phân công thay đổi không reset Status; sửa văn bản báo cáo không thay đổi case/Issue. File giống nhau tại hai Feature có identity và dữ liệu mutable riêng.
