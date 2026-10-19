import React,{StrictMode,useRef} from 'react';
import {fireEvent,render,screen} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {ReportDraftProvider,useReportDrafts} from './ReportDraftProvider';
const auth=vi.hoisted(()=>({status:'authenticated',user:{id:1}}));
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>auth}));
const snapshot={featureId:'42',editor:{title:'Nháp',markdown:'Nội dung riêng'},baseline:{title:'Nháp',markdown:''},saved:null};
function Consumer(){const memory=useReportDrafts();return <><button onClick={()=>memory.write(1,'new:42',snapshot)}>Giữ nháp</button><button onClick={()=>memory.remove(1,'new:42')}>Xóa nháp</button><button onClick={()=>{document.querySelector('output').textContent=memory.read(1)?.editor.markdown||'Không có nháp';}}>Đọc nháp</button><output/></>;}
beforeEach(()=>{auth.status='authenticated';auth.user={id:1};});
it('keeps drafts across child route unmounts in memory and clears the entry explicitly',()=>{
 const view=render(<ReportDraftProvider><Consumer/></ReportDraftProvider>);fireEvent.click(screen.getByText('Giữ nháp'));
 view.rerender(<ReportDraftProvider><p>Route khác</p></ReportDraftProvider>);view.rerender(<ReportDraftProvider><Consumer/></ReportDraftProvider>);
 fireEvent.click(screen.getByText('Đọc nháp'));expect(screen.getByText('Nội dung riêng')).toBeVisible();
 fireEvent.click(screen.getByText('Xóa nháp'));fireEvent.click(screen.getByText('Đọc nháp'));expect(screen.getByText('Không có nháp')).toBeVisible();
});
it.each(['logout','owner'])('does not restore private drafts after %s changes',kind=>{
 const view=render(<ReportDraftProvider><Consumer/></ReportDraftProvider>);fireEvent.click(screen.getByText('Giữ nháp'));
 fireEvent.click(screen.getByText('Đọc nháp'));expect(screen.getByText('Nội dung riêng')).toBeVisible();
 if(kind==='logout'){auth.status='anonymous';auth.user=null;view.rerender(<ReportDraftProvider><p>Đăng xuất</p></ReportDraftProvider>);auth.status='authenticated';auth.user={id:1};}
 else auth.user={id:2};
 view.rerender(<ReportDraftProvider><Consumer/></ReportDraftProvider>);fireEvent.click(screen.getByText('Đọc nháp'));expect(screen.getByText('Không có nháp')).toBeVisible();
});
it('warns on tab close only while an unsaved draft remains and clears data at provider disposal',()=>{
 const view=render(<ReportDraftProvider><Consumer/></ReportDraftProvider>);fireEvent.click(screen.getByText('Giữ nháp'));
 const dirty=new Event('beforeunload',{cancelable:true});window.dispatchEvent(dirty);expect(dirty.defaultPrevented).toBe(true);
 fireEvent.click(screen.getByText('Xóa nháp'));const clean=new Event('beforeunload',{cancelable:true});window.dispatchEvent(clean);expect(clean.defaultPrevented).toBe(false);
 view.unmount();const disposed=new Event('beforeunload',{cancelable:true});window.dispatchEvent(disposed);expect(disposed.defaultPrevented).toBe(false);
});
it.each(['expired','unavailable'])('preserves the same mounted owner and draft across %s reauthentication while blocking inactive writes',status=>{
 let nextInstance=0;
 function App(){const instance=useRef(++nextInstance),memory=useReportDrafts();return <><span>Instance {instance.current}</span><Consumer/><button onClick={()=>memory.write(1,'new:42',{...snapshot,editor:{...snapshot.editor,markdown:'Inactive overwrite'}})}>Thử ghi khi khóa</button></>;}
 const tree=<ReportDraftProvider><App/></ReportDraftProvider>;const view=render(tree);
 fireEvent.click(screen.getByText('Giữ nháp'));auth.status=status;view.rerender(<ReportDraftProvider><App/></ReportDraftProvider>);
 expect(screen.getByText('Instance 1')).toBeVisible();fireEvent.click(screen.getByText('Thử ghi khi khóa'));
 auth.status='authenticated';view.rerender(<ReportDraftProvider><App/></ReportDraftProvider>);fireEvent.click(screen.getByText('Đọc nháp'));
 expect(screen.getByText('Nội dung riêng')).toBeVisible();expect(screen.getByText('Instance 1')).toBeVisible();
});
it('preserves a dirty route through StrictMode effect replay and a child remount',()=>{
 function DirtyRoute(){const memory=useReportDrafts();React.useEffect(()=>{memory.write(1,'new:42',snapshot);},[memory]);return <p>Dirty route</p>;}
 const view=render(<StrictMode><ReportDraftProvider><DirtyRoute/></ReportDraftProvider></StrictMode>);
 view.rerender(<StrictMode><ReportDraftProvider><Consumer/></ReportDraftProvider></StrictMode>);fireEvent.click(screen.getByText('Đọc nháp'));expect(screen.getByText('Nội dung riêng')).toBeVisible();
});
