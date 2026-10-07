import React,{useId} from 'react';

export function ProjectRoleSelect({systemRole,value,onChange,label,includeMember=false}) {
 const descriptionId=useId();
 const roles=systemRole==='DEV'?['DEV']:['PM','TESTER',...(includeMember?['MEMBER']:[])];
 const incompatible=!roles.includes(value);
 return <><select aria-label={label} aria-describedby={incompatible?descriptionId:undefined} value={value} onChange={onChange}>
  {incompatible&&<option value={value} disabled>{value} · không phù hợp</option>}
  {roles.map(role=><option key={role} value={role}>{role}</option>)}
 </select>{incompatible&&<small id={descriptionId}>Vai trò hiện tại không phù hợp với tài khoản. Chọn lại vai trò; chỉ tài khoản DEV nhận vai trò DEV.</small>}</>;
}
