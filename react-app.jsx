// ==================================================
// CATEST - ReactJS Frontend Application Architecture
// Technology Stack: React 18, React Hooks, Lenis Smooth Scroll, Tailwind CSS, Lucide, Chart.js
// Visual Source of Truth: Japanese Enterprise CATEST Specification
// ==================================================

const { useState, useEffect, useMemo, useCallback, createContext, useContext, useRef } = React;

// 1. Central React Data Context
const CatStoreContext = createContext();

function CatStoreProvider({ children }) {
  const [store, setStore] = useState(window.CatStore);
  const [activeRoute, setActiveRoute] = useState(window.location.hash ? window.location.hash.substring(1) : '/dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash ? window.location.hash.substring(1) : '/dashboard';
      setActiveRoute(currentHash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((route) => {
    window.location.hash = route;
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleSpecRowStatus = useCallback((specId, rowId) => {
    alert(`Đã cập nhật trạng thái thực thi cho Case #${rowId}`);
  }, []);

  return (
    <CatStoreContext.Provider value={{ ...store, activeRoute, navigate, toggleSpecRowStatus }}>
      {children}
    </CatStoreContext.Provider>
  );
}

// 2. Global Header Component (Height 48px)
function GlobalHeader() {
  const { navigate } = useContext(CatStoreContext);
  return (
    <header class="h-12 border-b border-slate-300 bg-white px-4 flex items-center justify-between text-xs flex-shrink-0 z-30">
      <div class="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div class="w-6 h-6 rounded-full bg-[#20B7A6] flex items-center justify-center font-bold text-white text-xs shadow-xs">
          S+
        </div>
        <span class="font-bold text-sm text-slate-900 tracking-tight">Flutter</span>
      </div>

      <div class="hidden md:flex items-center gap-3 text-slate-700 font-medium">
        <div>Dự án: <span class="font-bold text-slate-900">Flutter</span></div>
        <span class="text-slate-300">|</span>
        <div>Giai đoạn: <span class="font-bold text-slate-900">Chuẩn_iPad Merge Regression</span></div>
      </div>

      <div class="flex items-center gap-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
          Chế độ xem · hết hạn 01/09/2027 09:00
        </span>

        <div class="hidden lg:flex items-center gap-2 text-slate-500 text-[11px]">
          <span>SpiderPlus Co., Ltd.</span>
          <span class="text-slate-300">|</span>
          <span class="font-semibold text-slate-800">Nguyen Xuan Nguyen Giap</span>
        </div>

        <div class="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-[10px]">
          NG
        </div>

        <select class="cat-select text-[10px]" onChange={(e) => alert('Chuyển đợt test: ' + e.target.value)}>
          <option>Chuẩn_iPad Merge Regression</option>
          <option>Chuẩn_Android Regression</option>
          <option>System Test Sprint 14</option>
        </select>
      </div>
    </header>
  );
}

// 3. Global Navigation Component (Height 36px)
function GlobalNavbar() {
  const { activeRoute, navigate } = useContext(CatStoreContext);

  const isNavActive = (baseRoute) => {
    if (baseRoute === '/dashboard') return activeRoute === '/dashboard';
    return activeRoute.startsWith(baseRoute);
  };

  const navItems = [
    { label: 'Tổng quan', route: '/dashboard' },
    { label: 'Quản lý kiểm thử', route: '/tests' },
    { label: 'Quản lý lỗi', route: '/issues' },
    { label: 'Quản lý tiến độ', route: '/progress' },
    { label: 'Tổng hợp & Phân tích', route: '/analysis' },
  ];

  return (
    <nav class="h-9 border-b border-slate-200 bg-[#FAFAFA] px-4 flex items-center gap-6 text-xs font-medium flex-shrink-0 z-20">
      {navItems.map(item => (
        <button
          key={item.route}
          onClick={() => navigate(item.route)}
          class={`h-full flex items-center border-b-2 transition ${
            isNavActive(item.route)
              ? 'text-[#20B7A6] border-[#20B7A6] font-bold'
              : 'text-slate-600 border-transparent hover:text-[#20B7A6]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

// 4. Global Footer Component (Height 32px)
function GlobalFooter() {
  return (
    <footer class="h-8 border-t border-slate-200 bg-[#FAFAFA] px-4 flex items-center justify-between text-[11px] text-slate-500 flex-shrink-0">
      <div>Copyright © SHIFT Inc. All rights reserved.</div>
      <div class="flex items-center gap-4">
        <span>Phiên bản: <strong class="text-slate-700 font-mono">CATEST v4.21.104</strong></span>
        <span>Hỗ trợ kỹ thuật: <strong class="text-slate-700">QA Lead S+</strong></span>
      </div>
    </footer>
  );
}

// 5. SCREEN 01: DashboardView (2-Pane Split Layout matching Image 3)
function DashboardView() {
  const { project, teamMembers, navigate } = useContext(CatStoreContext);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'manual'
  const chartRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'summary' && window.CatCharts) {
      setTimeout(() => window.CatCharts.initProgressLineChart('chartDashProgressReact'), 50);
    }
  }, [activeTab]);

  return (
    <div class="cat-container flex gap-4 items-start py-3">
      
      {/* LEFT PANE SIDEBAR (~224px) */}
      <div class="w-56 flex-shrink-0 space-y-3">
        {/* Block 1: Donut Progress */}
        <div class="border border-slate-200 bg-white p-3 rounded-xs text-center space-y-2">
          <div class="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1 text-left">Biểu đồ tóm tắt</div>
          
          <div class="flex items-center justify-around pt-1">
            <div class="flex flex-col items-center">
              <div class="relative w-14 h-14 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-200" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="text-[#20B7A6]" strokeDasharray="100, 100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="absolute text-xs font-bold text-slate-800">100%</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Thực hiện</span>
            </div>

            <div class="flex flex-col items-center">
              <div class="relative w-14 h-14 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path class="text-slate-200" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="text-[#0070F3]" strokeDasharray="100, 100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="absolute text-xs font-bold text-slate-800">100%</span>
              </div>
              <span class="text-[10px] text-slate-500 mt-1">Kế hoạch</span>
            </div>
          </div>
          <div class="text-[10px] text-slate-400 text-center">Đã tiêu hóa 136/136 trường hợp</div>
        </div>

        {/* Block 2: Phase Info */}
        <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-1.5 text-[11px]">
          <div class="font-bold text-slate-700 border-b border-slate-200 pb-1">Quy trình hiện tại</div>
          <div class="text-slate-700 font-semibold leading-snug">{project.phase}</div>
          <div class="text-slate-500 text-[10px] pt-1">Phiên bản: <span class="text-slate-700">-</span></div>
          <div class="text-slate-500 text-[10px]">Ngày bắt đầu: <span class="text-slate-700">{project.startDate}</span></div>
          <div class="text-slate-500 text-[10px]">Ngày kết thúc: <span class="text-slate-700">{project.endDate}</span></div>
          <div class="text-slate-500 text-[10px]">Số ngày đã trôi qua: <span class="text-slate-800 font-bold">{project.daysElapsed} ngày</span></div>
        </div>

        {/* Block 3: Team Members */}
        <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-2 text-[11px]">
          <div class="font-bold text-slate-700 border-b border-slate-200 pb-1">Thông tin đội nhóm</div>
          <div class="max-h-64 overflow-y-auto space-y-2 pr-1">
            {teamMembers.map(m => (
              <div key={m.id} class="flex items-center gap-2 text-slate-700">
                <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">{m.name.charAt(0)}</div>
                <span class="text-[11px] font-medium">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANE MAIN AREA */}
      <div class="flex-1 space-y-4">
        {/* Sub-navigation Tabs */}
        <div class="border-b border-slate-200 flex items-center justify-between pb-1">
          <div class="flex gap-2">
            <button
              onClick={() => setActiveTab('summary')}
              class={`px-3 py-1 text-xs transition ${
                activeTab === 'summary'
                  ? 'font-bold text-[#20B7A6] border-b-2 border-[#20B7A6]'
                  : 'font-medium text-slate-500 hover:text-slate-800'
              }`}
            >
              Tổng hợp
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              class={`px-3 py-1 text-xs transition ${
                activeTab === 'manual'
                  ? 'font-bold text-[#20B7A6] border-b-2 border-[#20B7A6]'
                  : 'font-medium text-slate-500 hover:text-slate-800'
              }`}
            >
              Thủ công
            </button>
          </div>
        </div>

        {/* TAB 1: TỔNG HỢP (Summary Dashboard) */}
        {activeTab === 'summary' && (
          <div class="space-y-4">
            
            {/* SỔ TAY HƯỚNG DẪN THỰC THI CAT (PLACED BEFORE GIÁ TRỊ TỔNG HỢP) */}
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
                      <br/><a href="https://docs.google.com/document/d/1mXJzjmqm9oooV9_Dt9b2V4ThlfJVxl0fYGY3-JHnD6c/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" class="cat-link font-semibold flex items-center gap-1 mt-0.5">
                        [Bộ phận chính S+] Vận hành danh sách QA thực thi
                      </a>
                    </li>
                    <li>Nếu phát hiện lỗi, báo cáo lỗi sẽ được tạo trong Backlog.
                      <br/><a href="https://docs.google.com/document/d/1U5L7tSAj71_yTXka9G1op0KqWJmIkP5f3XiI_A5IA4I/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" class="cat-link font-semibold flex items-center gap-1 mt-0.5">
                        [S+ Main Unit] Cách tạo phiếu yêu cầu trong Backlog
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

            {/* 6 HIGH-CONTRAST COLORED KPI BLOCKS */}
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

            {/* PROGRESS SUMMARY TABLE */}
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
                      <td class="font-medium">Tổng số ca bệnh: <span class="font-bold text-slate-900 float-right">{project.totalCases}</span></td>
                      <td class="font-medium">lịch trình: <span class="font-bold text-slate-900 float-right">0 (0%)</span></td>
                      <td class="text-center font-semibold text-slate-600">0 (0%)</td>
                      <td class="font-medium">trọn: <span class="font-bold text-slate-900 float-right">7</span></td>
                      <td class="text-center font-bold text-slate-800">0</td>
                    </tr>
                    <tr>
                      <td class="font-medium">Đã tiêu hóa: <span class="font-bold text-[#20B7A6] float-right">{project.executedCases}</span></td>
                      <td class="font-medium">Đã tiêu hóa: <span class="font-bold text-[#20B7A6] float-right">{project.executedCases}</span></td>
                      <td class="text-center font-bold text-emerald-600">0</td>
                      <td class="font-medium">Hoàn thành: <span class="font-bold text-purple-600 float-right">6</span></td>
                      <td class="text-center font-bold text-slate-800">0</td>
                    </tr>
                    <tr>
                      <td class="font-medium">chưa tiêu (còn lại): <span class="font-bold text-slate-700 float-right">{project.unexecutedCases}</span></td>
                      <td class="font-medium">Chênh lệch giữa ngân sách và thực tế: <span class="font-bold text-emerald-600 float-right">↑ 136</span></td>
                      <td class="text-center font-bold text-emerald-600">0</td>
                      <td class="font-medium">Số ca bệnh (còn lại): <span class="font-bold text-red-600 float-right">1</span></td>
                      <td class="text-center font-bold text-slate-800">0</td>
                    </tr>
                    <tr>
                      <td class="font-medium">Tốc độ tiến độ: <span class="font-bold text-[#20B7A6] float-right">{project.progressPercent}%</span></td>
                      <td class="font-medium">Tỷ lệ hoàn thành kế hoạch: <span class="font-bold text-slate-700 float-right">0%</span></td>
                      <td class="text-center text-slate-500">0%</td>
                      <td class="font-medium">Tỷ lệ hỏng: <span class="font-bold text-red-600 float-right">{project.defectRate}</span></td>
                      <td class="text-center text-slate-500">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PROGRESS LINE CHART */}
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
                <canvas id="chartDashProgressReact"></canvas>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: THỦ CÔNG */}
        {activeTab === 'manual' && (
          <div class="cat-handbook-box p-4 bg-white border border-slate-200 rounded-xs">
            <h3 class="text-sm font-bold text-slate-900 mb-2">Hướng dẫn thao tác thủ công</h3>
            <p class="text-xs text-slate-600">Thao tác chạy test được thực hiện trực tiếp trên giao diện Grid Spreadsheet. Hãy chọn tập tin đặc tả kiểm thử tương ứng ở tab [Quản lý kiểm thử] để mở lưới chạy test.</p>
          </div>
        )}

      </div>

    </div>
  );
}

// 6. SCREEN 02: TestSpecsView (List of 20 Specs)
function TestSpecsView() {
  const { testSpecs, navigate } = useContext(CatStoreContext);

  return (
    <div class="cat-container space-y-3 py-3">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h2 class="text-sm font-bold text-slate-900">Danh sách Test Specification ({testSpecs.length})</h2>
        <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button onClick={() => alert('Đăng ký Test Spec mới')} class="cat-btn cat-btn-mint">Đăng ký</button>
          <button class="cat-btn">Thuộc tính</button>
          <button class="cat-btn">Cài đặt Sheet</button>
          <button onClick={() => window.downloadCsvMock('Test Specs')} class="cat-btn">Tải xuống</button>
          <input type="text" placeholder="Từ khóa tìm kiếm..." class="cat-input w-40" />
          <button class="cat-btn">Cài đặt hiển thị</button>
        </div>
      </div>

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
            {testSpecs.map(s => (
              <tr key={s.no} class="hover:bg-slate-50">
                <td class="text-center text-slate-500 font-mono">{s.no}</td>
                <td>
                  <span onClick={() => navigate(`/tests/${s.no}`)} class="cat-link font-medium flex items-center gap-1.5 cursor-pointer">
                    <span>{s.name}</span>
                  </span>
                </td>
                <td class="text-center font-bold">{s.caseCount}</td>
                <td class="text-center font-bold text-[#20B7A6]">100%</td>
                <td class="text-center text-slate-400">{s.unexecuted}</td>
                <td class="text-center cat-status-ok">{s.ok}</td>
                <td class="text-center cat-status-fixed">{s.fixed}</td>
                <td class="text-center cat-status-ng">{s.ng}</td>
                <td class="text-center text-slate-400">{s.pending}</td>
                <td class="text-slate-500 text-[10px]">{s.updatedAt}</td>
                <td class="text-slate-600">{s.updatedBy}</td>
                <td class="text-center">
                  <span class="text-[10px] text-emerald-700 font-semibold">{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <div>Hiển thị 1–20 / 24 tập tin Specification</div>
        <div class="flex items-center gap-2">
          <button class="cat-btn">Trang trước</button>
          <span>Trang 1 / 2</span>
          <button class="cat-btn">Trang sau</button>
        </div>
      </div>
    </div>
  );
}

// 7. SCREEN DETAILED: TestRunnerGrid (/tests/:id - Matching Image 1, 2, 3 Exactly)
function TestRunnerGrid({ specId }) {
  const { testSpecs, navigate } = useContext(CatStoreContext);
  const spec = useMemo(() => testSpecs.find(s => s.no == specId) || testSpecs[0], [testSpecs, specId]);
  
  const [rowStatuses, setRowStatuses] = useState({
    1: 'OK',
    2: 'OK',
    3: 'OK',
    4: 'OK'
  });

  const toggleStatus = (id) => {
    setRowStatuses(prev => {
      const cur = prev[id] || 'OK';
      let next = 'OK';
      if (cur === 'OK') next = 'NG';
      else if (cur === 'NG') next = 'Đã sửa';
      else if (cur === 'Đã sửa') next = 'Tạm hoãn';
      else next = 'OK';
      return { ...prev, [id]: next };
    });
  };

  const getStatusClass = (status) => {
    if (status === 'OK') return 'text-[#0070F3] border-[#0070F3]';
    if (status === 'NG') return 'text-[#FF0000] border-[#FF0000]';
    if (status === 'Đã sửa') return 'text-[#00C853] border-[#00C853]';
    return 'text-[#E6A100] border-[#E6A100]';
  };

  return (
    <div class="space-y-0 min-h-[calc(100vh-84px)] flex flex-col justify-between bg-slate-50">
      <div>
        {/* HEADER BAR */}
        <div class="bg-[#00382B] text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-xs">
          <div class="flex items-center gap-2">
            <button onClick={() => navigate('/tests')} class="text-slate-300 hover:text-white flex items-center gap-1">
              ← Quay lại
            </button>
            <span class="text-emerald-500">|</span>
            <span class="text-xs font-bold tracking-tight text-emerald-100">{spec.no}. {spec.name}_Kiểm thử sau Release_1</span>
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

        {/* SUB-TAB BAR */}
        <div class="bg-white border-b border-slate-200 px-4 py-1 flex items-center gap-2 text-xs">
          <button class="px-3 py-1 bg-[#20B7A6] text-white font-bold rounded-t-xs text-[11px]">Tablet (タブレット)</button>
        </div>

        {/* TOOLBAR */}
        <div class="bg-[#FAFAFA] border-b border-slate-300 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div class="flex items-center gap-1.5">
            <button class="cat-btn">Tóm tắt Test</button>
            <button class="cat-btn">Đồng bộ dòng OFF</button>
            <button class="cat-btn bg-emerald-50 text-emerald-700 border-emerald-300">✔ Highlights ON</button>
            <div class="h-4 w-px bg-slate-300 mx-1"></div>
            <button class="cat-btn px-2 font-bold">B</button>
            <button class="cat-btn px-2 italic">I</button>
            <button class="cat-btn px-2 line-through">S</button>
            <button class="cat-btn px-2 underline">U</button>
          </div>

          <div class="flex items-center gap-1.5">
            <button onClick={() => alert('Báo cáo vấn đề Test')} class="cat-btn">Báo cáo vấn đề Test</button>
            <button onClick={() => alert('Nhập kết quả')} class="cat-btn">Nhập kết quả</button>
            <button class="cat-btn bg-[#20B7A6] text-white border-[#20B7A6]">Cập nhật liên kết</button>
            <button class="cat-btn bg-[#FFA000] text-white border-[#FFA000]">Cảnh báo liên kết (chi tiết)</button>
            <button class="cat-btn">Lọc kết quả ▼</button>
          </div>
        </div>

        {/* DENSE SPREADSHEET GRID TABLE */}
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
                
                {/* iPad COLUMN HEADER (MATCHING IMAGE 2 & 3) */}
                <th class="w-24 text-center bg-[#D0EBE8] text-[#004D40] border-x border-slate-300 font-extrabold text-xs">iPad</th>
                
                <th class="w-20">Ghi chú ST</th>
                <th class="w-24">Ghi chú thực thi</th>
                <th class="w-36">Lý do tạm hoãn (chọn từ danh sách)</th>
              </tr>
            </thead>
            <tbody>
              
              {/* Row 1 */}
              <tr class="hover:bg-slate-50 border-b border-slate-200">
                <td class="text-center font-bold text-slate-600 align-top pt-3">1</td>
                <td class="font-bold text-slate-800 align-top pt-3">Camera Icon</td>
                <td class="text-slate-600 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                  • SpiderPlus App là dev app download từ TestFlight<br/>
                  • Màn hình sử dụng theo hướng ngang (Landscape)<br/>
                  1. Mở ứng dụng SpiderPlus dev trên iPad<br/>
                  2. Bấm vào nút cài đặt server ở góc trái dưới
                </td>
                <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                  1. Mở tài khoản kiểm thử hợp lệ trên server iPad<br/>
                  2. Chọn dự án và thư mục bất kỳ<br/>
                  3. Nhấn nút "Tải ảnh lên"
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

                {/* iPad CELL */}
                <td class="align-top p-2 text-center bg-[#D0EBE8] border-x border-slate-300">
                  <div class="flex flex-col items-center gap-1 py-1">
                    <div onClick={() => toggleStatus(1)} class={`w-14 h-12 bg-white border-2 rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition ${getStatusClass(rowStatuses[1])}`}>
                      <span class="font-extrabold text-base tracking-wide">{rowStatuses[1]}</span>
                    </div>
                    <button onClick={() => alert('Đính kèm file minh chứng')} class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">Tập tin</button>
                    <button onClick={() => navigate('/issues')} class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">Báo cáo</button>
                  </div>
                </td>

                <td class="text-slate-400 align-top pt-3 text-center">-</td>
                <td class="font-mono text-slate-600 text-[10px] align-top pt-3">1.1.0(487)</td>
                <td class="text-slate-400 align-top pt-3 text-center text-[10px]">-</td>
              </tr>

              {/* Row 2 */}
              <tr class="hover:bg-slate-50 border-b border-slate-200">
                <td class="text-center font-bold text-slate-600 align-top pt-3">2</td>
                <td class="font-bold text-slate-800 align-top pt-3">Chọn ảnh</td>
                <td class="text-slate-400 align-top pt-3 text-center">-</td>
                <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px] leading-relaxed">
                  ▲ Tiếp tục thực thi: Nhấn nút "Chọn ảnh", Nhấn vào vị trí bất kỳ trên bản vẽ
                </td>
                <td class="text-slate-600 align-top pt-3">Hiển thị Dialog</td>
                <td class="text-slate-600 align-top pt-3">Dialog hiển thị đúng</td>
                <td class="text-slate-700 align-top pt-3 whitespace-normal text-[10px]">Trình chọn tệp Photo Picker được hiển thị</td>
                <td class="text-slate-400 text-center align-top pt-3">-</td>

                <td class="align-top p-2 text-center bg-[#D0EBE8] border-x border-slate-300">
                  <div class="flex flex-col items-center gap-1 py-1">
                    <div onClick={() => toggleStatus(2)} class={`w-14 h-12 bg-white border-2 rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition ${getStatusClass(rowStatuses[2])}`}>
                      <span class="font-extrabold text-base tracking-wide">{rowStatuses[2]}</span>
                    </div>
                    <button onClick={() => alert('Đính kèm file minh chứng')} class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">Tập tin</button>
                    <button onClick={() => navigate('/issues')} class="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">Báo cáo</button>
                  </div>
                </td>

                <td class="text-slate-400 align-top pt-3 text-center">-</td>
                <td class="font-mono text-slate-600 text-[10px] align-top pt-3">1.1.0(487)</td>
                <td class="text-slate-400 align-top pt-3 text-center text-[10px]">-</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div class="bg-[#004D40] text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-medium border-t border-emerald-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <button class="px-1.5 py-0.5 bg-emerald-800 rounded text-[10px]">«</button>
            <button class="px-1.5 py-0.5 bg-emerald-800 rounded text-[10px]">&lt;</button>
            <span>Trang</span>
            <input type="text" value="1" class="w-7 text-center bg-emerald-950 text-white border border-emerald-600 rounded text-[10px] font-bold" readOnly />
            <span>/ 3</span>
            <button class="px-1.5 py-0.5 bg-emerald-800 rounded text-[10px]">&gt;</button>
            <button class="px-1.5 py-0.5 bg-emerald-800 rounded text-[10px]">»</button>
          </div>
        </div>

        <div class="flex items-center gap-4 text-emerald-200 font-mono text-[10px]">
          <div>258 Hạng mục | 1 - 100 được hiển thị</div>
          <div>Copyright © SHIFT Inc. All rights reserved.</div>
          <div>CATEST v4.21.104</div>
        </div>
      </div>
    </div>
  );
}

// 8. SCREEN 03: IssuesView (/issues)
function IssuesView() {
  const { issues } = useContext(CatStoreContext);

  return (
    <div class="cat-container flex gap-4 items-start py-3">
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

      <div class="flex-1 space-y-3">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 class="text-sm font-bold text-slate-900">Danh sách lỗi ({issues.length})</h2>
          <input type="text" placeholder="Tìm kiếm tiêu đề..." class="cat-input w-52" />
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
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(i => (
                <tr key={i.id}>
                  <td class="font-mono font-bold"><span class="cat-link">{i.id}</span></td>
                  <td class="text-slate-500 text-[10px]">{i.phase}</td>
                  <td>{i.type}</td>
                  <td class="font-medium text-slate-900 max-w-xs truncate">{i.title}</td>
                  <td>{i.assignee}</td>
                  <td><span class={i.severity === 'Nghiêm trọng' ? 'text-red-600 font-bold' : 'text-slate-700'}>{i.severity}</span></td>
                  <td><span class={i.status === 'Chưa xử lý' ? 'cat-status-ng' : 'cat-status-ok'}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 9. SCREEN 04: ProgressSummaryView (/progress)
function ProgressSummaryView() {
  const { memberProgress } = useContext(CatStoreContext);

  useEffect(() => {
    if (window.CatCharts) {
      setTimeout(() => window.CatCharts.initProgressLineChart('chartProgressMainReact'), 50);
    }
  }, []);

  return (
    <div class="cat-container space-y-4 py-3">
      <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-3">
        <div class="font-bold text-slate-700 text-xs border-b border-slate-200 pb-2">Biểu đồ tiến độ dự án</div>
        <div class="h-64 w-full">
          <canvas id="chartProgressMainReact"></canvas>
        </div>
      </div>

      <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-3">
        <div class="font-bold text-slate-700 text-xs border-b border-slate-200 pb-2">Bảng tiến độ theo ngày</div>
        <div class="overflow-x-auto">
          <table class="cat-table text-center">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>07/08</th>
                <th>08/08</th>
                <th>09/08</th>
                <th>10/08</th>
                <th>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {memberProgress.map(m => (
                <tr key={m.id}>
                  <td class="text-left font-medium">{m.name}</td>
                  <td>{m.d07}</td>
                  <td>{m.d08}</td>
                  <td>{m.d09}</td>
                  <td>{m.d10}</td>
                  <td class="font-bold text-[#20B7A6]">{m.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 10. SCREEN 05: AnalysisView (/analysis)
function AnalysisView() {
  useEffect(() => {
    if (window.CatCharts) {
      setTimeout(() => window.CatCharts.initAnalysisChart('chartAnalysisMainReact'), 50);
    }
  }, []);

  return (
    <div class="cat-container flex gap-4 items-start py-3">
      <div class="flex-1 space-y-4">
        <div class="border border-slate-200 bg-white p-3 rounded-xs space-y-3">
          <div class="font-bold text-slate-700 text-xs border-b border-slate-200 pb-2">Biểu đồ phân tích chất lượng</div>
          <div class="h-64 w-full">
            <canvas id="chartAnalysisMainReact"></canvas>
          </div>
        </div>
      </div>

      <div class="w-64 flex-shrink-0 border border-slate-200 bg-white p-3 rounded-xs space-y-3 text-[11px]">
        <div class="font-bold text-slate-700 border-b border-slate-200 pb-1">Bộ lọc phân tích</div>
        <select class="cat-select w-full"><option>Theo Viewpoint</option></select>
        <button onClick={() => alert('Đã cập nhật bộ lọc')} class="cat-btn cat-btn-mint w-full">Áp dụng</button>
      </div>
    </div>
  );
}

// 11. MAIN APP ROUTER COMPONENT WITH LENIS SMOOTH SCROLL INTEGRATION
function App() {
  const { activeRoute } = useContext(CatStoreContext);

  // Initialize Lenis Smooth Scroll (Complies with Lenis Skill Guidelines)
  useEffect(() => {
    if (window.Lenis) {
      const lenis = new window.Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        autoRaf: true
      });
      return () => lenis.destroy();
    }
  }, []);

  // Re-initialize Lucide Icons after view render
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [activeRoute]);

  const isRunnerRoute = activeRoute.startsWith('/tests/');
  const specId = isRunnerRoute ? activeRoute.replace('/tests/', '') : null;

  return (
    <div class="min-h-screen flex flex-col justify-between">
      <div>
        <GlobalHeader />
        <GlobalNavbar />
        
        <main id="main-viewport" class="flex-1">
          {activeRoute === '/dashboard' && <DashboardView />}
          {activeRoute === '/tests' && <TestSpecsView />}
          {isRunnerRoute && <TestRunnerGrid specId={specId} />}
          {activeRoute.startsWith('/issues') && <IssuesView />}
          {activeRoute.startsWith('/progress') && <ProgressSummaryView />}
          {activeRoute === '/analysis' && <AnalysisView />}
        </main>
      </div>

      {/* Conditionally Render Global Footer (Hidden in Fullscreen Spec Runner) */}
      {!isRunnerRoute && <GlobalFooter />}
    </div>
  );
}

// 12. Mount React Application
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <CatStoreProvider>
      <App />
    </CatStoreProvider>
  );
}

