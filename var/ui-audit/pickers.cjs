const fs=require('fs');
const base='Frontend/src/app/features/admin/';
let p=base+'AdminProjectForm.jsx',s=fs.readFileSync(p,'utf8');
s="import {SelectionTable} from '../../components/SelectionTable';\n"+s;
s=s.replace("const [keyword,setKeyword]=useState('');const [page,setPage]=useState(0);","const [keyword,setKeyword]=useState('');const [role,setRole]=useState('');const [page,setPage]=useState(0);");
s=s.replace('api.users({keyword,enabled:true,page,size:20}',"api.users({keyword,...(role?{role}:{}),enabled:true,page,size:20}").replace('[api,keyword,page]','[api,keyword,role,page]').replace('`people:${keyword}:${page}`','`people:${keyword}:${role}:${page}`');
const a=s.indexOf(' {state.data?.items.map(u=>'),b=s.indexOf('\n {state.data &&',a);
s=s.slice(0,a)+` <label className="ui-field">Lọc vai trò tài khoản<select value={role} onChange={e=>{setRole(e.target.value);setPage(0);}}><option value="">Tất cả vai trò</option>{['PM','TESTER','DEV','ADMIN'].map(r=><option key={r}>{r}</option>)}</select></label>
 <SelectionTable label="Thành viên" searchable={false} pageScope loading={state.loading} selected={value.map(m=>m.userId)} extraTitle="Vai trò"
 rows={(state.data?.items||[]).map(u=>{const selected=value.find(m=>m.userId===u.id);return {id:u.id,name:u.displayName,description:(u.username||'')+' · '+u.role,extra:selected?<ProjectRoleSelect systemRole={u.role} label={'Vai trò '+u.displayName} value={selected.projectRole} onChange={e=>onChange(value.map(m=>m.userId===u.id?{...m,projectRole:e.target.value}:m))}/>:u.role};})}
 onChange={ids=>onChange(ids.map(id=>value.find(m=>m.userId===id)||(()=>{const u=state.data.items.find(u=>u.id===id);return {userId:u.id,projectRole:u.role==='PM'?'PM':u.role==='DEV'?'DEV':'TESTER',displayName:u.displayName,username:u.username};})()))}/>`+s.slice(b);
fs.writeFileSync(p,s);
p=base+'InitialDevicePicker.jsx';s=fs.readFileSync(p,'utf8');s="import {SelectionTable} from '../../components/SelectionTable';\n"+s;
const x=s.indexOf(' {state.data?.items.map(a=>'),y=s.indexOf('\n <button',x);
s=s.slice(0,x)+` <SelectionTable label="Máy sẵn sàng" searchable={false} pageScope loading={state.loading} selected={value.map(a=>a.assetId)}
 rows={(state.data?.items||[]).map(a=>({id:a.id,name:a.assetCode+' · '+a.model,selectLabel:a.assetCode+' · '+a.model,description:[a.serial,a.osName,a.osVersion].filter(Boolean).join(' · ')}))}
 onChange={ids=>onChange(ids.map(id=>value.find(a=>a.assetId===id)||(()=>{const a=state.data.items.find(a=>a.id===id);return {assetId:a.id,assetCode:a.assetCode,model:a.model,expectedVersion:a.version,recipientUserId:'',expectedReturnOn:'',handoverNote:''};})()))}/>`+s.slice(y);
fs.writeFileSync(p,s);
