import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, ApiError, onUnauthorized } from '../services/api/client';
import { fileWorkApi, executionDownload } from '../services/api/fileWork';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('file-work download transport', () => {
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const workbook = () => new Response('xlsx-bytes', { headers: {
    'Content-Type': mime,
    'Content-Disposition': "attachment; filename*=UTF-8''K%E1%BA%BFt%20qu%E1%BA%A3.xlsx",
  } });

  it('returns the actual successful Response with metadata and an unread body', async () => {
    const response = workbook(), fetchImpl = vi.fn().mockResolvedValue(response);
    const result = await createApiClient({ fetchImpl })('/download', { responseType: 'response' });
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
    expect(result.headers.get('Content-Disposition')).toContain('filename*');
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/download', expect.objectContaining({
      credentials: 'same-origin', headers: expect.objectContaining({ Accept: '*/*' }),
    }));
    const download = await executionDownload(result);
    expect(download.fileName).toBe('Kết quả.xlsx');
    expect(download.blob.size).toBe(10);
  });

  it('integrates real fileWorkApi.export, shared client and executionDownload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(workbook());
    vi.stubGlobal('fetch', fetchImpl);
    const response = await fileWorkApi.export(3, 27, 8);
    expect(response.bodyUsed).toBe(false);
    const download = await executionDownload(response);
    expect(download.fileName).toBe('Kết quả.xlsx');
    expect(download.blob.type).toBe(mime);
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/projects/3/file-work-groups/27/export?buildId=8', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it.each([403, 409, 401])('keeps HTTP %i typed at the real export boundary', async status => {
    const expired = vi.fn(), off = onUnauthorized(expired);
    const payload = { code: 'EXPORT_DENIED', message: 'Server refused export', fieldErrors: [{ field: 'buildId', message: 'Unavailable' }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
      status, headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'export-request' },
    })));
    try {
      const error = await fileWorkApi.export(3, 27, 8).catch(error => error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status, ...payload, requestId: 'export-request' });
      expect(expired).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    } finally { off(); }
  });

  it('keeps malformed raw-mode 401 typed and notifies the expired session', async () => {
    const expired = vi.fn(), off = onUnauthorized(expired);
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new Response('{broken', { status: 401, headers: { 'Content-Type': 'application/json' } }));
      await expect(createApiClient({ fetchImpl })('/download', { responseType: 'response' })).rejects.toMatchObject({ status: 401, code: 'HTTP_ERROR' });
      expect(expired).toHaveBeenCalledOnce();
    } finally { off(); }
  });

  it('leaves successful JSON unread in raw mode and preserves 204 behavior', async () => {
    const response = new Response('{broken', { headers: { 'Content-Type': 'application/json' } });
    const result = await createApiClient({ fetchImpl: vi.fn().mockResolvedValue(response) })('/raw', { responseType: 'response' });
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
    await expect(createApiClient({ fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 204 })) })('/empty', { responseType: 'response' })).resolves.toBeNull();
  });

  it('keeps raw-mode timeout and caller cancellation distinct', async () => {
    const fetchImpl = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    await expect(createApiClient({ fetchImpl, timeoutMs: 5 })('/slow', { responseType: 'response' })).rejects.toMatchObject({ code: 'TIMEOUT' });
    const controller = new AbortController();
    const pending = createApiClient({ fetchImpl })('/cancel', { responseType: 'response', signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
