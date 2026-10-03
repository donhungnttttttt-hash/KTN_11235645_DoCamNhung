import React, { useEffect, useRef, useState } from 'react';
import { workItemsApi } from '../../services/api/workItems';
import { Button } from './components';
import { WorkError, WorkField } from './WorkItemForm';

export function EvidencePanel({ projectId, workId, writable, canTriage, membershipId }) {
  const [files, setFiles] = useState([]), [file, setFile] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false), [revision, setRevision] = useState(0), [message, setMessage] = useState('');
  const input = useRef(null), live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    workItemsApi.attachments(projectId, workId).then(items => { if (current) { setFiles(items); setLoaded(true); setError(''); } }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [projectId, workId, revision]);
  async function upload() {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError('Chứng cứ tối đa 20 MiB mỗi tệp.'); return; }
    setBusy(true); setError(''); setMessage('');
    try { await workItemsApi.upload(projectId, workId, file); if (!live.current) return;
      setFile(null); if (input.current) input.current.value = ''; setRevision(r => r + 1); setMessage('Đã lưu chứng cứ.'); }
    catch (e) { if (live.current) setError(e.message); } finally { if (live.current) setBusy(false); }
  }
  async function download(attachment) {
    setError('');
    try { const blob = await workItemsApi.download(projectId, workId, attachment.id); if (!live.current) return;
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = attachment.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (e) { if (live.current) setError(e.message); }
  }
  async function remove(attachment) {
    setBusy(true);setError('');
    try { await workItemsApi.removeAttachment(projectId, workId, attachment.id); if (live.current) setRevision(r => r + 1); }
    catch (e) { if (live.current) setError(e.message); } finally { if (live.current) setBusy(false); }
  }
  return <section className="wi-section"><h3>Chứng cứ</h3><p className="wi-note">PNG, JPG, PDF, MP4 · Tối đa 20 MiB/tệp · Chỉ thành viên dự án</p>
    <WorkError error={error} retry={() => setRevision(r => r + 1)} />{message && <p role="status">{message}</p>}
    {writable && <div className="wi-actions"><WorkField label="Chọn chứng cứ"><input ref={input} type="file" accept=".png,.jpg,.jpeg,.pdf,.mp4" disabled={busy} onChange={e => { setFile(e.target.files[0] || null); setError(''); }} /></WorkField><Button primary disabled={!file || busy} onClick={upload}>{busy ? 'Đang lưu…' : 'Tải chứng cứ lên'}</Button></div>}
    {files.map(attachment => <div className="wi-actions" key={attachment.id}><Button onClick={() => download(attachment)}>{attachment.name}</Button><span className="wi-note">{Math.ceil(attachment.size / 1024)} KiB</span>
      {writable && (canTriage || attachment.uploadedBy === membershipId) && <Button disabled={busy} onClick={() => remove(attachment)}>Gỡ {attachment.name}</Button>}</div>)}
    {loaded && !files.length && <p className="wi-note">Chưa có chứng cứ.</p>}
  </section>;
}
