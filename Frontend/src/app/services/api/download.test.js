import {afterEach,expect,it,vi} from 'vitest';
import {createApiClient} from './client';
import {fileWorkApi,executionDownload} from './fileWork';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

it('times out a workbook whose headers arrived but body stalls, then permits retry',async()=>{
  vi.useFakeTimers();
  const fetch=vi.fn().mockImplementationOnce(async(_url,{signal})=>new Response(new ReadableStream({
    start(controller){signal.addEventListener('abort',()=>controller.error(new DOMException('aborted','AbortError')),{once:true});},
  }),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}}))
    .mockResolvedValueOnce(new Response('workbook',{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':"attachment; filename*=UTF-8''k%E1%BA%BFt.xlsx"}}));
  vi.stubGlobal('fetch',fetch);
  const done=vi.fn(),failed=vi.fn();
  const pending=fileWorkApi.export(1,2,3).then(executionDownload).then(done,failed);
  await vi.advanceTimersByTimeAsync(8001);
  expect(failed).toHaveBeenCalledWith(expect.objectContaining({code:'TIMEOUT'}));
  expect(done).not.toHaveBeenCalled();
  await pending;
  const retry=await executionDownload(await fileWorkApi.export(1,2,3));
  expect(retry.fileName).toBe('kết.xlsx');expect(retry.blob.size).toBe(8);
});

it('keeps caller cancellation active until buffered download completes',async()=>{
  const fetchImpl=vi.fn(async(_url,{signal})=>new Response(new ReadableStream({
    start(controller){signal.addEventListener('abort',()=>controller.error(new DOMException('aborted','AbortError')),{once:true});},
  })));
  const controller=new AbortController();
  const pending=createApiClient({fetchImpl})('/download',{responseType:'download',signal:controller.signal});
  const check=expect(pending).rejects.toMatchObject({name:'AbortError'});
  controller.abort();await check;
});
