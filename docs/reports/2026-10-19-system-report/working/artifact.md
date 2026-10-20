# Hợp đồng biên soạn tài liệu

Người dùng xác nhận dùng Bản gốc.docx làm mẫu cấu trúc cho TMS và sẽ bổ sung thông tin bìa. Được viết lại nội dung khác miền nghiệp vụ. Không sao chép tên tác giả, giảng viên hoặc doanh nghiệp từ mẫu.

Nguồn giữ nguyên: C:/Users/admin/Downloads/Bản gốc.docx; SHA256 61049eb3c19e2a1c0c811ffa620f690e6536f7879f06ff5b4ade780a19af7637. Gói bị cắt; đọc được 54 entry CRC đúng, document.xml gồm 2484 paragraph/40 bảng/76 drawing/1 textbox, 0 ins/del/comment/footnote/endnote reference trong XML chính. Không có central directory/content-types/theme và thiếu 35 ảnh được reference. Không biết chắc thành phần chưa được reference hoặc xuất hiện sau phần bị cắt. Số trang trong mục lục gốc là cache chưa xác minh render.

Mẫu có bìa, mục lục, danh mục bảng/hình/từ viết tắt, lời nói đầu, ba chương, kết luận và tài liệu tham khảo. Các chương giữ vai trò: bối cảnh/mục tiêu; phương pháp/công cụ; phân tích-thiết kế-hiện thực-kiểm chứng. Sửa trùng số 3.2.1. Thêm phụ lục truy vết và US/AC, không xóa mục gốc mà không mapping.

Page geometry đọc được: A4 portrait 11907×16840 twip, năm section; margins mẫu khác nhau (trái 2268/1701, phải1134/1418, trên/dưới1418). Bản viết mới thống nhất A4, trái3cm/phải2.5cm/trên2.5cm/dưới2.5cm để dùng cho nội dung TMS đã viết lại; không tuyên bố fidelity pixel với file hỏng. Body Times New Roman13, line spacing1.15; headings đen theo styles, bảng10.5–11 với cột có chủ đích, header lặp và không cố định chiều cao. Diagram inline, SVG nguồn và PNG raster density240; caption có số và giải thích sát hình.

Bìa có tiêu đề trung lập của báo cáo TMS; các dòng tác giả/giảng viên/đơn vị để trống có nhãn, không dùng dấu chấm thông tin giả. Mục lục điều hướng có liên kết nội bộ và không bịa số trang chưa render. Danh mục bảng/hình liên kết caption. Footer PAGE field; updateFields bật. Nội dung phải phân biệt source, yêu cầu, evidence lịch sử và thiếu kiểm chứng.

Runtime dùng tuyệt đối C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe và dependencies/node/bin/node.exe, package ở dependencies/node/node_modules. Không có loader tool trong phiên; xác minh runtime.json của gói26.1017.11052 và interpreter thực tế. Không dùng system interpreter cho authoring.

Renderer skill đã thử với PATH giới hạn runtime override, lỗi FileNotFoundError LibreOffice soffice.exe. Manifest có libreOfficeVersion=null và native chỉ git/jxrlib/libheif/poppler/powershell. Skill cấm dùng desktop LibreOffice; không cài toolchain. DOCX có thể được tạo và kiểm tra OOXML, nhưng kiểm tra từng trang và fidelity phải giữ NOT_VERIFIED đến khi có renderer được phép. Không thay file hỏng bằng mẫu khác không có nguồn.
