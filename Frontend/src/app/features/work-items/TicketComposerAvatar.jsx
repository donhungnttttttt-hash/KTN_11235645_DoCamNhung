import React,{useEffect,useState} from 'react';
import {useAuth,initials} from '../auth/AuthProvider';
import {selfProfileApi,avatarUrl} from '../../services/api/selfProfile';

export function TicketComposerAvatar(){
 const auth=useAuth(),user=auth?.user;
 const [profile,setProfile]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{
  setProfile(null);setFailed(false);
  if(!user?.id)return;
  const controller=new AbortController();
  selfProfileApi.get({signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setProfile(value);}).catch(()=>{});
  return()=>controller.abort();
 },[user?.id]);
 const name=user?.displayName||user?.username||'Bạn';
 return <span className="ticket-composer-avatar" role="img" aria-label={`Ảnh đại diện ${name}`} title={name}>
  {profile?.id===user?.id&&profile?.hasAvatar&&!failed?<img src={avatarUrl(profile)} alt="" onError={()=>setFailed(true)}/>:initials(name)}
 </span>;
}
