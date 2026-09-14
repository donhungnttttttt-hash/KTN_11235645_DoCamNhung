import React, { useState } from 'react';

export function TestRunnerGridPage({ specId, testSpecs, navigate }) {
  const spec = testSpecs.find(s => s.no == specId) || testSpecs[0];

  // 6 Trạng thái kiểm thử chuẩn: Unexecuted -> OK -> NG -> P (Pending) -> Fix -> NA
  const STATUS_CYCLE = ['Unexecuted', 'OK', 'NG', 'P', 'Fix', 'NA'];

  // BẢNG TÊN CỘT DỄ ĐỌC TRONG NHẬT KÝ AUDIT LOG
  const FIELD_NAMES_MAP = {
    target: 'Đối tượng kiểm thử',
    prerequisites: 'Điều kiện tiên quyết',
    steps: 'Trình tự kiểm thử',
    viewpoint: 'Quan điểm kiểm thử',
    confirmation: 'Hạng mục xác nhận',
    expected: 'Kết quả kỳ vọng',
    status: 'Trạng thái iPad',
    designNotes: 'Ghi chú thiết kế',
    stNotes: 'Ghi chú ST',
    executionNotes: 'Ghi chú thực thi',
    pendingReason: 'Lý do tạm hoãn'
  };

  const [rowStatuses, setRowStatuses] = useState({
    1: 'Unexecuted',
    2: 'Unexecuted',
    3: 'Unexecuted',
    4: 'Unexecuted'
  });

  // State cho Độ rộng các cột (Độ rộng động tùy chỉnh kéo thả được)
  const [colWidths, setColWidths] = useState({
    id: 55,
    target: 130,
    prerequisites: 280,
    steps: 320,
    viewpoint: 120,
    confirmation: 140,
    expected: 270,
    designNotes: 70,
    ipad: 95,
    stNotes: 75,
    executionNotes: 95,
    pendingReason: 135
  });

  // State cho Ô đang chọn (Active Selected Cell) và Định dạng Ô (Cell Styles)
  const [selectedCell, setSelectedCell] = useState({ caseId: 1, field: 'steps' });
  const [cellStylesMap, setCellStylesMap] = useState({
    '1_target': { bold: true },
    '1_steps': { underline: true }
  });

  // State cho Popovers chọn màu
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  // State cho Toolbar Toggles & Modals
  const [columnSync, setColumnSync] = useState(false);
  const [highlightOn, setHighlightOn] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [selectedDetailCase, setSelectedDetailCase] = useState(null);
  const [selectedHistoryCase, setSelectedHistoryCase] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showBatchEntryModal, setShowBatchEntryModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Xử lý kéo thả độ rộng cột (Column Resizing Drag Handler)
  const handleMouseDownResize = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey];

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(40, startWidth + delta);
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleStatus = (id) => {
    setRowStatuses(prev => {
      const cur = prev[id] || 'Unexecuted';
      const idx = STATUS_CYCLE.indexOf(cur);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...prev, [id]: next };
    });
  };

  const getStatusClass = (status) => {
    if (status === 'Unexecuted') return 'text-[#757575] border-[#757575] bg-white';
    if (status === 'OK') return 'text-[#0070F3] border-[#0070F3] bg-white';
    if (status === 'NG') return 'text-[#FF0000] border-[#FF0000] bg-white';
    if (status === 'P') return 'text-[#E6A100] border-[#E6A100] bg-white';
    if (status === 'Fix') return 'text-[#00C853] border-[#00C853] bg-white';
    if (status === 'NA') return 'text-[#455A64] border-[#455A64] bg-white';
    return 'text-[#0070F3] border-[#0070F3] bg-white';
  };

  const getStatusFont = (status) => {
    if (status === 'Unexecuted') return 'text-[9px] font-bold leading-tight';
    if (status === 'Fix') return 'text-sm font-extrabold';
    return 'text-base font-extrabold';
  };

  // HELPER TRẢ VỀ MÀU NỀN ĐỘNG CỦA CỘT IPAD THEO TRẠNG THÁI (DÙNG NỀN XÁM NHẠT MẶC ĐỊNH BẮT ĐẦU CHO UNEXECUTED)
  const getIpadCellBgClass = (status) => {
    if (status === 'Unexecuted') return 'bg-slate-100/90 text-slate-700'; // Xám nhạt mặc định
    if (status === 'OK') return 'bg-[#E3F2FD] text-blue-900'; // Xanh dương nhạt cho OK
    if (status === 'NG') return 'bg-[#FFEBEE] text-red-900'; // Đỏ nhạt cho NG
    if (status === 'P') return 'bg-[#FFF9C4] text-amber-900'; // Vàng nhạt cho Pending
    if (status === 'Fix') return 'bg-[#E8F5E9] text-emerald-900'; // Xanh lá nhạt cho Fix
    if (status === 'NA') return 'bg-[#ECEFF1] text-slate-800'; // Xám đá cho NA
    return 'bg-slate-100/90 text-slate-700';
  };

  const handleCopyLink = (id) => {
    const link = `${window.location.origin}${window.location.pathname}#/tests/${spec.no}?caseId=${id}`;
    navigator.clipboard?.writeText(link);
    setActiveMenuId(null);
    setToastMessage(`Đã sao chép liên kết Test Case #${id} vào bộ nhớ tạm!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Mock Dữ liệu Test Cases
  const [testCasesData, setTestCasesData] = useState([
    {
      id: 1,
      target: 'Camera Icon',
      prerequisites: '• SpiderPlus App là dev app download từ TestFlight\n• Màn hình sử dụng theo hướng ngang (Landscape)\n1. Mở ứng dụng SpiderPlus dev trên iPad\n2. Bấm vào nút cài đặt server ở góc trái dưới\n3. Chọn Nhập server\n4. Nhập tên server vào ô văn bản\n5. Nhập ID tài khoản và Mật khẩu hợp lệ\n6. Nhấn nút Đăng nhập\n7. Thực hiện từ quy trình kiểm thử',
      steps: '1. Đăng nhập bằng tài khoản bất kỳ trên server iPad của app SpiderPlus\n2. Chọn dự án bất kỳ và thư mục bất kỳ tại hiện trường\n3. Nhấn Tải ảnh lên\n4. Nhấn Chọn tệp\n5. Nhấn Chọn từ Album\n6. Chọn hình ảnh bất kỳ\n7. Nhấn nút Tải lên\n8. Nhấn vào bản vẽ đã tải lên\n9. Nhấn Chụp/Chọn ảnh',
      viewpoint: 'Hiển thị Dialog',
      confirmation: 'Dialog hiển thị đúng giá trị kỳ vọng',
      expected: 'Camera modal được hiển thị chính xác\nhttps://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/',
      designNotes: '',
      stNotes: '',
      executionNotes: '1.1.0(487)',
      pendingReason: '',
      history: [
        {
          rev: 2,
          time: '2025-08-10 14:02:10',
          user: 'Nguyen Xuan Nguyen Giap',
          build: '1.1.0(487)',
          note: 'Cập nhật kết quả chạy test lần 2 trên iPad Pro M2.',
          changedFields: ['status', 'executionNotes'],
          changes: {
            status: { old: 'Unexecuted', new: 'OK' },
            executionNotes: { old: '-', new: '1.1.0(487)' }
          }
        },
        {
          rev: 1,
          time: '2025-08-09 16:30:00',
          user: 'Đỗ Cẩm Nhung',
          build: '1.1.0(486)',
          note: 'Cập nhật lại chi tiết Điều kiện tiên quyết và Kết quả kỳ vọng Figma.',
          changedFields: ['prerequisites', 'expected'],
          changes: {
            prerequisites: { old: 'Mở ứng dụng SpiderPlus', new: '• SpiderPlus App là dev app download từ TestFlight\n• Màn hình sử dụng theo hướng ngang (Landscape)\n1. Mở ứng dụng SpiderPlus dev trên iPad' },
            expected: { old: 'Camera modal hiển thị', new: 'Camera modal được hiển thị chính xác\nhttps://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/' }
          }
        }
      ]
    },
    {
      id: 2,
      target: 'Chọn ảnh',
      prerequisites: '▲ Tiếp tục thực thi:\n1. Nhấn nút "Chọn ảnh"\n2. Nhấn vào vị trí bất kỳ trên bản vẽ',
      steps: '1. Nhấn nút "Chọn ảnh"\n2. Chọn 1 ảnh từ thư viện thiết bị',
      viewpoint: 'Hiển thị Dialog',
      confirmation: 'Dialog hiển thị đúng',
      expected: 'Trình chọn tệp Photo Picker được hiển thị',
      designNotes: '',
      stNotes: '',
      executionNotes: '1.1.0(487)',
      pendingReason: '',
      history: [
        {
          rev: 1,
          time: '2025-08-10 14:05:00',
          user: 'Phan Quoc Khanh',
          build: '1.1.0(487)',
          note: 'Báo cáo lỗi NG: Photo Picker bị crash khi chọn ảnh định dạng HEIC.',
          changedFields: ['status'],
          changes: {
            status: { old: 'Unexecuted', new: 'NG' }
          }
        }
      ]
    },
    {
      id: 3,
      target: 'Xem trước (Preview)',
      prerequisites: '1. Chọn 1 ảnh bất kỳ từ Photo Picker\n2. Kiểm tra ảnh hiển thị trên bản vẽ',
      steps: '1. Mở màn hình xem trước ảnh\n2. Thao tác phóng to/thu nhỏ ảnh',
      viewpoint: 'Xem trước ảnh',
      confirmation: 'Ảnh hiển thị rõ ràng, đúng tỉ lệ',
      expected: 'Ảnh hiển thị xem trước không bị biến dạng',
      designNotes: '',
      stNotes: '',
      executionNotes: '1.1.0(487)',
      pendingReason: 'Chờ chốt spec BA',
      history: [
        {
          rev: 1,
          time: '2025-08-10 14:10:00',
          user: 'Đỗ Cẩm Nhung',
          build: '1.1.0(487)',
          note: 'Chuyển sang P (Pending) để chờ BA chốt tỉ lệ ảnh ngang/dọc.',
          changedFields: ['status', 'pendingReason'],
          changes: {
            status: { old: 'Unexecuted', new: 'P' },
            pendingReason: { old: '', new: 'Chờ chốt spec BA' }
          }
        }
      ]
    }
  ]);

  // VỊ TRÍ VÀ ĐIỀU HƯỚNG CASE CHI TIẾT
  const currentDetailIndex = selectedDetailCase
    ? testCasesData.findIndex(c => c.id === selectedDetailCase.id)
    : -1;

  const handlePrevDetailCase = () => {
    if (currentDetailIndex > 0) {
      setSelectedDetailCase(testCasesData[currentDetailIndex - 1]);
    }
  };

  const handleNextDetailCase = () => {
    if (currentDetailIndex >= 0 && currentDetailIndex < testCasesData.length - 1) {
      setSelectedDetailCase(testCasesData[currentDetailIndex + 1]);
    }
  };

  // HÀM SỬA TRỰC TIẾP VĂN BẢN TRONG Ô VÀ TỰ ĐỘNG GHI AUDIT LOG
  const handleCellTextChange = (caseId, field, newRawText) => {
    const targetCase = testCasesData.find(c => c.id === caseId);
    const oldValue = targetCase ? targetCase[field] : '';
    const newText = newRawText ? newRawText.trim() : '';

    if (oldValue !== newText) {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      setTestCasesData(prevCases => prevCases.map(c => {
        if (c.id === caseId) {
          const currentHistory = c.history || [];
          const nextRev = currentHistory.length > 0 ? Math.max(...currentHistory.map(h => h.rev || 1)) + 1 : 1;
          
          const newAuditEntry = {
            rev: nextRev,
            time: nowStr,
            user: 'Nguyen Xuan Nguyen Giap',
            build: '1.1.0(487)',
            note: `Sửa trực tiếp ô [${FIELD_NAMES_MAP[field] || field}]`,
            changedFields: [field],
            changes: {
              [field]: {
                old: oldValue || '(trống)',
                new: newText || '(trống)'
              }
            }
          };

          return {
            ...c,
            [field]: newText,
            history: [newAuditEntry, ...currentHistory]
          };
        }
        return c;
      }));

      triggerToast(`Đã cập nhật [${FIELD_NAMES_MAP[field] || field}] cho Case #${caseId} và lưu vào Lịch sử!`);
    }
  };

  // HÀM ÁP DỤNG ĐỊNH DẠNG VÀ TỰ ĐỘNG GHI BẢN GHI LỊCH SỬ AUDIT LOG
  const applyFormatToSelectedCell = (formatType, value = true) => {
    if (!selectedCell) {
      triggerToast('⚠️ Vui lòng nhấp chọn một ô bất kỳ trong bảng để áp dụng định dạng!');
      return;
    }

    const { caseId, field } = selectedCell;
    const cellKey = `${caseId}_${field}`;
    const oldStyle = cellStylesMap[cellKey] || {};
    
    let newStyle = { ...oldStyle };
    let formatLabel = '';

    if (formatType === 'bold') {
      newStyle.bold = !oldStyle.bold;
      formatLabel = newStyle.bold ? 'In đậm (Bold)' : 'Bỏ in đậm';
    } else if (formatType === 'italic') {
      newStyle.italic = !oldStyle.italic;
      formatLabel = newStyle.italic ? 'In nghiêng (Italic)' : 'Bỏ in nghiêng';
    } else if (formatType === 'strikethrough') {
      newStyle.strikethrough = !oldStyle.strikethrough;
      formatLabel = newStyle.strikethrough ? 'Gạch ngang (Strikethrough)' : 'Bỏ gạch ngang';
    } else if (formatType === 'underline') {
      newStyle.underline = !oldStyle.underline;
      formatLabel = newStyle.underline ? 'Gạch chân (Underline)' : 'Bỏ gạch chân';
    } else if (formatType === 'color') {
      newStyle.color = value;
      formatLabel = `Đổi màu chữ [${value}]`;
      setShowTextColorPicker(false);
    } else if (formatType === 'bgColor') {
      newStyle.bgColor = value;
      formatLabel = `Tô màu nền ô [${value}]`;
      setShowBgColorPicker(false);
    }

    // 1. Cập nhật Cell Styles Map
    setCellStylesMap(prev => ({ ...prev, [cellKey]: newStyle }));

    // 2. Tự động ghi bản ghi Revision mới vào Nhật ký Lịch sử Audit Log
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setTestCasesData(prevCases => prevCases.map(c => {
      if (c.id === caseId) {
        const currentHistory = c.history || [];
        const nextRev = currentHistory.length > 0 ? Math.max(...currentHistory.map(h => h.rev || 1)) + 1 : 1;
        
        const newAuditEntry = {
          rev: nextRev,
          time: nowStr,
          user: 'Nguyen Xuan Nguyen Giap',
          build: '1.1.0(487)',
          note: `Định dạng văn bản: ${formatLabel} cho cột [${FIELD_NAMES_MAP[field] || field}]`,
          changedFields: [field],
          changes: {
            [field]: {
              old: 'Định dạng chuẩn',
              new: `Đã áp dụng ${formatLabel}`
            }
          }
        };

        return { ...c, history: [newAuditEntry, ...currentHistory] };
      }
      return c;
    }));

    triggerToast(`Đã áp dụng ${formatLabel} cho Case #${caseId} và lưu vào Nhật ký Lịch sử!`);
  };

  // Helper trả về CSS Class và Inline Style cho ô
  const getCellStyleClasses = (caseId, field) => {
    const key = `${caseId}_${field}`;
    const s = cellStylesMap[key] || {};
    let classes = [];
    if (s.bold) classes.push('font-bold text-slate-950');
    if (s.italic) classes.push('italic');
    if (s.strikethrough) classes.push('line-through text-[#E53935] font-semibold');
    if (s.underline) classes.push('underline decoration-blue-600 font-semibold');
    return classes.join(' ');
  };

  const getInlineCellStyle = (caseId, field) => {
    const key = `${caseId}_${field}`;
    const s = cellStylesMap[key] || {};
    let style = {};
    if (s.color) style.color = s.color;
    if (s.bgColor) style.backgroundColor = s.bgColor;
    return style;
  };

  // Lọc dữ liệu theo bộ lọc
  const filteredCases = testCasesData.filter(c => {
    if (activeFilter === 'ALL') return true;
    const st = rowStatuses[c.id] || 'Unexecuted';
    return st === activeFilter;
  });

  // Helper dựng Header Cột có đường kéo chỉnh độ rộng TRÙNG KHỚP 100% VỚI ĐƯỜNG KẺ BẢNG
  const renderResizableTh = (key, label, extraClass = '') => (
    <th
      style={{ width: `${colWidths[key]}px`, minWidth: `${colWidths[key]}px`, maxWidth: `${colWidths[key]}px` }}
      className={`relative select-none border-r border-b border-slate-300 px-2 py-2 text-left font-bold text-slate-700 overflow-hidden box-border ${extraClass}`}
    >
      <div className="truncate pr-1 text-slate-800 font-semibold" title={label}>{label}</div>
      
      {/* RESIZE HANDLE */}
      <div
        onMouseDown={(e) => handleMouseDownResize(key, e)}
        className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize z-30 hover:bg-teal-500 active:bg-teal-600 transition-colors"
        title="Kéo sang trái/phải để thay đổi độ rộng cột"
      />
    </th>
  );

  return (
    <div className="space-y-0 min-h-screen flex flex-col justify-between bg-slate-50 relative" onClick={() => { setActiveMenuId(null); setShowTextColorPicker(false); setShowBgColorPicker(false); }}>
      
      {/* TOAST NOTIFICATION (EXACTLY 1 CHECKMARK ICON) */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-800 text-white px-4 py-2.5 rounded shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce border border-emerald-600">
          <span>✔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        {/* ENHANCED ENTERPRISE RUNNER HEADER BAR (DARK TEAL #00382B) */}
        <div className="bg-[#00382B] text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md">
          <div className="flex items-center gap-3">
            {/* PROMINENT BACK BUTTON TO RESTORE GLOBAL NAVBAR */}
            <button
              onClick={() => navigate('/tests')}
              className="bg-emerald-950 hover:bg-emerald-800 border border-emerald-600/60 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-2 shadow-xs group"
              title="Trở về Danh sách Test Spec & Hiện lại Thanh Điều hướng Toàn cục"
            >
              <span className="text-emerald-400 group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>Quay lại danh sách File Test</span>
            </button>

            <span className="text-emerald-600">|</span>
            
            <div className="flex items-center gap-2">
              <span className="bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-emerald-700">Spec #{spec.no}</span>
              <span className="text-xs font-bold tracking-tight text-emerald-100">{spec.name}_Kiểm thử sau Release_1</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-emerald-100 font-normal">
            <span className="hidden sm:inline">SpiderPlus Co., Ltd.</span>
            <span className="hidden sm:inline text-emerald-700">|</span>
            <span className="font-semibold text-emerald-200">S++ Flutter</span>
            <span className="text-emerald-700">|</span>
            <span className="font-bold text-white">Nguyen Xuan Nguyen Giap</span>
            <div className="w-6 h-6 rounded-full bg-emerald-700 border border-emerald-400 flex items-center justify-center font-bold text-white text-[10px] shadow-xs">NG</div>
          </div>
        </div>

        {/* SUB-TAB BAR */}
        <div className="bg-white border-b border-slate-200 px-4 py-1 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button className="px-3.5 py-1 bg-[#20B7A6] text-white font-bold rounded-t-xs text-[11px] whitespace-nowrap shadow-xs">
              Tablet
            </button>
          </div>
          {selectedCell && (
            <div className="text-[10px] text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 font-medium">
              Đang chọn ô: <strong className="text-teal-700">Case #{selectedCell.caseId} - Cột [{FIELD_NAMES_MAP[selectedCell.field] || selectedCell.field}]</strong> (Gõ trực tiếp vào ô)
            </div>
          )}
        </div>

        {/* TOOLBAR BAR (INTERACTIVE FORMATTING BUTTONS B, I, S, U, COLORS) */}
        <div className="bg-[#FAFAFA] border-b border-slate-300 px-4 py-1.5 flex items-center justify-between gap-2 text-[11px] relative z-40">
          
          {/* NHÓM BÊN TRÁI: CÁC NÚT ĐỊNH DẠNG VĂN BẢN ĐÃ KÍCH HOẠT */}
          <div className="flex items-center gap-1.5 relative">
            
            {/* NÚT IN ĐẬM (B) */}
            <button
              onClick={() => applyFormatToSelectedCell('bold')}
              className={`cat-btn px-2.5 py-1 font-bold transition ${selectedCell && cellStylesMap[`${selectedCell.caseId}_${selectedCell.field}`]?.bold ? 'bg-teal-700 text-white border-teal-800 shadow-xs' : 'hover:bg-slate-200 text-slate-800'}`}
              title="In đậm (Bold) - Nhấp để định dạng ô đang chọn"
            >
              B
            </button>

            {/* NÚT IN NGHIÊNG (I) */}
            <button
              onClick={() => applyFormatToSelectedCell('italic')}
              className={`cat-btn px-2.5 py-1 italic transition ${selectedCell && cellStylesMap[`${selectedCell.caseId}_${selectedCell.field}`]?.italic ? 'bg-teal-700 text-white border-teal-800 shadow-xs' : 'hover:bg-slate-200 text-slate-800'}`}
              title="In nghiêng (Italic)"
            >
              I
            </button>

            {/* NÚT GẠCH NGANG (S) */}
            <button
              onClick={() => applyFormatToSelectedCell('strikethrough')}
              className={`cat-btn px-2.5 py-1 line-through transition ${selectedCell && cellStylesMap[`${selectedCell.caseId}_${selectedCell.field}`]?.strikethrough ? 'bg-teal-700 text-white border-teal-800 shadow-xs' : 'hover:bg-slate-200 text-slate-800'}`}
              title="Gạch ngang (Strikethrough)"
            >
              S
            </button>

            {/* NÚT GẠCH CHÂN (U) */}
            <button
              onClick={() => applyFormatToSelectedCell('underline')}
              className={`cat-btn px-2.5 py-1 underline transition ${selectedCell && cellStylesMap[`${selectedCell.caseId}_${selectedCell.field}`]?.underline ? 'bg-teal-700 text-white border-teal-800 shadow-xs' : 'hover:bg-slate-200 text-slate-800'}`}
              title="Gạch chân (Underline)"
            >
              U
            </button>
            
            {/* NÚT MÀU CHỮ (T_ ▼) */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowTextColorPicker(!showTextColorPicker); setShowBgColorPicker(false); }}
                className="cat-btn px-2 py-1 hover:bg-slate-200 transition"
                title="Chọn màu chữ cho ô đang chọn"
              >
                <span className="border-b-2 border-blue-600 font-bold text-[10px]">T</span> ▼
              </button>

              {/* POPOVER CHỌN MÀU CHỮ */}
              {showTextColorPicker && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-slate-300 rounded shadow-xl p-2 z-50 flex gap-1.5 bg-white" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => applyFormatToSelectedCell('color', '#EF4444')} className="w-5 h-5 rounded bg-red-500 border border-slate-300 hover:scale-110 transition" title="Đỏ"></button>
                  <button onClick={() => applyFormatToSelectedCell('color', '#2563EB')} className="w-5 h-5 rounded bg-blue-600 border border-slate-300 hover:scale-110 transition" title="Xanh dương"></button>
                  <button onClick={() => applyFormatToSelectedCell('color', '#059669')} className="w-5 h-5 rounded bg-emerald-600 border border-slate-300 hover:scale-110 transition" title="Xanh lá"></button>
                  <button onClick={() => applyFormatToSelectedCell('color', '#D97706')} className="w-5 h-5 rounded bg-amber-600 border border-slate-300 hover:scale-110 transition" title="Cam/Vàng"></button>
                  <button onClick={() => applyFormatToSelectedCell('color', '#0F172A')} className="w-5 h-5 rounded bg-slate-900 border border-slate-300 hover:scale-110 transition" title="Mặc định Mới"></button>
                </div>
              )}
            </div>

            {/* NÚT MÀU NỀN HIGHLIGHT (T_ ▼) */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowBgColorPicker(!showBgColorPicker); setShowTextColorPicker(false); }}
                className="cat-btn px-2 py-1 hover:bg-slate-200 transition"
                title="Tô màu nền highlight cho ô đang chọn"
              >
                <span className="bg-yellow-200 px-1 font-bold text-[10px]">T</span> ▼
              </button>

              {/* POPOVER CHỌN MÀU NỀN */}
              {showBgColorPicker && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-slate-300 rounded shadow-xl p-2 z-50 flex gap-1.5 bg-white" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => applyFormatToSelectedCell('bgColor', '#FFF9C4')} className="w-5 h-5 rounded bg-[#FFF9C4] border border-amber-300 hover:scale-110 transition" title="Vàng Highlight"></button>
                  <button onClick={() => applyFormatToSelectedCell('bgColor', '#D0EBE8')} className="w-5 h-5 rounded bg-[#D0EBE8] border border-teal-300 hover:scale-110 transition" title="Xanh Mint"></button>
                  <button onClick={() => applyFormatToSelectedCell('bgColor', '#FFEBEE')} className="w-5 h-5 rounded bg-[#FFEBEE] border border-red-200 hover:scale-110 transition" title="Hồng Nhạt"></button>
                  <button onClick={() => applyFormatToSelectedCell('bgColor', '#E3F2FD')} className="w-5 h-5 rounded bg-[#E3F2FD] border border-blue-200 hover:scale-110 transition" title="Xanh Nhạt"></button>
                  <button onClick={() => applyFormatToSelectedCell('bgColor', '#FFFFFF')} className="w-5 h-5 rounded bg-white border border-slate-300 hover:scale-110 transition" title="Màu Nền Trắng"></button>
                </div>
              )}
            </div>

          </div>

          {/* KHOẢNG TRỐNG TỰ ĐỘNG BÊN PHẢI: LỌC KẾT QUẢ */}
          <div className="ml-auto flex items-center gap-1.5">
            <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="cat-select text-[10px] font-medium whitespace-nowrap bg-white border-slate-300 shadow-2xs" title="Bộ lọc kết quả kiểm thử">
              <option value="ALL">Lọc kết quả ▼ (Tất cả)</option>
              <option value="Unexecuted">Chưa thực thi (Unexecuted)</option>
              <option value="OK">Đạt (OK)</option>
              <option value="NG">Lỗi (NG)</option>
              <option value="P">Tạm hoãn (P)</option>
              <option value="Fix">Đã sửa (Fix)</option>
              <option value="NA">Không áp dụng (NA)</option>
            </select>

            <button onClick={() => setActiveFilter('ALL')} className="cat-btn text-slate-700 font-medium whitespace-nowrap bg-white hover:bg-slate-100" title="Xóa bộ lọc về mặc định">
              Xóa lọc ▼
            </button>

            <button onClick={() => triggerToast('Hướng dẫn: Đã cập nhật xong thông báo toast gọn gàng!')} className="cat-btn px-2 bg-blue-500 hover:bg-blue-600 text-white font-bold border-blue-500 text-xs rounded-xs" title="Trợ giúp hướng dẫn">
              i
            </button>
          </div>

        </div>

        {/* SPREADSHEET GRID TABLE WITH DIRECT TD CONTENTEDITABLE EDITING & PRE-WRAP LINE BREAKING */}
        <div className="overflow-x-auto bg-white border-b border-slate-300">
          <table className="cat-table text-[11px] border-collapse w-full table-fixed">
            <thead>
              <tr className="bg-[#FAFAFA]">
                {renderResizableTh('id', 'ID', 'text-center')}
                {renderResizableTh('target', 'Đối tượng kiểm thử')}
                {renderResizableTh('prerequisites', 'Điều kiện tiên quyết')}
                {renderResizableTh('steps', 'Trình tự kiểm thử')}
                {renderResizableTh('viewpoint', 'Quan điểm kiểm thử')}
                {renderResizableTh('confirmation', 'Hạng mục xác nhận')}
                {renderResizableTh('expected', 'Kết quả kỳ vọng')}
                {renderResizableTh('designNotes', 'Ghi chú thiết kế', 'text-center')}
                {renderResizableTh('ipad', 'iPad', 'text-center bg-slate-200 text-slate-800 font-extrabold')}
                {renderResizableTh('stNotes', 'Ghi chú ST')}
                {renderResizableTh('executionNotes', 'Ghi chú thực thi')}
                {renderResizableTh('pendingReason', 'Lý do tạm hoãn')}
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50 border-b border-slate-200 ${highlightOn && rowStatuses[c.id] !== 'Unexecuted' ? 'bg-amber-50/40' : ''}`}>
                  
                  {/* ID COLUMN CELL */}
                  <td
                    style={{ width: `${colWidths.id}px`, minWidth: `${colWidths.id}px`, maxWidth: `${colWidths.id}px` }}
                    className={`text-center font-bold text-slate-700 align-top pt-2 relative border-r border-slate-300 box-border ${activeMenuId === c.id ? 'z-50 overflow-visible' : 'z-10 overflow-visible'}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono text-xs">{c.id}</span>
                      
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === c.id ? null : c.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 border border-slate-300 text-slate-700 transition focus:outline-none flex items-center justify-center bg-white shadow-2xs"
                          title="Tùy chọn Test Case"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                          </svg>
                        </button>

                        {activeMenuId === c.id && (
                          <div className="absolute left-full top-0 ml-2 z-50 w-40 bg-white border border-slate-300 rounded-md shadow-2xl text-left text-xs py-1.5 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                            <div className="absolute -left-1.5 top-2.5 w-3 h-3 bg-white border-l border-b border-slate-300 rotate-45" />

                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedDetailCase(c); setActiveMenuId(null); }}
                              className="w-full px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-800 font-medium transition text-[11px]"
                            >
                              <span>Hiển thị chi tiết</span>
                            </button>
                            
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedHistoryCase(c); setActiveMenuId(null); }}
                              className="w-full px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-800 font-medium transition text-[11px]"
                            >
                              <span>Hiển thị lịch sử</span>
                            </button>
                            
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyLink(c.id); }}
                              className="w-full px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-800 font-medium transition text-[11px]"
                            >
                              <span>Sao chép URL</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </td>

                  {/* TARGET CELL */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'target' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'target', e.target.innerText)}
                    style={{ width: `${colWidths.target}px`, minWidth: `${colWidths.target}px`, maxWidth: `${colWidths.target}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...getInlineCellStyle(c.id, 'target') }}
                    className={`align-top p-1.5 border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset ${getCellStyleClasses(c.id, 'target')} ${selectedCell?.caseId === c.id && selectedCell?.field === 'target' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    title="Nhấp để sửa trực tiếp văn bản"
                  >
                    {c.target}
                  </td>

                  {/* PREREQUISITES CELL (EXPLICIT PRE-WRAP LINE BREAK PRESERVATION) */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'prerequisites' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'prerequisites', e.target.innerText)}
                    style={{ width: `${colWidths.prerequisites}px`, minWidth: `${colWidths.prerequisites}px`, maxWidth: `${colWidths.prerequisites}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...getInlineCellStyle(c.id, 'prerequisites') }}
                    className={`align-top p-1.5 text-[10px] leading-relaxed overflow-y-auto max-h-48 whitespace-pre-wrap break-words border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset ${getCellStyleClasses(c.id, 'prerequisites')} ${selectedCell?.caseId === c.id && selectedCell?.field === 'prerequisites' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    data-lenis-prevent
                    title="Nhấp để sửa trực tiếp văn bản (Bấm Enter để xuống dòng tự nhiên, cuộn chuột mượt mà)"
                  >
                    {c.prerequisites}
                  </td>

                  {/* STEPS CELL (EXPLICIT PRE-WRAP LINE BREAK PRESERVATION) */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'steps' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'steps', e.target.innerText)}
                    style={{ width: `${colWidths.steps}px`, minWidth: `${colWidths.steps}px`, maxWidth: `${colWidths.steps}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...getInlineCellStyle(c.id, 'steps') }}
                    className={`align-top p-1.5 text-[10px] leading-relaxed overflow-y-auto max-h-48 whitespace-pre-wrap break-words border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset ${getCellStyleClasses(c.id, 'steps')} ${selectedCell?.caseId === c.id && selectedCell?.field === 'steps' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    data-lenis-prevent
                    title="Nhấp để sửa trực tiếp văn bản (Bấm Enter để xuống dòng tự nhiên, cuộn chuột mượt mà)"
                  >
                    {c.steps}
                  </td>

                  {/* VIEWPOINT CELL */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'viewpoint' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'viewpoint', e.target.innerText)}
                    style={{ width: `${colWidths.viewpoint}px`, minWidth: `${colWidths.viewpoint}px`, maxWidth: `${colWidths.viewpoint}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...getInlineCellStyle(c.id, 'viewpoint') }}
                    className={`align-top p-1.5 border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset ${getCellStyleClasses(c.id, 'viewpoint')} ${selectedCell?.caseId === c.id && selectedCell?.field === 'viewpoint' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    title="Nhấp để sửa trực tiếp văn bản"
                  >
                    {c.viewpoint}
                  </td>

                  {/* CONFIRMATION CELL */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'confirmation' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'confirmation', e.target.innerText)}
                    style={{ width: `${colWidths.confirmation}px`, minWidth: `${colWidths.confirmation}px`, maxWidth: `${colWidths.confirmation}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...getInlineCellStyle(c.id, 'confirmation') }}
                    className={`align-top p-1.5 border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset ${getCellStyleClasses(c.id, 'confirmation')} ${selectedCell?.caseId === c.id && selectedCell?.field === 'confirmation' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    title="Nhấp để sửa trực tiếp văn bản"
                  >
                    {c.confirmation}
                  </td>

                  {/* EXPECTED CELL (EXPLICIT PRE-WRAP LINE BREAK PRESERVATION) */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'expected' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'expected', e.target.innerText)}
                    style={{ width: `${colWidths.expected}px`, minWidth: `${colWidths.expected}px`, maxWidth: `${colWidths.expected}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...getInlineCellStyle(c.id, 'expected') }}
                    className={`align-top p-1.5 text-[10px] leading-relaxed overflow-y-auto max-h-48 whitespace-pre-wrap break-words border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset ${getCellStyleClasses(c.id, 'expected')} ${selectedCell?.caseId === c.id && selectedCell?.field === 'expected' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    data-lenis-prevent
                    title="Nhấp để sửa trực tiếp văn bản (Bấm Enter để xuống dòng tự nhiên, cuộn chuột mượt mà)"
                  >
                    {c.expected}
                  </td>

                  {/* DESIGN NOTES CELL */}
                  <td style={{ width: `${colWidths.designNotes}px`, minWidth: `${colWidths.designNotes}px`, maxWidth: `${colWidths.designNotes}px` }} className="text-slate-400 text-center align-top pt-3 overflow-hidden border-r border-slate-300 box-border select-none">
                    -
                  </td>

                  {/* iPad CELL WITH DYNAMIC BACKGROUND COLOR MATCHING TRẠNG THÁI */}
                  <td
                    style={{ width: `${colWidths.ipad}px`, minWidth: `${colWidths.ipad}px`, maxWidth: `${colWidths.ipad}px` }}
                    className={`align-top p-2 text-center border-r border-slate-300 overflow-hidden box-border transition-colors duration-200 ${getIpadCellBgClass(rowStatuses[c.id] || 'Unexecuted')}`}
                  >
                    <div className="flex flex-col items-center gap-1 py-1">
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleStatus(c.id); }}
                        title="Nhấn để chuyển trạng thái: Unexecuted -> OK -> NG -> P (Pending) -> Fix -> NA"
                        className={`w-14 h-12 border-2 rounded-xs flex items-center justify-center cursor-pointer shadow-xs hover:shadow-md transition ${getStatusClass(rowStatuses[c.id] || 'Unexecuted')}`}
                      >
                        <span className={`tracking-wide text-center px-0.5 ${getStatusFont(rowStatuses[c.id] || 'Unexecuted')}`}>
                          {rowStatuses[c.id] || 'Unexecuted'}
                        </span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); alert('Đính kèm file minh chứng'); }} className="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">Tập tin</button>
                      <button onClick={(e) => { e.stopPropagation(); navigate('/issues'); }} className="w-14 bg-[#B5C5C2] hover:bg-[#a0b2af] text-white text-[9px] py-0.5 rounded-xs font-medium transition">Báo cáo</button>
                    </div>
                  </td>

                  {/* ST NOTES CELL */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'stNotes' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'stNotes', e.target.innerText)}
                    style={{ width: `${colWidths.stNotes}px`, minWidth: `${colWidths.stNotes}px`, maxWidth: `${colWidths.stNotes}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    className="text-slate-600 align-top p-1.5 text-center overflow-hidden border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset"
                    title="Nhấp để sửa trực tiếp văn bản"
                  >
                    {c.stNotes}
                  </td>

                  {/* EXECUTION NOTES CELL */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'executionNotes' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'executionNotes', e.target.innerText)}
                    style={{ width: `${colWidths.executionNotes}px`, minWidth: `${colWidths.executionNotes}px`, maxWidth: `${colWidths.executionNotes}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...getInlineCellStyle(c.id, 'executionNotes') }}
                    className={`font-mono text-[10px] align-top p-1.5 overflow-hidden border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-[#FFF9C4] focus:ring-2 focus:ring-teal-500 focus:ring-inset ${getCellStyleClasses(c.id, 'executionNotes')} ${selectedCell?.caseId === c.id && selectedCell?.field === 'executionNotes' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    title="Nhấp để sửa trực tiếp văn bản"
                  >
                    {c.executionNotes}
                  </td>

                  {/* PENDING REASON CELL */}
                  <td
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onClick={() => setSelectedCell({ caseId: c.id, field: 'pendingReason' })}
                    onBlur={(e) => handleCellTextChange(c.id, 'pendingReason', e.target.innerText)}
                    style={{ width: `${colWidths.pendingReason}px`, minWidth: `${colWidths.pendingReason}px`, maxWidth: `${colWidths.pendingReason}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    className={`text-slate-700 align-top p-1.5 text-center text-[10px] overflow-hidden border-r border-slate-300 box-border transition cursor-text outline-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:ring-inset ${selectedCell?.caseId === c.id && selectedCell?.field === 'pendingReason' ? 'ring-2 ring-teal-500 ring-inset bg-teal-50/30' : ''}`}
                    title="Nhấp để nhập trực tiếp lý do tạm hoãn"
                  >
                    {c.pendingReason}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="bg-[#004D40] text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-medium border-t border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button className="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px] transition">«</button>
            <button className="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px] transition">&lt;</button>
            <span>Trang</span>
            <input type="text" value="1" className="w-7 text-center bg-emerald-950 text-white border border-emerald-600 rounded text-[10px] font-bold" readOnly />
            <span>/ 3</span>
            <button className="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px] transition">&gt;</button>
            <button className="px-1.5 py-0.5 bg-emerald-800 hover:bg-emerald-700 rounded text-[10px] transition">»</button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-emerald-200 font-mono text-[10px]">
          <div>{filteredCases.length} Hạng mục | 1 - {filteredCases.length} được hiển thị</div>
          <div>Copyright © SHIFT Inc. All rights reserved.</div>
          <div>CATEST v4.21.104</div>
        </div>
      </div>

      {/* MODAL 1: CASE DETAILS MODAL */}
      {selectedDetailCase && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 overflow-y-auto" onClick={() => setSelectedDetailCase(null)} data-lenis-prevent>
          <div className="bg-white rounded-xs shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-400 my-auto" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
            
            {/* WINDOW TOP HEADER BAR */}
            <div className="bg-[#D9E2E2] text-slate-800 px-3 py-1.5 flex items-center justify-between font-bold text-xs border-b border-slate-300">
              <span className="text-slate-700">Chi tiết Case - Tablet</span>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <button onClick={() => setSelectedDetailCase(null)} className="hover:text-slate-900">▲</button>
                <button onClick={() => setSelectedDetailCase(null)} className="hover:text-slate-900 font-bold">✕</button>
              </div>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[85vh] overflow-y-auto bg-white" data-lenis-prevent>
              
              {/* TOP NAVIGATION & STATUS DISPLAY AREA */}
              <div className="flex flex-col items-center gap-3 border-b border-slate-200 pb-3">
                
                {/* CENTERED CONTROL BAR */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handlePrevDetailCase}
                    disabled={currentDetailIndex <= 0}
                    className={`px-4 py-1 rounded-xs text-xs font-semibold transition ${currentDetailIndex <= 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300' : 'bg-slate-300 text-slate-800 hover:bg-slate-400 cursor-pointer shadow-xs border border-slate-400'}`}
                  >
                    &lt; Trước
                  </button>

                  <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3.5 py-1 rounded border border-slate-300 shadow-2xs">
                    {currentDetailIndex + 1} / {testCasesData.length}
                  </div>

                  <button
                    onClick={handleNextDetailCase}
                    disabled={currentDetailIndex >= testCasesData.length - 1}
                    className={`px-4 py-1 rounded-xs text-xs font-bold transition ${currentDetailIndex >= testCasesData.length - 1 ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300' : 'bg-[#80C200] text-white hover:bg-[#72ad00] cursor-pointer shadow-xs'}`}
                  >
                    Tiếp &gt;
                  </button>
                </div>

                {/* CENTERED iPad STATUS BLOCK (DYNAMIC READ-ONLY STATUS COLOR) */}
                <div className="flex flex-col items-center gap-0.5 border border-slate-300 p-1 bg-slate-50 rounded-xs shadow-2xs">
                  <div className="bg-[#20B7A6] text-white px-4 py-0.5 font-bold text-[11px] rounded-t-xs text-center w-16 select-none">
                    iPad
                  </div>
                  <div
                    className={`w-16 h-12 border-2 rounded-xs flex items-center justify-center cursor-not-allowed select-none transition ${getStatusClass(rowStatuses[selectedDetailCase.id] || 'Unexecuted')}`}
                    title="Chế độ chỉ xem (Read-only) - Không thể thay đổi trạng thái tại cửa sổ Chi tiết Case"
                  >
                    <span className={`tracking-wide text-center px-0.5 ${getStatusFont(rowStatuses[selectedDetailCase.id] || 'Unexecuted')}`}>
                      {rowStatuses[selectedDetailCase.id] || 'Unexecuted'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <button className="w-16 bg-[#B5C5C2] text-white text-[9px] py-0.5 rounded-xs font-medium cursor-not-allowed opacity-80" title="Chế độ chỉ xem">Tập tin</button>
                    <button className="w-16 bg-[#B5C5C2] text-white text-[9px] py-0.5 rounded-xs font-medium cursor-not-allowed opacity-80" title="Chế độ chỉ xem">Báo cáo</button>
                  </div>
                </div>

              </div>

              {/* FORM DATA TABLE */}
              <div className="border border-slate-300">
                <table className="w-full border-collapse text-[11px]">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-48 bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">ID</td>
                      <td className="px-3 py-2 font-mono text-slate-800 font-bold">{selectedDetailCase.id}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Đối tượng kiểm thử</td>
                      <td className="px-3 py-2 text-slate-900 font-bold">{selectedDetailCase.target}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Điều kiện tiên quyết</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedDetailCase.prerequisites}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Trình tự kiểm thử</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedDetailCase.steps}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Quan điểm kiểm thử</td>
                      <td className="px-3 py-2 text-slate-800">{selectedDetailCase.viewpoint}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Hạng mục xác nhận</td>
                      <td className="px-3 py-2 text-slate-800">{selectedDetailCase.confirmation}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Kết quả kỳ vọng</td>
                      <td className="px-3 py-2 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        <div>Camera modal được hiển thị chính xác</div>
                        <a href="https://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all text-[10px] block mt-1">
                          https://www.figma.com/design/IeIMPa62IDyrBQ0Ve2EiwB/...
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Ghi chú thiết kế</td>
                      <td className="px-3 py-2 text-slate-400">{selectedDetailCase.designNotes || '-'}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Ghi chú ST</td>
                      <td className="px-3 py-2 text-slate-400">{selectedDetailCase.stNotes || '-'}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Ghi chú thực thi</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{selectedDetailCase.executionNotes || '1.1.0(487)'}</td>
                    </tr>
                    <tr>
                      <td className="bg-[#388E8E] text-white font-bold px-3 py-2 border-r border-slate-300 align-top">Lý do tạm hoãn</td>
                      <td className="px-3 py-2 text-slate-500">{selectedDetailCase.pendingReason || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* BOTTOM NAVIGATION BUTTONS */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={handlePrevDetailCase}
                  disabled={currentDetailIndex <= 0}
                  className={`px-5 py-1 rounded-xs text-xs font-semibold transition ${currentDetailIndex <= 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300' : 'bg-slate-300 text-slate-800 hover:bg-slate-400 cursor-pointer shadow-xs border border-slate-400'}`}
                >
                  &lt; Trước
                </button>
                <button
                  onClick={handleNextDetailCase}
                  disabled={currentDetailIndex >= testCasesData.length - 1}
                  className={`px-5 py-1 rounded-xs text-xs font-bold transition ${currentDetailIndex >= testCasesData.length - 1 ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300' : 'bg-[#80C200] text-white hover:bg-[#72ad00] cursor-pointer shadow-xs'}`}
                >
                  Tiếp &gt;
                </button>
              </div>

            </div>

            <div className="bg-slate-100 px-4 py-2 text-right border-t border-slate-200">
              <button onClick={() => setSelectedDetailCase(null)} className="cat-btn cat-btn-mint">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HIGH-FOCUS AUDIT CHANGE DIFF TIMELINE MODAL */}
      {selectedHistoryCase && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 overflow-y-auto" onClick={() => setSelectedHistoryCase(null)} data-lenis-prevent>
          <div className="bg-white rounded-xs shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-400 my-auto" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
            
            {/* WINDOW TOP HEADER BAR */}
            <div className="bg-[#00382B] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-2">
                <span>Nhật ký Lịch sử Chỉnh sửa Chi tiết (Audit Diff Log) - Test Case #{selectedHistoryCase.id}: {selectedHistoryCase.target}</span>
              </div>
              <button onClick={() => setSelectedHistoryCase(null)} className="text-[#388E8E] hover:text-white text-base font-bold">✕</button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto bg-white" data-lenis-prevent>
              
              {/* AUDIT LEGEND BANNER */}
              <div className="bg-amber-50 border border-amber-300 p-2.5 rounded text-[11px] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block border border-amber-600"></span>
                  <span className="font-bold text-amber-900">Màn hình tập trung biến động:</span>
                  <span className="text-amber-800">Chỉ hiển thị đích danh các cột có sự thay đổi thay vì lặp lại toàn bộ dữ liệu bảng.</span>
                </div>
                <div className="text-slate-500 font-mono text-[10px]">Tổng số phiên bản: {selectedHistoryCase.history.length + 1}</div>
              </div>

              {/* FOCUSED AUDIT DIFF TIMELINE TABLE */}
              <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-slate-300 rounded" data-lenis-prevent>
                <table className="cat-table text-[11px] border-collapse w-full">
                  <thead>
                    <tr className="bg-[#FAFAFA] text-slate-800 font-bold border-b border-slate-300">
                      <th className="w-20 text-center py-2">Phiên bản</th>
                      <th className="w-32 py-2">Thời gian</th>
                      <th className="w-36 py-2">Người chỉnh sửa</th>
                      <th className="w-40 py-2">Cột / Hạng mục sửa</th>
                      <th className="w-64 py-2 bg-red-50/70 text-red-900">Nội dung trước khi sửa</th>
                      <th className="w-64 py-2 bg-amber-50/70 text-amber-900">Nội dung sau khi sửa</th>
                      <th className="py-2">Ghi chú Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    
                    {/* PARSE & RENDER ONLY CHANGED FIELDS FOR EACH HISTORICAL REVISION */}
                    {selectedHistoryCase.history.flatMap((h) => {
                      const changeKeys = Object.keys(h.changes || {});
                      if (changeKeys.length === 0) {
                        return [{
                          rev: h.rev,
                          time: h.time,
                          user: h.user,
                          fieldKey: 'general',
                          fieldName: 'Chỉnh sửa chung',
                          oldVal: '-',
                          newVal: '-',
                          note: h.note
                        }];
                      }
                      return changeKeys.map((fk) => ({
                        rev: h.rev,
                        time: h.time,
                        user: h.user,
                        fieldKey: fk,
                        fieldName: FIELD_NAMES_MAP[fk] || fk,
                        oldVal: h.changes[fk]?.old || '-',
                        newVal: h.changes[fk]?.new || '-',
                        note: h.note
                      }));
                    }).map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="text-center font-mono font-bold py-2.5 px-2">
                          <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px]">Rev #{item.rev}</span>
                        </td>
                        <td className="font-mono text-slate-600 px-2.5 py-2.5 text-[10px]">{item.time}</td>
                        <td className="font-bold text-slate-800 px-2.5 py-2.5 text-[11px]">{item.user}</td>
                        
                        <td className="px-2.5 py-2.5">
                          <span className="bg-teal-100 text-teal-900 border border-teal-300 font-bold px-2 py-1 rounded text-[10px] inline-block">
                            {item.fieldName}
                          </span>
                        </td>

                        {/* PREVIOUS VALUE IN RED LINE-THROUGH */}
                        <td className="px-2.5 py-2.5 bg-red-50/40 align-top">
                          <div className="text-red-700 line-through text-[10px] whitespace-pre-wrap break-words max-h-32 overflow-y-auto leading-relaxed p-1.5 bg-red-100/50 rounded border border-red-200" data-lenis-prevent>
                            {item.oldVal}
                          </div>
                        </td>

                        {/* NEW VALUE IN AMBER HIGHLIGHT */}
                        <td className="px-2.5 py-2.5 bg-amber-50/40 align-top">
                          <div className="text-slate-900 font-medium text-[10px] whitespace-pre-wrap break-words max-h-32 overflow-y-auto leading-relaxed p-1.5 bg-[#FFF9C4] rounded border border-amber-300 shadow-2xs" data-lenis-prevent>
                            {item.newVal}
                          </div>
                        </td>

                        <td className="px-2.5 py-2.5 text-slate-700 italic text-[10px] align-top">{item.note}</td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>

            </div>

            <div className="bg-slate-100 px-4 py-2 text-right border-t border-slate-200">
              <button onClick={() => setSelectedHistoryCase(null)} className="cat-btn cat-btn-mint">Đóng nhật ký</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SPEC SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onClick={() => setShowSummaryModal(false)} data-lenis-prevent>
          <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden border border-slate-300" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
            <div className="bg-[#00382B] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>Tóm tắt Test Specification #{spec.no}: {spec.name}</span>
              <button onClick={() => setShowSummaryModal(false)} className="text-slate-300 hover:text-white font-bold">✕</button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">Thống kê tiến độ thực thi chi tiết cho tập tin đợt này:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 border p-2 rounded"><span>Tổng số case:</span> <strong className="float-right text-slate-900">4</strong></div>
                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded"><span>Đã chạy:</span> <strong className="float-right text-emerald-800">4 (100%)</strong></div>
                <div className="bg-blue-50 border border-blue-200 p-2 rounded"><span>OK:</span> <strong className="float-right text-blue-700">1</strong></div>
                <div className="bg-red-50 border border-red-200 p-2 rounded"><span>NG:</span> <strong className="float-right text-red-700">1</strong></div>
              </div>
            </div>
            <div className="bg-slate-100 px-4 py-2 text-right border-t border-slate-200">
              <button onClick={() => setShowSummaryModal(false)} className="cat-btn cat-btn-mint">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BATCH ENTRY MODAL */}
      {showBatchEntryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onClick={() => setShowBatchEntryModal(false)} data-lenis-prevent>
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden border border-slate-300" onClick={(e) => e.stopPropagation()} data-lenis-prevent>
            <div className="bg-[#00382B] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>Nhập Kết Quả Hàng Loạt</span>
              <button onClick={() => setShowBatchEntryModal(false)} className="text-slate-300 hover:text-white font-bold">✕</button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">Chọn trạng thái để cập nhật đồng loạt cho tất cả các dòng Test Case:</p>
              <select className="cat-select w-full text-xs font-bold">
                <option value="OK">Chuyển tất cả thành OK</option>
                <option value="Unexecuted">Reset tất cả thành Unexecuted</option>
                <option value="NG">Chuyển tất cả thành NG</option>
              </select>
            </div>
            <div className="bg-slate-100 px-4 py-2 text-right border-t border-slate-200 space-x-2">
              <button onClick={() => setShowBatchEntryModal(false)} className="cat-btn">Hủy</button>
              <button onClick={() => { setShowBatchEntryModal(false); triggerToast('Đã cập nhật kết quả hàng loạt thành công!'); }} className="cat-btn cat-btn-mint">Cập nhật ngay</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
