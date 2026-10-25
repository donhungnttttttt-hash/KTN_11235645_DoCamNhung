import React,{useCallback,useState} from 'react';
import {SelectionTable} from '../../components/SelectionTable';
import {adminApi} from '../../services/api/admin';
import {useAdminRead,ReadState} from '../admin/shared';

export function MemberPicker({value,onChange,api=adminApi,existingUserIds=[],projectId,footerAction,allowedRoles=['PM','TESTER','DEV','ADMIN']}) {
 const [keyword,setKeyword]=useState('');const [role,setRole]=useState('');const [membershipStatus,setMembershipStatus]=useState('');const [page,setPage]=useState(0);
 const load=useCallback(signal=>api.users({keyword,...(role?{role}:{}),enabled:true,unassignedOnly:false,...(projectId?{excludeProjectId:projectId}:{}),...(membershipStatus?{hasProject:membershipStatus==='assigned'}:{}),page,size:20},{signal}),[api,keyword,role,membershipStatus,page,projectId]);
 const state=useAdminRead(`people:${projectId||''}:${existingUserIds.join(',')}:${keyword}:${role}:${membershipStatus}:${page}`,load);
 return <section className="admin-member-picker"><ReadState {...state}/>
 <SelectionTable label="Thành viên" searchable={false} pageScope loading={state.loading} selected={value.map(m=>m.userId)} extraTitle="Vai trò"
 filters={<><label className="ui-field ui-filter-search">Tìm<input aria-label="Tìm tài khoản đang hoạt động" placeholder="Tên hoặc tài khoản…" type="search" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0);}}/></label><label className="ui-field ui-filter-role">Vai trò<select aria-label="Lọc vai trò tài khoản" value={role} onChange={e=>{setRole(e.target.value);setPage(0);}}><option value="">Tất cả</option>{allowedRoles.map(r=><option key={r}>{r}</option>)}</select></label><label className="ui-field ui-filter-role">Trạng thái<select aria-label="Lọc trạng thái dự án" value={membershipStatus} onChange={e=>{setMembershipStatus(e.target.value);setPage(0);}}><option value="">Tất cả</option><option value="assigned">Đã có dự án</option><option value="unassigned">Chưa có dự án</option></select></label></>}
 rows={(state.data?.items||[]).filter(u=>!existingUserIds.some(id=>String(id)===String(u.id))).map(u=>({id:u.id,name:u.displayName,description:(u.username||'')+' · '+u.role+' · '+(u.memberships?.length?'Dự án: '+u.memberships.map(m=>m.code+' — '+m.name).join(', '):u.hasProject?'Đã có dự án':'Chưa có dự án'),extra:<strong>{u.role==='ADMIN'?'ADMIN · Làm PM':u.role}</strong>}))}
 onChange={ids=>onChange(ids.map(id=>value.find(m=>m.userId===id)||(()=>{const u=state.data.items.find(u=>u.id===id);return {userId:u.id,projectRole:u.role==='ADMIN'||u.role==='PM'?'PM':u.role==='DEV'?'DEV':'TESTER',displayName:u.displayName,username:u.username};})()))}/>
 <p>Đã chọn {value.length} người · {value.filter(m=>m.projectRole==='PM').length} PM</p>
 {state.data && <div className="admin-pagination"><span>Trang {page+1} / {Math.max(1,Math.ceil(state.data.totalElements/20))} · {state.data.totalElements} người</span><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Người trước</button><button type="button" disabled={(page+1)*20>=state.data.totalElements} onClick={()=>setPage(page+1)}>Người sau</button>{footerAction&&<div className="admin-member-footer-action">{footerAction}</div>}</div>}
 </section>;
}
