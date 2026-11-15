import {useGuestLanguage} from '../../i18n/GuestLanguage';
import React from 'react';
const statuses=[['ok','OK'],['ng','NG'],['pending','P'],['na','NA'],['notRun','Unexecuted']];
export function ProgressSummary({metrics,asOf}) {
 const {t,locale,number}=useGuestLanguage();
 const total=Number(metrics.total)||0;
 const percent=Math.round(Math.max(0,Math.min(100,Number(metrics.executionPercent)||0))*100)/100;
 return <><h2>{t("Tiến độ kiểm thử")}</h2><p className="management-progress-text">{total?t("{0} / {1} case đã test · {2}%",{0:(metrics.tested),1:(total),2:(percent)}):t("Chưa có case trong phạm vi này.")}</p><p>{t("Đã test gồm OK, NG, P và NA; tiến độ không thay cho xác nhận nghiệm thu.")}</p>
 <div className="management-status-bar" role="img" aria-label={statuses.map(([key,label])=>`${t(label)}: ${number(metrics[key]??0)}`).join(' · ')}>{statuses.map(([key,label])=><span key={key} className={`management-status-${key}`} title={`${t(label)}: ${number(metrics[key]??0)}`} style={{width:`${total?(Number(metrics[key])||0)*100/total:0}%`}}/>)}</div>
 <ul className="management-status-legend">{statuses.map(([key,label])=><li key={key}><span className={`management-status-${key}`} aria-hidden="true"/>{t(label)}: {number(metrics[key]??0)}</li>)}</ul>
 <p className="management-as-of">{t("Cập nhật")} {asOf?new Date(asOf).toLocaleString(locale,{timeZone:'Asia/Ho_Chi_Minh'}):'—'} {t("· giờ Việt Nam")}</p></>;
}
