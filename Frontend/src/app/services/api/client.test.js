import { describe, it, expect, vi } from 'vitest';
import { createApiClient, onUnauthorized } from './client';

const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'test-request' },
});

describe('API boundary', () => {
  it('preserves HTTP status and expires the session even when an error body is malformed', async () => {
    const expired=vi.fn(),off=onUnauthorized(expired);
    try {
      const fetchImpl=vi.fn().mockResolvedValue(new Response('{broken',{status:401,headers:{'Content-Type':'application/json','X-Request-ID':'broken-body'}}));
      await expect(createApiClient({fetchImpl})('/me')).rejects.toMatchObject({status:401,code:'HTTP_ERROR',requestId:'broken-body'});
      expect(expired).toHaveBeenCalledOnce();
    } finally { off(); }
  });
  it('reports invalid successful JSON as a response error, not a network outage',async()=> {
    const fetchImpl=vi.fn().mockResolvedValue(new Response('{broken',{headers:{'Content-Type':'application/json'}}));
    await expect(createApiClient({fetchImpl})('/me')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
  });
  it('keeps the timeout active while downloading a response body',async()=> {
    const fetchImpl=vi.fn(async(url,{signal})=>({ok:true,status:200,headers:new Headers(),blob:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))}));
    await expect(createApiClient({fetchImpl,timeoutMs:5})('/download',{responseType:'blob'})).rejects.toMatchObject({code:'TIMEOUT'});
  },1000);
  it('uploads FormData with CSRF without overriding the multipart boundary', async () => {
    const body = new FormData(); body.append('file', new File(['xlsx'], 'cases.xlsx'));
    const fetchImpl = vi.fn().mockResolvedValue(response({id:1}));
    await createApiClient({fetchImpl})('/projects/1/import-previews', {method:'POST',body,headers:{'X-CSRF-TOKEN':'test-token'}});
    const options=fetchImpl.mock.calls[0][1];
    expect(options.body).toBe(body); expect(options.headers['Content-Type']).toBeUndefined();
    expect(options.headers['X-CSRF-TOKEN']).toBe('test-token');
  });

  it('downloads a binary workbook and still preserves JSON errors', async () => {
    const fetchImpl=vi.fn().mockResolvedValue(new Response('xlsx-bytes',{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}}));
    const blob=await createApiClient({fetchImpl})('/projects/1/import-previews/template',{responseType:'blob'});
    expect(blob.size).toBe(10);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await expect(createApiClient({fetchImpl:vi.fn().mockResolvedValue(response({message:'Không có quyền'},403))})('/template',{responseType:'blob'})).rejects.toMatchObject({status:403,message:'Không có quyền'});
  });
  it('uses the same origin session and returns server data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ id: 'saved-id' }, 201));
    const request = createApiClient({ fetchImpl });
    await expect(request('/system/checks', { method: 'POST', body: '{"message":"test"}' })).resolves.toEqual({ id: 'saved-id' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/system/checks', expect.objectContaining({ credentials: 'same-origin', method: 'POST' }));
  });

  it.each([401, 403, 404, 409, 422, 503])('preserves HTTP %i and validation/request context', async (status) => {
    const payload = { code: 'TEST_ERROR', message: 'Thông báo từ server', fieldErrors: [{ field: 'message', message: 'Bắt buộc' }] };
    const request = createApiClient({ fetchImpl: vi.fn().mockResolvedValue(response(payload, status)) });
    await expect(request('/system/checks')).rejects.toMatchObject({ status, code: payload.code, fieldErrors: payload.fieldErrors, requestId: 'test-request' });
  });

  it('reports unavailable backend without returning sample data or retrying writes', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Network down'));
    await expect(createApiClient({ fetchImpl })('/system/checks', { method: 'POST' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects HTML responses instead of interpreting the frontend as API data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html/>', { headers: { 'Content-Type': 'text/html' } }));
    await expect(createApiClient({ fetchImpl })('/system/status')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('distinguishes timeout from caller cancellation', async () => {
    const fetchImpl = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    await expect(createApiClient({ fetchImpl, timeoutMs: 5 })('/slow')).rejects.toMatchObject({ code: 'TIMEOUT' });
    const controller = new AbortController();
    const pending = createApiClient({ fetchImpl })('/cancel', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
