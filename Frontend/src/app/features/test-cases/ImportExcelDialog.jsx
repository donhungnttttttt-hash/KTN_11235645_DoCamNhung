import React, { useEffect, useRef, useState } from 'react';
import { X, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { testCasesApi } from '../../services/api/testCases';
import { ExcelImportPreview } from './ExcelImportPreview';
import './excel-import.css';

const fileError = file => !file.name.toLowerCase().endsWith('.xlsx') || !file.size || file.size > 5 * 1024 * 1024
  ? 'Chọn tệp .xlsx không rỗng, không quá 5 MiB.' : '';
const ready = entry => entry.preview?.status === 'PREVIEW' && entry.preview.validRows > 0 && !entry.preview.errorRows && !entry.committed;

export function ImportExcelDialog(props) {
  return <ExcelImportDialog key={props.projectId} {...props} />;
}

function ExcelImportDialog({ projectId, onClose, onSuccess }) {
  const [step, setStep] = useState('input');
  const [files, setFiles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const generation = useRef(0), busy = useRef(false), previewHeading = useRef(null);
  const multiple = entries.length > 1;
  const completed = entries.filter(entry => entry.committed);
  const finish = () => {
    if (busy.current) return;
    if (completed.length) onSuccess(multiple ? { documents: completed.map(entry => entry.committed) } : completed[0].committed);
    onClose();
  };
  const dialogRef = useDialogFocus(finish, loading);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { if (step === 'preview') previewHeading.current?.focus(); }, [step]);
  const update = (index, patch) => setEntries(previous => previous.map((entry, i) => i === index ? { ...entry, ...patch } : entry));

  async function parse(retry = false) {
    if (busy.current) return;
    if (!files.length || files.length > 20) { setError('Chọn tệp Excel, tối đa 20 file mỗi lần.'); return; }
    const queue = retry ? entries : files.map(file => ({ file }));
    const request = generation.current;
    busy.current = true; setLoading(true); setError('');
    if (!retry) { setEntries(queue); setSelected(0); }
    if (queue.length > 1) setStep('preview');
    try {
      for (let i = 0; i < queue.length; i++) {
        if (request !== generation.current) return;
        if (retry && queue[i].preview) continue;
        setProgress(`Đang xem trước ${i + 1}/${queue.length}: ${queue[i].file.name}`);
        try {
          const invalid = fileError(queue[i].file);
          if (invalid) throw new Error(invalid);
          const preview = await testCasesApi.createImportPreview(projectId, queue[i].file);
          if (request !== generation.current) return;
          update(i, { preview, error: '', committed: preview.status === 'COMMITTED' ? preview : null });
          setStep('preview');
        } catch (err) {
          if (request !== generation.current) return;
          const message = err.message || 'Không tạo được bản xem trước.';
          update(i, { error: message });
          if (queue.length === 1) setError(message);
          if (err.status === 401 || err.status === 403) { setError(message); break; }
        }
      }
    } finally {
      if (request === generation.current) { busy.current = false; setLoading(false); setProgress(''); }
    }
  }

  async function commit() {
    if (busy.current || !entries.some(ready)) return;
    const request = generation.current;
    busy.current = true; setLoading(true); setError('');
    try {
      for (let i = 0; i < entries.length; i++) {
        if (request !== generation.current) return;
        if (!ready(entries[i])) continue;
        setProgress(`Đang nhập ${i + 1}/${entries.length}: ${entries[i].file.name}`);
        try {
          const committed = await testCasesApi.commitImportPreview(projectId, entries[i].preview.id);
          if (request !== generation.current) return;
          update(i, { committed, error: '' });
          if (!multiple) { onSuccess(committed); onClose(); return; }
        } catch (err) {
          if (request !== generation.current) return;
          const message = err.message || 'Không nhập được file. Bạn có thể thử lại.';
          update(i, { error: message, ...(err.status === 410 ? { preview: null } : {}) });
          if (!multiple) setError(message);
          if (err.status === 401 || err.status === 403) { setError(message); break; }
        }
      }
    } finally {
      if (request === generation.current) { busy.current = false; setLoading(false); setProgress(''); }
    }
  }

  async function downloadTemplate() {
    if (busy.current) return;
    const request = generation.current;
    busy.current = true; setLoading(true); setError('');
    try {
      const blob = await testCasesApi.importTemplate(projectId);
      if (request !== generation.current) return;
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'test-cases-template.xlsx'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { if (request === generation.current) setError(err.message); }
    finally { if (request === generation.current) { busy.current = false; setLoading(false); } }
  }

  const current = entries[selected];
  const validCount = entries.filter(ready).length;
  return <div className="tc-modal-overlay">
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-busy={loading} aria-label="Nhập test case từ Excel" className="tc-modal-content excel-import-dialog">
      <div className="tc-modal-header">
        <h3 className="flex items-center gap-2 font-bold"><FileSpreadsheet size={20} />Nhập test case từ Excel</h3>
        <button aria-label="Đóng" disabled={loading} onClick={finish}><X size={20} /></button>
      </div>
      <div className="tc-modal-body">
        <ol aria-label="Các bước nhập Excel" className="flex flex-wrap gap-3 mb-4 text-xs">
          <li aria-current={step === 'input' ? 'step' : undefined}>1. Chọn tệp</li>
          <li aria-current={step === 'preview' ? 'step' : undefined}>2. Xem trước và xác nhận</li>
        </ol>
        {error && <p role="alert" className="excel-import-error">{error}</p>}
        {progress && <p role="status" className="excel-import-progress">{progress}</p>}
        {step === 'input' ? <div className="space-y-4">
          <p>Chọn một hoặc nhiều file .xlsx (tối đa 20 file). Mỗi file: một sheet, tối đa 500 dòng, 64 cột và 5 MiB.</p>
          <details className="text-xs border rounded p-3">
            <summary>Quy tắc nhận diện cột và ô gộp</summary>
            <p>Tự nhận diện theo tên cột, không phụ thuộc thứ tự. Cần ID, Đối tượng test, Các bước test và Kết quả mong đợi. Chấp nhận “Điều kiện tiền đề / Điều kiện tiên quyết”, “Mục xác nhận / Hạng mục xác nhận” và khoảng trắng trong tiêu đề. Giữ tên file, thứ tự và cột bổ sung. Ô Đối tượng test trống kế thừa dòng trước để tạo case; dữ liệu nguồn vẫn giữ trống. Kết quả Excel chỉ để tham khảo. Mẫu TestCases nội bộ cũ vẫn được hỗ trợ.</p>
            <p>Cho phép ô gộp ngang ở cột trình bày sang cột trống. Ô gộp trong ID, nội dung test case hoặc qua nhiều dòng cần tách trước.</p>
          </details>
          <button className="cat-btn" disabled={loading} onClick={downloadTemplate}>Tải mẫu Excel theo tiêu đề</button>
          <label className="block font-medium">Chọn tệp Excel
            <input type="file" accept=".xlsx" multiple disabled={loading} onChange={e => { setFiles(Array.from(e.target.files || [])); setError(''); }} className="block mt-2 w-full cat-input" />
          </label>
          {files.length > 0 && <ul className="excel-import-selection">{files.map((file, index) => <li key={index}>{file.name}</li>)}</ul>}
          <p className="text-xs">Chỉ nhập sau khi bạn xác nhận. Mỗi file được xử lý riêng; file lỗi không làm mất file đã nhập thành công.</p>
        </div> : <div className="space-y-4">
          <h4 ref={previewHeading} tabIndex={-1} className="font-semibold">Xem trước dữ liệu</h4>
          {multiple && <>
            <p aria-live="polite">Đã nhập {completed.length}/{entries.length} file.</p>
            <ul className="excel-import-files" aria-label="Các file đã chọn">
              {entries.map((entry, index) => <li key={index}>
                <button disabled={loading} className="excel-import-file" aria-pressed={selected === index} onClick={() => setSelected(index)}>
                  <strong>{entry.file.name}</strong>
                  <span>{entry.committed ? entry.preview?.status === 'COMMITTED' ? 'Đã có trong thư viện' : 'Đã nhập' : entry.error ? 'Cần thử lại hoặc sửa file' : entry.preview?.errorRows ? `${entry.preview.errorRows} dòng lỗi` : entry.preview ? `${entry.preview.validRows} dòng hợp lệ` : 'Chờ xem trước'}</span>
                </button>
                {entry.error && <p className="excel-import-error">{entry.error}</p>}
                {!entry.committed && (entry.error || entry.preview?.errorRows > 0) && <label className="excel-import-replace">Thay file {entry.file.name}
                  <input type="file" accept=".xlsx" disabled={loading} onChange={event => {
                    const replacement = event.target.files?.[0];
                    if (!replacement) return;
                    setFiles(previous => previous.map((file, i) => i === index ? replacement : file));
                    update(index, { file: replacement, preview: null, error: '', committed: null });
                  }} />
                </label>}
              </li>)}
            </ul>
            {entries.some(entry => !entry.preview) && <button disabled={loading} className="cat-btn" onClick={() => parse(true)}>Thử lại file chưa xem trước</button>}
          </>}
          {!multiple && current?.committed && <><p role="status">Tệp này đã được nhập trước đó. Không tạo dữ liệu trùng.</p><button className="cat-btn cat-btn-mint" disabled={loading} onClick={finish}>Mở tài liệu đã nhập</button></>}
          {current?.preview && <ExcelImportPreview key={selected} previewData={current.preview} />}
        </div>}
      </div>
      <div className="tc-modal-footer">
        {step === 'input' ? <>
          <button disabled={loading} className="cat-btn" onClick={finish}>Hủy</button>
          <button disabled={loading} className="cat-btn cat-btn-mint" onClick={() => parse()}>Xem trước kết quả <ArrowRight size={14} /></button>
        </> : <>
          {(!completed.length || !multiple) && <button disabled={loading} className="cat-btn" onClick={() => setStep('input')}>Quay lại sửa</button>}
          {multiple && <button disabled={loading} className="cat-btn" onClick={finish}>{completed.length ? 'Hoàn tất' : 'Đóng'}</button>}
          <button disabled={loading || !validCount} className="cat-btn cat-btn-mint" onClick={commit}>
            {loading ? 'Đang xử lý...' : multiple ? `Xác nhận nhập ${validCount} file hợp lệ` : `Xác nhận nhập (${current?.preview?.validRows || 0} dòng hợp lệ)`}
          </button>
        </>}
      </div>
    </div>
  </div>;
}
