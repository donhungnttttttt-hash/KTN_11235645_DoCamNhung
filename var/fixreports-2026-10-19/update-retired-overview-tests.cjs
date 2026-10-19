const fs=require('fs'),p='Frontend/src/app/features/qa/qa-dashboard.test.jsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace("vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 2, displayName: 'PM' } }) }));", "vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 2, displayName: 'PM' }, hasRole:r=>r===state.role }) }));\nvi.mock('../projects/ProjectProvider',()=>({useProject:()=>({currentProject:state.project})}));");
const start=s.indexOf("describe('current PM dashboard handoff'"),end=s.indexOf('const statuses =',start);
s=s.slice(0,start)+`describe('FR05 read-only project overview replaces the retired handoff dashboard',()=>{
  it.each(['PM','TESTER','DEV','ADMIN','archived'])('does not fetch hidden management/queue data for %s',role=>{
    state.role=role;state.project={id:1,code:'ACTUAL',name:'Dự án thật',description:'Mô tả đã lưu',projectRole:role,archived:role==='archived'};
    render(<ProjectOverview navigate={vi.fn()}/>);
    expect(screen.getByText('Mô tả đã lưu')).toBeVisible();
    expect(screen.queryByRole('region',{name:'Hàng chờ bàn giao'})).toBeNull();
    expect(screen.queryByRole('button',{name:'Thêm công việc'})).toBeNull();
    expect(workItemsApi.overview).not.toHaveBeenCalled();expect(qaApi.handoff).not.toHaveBeenCalled();
  });
});

`+s.slice(end);
fs.writeFileSync(p,s);
