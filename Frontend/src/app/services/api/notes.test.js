import {beforeEach,expect,it,vi} from 'vitest';
import {notesApi} from './notes';
import {apiRequest} from './client';
vi.mock('./client',()=>({apiRequest:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();apiRequest.mockResolvedValue({headerName:'X-CSRF-TOKEN',token:'synthetic-csrf'});});
it('uses the same abort signal for CSRF and scoped writes and preserves expectedVersion',async()=>{
 const abort=new AbortController(),body={title:'Note',body:'Nội dung',expectedVersion:4};
 await notesApi.update(9,7,body,{signal:abort.signal});
 expect(apiRequest).toHaveBeenNthCalledWith(1,'/auth/csrf',{signal:abort.signal});
 expect(apiRequest).toHaveBeenNthCalledWith(2,'/projects/9/notes/7',{signal:abort.signal,method:'PUT',headers:{'X-CSRF-TOKEN':'synthetic-csrf'},body:JSON.stringify(body)});
 await notesApi.remove(9,7,4,{signal:abort.signal});expect(apiRequest).toHaveBeenLastCalledWith('/projects/9/notes/7?expectedVersion=4',expect.objectContaining({method:'DELETE',signal:abort.signal}));
});
it('paginates on the server and scopes individual reads and creates',async()=>{
 await notesApi.list(9,{page:2,size:20});expect(apiRequest).toHaveBeenLastCalledWith('/projects/9/notes?page=2&size=20',undefined);
 await notesApi.get(9,7);expect(apiRequest).toHaveBeenLastCalledWith('/projects/9/notes/7',undefined);
 await notesApi.create(9,{title:'A',body:'B'});expect(apiRequest).toHaveBeenLastCalledWith('/projects/9/notes',expect.objectContaining({method:'POST',body:'{"title":"A","body":"B"}'}));
});
it('does not send the write when CSRF retrieval fails',async()=>{
 apiRequest.mockRejectedValueOnce(new Error('Phiên đăng nhập hết hạn'));await expect(notesApi.create(9,{title:'A',body:'B'})).rejects.toThrow('Phiên đăng nhập hết hạn');expect(apiRequest).toHaveBeenCalledOnce();
});
