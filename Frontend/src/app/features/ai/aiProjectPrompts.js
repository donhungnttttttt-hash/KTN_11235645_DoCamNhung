export const MY_PROJECTS_SCOPE='MY_PROJECTS';
export const PROJECT_CHAT_SCOPE='PROJECT_CHAT';
export const projectPrompts=[
 {id:'projects',label:'Dự án tôi tham gia',text:'Tôi đang tham gia những dự án nào? Tóm tắt tên, vai trò và tình trạng từng dự án.'},
 {id:'progress',label:'Tiến độ kiểm thử',text:'Tổng hợp tiến độ kiểm thử trong các dự án của tôi. Nêu rõ số liệu, thời điểm và phần dữ liệu chưa có.'},
 {id:'my-work',label:'Việc và case còn lại',text:'Tôi còn công việc và test case nào cần thực hiện trong các dự án của mình? Phân nhóm theo dự án và nêu giới hạn danh sách.'},
 {id:'bugs',label:'Bug cần xử lý',text:'Những bug hoặc công việc nào đang được giao cho tôi cần ưu tiên xử lý? Dựa vào trạng thái và độ ưu tiên đã ghi, không suy đoán hạn chưa có.'},
];
export const singleProjectPrompts=[
 {id:'projects',label:'Tổng quan dự án',text:'Tóm tắt dự án đang chọn, vai trò của tôi, tình trạng công việc và những thông tin còn thiếu.'},
 {id:'progress',label:'Tiến độ kiểm thử',text:'Tổng hợp tiến độ kiểm thử của dự án đang chọn. Nêu rõ số liệu, đợt kiểm thử, thời điểm và phần dữ liệu chưa có.'},
 {id:'my-work',label:'Việc và case còn lại',text:'Tôi còn công việc và test case nào cần thực hiện trong dự án đang chọn? Nêu trạng thái và giới hạn danh sách.'},
 {id:'bugs',label:'Bug cần xử lý',text:'Trong dự án đang chọn, những bug hoặc công việc nào đang được giao cho tôi cần ưu tiên xử lý? Dựa vào trạng thái và độ ưu tiên đã ghi, không suy đoán hạn chưa có.'},
];
export const memberProjectPrompts=[
 {id:'projects',label:'Dự án tôi tham gia',text:'Tôi đang tham gia những dự án nào? Tóm tắt tên và vai trò của tôi trong từng dự án.'},
 {id:'progress',label:'Tiến độ file của tôi',text:'Cho tôi biết tiến độ những file và phạm vi case tôi được giao trong các dự án được phép. Nêu Status còn lại và dữ liệu chưa có.'},
 {id:'my-work',label:'Việc và case còn lại',text:'Tôi còn công việc và test case nào cần thực hiện trong các dự án của mình? Phân nhóm theo dự án và nêu giới hạn danh sách.'},
 {id:'bugs',label:'Bug cần xử lý',text:'Những Bug/QA nào đang được giao cho tôi cần ưu tiên xử lý? Dựa vào trạng thái và độ ưu tiên đã ghi, không suy đoán hạn chưa có.'},
];
export const memberSingleProjectPrompts=[
 {id:'projects',label:'Phần việc trong dự án',text:'Trong dự án đang chọn, tôi được giao những file, case và issue nào? Nêu phần việc và thông tin còn thiếu trong phạm vi tôi được xem.'},
 {id:'progress',label:'Tiến độ file của tôi',text:'Trong dự án và Feature đang chọn, tiến độ các file và phạm vi case tôi được giao thế nào? Nêu Status còn lại và dữ liệu chưa có.'},
 {id:'my-work',label:'Giải thích case',text:'Giải thích các bước và kết quả mong muốn của case trong phần việc tôi được giao ở dự án và Feature đang chọn. Nếu thiếu mã case, hãy hỏi tôi mã cần xem.'},
 {id:'bugs',label:'Issue được giao',text:'Trong dự án và Feature đang chọn, Bug/QA nào được giao cho tôi và cần làm gì tiếp theo theo dữ liệu hiện có? Nêu thông tin còn thiếu, không suy đoán hạn.'},
];
