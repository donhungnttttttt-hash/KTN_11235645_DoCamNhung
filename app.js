// SPA Router & Renderer for CATEST (SHIFT Inc Enterprise QA System)

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  navigate(window.location.hash ? window.location.hash.substring(1) : '/dashboard');
});

function navigate(route) {
  window.CatStore.activeRoute = route;
  window.location.hash = route;

  // Highlight Active Top Navigation Link
  document.querySelectorAll('nav button').forEach(btn => {
    btn.classList.remove('text-[#20B7A6]', 'border-[#20B7A6]', 'font-bold');
    btn.classList.add('text-slate-600', 'border-transparent');
  });

  let activeNavId = 'nav-dashboard';
  if (route.startsWith('/tests')) activeNavId = 'nav-tests';
  else if (route.startsWith('/issues')) activeNavId = 'nav-issues';
  else if (route.startsWith('/progress')) activeNavId = 'nav-progress';
  else if (route.startsWith('/analysis')) activeNavId = 'nav-analysis';

  const activeNav = document.getElementById(activeNavId);
  if (activeNav) {
    activeNav.classList.add('text-[#20B7A6]', 'border-[#20B7A6]', 'font-bold');
    activeNav.classList.remove('text-slate-600', 'border-transparent');
  }

  const viewport = document.getElementById('main-viewport');
  viewport.scrollTop = 0;

  // Toggle Global Footer for Fullscreen Runner vs Standard Views
  const globalFooter = document.querySelector('footer');
  if (route.startsWith('/tests/')) {
    if (globalFooter) globalFooter.classList.add('hidden');
    viewport.classList.remove('py-3');
    viewport.classList.add('py-0');
  } else {
    if (globalFooter) globalFooter.classList.remove('hidden');
    viewport.classList.add('py-3');
    viewport.classList.remove('py-0');
  }

  // Render Target View
  if (route.startsWith('/tests/')) {
    const specId = route.replace('/tests/', '');
    renderTestSpecDetailView(viewport, specId);
  } else {
    switch (route) {
      case '/dashboard':
        renderDashboardView(viewport);
        setTimeout(() => window.CatCharts.initProgressLineChart('chartDashProgress'), 50);
        break;
      case '/tests':
        renderTestSpecsView(viewport);
        break;
      case '/issues':
        renderIssuesView(viewport);
        break;
      case '/progress':
        renderProgressSummaryView(viewport);
        setTimeout(() => window.CatCharts.initProgressLineChart('chartProgressMain'), 50);
        break;
      case '/progress/detail':
        renderProgressDetailView(viewport);
        break;
      case '/progress/test-issues':
        renderTestIssuesView(viewport);
        break;
      case '/analysis':
        renderAnalysisView(viewport);
        setTimeout(() => window.CatCharts.initAnalysisChart('chartAnalysisMain'), 50);
        break;
      default:
        renderDashboardView(viewport);
        setTimeout(() => window.CatCharts.initProgressLineChart('chartDashProgress'), 50);
    }
  }

  lucide.createIcons();
}

/* ================================================== */
/* SCREEN 01: DASHBOARD (/dashboard - Trang 1-7 PDF & Sample 3) */
/* ================================================== */
function renderDashboardView(container) {
  const p = window.CatStore.project;
  const team = window.CatStore.teamMembers;

  container.innerHTML = `
    <div class="cat-container flex gap-4 items-start">
      
      <!-- ================================================== -->
      <!-- LEFT PANE / SIDEBAR (w-56 flex-shrink-0) -->
      <!-- Matches Image 3 Left Sidebar exactly -->
      <!-- ================================================== -->
      <div class="w-56 flex-shrink-0 space-y-3">
        
        <!-- Block 1: Biểu đồ tóm tắt (Donut Progress) -->
        <div class="border border-slate-200 bg-white p-3 rounded-xs text-center space-y-2">
          <div class="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1 text-left">Biểu đồ tóm tắt</div>
          
          <div class="flex items-center justify-around pt-1">
            <!-- Circle 1: Executed Progress -->
            <div class="flex flex-col items-center">
              <div class="relative w-14 h-14 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-200" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="text-[#20B7A6]" stroke-dasharray="100, 100" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="absolute text-xs font-bold text-slate-800">100%</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Thực hiện</span>
            </div>

            <!-- Circle 2: Plan Progress -->
            <div class="flex flex-col items-center">
              <div class="relative w-14 h-14 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-200" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="text-[#0070F3]" stroke-dasharray="100, 100" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="absolute text-xs font-bold text-slate-800">100%</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Kế hoạch</span>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 text-center">Đã tiêu hóa 136/136 trường hợp</div>
        </div>

        <!-- Block 2: Quy trình hiện tại (Phase Info) -->
        <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-1.5 text-[11px]">
          <div class="font-bold text-slate-700 border-b border-slate-200 pb-1">Quy trình hiện tại</div>
          <div class="text-slate-700 font-semibold leading-snug">${p.phase}</div>
          <div class="text-slate-500 text-[10px] pt-1">Phiên bản: <span class="text-slate-700">-</span></div>
          <div class="text-slate-500 text-[10px]">Ngày bắt đầu: <span class="text-slate-700">${p.startDate}</span></div>
          <div class="text-slate-500 text-[10px]">Ngày kết thúc: <span class="text-slate-700">${p.endDate}</span></div>
          <div class="text-slate-500 text-[10px]">Số ngày đã trôi qua: <span class="text-slate-800 font-bold">${p.daysElapsed} ngày</span></div>
        </div>

        <!-- Block 3: Thông tin đội nhóm (Team Members List) -->
        <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2 text-[11px]">
          <div class="font-bold text-slate-700 border-b border-slate-200 pb-1">Thông tin đội nhóm</div>
          <div class="max-h-64 overflow-y-auto space-y-2 pr-1">
            ${team.map(m => `
              <div class="flex items-center gap-2 text-slate-700">
                <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">${m.name.charAt(0)}</div>
                <span class="text-[11px] font-medium">${m.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- ================================================== -->
      <!-- RIGHT PANE / MAIN CONTENT AREA (flex-1) -->
      <!-- Matches Image 3 Right Content with Tabs -->
      <!-- ================================================== -->
      <div class="flex-1 space-y-4">
        
        <!-- Tab Bar Sub-navigation: [Tổng hợp] | [Thủ công] -->
        <div class="border-b border-slate-200 flex items-center justify-between pb-1">
          <div class="flex gap-2">
            <button id="dash-tab-summary-btn" onclick="switchDashboardTab('summary')" class="px-3 py-1 text-xs font-bold text-[#20B7A6] border-b-2 border-[#20B7A6] transition">
              Tổng hợp
            </button>
            <button id="dash-tab-manual-btn" onclick="switchDashboardTab('manual')" class="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition">
              Thủ công
            </button>
          </div>
        </div>

        <!-- TAB CONTENT 1: TỔNG HỢP & THỦ CÔNG (Directly Visible Handbook + Summary Metrics, Tables & Chart) -->
        <div id="dash-tab-summary" class="space-y-4">
          
          <!-- ================================================== -->
          <!-- 1. SỔ TAY HƯỚNG DẪN THỰC THI CAT (PLACED BEFORE GIÁ TRỊ TỔNG HỢP) -->
          <!-- ================================================== -->
          <div class="cat-handbook-box space-y-4">
            <div class="cat-handbook-title flex items-center justify-between">
              <span>Sổ tay hướng dẫn thực thi CAT</span>
              <span class="text-xs text-slate-400 font-normal">Tài liệu hướng dẫn thực thi hệ thống</span>
            </div>
            
            <div class="space-y-4">
              <div>
                <div class="cat-handbook-section">1. Mục đích</div>
                <p class="text-slate-600 leading-relaxed text-xs">Tài liệu này nêu rõ các quy trình và quy tắc để tiến hành kiểm thử hệ thống và kiểm thử hồi quy một cách suôn sẻ trong quá trình phát triển hệ thống. Mục tiêu là duy trì chất lượng kiểm thử nhất quán, phát hiện lỗi sớm và đảm bảo quản lý đáng tin cậy.</p>
              </div>

              <div>
                <div class="cat-handbook-section">2. Luồng thực thi kiểm thử</div>
                <p class="text-xs text-slate-500 mb-2">Chu trình thực thi cơ bản như sau:</p>
                <div class="space-y-3 pl-2 text-xs">
                  <div>
                    <span class="font-bold text-slate-800 text-sm block">① Kiểm tra các trường hợp thử nghiệm</span>
                    <p class="text-slate-600">Vui lòng kiểm tra tài liệu đặc tả kiểm thử thông qua liên kết trong phiếu thực hiện kiểm thử trong danh sách công việc tồn đọng. Nếu có bất kỳ thắc mắc nào, vui lòng tham khảo ý kiến của trưởng nhóm kiểm thử hoặc người thiết kế kiểm thử trước khi thực hiện.</p>
                  </div>
                  <div>
                    <span class="font-bold text-slate-800 text-sm block">② Thực hiện thao tác</span>
                    <p class="text-slate-600">Hãy làm theo "quy trình" được nêu trong tài liệu đặc tả thử nghiệm để vận hành hệ thống thực tế.</p>
                  </div>
                  <div>
                    <span class="font-bold text-slate-800 text-sm block">③ Xác định kết quả</span>
                    <p class="text-slate-600 mb-1.5">Chúng tôi sẽ so sánh màn hình và hoạt động thực tế với "giá trị kỳ vọng".</p>
                    <ul class="list-disc pl-5 space-y-1 text-slate-700">
                      <li><strong>Chưa chạy:</strong> Trạng thái ban đầu khi chưa có thao tác kiểm thử nào được thực hiện.</li>
                      <li><strong>OK (Đạt):</strong> Khi giá trị mong đợi khớp chính xác.</li>
                      <li><strong>NG (Thất bại):</strong> Kết quả khác với giá trị mong đợi.</li>
                      <li><strong>Đang chờ xử lý:</strong> Điều này cho biết các điều kiện tiên quyết chưa được đáp ứng hoặc việc xác minh không thể thực hiện được do lỗi trong các chức năng khác. <span class="font-semibold text-slate-800">Vui lòng ghi rõ số QA và lý do đang chờ xử lý trong phần ghi chú.</span></li>
                      <li><strong>Đã khắc phục:</strong> Sau báo cáo của NG, phiên bản đã được sửa lỗi đã được triển khai và sự cố đã được giải quyết thông qua việc kiểm tra lại. <span class="font-semibold text-slate-800">Vui lòng ghi rõ số QA hoặc số vé trong phần ghi chú.</span></li>
                      <li><strong>Không áp dụng (N/A):</strong> Các trường hợp việc triển khai không còn cần thiết do thay đổi thông số kỹ thuật hoặc loại bỏ tính năng.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <div class="cat-handbook-section">3. Các quy tắc thu thập bằng chứng (thủ tục chứng cứ)</div>
                <p class="text-xs text-slate-600 mb-2">Để chứng minh rằng cuộc thử nghiệm đã được thực hiện, chúng tôi sẽ lưu giữ bằng chứng theo các quy tắc sau:</p>
                <table class="cat-table text-xs">
                  <thead>
                    <tr>
                      <th class="w-1/4">Mục</th>
                      <th>Nội dung</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-bold bg-[#FAFAFA]">thời gian</td>
                      <td>Dữ liệu được thu thập không chỉ từ màn hình kết quả cuối cùng mà còn từ mỗi điểm đánh giá quan trọng.</td>
                    </tr>
                    <tr>
                      <td class="font-bold bg-[#FAFAFA]">phạm vi</td>
                      <td>Ảnh chụp màn hình đầy đủ hiển thị URL trình duyệt, ngày tháng hệ thống và các thao tác đã thực hiện. Hoặc một video.</td>
                    </tr>
                    <tr>
                      <td class="font-bold bg-[#FAFAFA]">tên tệp</td>
                      <td><code class="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">ケースID_連番_ステータス.png</code> (ví dụ: <code class="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">ID1_01_NG.png</code>)</td>
                    </tr>
                    <tr>
                      <td class="font-bold bg-[#FAFAFA]">Lưu điểm đến</td>
                      <td>Các trường hợp kiểm thử mục tiêu, các phiếu báo lỗi mục tiêu</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div class="cat-handbook-section">4. Quy trình báo cáo lỗi</div>
                <p class="text-xs text-slate-600 mb-2">Nếu xảy ra lỗi, chúng tôi sẽ báo cáo ngay lập tức như sau:</p>
                <ol class="list-decimal pl-5 space-y-2 text-xs text-slate-700">
                  <li>Thu thập bằng chứng và đính kèm vào hồ sơ vụ án.</li>
                  <li>Hãy báo cáo lỗi bằng cách sử dụng biểu mẫu QA. (Vui lòng chia sẻ cả đường dẫn đến trường hợp này.)
                    <br><a href="https://docs.google.com/document/d/1mXJzjmqm9oooV9_Dt9b2V4ThlfJVxl0fYGY3-JHnD6c/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" class="cat-link font-semibold flex items-center gap-1 mt-0.5">
                      <i data-lucide="external-link" class="w-3 h-3"></i> [Bộ phận chính S+] Vận hành danh sách QA thực thi
                    </a>
                  </li>
                  <li>Nếu phát hiện lỗi, báo cáo lỗi sẽ được tạo trong Backlog.
                    <br><a href="https://docs.google.com/document/d/1U5L7tSAj71_yTXka9G1op0KqWJmIkP5f3XiI_A5IA4I/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" class="cat-link font-semibold flex items-center gap-1 mt-0.5">
                      <i data-lucide="external-link" class="w-3 h-3"></i> [S+ Main Unit] Cách tạo phiếu yêu cầu trong Backlog
                    </a>
                  </li>
                  <li>Hãy tạo phiếu yêu cầu theo mẫu và thông báo cho trưởng nhóm kiểm thử qua Slack rằng bạn đã tạo phiếu yêu cầu.</li>
                </ol>
              </div>

              <div>
                <div class="cat-handbook-section">5. Tiêu chí hoàn thành</div>
                <p class="text-xs text-slate-600 mb-2">Quá trình thực thi kiểm thử sẽ được coi là hoàn tất khi đáp ứng các điều kiện sau:</p>
                <ul class="list-disc pl-5 space-y-1 text-xs text-slate-700">
                  <li>Tất cả các trường hợp kiểm thử phải được đánh giá là "OK" hoặc "Đã sửa".</li>
                  <li>Tất cả các báo cáo lỗi mà bạn đã gửi phải được giải quyết. (Điều này bao gồm cả những lỗi đã được xác định là không cần khắc phục trong bản phát hành.)</li>
                  <li>Tất cả bằng chứng phải được lưu trữ trong hồ sơ vụ việc và phiếu báo lỗi tương ứng.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- ================================================== -->
          <!-- 2. GIÁ TRỊ TỔNG HỢP (SUMMARY METRICS 6 COLORED BLOCKS) -->
          <!-- ================================================== -->
          <div class="space-y-1 pt-2">
            <div class="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Giá trị tổng hợp (Summary Metrics)</span>
              <span class="text-[10px] text-slate-500 font-normal">Dự án: Flutter • Giai đoạn: Chuẩn_iPad Merge Regression</span>
            </div>
            <div class="cat-kpi-bar">
              <div class="cat-kpi-block cat-kpi-block-unexec">
                <span class="text-[11px] font-medium">Chưa được thực thi</span>
                <span class="text-xl font-extrabold mt-0.5">0 <span class="text-xs font-normal">trường hợp</span></span>
              </div>
              <div class="cat-kpi-block cat-kpi-block-ng">
                <span class="text-[11px] font-medium">NG</span>
                <span class="text-xl font-extrabold mt-0.5">1 <span class="text-xs font-normal">trường hợp</span></span>
              </div>
              <div class="cat-kpi-block cat-kpi-block-pending">
                <span class="text-[11px] font-medium">đang chờ</span>
                <span class="text-xl font-extrabold mt-0.5">0 <span class="text-xs font-normal">trường hợp</span></span>
              </div>
              <div class="cat-kpi-block cat-kpi-block-fixed">
                <span class="text-[11px] font-medium">Đã sửa</span>
                <span class="text-xl font-extrabold mt-0.5">1 <span class="text-xs font-normal">trường hợp</span></span>
              </div>
              <div class="cat-kpi-block cat-kpi-block-ok">
                <span class="text-[11px] font-medium">ĐƯỢC RỒI (OK)</span>
                <span class="text-xl font-extrabold mt-0.5">134 <span class="text-xs font-normal">trường hợp</span></span>
              </div>
              <div class="cat-kpi-block cat-kpi-block-na">
                <span class="text-[11px] font-medium">Không áp dụng</span>
                <span class="text-xl font-extrabold mt-0.5">0 <span class="text-xs font-normal">trường hợp</span></span>
              </div>
            </div>
          </div>

          <!-- Tóm tắt tiến độ kiểm tra tổng thể & Lịch trình Table -->
          <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2">
            <div class="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1">Tóm tắt tiến độ kiểm tra tổng thể & Lịch trình</div>
            <div class="overflow-x-auto">
              <table class="cat-table text-[11px]">
                <thead>
                  <tr class="bg-slate-50 text-slate-700 font-bold">
                    <th class="w-1/4">Tiến Độ Kiểm Tra Tổng Thể</th>
                    <th class="w-1/4">Tiến Độ Lịch Trình Kiểm Tra</th>
                    <th class="w-1/6 text-center">Cho đến ngày / Vào ngày hôm đó</th>
                    <th class="w-1/6">Phân Công / Trở ngại</th>
                    <th class="w-1/6 text-center">Bài tập kiểm tra</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-medium">Tổng số ca bệnh: <span class="font-bold text-slate-900 float-right">${p.totalCases}</span></td>
                    <td class="font-medium">lịch trình: <span class="font-bold text-slate-900 float-right">0 (0%)</span></td>
                    <td class="text-center font-semibold text-slate-600">0 (0%)</td>
                    <td class="font-medium">trọn: <span class="font-bold text-slate-900 float-right">7</span></td>
                    <td class="text-center font-bold text-slate-800">0</td>
                  </tr>
                  <tr>
                    <td class="font-medium">Đã tiêu hóa: <span class="font-bold text-[#20B7A6] float-right">${p.executedCases}</span></td>
                    <td class="font-medium">Đã tiêu hóa: <span class="font-bold text-[#20B7A6] float-right">${p.executedCases}</span></td>
                    <td class="text-center font-bold text-emerald-600">0</td>
                    <td class="font-medium">Hoàn thành: <span class="font-bold text-purple-600 float-right">6</span></td>
                    <td class="text-center font-bold text-slate-800">0</td>
                  </tr>
                  <tr>
                    <td class="font-medium">chưa tiêu (còn lại): <span class="font-bold text-slate-700 float-right">${p.unexecutedCases}</span></td>
                    <td class="font-medium">Chênh lệch giữa ngân sách và thực tế: <span class="font-bold text-emerald-600 float-right">↑ 136</span></td>
                    <td class="text-center font-bold text-emerald-600">0</td>
                    <td class="font-medium">Số ca bệnh (còn lại): <span class="font-bold text-red-600 float-right">1</span></td>
                    <td class="text-center font-bold text-slate-800">0</td>
                  </tr>
                  <tr>
                    <td class="font-medium">Tốc độ tiến độ: <span class="font-bold text-[#20B7A6] float-right">${p.progressPercent}%</span></td>
                    <td class="font-medium">Tỷ lệ hoàn thành kế hoạch: <span class="font-bold text-slate-700 float-right">0%</span></td>
                    <td class="text-center text-slate-500">0%</td>
                    <td class="font-medium">Tỷ lệ hỏng: <span class="font-bold text-red-600 float-right">${p.defectRate}</span></td>
                    <td class="text-center text-slate-500">-</td>
                  </tr>
                  <tr>
                    <td class="font-medium">Chưa đăng ký: <span class="font-bold text-slate-700 float-right">0</span></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>


          <!-- Progress Line Chart -->
          <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-3">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <div class="font-bold text-slate-700 text-xs">Biểu đồ tiến độ</div>
              <div class="flex items-center gap-2 text-[11px]">
                <span class="text-slate-500">Test Specification:</span>
                <select class="cat-select text-[10px]">
                  <option>-- Chọn tất cả --</option>
                  <option>Chuẩn_iPad Merge Regression Test</option>
                </select>
              </div>
            </div>
            
            <div class="h-56 w-full">
              <canvas id="chartDashProgress"></canvas>
            </div>
          </div>

          <!-- Tóm tắt tiến độ theo Sheet Table -->
          <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <div class="font-bold text-slate-700 text-xs">Tóm tắt tiến độ theo Sheet</div>
              <button onclick="downloadCsvMock('Tóm tắt tiến độ theo Sheet')" class="cat-btn cat-btn-outline-mint">
                <i data-lucide="download" class="w-3 h-3"></i> Tải CSV
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="cat-table text-[11px]">
                <thead>
                  <tr>
                    <th>Tên Sheet / Hierarchy</th>
                    <th>Tổng Sheet</th>
                    <th>Đã thực hiện</th>
                    <th>Chưa thực hiện</th>
                    <th>Tỷ lệ</th>
                    <th>Tổng Case</th>
                    <th>Đã làm</th>
                    <th>Còn lại</th>
                    <th>OK</th>
                    <th>Đã sửa</th>
                    <th>NG</th>
                    <th>Tạm hoãn</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="font-bold bg-[#FAFAFA]">
                    <td><span class="cat-link">▼ Tổng cộng</span></td>
                    <td>14</td>
                    <td>14</td>
                    <td>0</td>
                    <td>100%</td>
                    <td>136</td>
                    <td>136</td>
                    <td>0</td>
                    <td class="cat-status-ok">134</td>
                    <td class="cat-status-fixed">1</td>
                    <td class="cat-status-ng">1</td>
                    <td>0</td>
                  </tr>
                  <tr>
                    <td class="pl-4"><span class="cat-link">▶ Giai đoạn: Chuẩn_iPad Merge Regression</span></td>
                    <td>14</td>
                    <td>14</td>
                    <td>0</td>
                    <td>100%</td>
                    <td>136</td>
                    <td>136</td>
                    <td>0</td>
                    <td class="cat-status-ok">134</td>
                    <td class="cat-status-fixed">1</td>
                    <td class="cat-status-ng">1</td>
                    <td>0</td>
                  </tr>
                  <tr>
                    <td class="pl-8"><span class="cat-link">▶ (Tablet)(Standard) Spec User Template</span></td>
                    <td>1</td>
                    <td>1</td>
                    <td>0</td>
                    <td>100%</td>
                    <td>8</td>
                    <td>8</td>
                    <td>0</td>
                    <td class="cat-status-ok">8</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                  </tr>
                  <tr>
                    <td class="pl-8"><span class="cat-link">▶ (Tablet)(Standard) Spec File Upload PDF</span></td>
                    <td>1</td>
                    <td>1</td>
                    <td>0</td>
                    <td>100%</td>
                    <td>6</td>
                    <td>6</td>
                    <td>0</td>
                    <td class="cat-status-ok">5</td>
                    <td class="cat-status-fixed">1</td>
                    <td>0</td>
                    <td>0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

            
            <div id="manual-content" class="space-y-3 pt-2 text-slate-600 leading-relaxed">
              <div>
                <span class="font-bold text-slate-800 block">1. Mục đích:</span>
                <p>Hướng dẫn chuẩn hóa quy trình kiểm thử phần mềm ứng dụng S+ Flutter trên môi trường iPad OS.</p>
              </div>

              <div>
                <span class="font-bold text-slate-800 block">2. Quy trình kiểm thử:</span>
                <p>① Kiểm tra Test Case → ② Thực hiện thao tác trên thiết bị → ③ Đánh giá kết quả (OK / NG / Đã sửa / Tạm hoãn).</p>
              </div>

              <div>
                <span class="font-bold text-slate-800 block">3. Tiêu chí hoàn thành (Exit Criteria):</span>
                <p>100% Test Case đã được thực thi, 0 lỗi Critical/Major ở trạng thái Chưa xử lý.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}

/* ================================================== */
/* SCREEN 02: DANH SÁCH TEST SPECIFICATION (/tests) */
/* ================================================== */
function renderTestSpecsView(container) {
  const specs = window.CatStore.testSpecs;

  container.innerHTML = `
    <div class="cat-container space-y-3">
      
      <!-- Top Title & Toolbar Bar -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h2 class="text-sm font-bold text-slate-900">Danh sách Test Specification (${specs.length})</h2>
        
        <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button onclick="alert('Đăng ký Test Spec mới')" class="cat-btn cat-btn-mint">Đăng ký</button>
          <button class="cat-btn">Thuộc tính</button>
          <button class="cat-btn">Cài đặt Sheet</button>
          <button onclick="downloadCsvMock('Test Specifications')" class="cat-btn">Tải xuống</button>
          
          <input type="text" placeholder="Từ khóa tìm kiếm..." class="cat-input w-40">
          
          <button class="cat-btn">Cài đặt hiển thị</button>
        </div>
      </div>

      <!-- Test Specifications Table (20 Rows) -->
      <div class="overflow-x-auto border border-slate-200 bg-white">
        <table class="cat-table">
          <thead>
            <tr>
              <th class="w-10 text-center">No.</th>
              <th>Test Specification</th>
              <th class="text-center">Số Case</th>
              <th class="text-center">Tiến độ</th>
              <th class="text-center">Chưa làm</th>
              <th class="text-center">OK</th>
              <th class="text-center">Đã sửa</th>
              <th class="text-center">NG</th>
              <th class="text-center">Tạm hoãn</th>
              <th>Ngày cập nhật</th>
              <th>Người cập nhật</th>
              <th class="text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${specs.map(s => `
              <tr>
                <td class="text-center text-slate-500 font-mono">${s.no}</td>
                <td>
                  <span onclick="navigate('/tests/${s.no}')" class="cat-link font-medium flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="file-text" class="w-3.5 h-3.5 text-[#20B7A6]"></i>
                    <span>${s.name}</span>
                  </span>
                </td>
                <td class="text-center font-bold">${s.caseCount}</td>
                <td class="text-center font-bold text-[#20B7A6]">100%</td>
                <td class="text-center text-slate-400">${s.unexecuted}</td>
                <td class="text-center cat-status-ok">${s.ok}</td>
                <td class="text-center cat-status-fixed">${s.fixed}</td>
                <td class="text-center cat-status-ng">${s.ng}</td>
                <td class="text-center text-slate-400">${s.pending}</td>
                <td class="text-slate-500 text-[10px]">${s.updatedAt}</td>
                <td class="text-slate-600">${s.updatedBy}</td>
                <td class="text-center">
                  <span class="text-[10px] text-emerald-700 font-semibold">${s.status}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Table Footer & Pagination -->
      <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <div>Hiển thị 1–20 / 24 tập tin Specification</div>
        <div class="flex items-center gap-2">
          <button class="cat-btn">Trang trước</button>
          <span>Trang 1 / 2</span>
          <button class="cat-btn">Trang sau</button>
        </div>
      </div>

    </div>
  `;
}

/* ================================================== */
/* SCREEN 03: QUẢN LÝ LỖI (/issues - Trang 9 PDF) */
/* ================================================== */
function renderIssuesView(container) {
  const issues = window.CatStore.issues;

  container.innerHTML = `
    <div class="cat-container flex gap-4 items-start">
      
      <!-- LEFT FILTER SIDEBAR (200px) -->
      <div class="w-48 flex-shrink-0 border border-slate-200 bg-white p-3 rounded-xs space-y-3 text-[11px]">
        <div class="font-bold text-slate-700 border-b border-slate-200 pb-1">Tóm tắt bộ lọc</div>
        
        <div class="space-y-1">
          <span class="font-bold text-slate-600 block text-[10px] uppercase">Bộ lọc hệ thống</span>
          <div class="flex justify-between items-center p-1.5 bg-[#EBF8F6] text-[#20B7A6] font-bold rounded cursor-pointer">
            <span>Lỗi đang mở</span>
            <span class="cat-status-ng">1</span>
          </div>
          <div class="flex justify-between items-center p-1.5 text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
            <span>Tất cả lỗi</span>
            <span class="font-bold">7</span>
          </div>
        </div>
      </div>

      <!-- RIGHT ISSUES TABLE -->
      <div class="flex-1 space-y-3">
        
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 class="text-sm font-bold text-slate-900">Danh sách lỗi (${issues.length})</h2>
          
          <div class="flex items-center gap-2">
            <input type="text" placeholder="Tìm kiếm tiêu đề / bình luận..." class="cat-input w-52">
            <button onclick="downloadCsvMock('Issues')" class="cat-btn">Tải xuống</button>
          </div>
        </div>

        <div class="overflow-x-auto border border-slate-200 bg-white">
          <table class="cat-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Giai đoạn</th>
                <th>Loại</th>
                <th>Tiêu đề</th>
                <th>Người phụ trách</th>
                <th>Mức độ</th>
                <th>Thời gian cập nhật</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${issues.map(i => `
                <tr>
                  <td class="font-mono font-bold"><span class="cat-link">${i.id}</span></td>
                  <td class="text-slate-500 text-[10px]">${i.phase}</td>
                  <td>${i.type}</td>
                  <td class="font-medium text-slate-900 max-w-xs truncate">${i.title}</td>
                  <td>${i.assignee}</td>
                  <td>
                    <span class="${i.severity === 'Nghiêm trọng' ? 'text-red-600 font-bold' : 'text-slate-700'}">${i.severity}</span>
                  </td>
                  <td class="text-slate-500 text-[10px]">${i.updatedAt}</td>
                  <td>
                    <span class="${i.status === 'Chưa xử lý' ? 'cat-status-ng' : 'cat-status-ok'}">${i.status}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `;
}

/* ================================================== */
/* SCREEN 04: QUẢN LÝ TIẾN ĐỘ (/progress - Trang 10-11) */
/* ================================================== */
function renderProgressSummaryView(container) {
  const p = window.CatStore.project;

  container.innerHTML = `
    <div class="cat-container space-y-4">
      
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <h2 class="text-sm font-bold text-slate-900">Biểu đồ & Bảng tiến độ</h2>
        <div class="flex items-center gap-2">
          <button class="cat-btn">Cài đặt hiển thị</button>
          <button onclick="downloadCsvMock('Progress Summary')" class="cat-btn cat-btn-mint">Tải CSV</button>
        </div>
      </div>

      <!-- Main Chart Area -->
      <div class="border border-slate-200 bg-white p-3 rounded-xs">
        <div class="h-60 w-full">
          <canvas id="chartProgressMain"></canvas>
        </div>
      </div>

      <!-- Progress Table Spreadsheet Style -->
      <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2">
        <div class="font-bold text-slate-700 text-xs border-b border-slate-200 pb-1">Bảng tiến độ chi tiết (Spreadsheet View)</div>
        
        <div class="overflow-x-auto">
          <table class="cat-table text-center text-[11px]">
            <thead>
              <tr>
                <th class="text-left">Hạng mục chỉ số</th>
                <th>07/08</th>
                <th>08/08</th>
                <th>09/08</th>
                <th>10/08 (Deadline)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-left font-bold bg-[#FAFAFA]">Kế hoạch tích lũy</td>
                <td>34</td>
                <td>68</td>
                <td>102</td>
                <td class="font-bold text-[#20B7A6]">136</td>
              </tr>
              <tr>
                <td class="text-left font-bold bg-[#FAFAFA]">Thực tế thực hiện</td>
                <td>38</td>
                <td>76</td>
                <td>114</td>
                <td class="font-bold text-[#20B7A6]">136</td>
              </tr>
              <tr>
                <td class="text-left font-bold bg-[#FAFAFA]">OK</td>
                <td class="cat-status-ok">37</td>
                <td class="cat-status-ok">75</td>
                <td class="cat-status-ok">112</td>
                <td class="cat-status-ok font-bold">134</td>
              </tr>
              <tr>
                <td class="text-left font-bold bg-[#FAFAFA]">NG</td>
                <td class="cat-status-ng">1</td>
                <td class="cat-status-ng">1</td>
                <td class="cat-status-ng">1</td>
                <td class="cat-status-ng font-bold">1</td>
              </tr>
              <tr>
                <td class="text-left font-bold bg-[#FAFAFA]">Đã sửa</td>
                <td class="cat-status-fixed">0</td>
                <td class="cat-status-fixed">0</td>
                <td class="cat-status-fixed">1</td>
                <td class="cat-status-fixed font-bold">1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

/* ================================================== */
/* SCREEN 05: CHI TIẾT TIẾN ĐỘ (/progress/detail) */
/* ================================================== */
function renderProgressDetailView(container) {
  const members = window.CatStore.memberProgressList;

  container.innerHTML = `
    <div class="cat-container space-y-3">
      
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <div class="flex items-center gap-4">
          <h2 class="text-sm font-bold text-slate-900">Chi tiết tiến độ theo Thành viên</h2>
          <div class="flex gap-1 text-xs">
            <button onclick="navigate('/progress/detail')" class="px-2.5 py-1 font-bold text-[#20B7A6] border-b-2 border-[#20B7A6]">Theo Member</button>
            <button onclick="navigate('/progress')" class="px-2.5 py-1 text-slate-500 hover:text-slate-800">Theo Spec</button>
          </div>
        </div>

        <button onclick="downloadCsvMock('Member Progress Detail')" class="cat-btn">Tải CSV</button>
      </div>

      <div class="overflow-x-auto border border-slate-200 bg-white">
        <table class="cat-table">
          <thead>
            <tr>
              <th class="w-10 text-center">ID</th>
              <th>Thành viên (Member)</th>
              <th class="text-center">Tiến độ</th>
              <th class="text-center">Kế hoạch</th>
              <th class="text-center">Đã làm</th>
              <th class="text-center">Còn lại</th>
              <th>07/08</th>
              <th>08/08</th>
              <th>09/08</th>
              <th>10/08</th>
              <th class="text-center">Lỗi phát hiện</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td class="text-center text-slate-500 font-mono">${m.id}</td>
                <td class="font-bold text-slate-800">${m.name}</td>
                <td class="text-center font-bold text-[#20B7A6]">${m.progress}</td>
                <td class="text-center font-mono">${m.plan}</td>
                <td class="text-center font-mono font-bold text-[#20B7A6]">${m.done}</td>
                <td class="text-center font-mono text-slate-400">${m.remaining}</td>
                <td class="text-center font-mono">${m.d07}</td>
                <td class="text-center font-mono">${m.d08}</td>
                <td class="text-center font-mono">${m.d09}</td>
                <td class="text-center font-mono">${m.d10}</td>
                <td class="text-center font-bold text-red-600">${m.defectsFound}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

    </div>
  `;
}

/* ================================================== */
/* SCREEN 06: TEST ISSUE MANAGEMENT (/progress/test-issues) */
/* ================================================== */
function renderTestIssuesView(container) {
  container.innerHTML = `
    <div class="cat-container space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <h2 class="text-sm font-bold text-slate-900">Quản lý vấn đề kiểm thử (Test Issues)</h2>
        <button onclick="alert('Tạo Vấn đề kiểm thử mới')" class="cat-btn cat-btn-mint">Đăng ký mới</button>
      </div>

      <!-- Japanese Style Empty State -->
      <div class="border border-slate-200 bg-white p-12 text-center space-y-2">
        <p class="text-xs text-slate-500 font-medium">Không có dữ liệu phù hợp với điều kiện.</p>
        <span class="text-[10px] text-slate-400">Tổng số: 0 | Trang 0 / 0</span>
      </div>
    </div>
  `;
}

/* ================================================== */
/* SCREEN 07: TỔNG HỢP & PHÂN TÍCH (/analysis - Trang 14-19) */
/* ================================================== */
function renderAnalysisView(container) {
  const store = window.CatStore;
  const analysis = store.analysisData;

  container.innerHTML = `
    <div class="cat-container space-y-4">
      
      <!-- Page Header -->
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Tổng hợp kiểm thử (Analysis & Aggregation)</h2>
          <p class="text-[10px] text-slate-500 mt-0.5">Tổng hợp Test Case theo Test Viewpoint, hạng mục lớn, tên màn hình hoặc các cột trong Test Specification.</p>
        </div>
        <button onclick="downloadCsvMock('Analysis Aggregation')" class="cat-btn cat-btn-mint">Tải CSV</button>
      </div>

      <!-- Main Layout: Left 75% Charts/Tables, Right 25% Filter Panel -->
      <div class="flex gap-4 items-start">
        
        <!-- MAIN CONTENT (75%) -->
        <div class="flex-1 space-y-4">
          
          <!-- Top Summary Progress Bar -->
          <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2 text-xs">
            <div class="flex justify-between items-center font-bold">
              <span>Tiến độ kiểm thử tổng thể</span>
              <span class="text-[#20B7A6]">100.0% (136 / 136 Cases)</span>
            </div>
            <div class="w-full bg-slate-100 h-3 rounded-xs overflow-hidden border border-slate-200">
              <div class="bg-[#20B7A6] h-full" style="width: 100%"></div>
            </div>
          </div>

          <!-- Bar & Line Overlay Chart -->
          <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2">
            <div class="font-bold text-slate-700 text-xs border-b border-slate-200 pb-1">Biểu đồ tổng hợp phân bố Lỗi theo Đối tượng</div>
            <div class="h-64 w-full">
              <canvas id="chartAnalysisMain"></canvas>
            </div>
          </div>

          <!-- Analysis Detailed Breakdown Table -->
          <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2">
            <div class="font-bold text-slate-700 text-xs border-b border-slate-200 pb-1">Bảng tổng hợp chi tiết theo Hạng mục</div>
            
            <div class="overflow-x-auto">
              <table class="cat-table">
                <thead>
                  <tr>
                    <th>Đối tượng kiểm thử</th>
                    <th class="text-center">Số Case</th>
                    <th class="text-center">Đã làm</th>
                    <th class="text-center">Số Issue</th>
                    <th class="text-center">Tỷ lệ Issue</th>
                    <th class="text-center">OK</th>
                    <th class="text-center">NG</th>
                    <th class="text-center">Đã sửa</th>
                  </tr>
                </thead>
                <tbody>
                  ${analysis.map(a => `
                    <tr>
                      <td class="font-medium text-slate-800">${a.target}</td>
                      <td class="text-center font-bold">${a.total}</td>
                      <td class="text-center font-bold text-[#20B7A6]">${a.executed}</td>
                      <td class="text-center font-bold ${a.issues > 0 ? 'text-red-600' : 'text-slate-500'}">${a.issues}</td>
                      <td class="text-center font-bold ${a.rate !== '0.00%' ? 'text-red-600' : 'text-slate-500'}">${a.rate}</td>
                      <td class="text-center cat-status-ok">${a.ok}</td>
                      <td class="text-center cat-status-ng">${a.ng}</td>
                      <td class="text-center cat-status-fixed">${a.fixed}</td>
                    </tr>
                  `).join('')}
                  <tr class="font-bold bg-[#FAFAFA]">
                    <td>TỔNG CỘNG</td>
                    <td class="text-center">136</td>
                    <td class="text-center text-[#20B7A6]">136</td>
                    <td class="text-center text-red-600">7</td>
                    <td class="text-center text-red-600">5.15%</td>
                    <td class="text-center cat-status-ok">134</td>
                    <td class="text-center cat-status-ng">1</td>
                    <td class="text-center cat-status-fixed">1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- RIGHT FILTER PANEL (25%) -->
        <div class="w-64 flex-shrink-0 border border-slate-200 bg-white p-3 rounded-xs space-y-3 text-[11px]">
          <div class="font-bold text-slate-700 border-b border-slate-200 pb-1">Cài đặt hiển thị (Filter Panel)</div>

          <div class="space-y-1">
            <label class="font-semibold text-slate-600 block">Trục tổng hợp:</label>
            <select class="cat-select w-full">
              <option>Đối tượng kiểm thử (Viewpoint)</option>
              <option>Test Specification</option>
              <option>Người phụ trách</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="font-semibold text-slate-600 block">Hình thức hiển thị:</label>
            <select class="cat-select w-full">
              <option>Biểu đồ cột chồng & Đường</option>
              <option>Chỉ hiển thị Bảng</option>
            </select>
          </div>

          <div class="space-y-1 pt-2 border-t border-slate-200">
            <label class="font-semibold text-slate-600 block">Loại Thiết bị:</label>
            <select class="cat-select w-full">
              <option>iPad Pro M4 (iOS 27)</option>
              <option>Tất cả thiết bị</option>
            </select>
          </div>

          <button onclick="alert('Đã cập nhật bộ lọc phân tích')" class="cat-btn cat-btn-mint w-full mt-2">Áp dụng bộ lọc</button>
        </div>

      </div>

    </div>
  `;
}

// Download CSV Mock Helper
function downloadCsvMock(title) {
  alert(`Đã khởi tạo tải về dữ liệu CSV cho [${title}]!`);
}

/* ================================================== */
/* DETAILED TEST SPECIFICATION RUNNER GRID VIEW (Matching Image 2 & 3) */
/* Route: /tests/:id */
/* ================================================== */
function renderTestSpecDetailView(container, specId) {
  const specs = window.CatStore.testSpecs;
  const spec = specs.find(s => s.no == specId) || specs[0];

  container.innerHTML = `
    <div class="space-y-0 min-h-[calc(100vh-84px)] flex flex-col justify-between bg-slate-50">

      <div>
        <!-- 1. DARK GREEN TOP SPECIFICATION HEADER BAR -->
        <div class="bg-[#00382B] text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-xs">
          <div class="flex items-center gap-2">
            <button onclick="navigate('/tests')" class="text-slate-300 hover:text-white flex items-center gap-1">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> Quay lại
            </button>
            <span class="text-emerald-500">|</span>
            <i data-lucide="file-spreadsheet" class="w-4 h-4 text-[#20B7A6]"></i>
            <span class="text-xs font-bold tracking-tight text-emerald-100">${spec.no}. ${spec.name}_Kiểm thử sau Release_1</span>
          </div>
          <div class="flex items-center gap-3 text-[11px] text-emerald-100 font-normal">
            <span>SpiderPlus Co., Ltd.</span>
            <span>|</span>
            <span>S++ Flutter</span>
            <span>|</span>
            <span class="font-bold text-white">Nguyen Xuan Nguyen Giap</span>
            <div class="w-6 h-6 rounded-full bg-emerald-700 border border-emerald-500 flex items-center justify-center font-bold text-white text-[10px]">NG</div>
          </div>
        </div>

        <!-- 2. SUB-TAB BAR UNDER GREEN HEADER -->
        <div class="bg-white border-b border-slate-200 px-4 py-1 flex items-center gap-2 text-xs">
          <button class="px-3 py-1 bg-[#20B7A6] text-white font-bold rounded-t-xs text-[11px]">Tablet (タブレット)</button>
        </div>

        <!-- 3. TOOLBAR UNDER TAB BAR -->
        <div class="bg-[#FAFAFA] border-b border-slate-300 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <!-- Left Tools -->
          <div class="flex items-center gap-1.5">
            <button class="cat-btn">Tóm tắt Test</button>
            <button class="cat-btn">Đồng bộ dòng OFF</button>
            <button class="cat-btn bg-emerald-50 text-emerald-700 border-emerald-300">✔ Highlights ON</button>
            <div class="h-4 w-px bg-slate-300 mx-1"></div>
            <button class="cat-btn px-2 font-bold">B</button>
            <button class="cat-btn px-2 italic">I</button>
            <button class="cat-btn px-2 line-through">S</button>
            <button class="cat-btn px-2 underline">U</button>
            <button class="cat-btn px-2">T ▼</button>
            <button class="cat-btn px-2 bg-yellow-200 text-slate-800">🎨 T ▼</button>
          </div>

          <!-- Right Action Tools -->
          <div class="flex items-center gap-1.5">
            <button onclick="alert('Báo cáo vấn đề Test')" class="cat-btn">Báo cáo vấn đề Test</button>
            <button onclick="alert('Nhập kết quả')" class="cat-btn">Nhập kết quả</button>
            <button onclick="alert('Đính kèm sự cố')" class="cat-btn">Đính kèm sự cố</button>
            <button class="cat-btn bg-[#20B7A6] text-white border-[#20B7A6] hover:bg-[#1eb7a5]">Cập nhật liên kết</button>
            <button class="cat-btn bg-[#FFA000] text-white border-[#FFA000] hover:bg-[#e69100]">Cảnh báo liên kết (chi tiết)</button>
            <button class="cat-btn">Lọc kết quả ▼</button>
            <button class="cat-btn">Xóa ▼</button>
            <i data-lucide="info" class="w-4 h-4 text-slate-400 cursor-pointer"></i>
          </div>
        </div>

        <!-- 4. DENSE EXECUTION DATA GRID WITH FULL HORIZONTAL SCROLLING -->
        <div class="overflow-x-auto bg-white border-b border-slate-300">
          <table class="cat-table text-[11px] border-collapse min-w-[1300px] w-full">
            <thead>
              <tr class="bg-[#FAFAFA] text-slate-700 font-bold border-b border-slate-300">
                <th class="w-10 text-center">ID</th>
                <th class="w-28">Đối tượng kiểm thử</th>
                <th class="w-56">Điều kiện tiên quyết</th>
                <th class="w-64">Trình tự kiểm thử</th>
                <th class="w-28">Quan điểm kiểm thử</th>
                <th class="w-32">Hạng mục xác nhận</th>
                <th class="w-56">Kết quả kỳ vọng</th>
                <th class="w-20 text-center">Ghi chú thiết kế</th>
                
                <!-- iPad COLUMN HEADER (MATCHING IMAGE 2 & 3) -->
                <th class="w-24 text-center bg-[#D0EBE8] text-[#004D40] border-x border-slate-300 font-extrabold text-xs">iPad</th>
                
                <th class="w-20">Ghi chú ST</th>
                <th class="w-24">Ghi chú thực thi</th>
                <th class="w-36">Lý do tạm hoãn (chọn từ danh sách)</th>
              </tr>
            </thead>
          <tbody>

            <!-- Row 1 -->
            <tr class="hover:bg-slate-50 border-b border-slate-200">
              <td class="text-center font-bold text-slate-600 align-top pt-3">
                1
                <div class="mt-1 text-slate-400 cursor-pointer" title="Chi tiết"><i data-lucide="list" class="w-3 h-3 mx-auto"></i></div>
              </td>
              <td class="font-bold text-slate-800 align-top pt-3">Camera Icon</td>
              <td class="text-slate-600 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                • SpiderPlus App là dev app download từ TestFlight<br>
                • Màn hình sử dụng theo hướng ngang (Landscape)<br>
                • <strong>Thao tác chuẩn bị:</strong><br>
                1. Mở ứng dụng SpiderPlus dev trên iPad<br>
                2. Bấm vào nút cài đặt server ở góc trái dưới<br>
                3. Chọn "Thêm Server"<br>
                4. Nhập IP/Tên server dev vào ô textbox<br>
                5. Nhập ID tài khoản và Password hợp lệ<br>
                6. Bấm nút "Đăng nhập"<br>
                7. Tiến hành thực thi các bước kiểm thử bên dưới
              </td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                1. Mở tài khoản kiểm thử hợp lệ trên server iPad<br>
                2. Chọn dự án và thư mục bất kỳ<br>
                3. Nhấn nút "Tải ảnh lên"<br>
                4. Chọn "Chọn tập tin"<br>
                5. Chọn "Chọn từ Album"<br>
                6. Chọn ảnh bất kỳ trong thư viện<br>
                7. Nhấn nút "Tải lên"<br>
                8. Nhấn vào bản vẽ đã tải lên<br>
                9. Nhấn nút "Chụp ảnh / Photo"
              </td>
              <td class="text-slate-600 align-top pt-3">Hiển thị Dialog</td>
              <td class="text-slate-600 align-top pt-3">Dialog hiển thị đúng giá trị kỳ vọng</td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px]">
                <span class="text-blue-600 font-semibold block">Camera modal được hiển thị chính xác</span>
                <a href="https://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-all text-[9px] block mt-1">
                  https://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/
                </a>
              </td>
              <td class="text-slate-400 text-center align-top pt-3">-</td>
              
              <!-- iPad COLUMN CELL (MATCHING IMAGE 3 EXACTLY) -->
              <td class="align-top p-2 text-center bg-[#D0EBE8] border-x border-slate-300">
                <div class="flex flex-col items-center gap-1 py-1">
                  <!-- Status Box Button -->
                  <div onclick="toggleSpecRowStatus(this)" class="w-14 h-12 bg-white border-2 border-[#0070F3] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition">
                    <span class="text-[#0070F3] font-extrabold text-base tracking-wide">OK</span>
                  </div>
                  <!-- Sub Action Buttons -->
                  <button onclick="alert('Đính kèm file minh chứng')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Tập tin
                  </button>
                  <button onclick="navigate('/issues')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Báo cáo
                  </button>
                </div>
              </td>

              <td class="text-slate-400 align-top pt-3 text-center">-</td>
              <td class="font-mono text-slate-600 text-[10px] align-top pt-3">1.1.0(487)</td>
              <td class="text-slate-400 align-top pt-3 text-center text-[10px]">-</td>
            </tr>

            <!-- Row 2 -->
            <tr class="hover:bg-slate-50 border-b border-slate-200">
              <td class="text-center font-bold text-slate-600 align-top pt-3">
                2
                <div class="mt-1 text-slate-400 cursor-pointer" title="Chi tiết"><i data-lucide="list" class="w-3 h-3 mx-auto"></i></div>
              </td>
              <td class="font-bold text-slate-800 align-top pt-3">Chọn ảnh</td>
              <td class="text-slate-400 align-top pt-3 text-center">-</td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                ▲ Tiếp tục thực thi: Nhấn nút "Chọn ảnh", Nhấn vào vị trí bất kỳ trên bản vẽ
              </td>
              <td class="text-slate-600 align-top pt-3">Hiển thị Dialog</td>
              <td class="text-slate-600 align-top pt-3">Dialog hiển thị đúng</td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px]">
                Trình chọn tệp Photo Picker được hiển thị
              </td>
              <td class="text-slate-400 text-center align-top pt-3">-</td>
              
              <!-- iPad COLUMN CELL -->
              <td class="align-top p-2 text-center bg-[#D0EBE8] border-x border-slate-300">
                <div class="flex flex-col items-center gap-1 py-1">
                  <div onclick="toggleSpecRowStatus(this)" class="w-14 h-12 bg-white border-2 border-[#0070F3] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition">
                    <span class="text-[#0070F3] font-extrabold text-base tracking-wide">OK</span>
                  </div>
                  <button onclick="alert('Đính kèm file minh chứng')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Tập tin
                  </button>
                  <button onclick="navigate('/issues')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Báo cáo
                  </button>
                </div>
              </td>

              <td class="text-slate-400 align-top pt-3 text-center">-</td>
              <td class="font-mono text-slate-600 text-[10px] align-top pt-3">1.1.0(487)</td>
              <td class="text-slate-400 align-top pt-3 text-center text-[10px]">-</td>
            </tr>

            <!-- Row 3 -->
            <tr class="hover:bg-slate-50 border-b border-slate-200">
              <td class="text-center font-bold text-slate-600 align-top pt-3">
                3
                <div class="mt-1 text-slate-400 cursor-pointer" title="Chi tiết"><i data-lucide="list" class="w-3 h-3 mx-auto"></i></div>
              </td>
              <td class="font-bold text-slate-800 align-top pt-3">Chọn ảnh</td>
              <td class="text-slate-400 align-top pt-3 text-center">-</td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                ▲ Tiếp tục thực thi: Chọn ảnh bất kỳ, Nhấn nút "Hoàn tất", Nhấn nút "Đóng"
              </td>
              <td class="text-slate-600 align-top pt-3">Hiển thị Dialog</td>
              <td class="text-slate-600 align-top pt-3">Dialog hiển thị đúng</td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px]">
                <span class="text-blue-600 font-semibold block">Modal chỉnh sửa chi tiết được hiển thị</span>
                <a href="https://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-all text-[9px] block mt-1">
                  https://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/
                </a>
              </td>
              <td class="text-slate-400 text-center align-top pt-3">-</td>
              
              <!-- iPad COLUMN CELL -->
              <td class="align-top p-2 text-center bg-[#D0EBE8] border-x border-slate-300">
                <div class="flex flex-col items-center gap-1 py-1">
                  <div onclick="toggleSpecRowStatus(this)" class="w-14 h-12 bg-white border-2 border-[#0070F3] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition">
                    <span class="text-[#0070F3] font-extrabold text-base tracking-wide">OK</span>
                  </div>
                  <button onclick="alert('Đính kèm file minh chứng')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Tập tin
                  </button>
                  <button onclick="navigate('/issues')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Báo cáo
                  </button>
                </div>
              </td>

              <td class="text-slate-700 font-semibold text-[10px] align-top pt-3">QA No.8</td>
              <td class="font-mono text-slate-600 text-[10px] align-top pt-3">1.1.0(487)</td>
              <td class="text-slate-400 align-top pt-3 text-center text-[10px]">-</td>
            </tr>

            <!-- Row 4 -->
            <tr class="hover:bg-slate-50 border-b border-slate-200">
              <td class="text-center font-bold text-slate-600 align-top pt-3">
                4
                <div class="mt-1 text-slate-400 cursor-pointer" title="Chi tiết"><i data-lucide="list" class="w-3 h-3 mx-auto"></i></div>
              </td>
              <td class="font-bold text-slate-800 align-top pt-3">Xem trước</td>
              <td class="text-slate-400 align-top pt-3 text-center">-</td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                ▲ Tiếp tục thực thi
              </td>
              <td class="text-slate-600 align-top pt-3">Kích hoạt / Vô hiệu hóa</td>
              <td class="text-slate-600 align-top pt-3">Thiết lập đúng trạng thái active/inactive</td>
              <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px]">
                Textbox bị vô hiệu hóa khi không đủ quyền
              </td>
              <td class="text-slate-400 text-center align-top pt-3">-</td>
              
              <!-- iPad COLUMN CELL -->
              <td class="align-top p-2 text-center bg-[#D0EBE8] border-x border-slate-300">
                <div class="flex flex-col items-center gap-1 py-1">
                  <div onclick="toggleSpecRowStatus(this)" class="w-14 h-12 bg-white border-2 border-[#0070F3] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition">
                    <span class="text-[#0070F3] font-extrabold text-base tracking-wide">OK</span>
                  </div>
                  <button onclick="alert('Đính kèm file minh chứng')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Tập tin
                  </button>
                  <button onclick="navigate('/issues')" class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">
                    Báo cáo
                  </button>
                </div>
              </td>

              <td class="text-slate-400 align-top pt-3 text-center">-</td>
              <td class="font-mono text-slate-600 text-[10px] align-top pt-3">1.1.0(487)</td>
              <td class="text-slate-400 align-top pt-3 text-center text-[10px]">-</td>
            </tr>

          </tbody>
        </table>
      </div>

      <!-- 5. FOOTER CONTROL BAR AT BOTTOM -->
      <div class="bg-[#004D40] text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-medium border-t border-emerald-800">
        
        <!-- Left Footer Controls -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <button class="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px]">«</button>
            <button class="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px]">&lt;</button>
            <span class="text-emerald-200">Trang</span>
            <input type="text" value="1" class="w-7 text-center bg-emerald-950 text-white border border-emerald-600 rounded text-[10px] font-bold">
            <span class="text-emerald-200">/ 3</span>
            <button class="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px]">&gt;</button>
            <button class="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px]">»</button>
            <button class="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px]">↻</button>
          </div>

          <div class="flex items-center gap-1.5 text-emerald-100">
            <span>Hiển thị:</span>
            <select class="bg-emerald-950 text-white border border-emerald-600 rounded px-1 text-[10px]">
              <option>100 dòng</option>
              <option>50 dòng</option>
              <option>200 dòng</option>
            </select>
          </div>

          <div class="flex items-center gap-1.5 text-emerald-100">
            <span>Kích thước chữ:</span>
            <input type="range" min="10" max="16" value="11" class="w-20 accent-[#20B7A6] cursor-pointer">
          </div>
        </div>

        <!-- Right Footer Info -->
        <div class="flex items-center gap-4 text-emerald-200 font-mono text-[10px]">
          <div>258 Hạng mục | 1 - 100 được hiển thị</div>
          <div>Copyright © SHIFT Inc. All rights reserved.</div>
          <div>CATEST v4.21.104</div>
        </div>

      </div>

    </div>
  `;
}

// Toggle Row Execution Status (OK -> NG -> Đã sửa -> Tạm hoãn) inside iPad Column Status Box
function toggleSpecRowStatus(statusBox) {
  const label = statusBox.querySelector('span');
  if (!label) return;
  const current = label.innerText.trim();

  if (current === 'OK') {
    label.innerText = 'NG';
    label.className = 'text-[#FF0000] font-extrabold text-base tracking-wide';
    statusBox.className = 'w-14 h-12 bg-white border-2 border-[#FF0000] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition';
  } else if (current === 'NG') {
    label.innerText = 'Đã sửa';
    label.className = 'text-[#00C853] font-extrabold text-xs tracking-tight';
    statusBox.className = 'w-14 h-12 bg-white border-2 border-[#00C853] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition';
  } else if (current === 'Đã sửa') {
    label.innerText = 'Tạm hoãn';
    label.className = 'text-[#E6A100] font-extrabold text-xs tracking-tight';
    statusBox.className = 'w-14 h-12 bg-white border-2 border-[#E6A100] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition';
  } else {
    label.innerText = 'OK';
    label.className = 'text-[#0070F3] font-extrabold text-base tracking-wide';
    statusBox.className = 'w-14 h-12 bg-white border-2 border-[#0070F3] rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition';
  }
}

