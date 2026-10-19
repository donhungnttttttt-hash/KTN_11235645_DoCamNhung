Adnin tổng : 

1\. màn tổng quan : thừa hiển thị tài khoản theo vai trò-> cut bớt 1 cái 

2\. màn dự án : bỏ danh sách dưới check box "chọn tất cả trên trang(2)" => sửa thành chỉ hiện danh sách thành viên chưa bàn giao 

3\. phần tìm kiếm trong tất cả : sửa bộ lọc tìm kiếm phải sửa theo các từ 

4\. màn dự án>> tạo dự án >> máy bàn giao ban đầu >> người nhận chung : sửa thành chỉ bàn giao cho 1 PM , sau đó PM dẽ tự giao cho các member => đề xuất bỏ xem thành viên nào đang dùng máy nào 

5\. thanh memu tổng của admin tổng nen fix cứng, không trượt lên trên gây mất hình 

6: màn nhật ký quản trị : bỏ loại sự kiện đổi thành tìm kiếm theo từ và múi giờ ngày lọc phải bỏ 

Chung : 

**I.màn Tổng quan** >> bỏ tab "việc cần xử lý " + cong việc tạo gần đây và thay bằng "**thông tin dự án " => nhung soạn nhé** 



**II. Màn bảng công việc** : Tab bảng kaban đổi sang tên tiếng việt cho hợp 

\- Bảng kaban giữ nguyên (trong bản kaban có phần chọn kaban và danh sách, thì cáci đấy vẫn phải giữ lại nhé, còn tab danh sách bên ngoài thì bỏ)

\- Danh sách thì đổi thành "**Quản lý kiểm thử** " ( trong quant lý kiểm thử thì có 2 dạng xem : hoặc là xem danh sách feature, bấm vào từng feature thì hiện ra các file test case tương ứng của feature đó/ hoặc là xem tiến độ của nhiều feature cùng lúc.) 

Mô tả màn quản lý kiểm thử như sau : 

Trong quản lý kiểm thử ta sẽ có danh sách các feature và có chức năng thêm feature  :  

\- Feature : là các đợt test : VD như Test tiêu chuẩn tháng 8, test tiêu chuẩn tháng 9... 

&#x09;- Trong Feature thì sẽ có thể them các file test case như thể là các chức năng ở phần Thư viện test case (có thể hiểu là feature là thằng cha -> bấm vào từng feature nó hiện ra từng case sẽ tương ứng như thư viện test case thôi, nhưng lúc này các file đó sẽ được định danh là của feature đó,)

=> hướng là đổi màn "bảng công việc >> danh sách " thành màn "Bảng công việc >> feature": màn này chứa danh sách các feature < bấm vào mỗi feature sẽ hiện ra chỗ để add các file test case(mỗi test case sẽ là nội dung test của một cụm chức năng khác nhau ) 





Flow : 

vào quản lý kiểm thử >> thêm feature ( feature này VD như : Test regression app Flutter tháng 1, Test ST cụm tiêu chuẩn ) =>  tạo feature sẽ có chỗ nhập ten feature + nhập môi trường test( sever test của đợt này )  + mô tả ngắn gọn 



&#x09;	- Vào trong mỗi feature : sẽ có danh sách file test case của đợt kiểm thử này , chỗ để nhập test case (import file test sẽ ở đây , thì mỗi khi có một đợt kiểm thử thì Pm sẽ tạo feature mới , sau đó sẽ import file excel để test ) 

&#x09;	- bấm vào 1 file test case trong danh sách file test case của feature thì hiển thị ra màn chi tiết test case như hiện tại đang xây dựng nhưng cột Ipad đổi tên thành status, button "lịch sử /chứng cứ " ở cột này sẽ đổi thành button "issue" => bấm vào đây thì sẽ nhảy ra màn tạo cộng việc mới , sau khi tạo xong công việc và bấm "Lưu" thì sẽ trở lại màn chi tiết test case và ở đúng case mình vừa theem công việc thì button issue sẽ hiển thị thêm số issue tương ứng với case đấy ở góc trên bên phải của button( hiển thị số nhỏ bên trong hình tròn) . Khi di chuột vào cái số nhỏ nhỏ này hiển thị ở button thì sẽ hiện ra màn preview để xem danh sách các issue đã thêm , bấm vào issue trong danh scash này thì sẽ ra màn hình thông tin chi tiết của issue đó 

&#x09;	- ở màn feature này thì đang có danh sách file test case, nó sẽ có cột tên file test case, cột người phụ trách( PM có thể chọn tên tester để phân công và test tester cũng có thể tự chọn mình vào file , cột tiến độ(hiển thị số case đã test/ tổng case của file theo biểu đồ cột ngang. Cũng như 1 số cột cần thiết, nếu bạn thấy là cần thiết để thêm vào) 


**III. màn quản lý kiểm thử** :bỏ ở menu,  đổi thành tab của mục II. (trực tiếp bỏ phần đợt kiểm thử và kiểm thử lại và công việc theo file đi, còn cái thư viện test case thì bên trên tôi đã nói qua là nó sẽ được xử lý như nào rồi )


**IV. Tab quản lý lỗi** : hiển thị danh sách tất cả các lỗi và có thể lọc theo feature, theo tên .... + có thể CRUD lỗi monkey test theo feature (hiểu là nó có thể tìm theo tất cả feature của dự án đó, không thì có thể chọn riêng 1 feature riêng ra để kiểm tra)



**V. tab Quản lý tiến độ** => bỏ và đổi thành 1 chức năng bên trong tab **Tổng hợp và phân tích**

(Hiểu là bỏ tab này ở ngoài menu đi, mà thay vào đó nó sẽ là 1 chức năng nhỏ trong màn tổng hợp và phân tích, đã xác định ở bên dưới )

**VI. Màn tổng hợp và phân tích** : chỉnh sửa thành các dashboard hiển thị báo cáo về sức khỏe của dự án và có chỗ để tạo form quản lý tiến độ (Cụ thể là vẫn giữ như vậy, nhưng sẽ cần sửa UI đề đẹp hơn, và ở cuối thì có thể dùng AI để bảo nó tự tạo 1 file MD báo cáo về toàn bộ dự án đó để nó biết, AI sẽ là chọn dự án, chọn feature, nếu không chọn feature thì sẽ coi là muốn báo cáo dựa trên toàn bộ thông tin của dự án đó luôn, bấn tạo là sẽ tạo ra 1 file md có toàn bộ nội dung luôn, muốn coi sẽ có 2 dạng, 1 là preview nội dung, nếu có 1 chỗ số lỗi thì có thể bấm nút sửa, để sửa nội dung đó, hoặc là trực tiếp tải về) ( tester và DEV không có quyền xem màn này )

**VII. Tab trợ lý AI** => bỏ ở menu và chỉ giữ chatbot AI hiện tại (có thể hiểu là bỏ tab đó đi, còn cái chat AI thì vẫn phải giữ, hãy làm rõ nếu bạn không hiểu)

**VIII. Tab cài đặt dự án :=> đổi tên thành "Thông tin chung"** : các tab con giữ nguyên, riêng phần danh mục thì bỏ và đổi thành Note và trong này hiển thị danh sách các note chung của dự án 



Chú ý là 
AI cũng có thể thực hiện đề xuất người test cho các file testcase ở các feature như chúng ta đã nói ở trên AI có thể biết dự án có các user nào để biết, AI sẽ có thể dựa trên các thông tin như, User đã từng test file trên, User đã từng thực hiện test nhiều lần, có kinh nghiệm (xem thử đã từng test ở feature nào khác không), nếu hoàn toàn là mới nhập dự án thì đánh giá file test case có nhiều hay không, hay là có khó hay không, thì ưu tiên mấy file như thế cho người có kinh nghiệm, còn nếu là hoàn toàn mới

Thì bạn cứ chia sao để hợp lý đủ người là được, cũng phải nói rõ là chia như trên là tham khảo, rồi PM sẽ tự phân công ở cột phụ trách hoặc tester tự vào nhận file 

AI cũng có thể hỗ trợ giải thích các test case cho dễ hiểu hơn, hoặc trực tiếp dùng AI để tra cứu xem ai là người test trước nếu như trên file test case không viết


AI phải dựa trên data toàn bộ của tất các hệ thống để có đánh giá khách quan nhất, còn nếu AI chọn riêng dự án, chọn riêng feature thì ý là vẫn có data tổng để áp dụng riêng vào dự án đó để đưa ra được các cái đề xuất phù hợp hơn khi người dùng hỏi AI



























































