export function vietnamDate(value=new Date()) {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function suggestedVersion(versions,date) {
 if(!date)return '';
 const eligible=versions.filter(version=>version.createdAt&&vietnamDate(version.createdAt)<=date);
 eligible.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)||Number(b.id)-Number(a.id));
 return eligible.length?String(eligible[0].id):'';
}
