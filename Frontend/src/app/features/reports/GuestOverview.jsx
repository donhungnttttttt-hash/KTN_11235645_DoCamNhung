import {useGuestLanguage} from '../../i18n/GuestLanguage';
import React from 'react';
import {ArrowUpRight} from 'lucide-react';
import {ComparisonBars,QualityChart,RingChart,healthLabels} from './GuestCharts';

const colors={HIGH:'#d84c5c',WATCH:'#e6a52c',ON_TRACK:'#13a985',INSUFFICIENT_DATA:'#a5b3bb'};
const dimensions=[['PROGRESS','Tiến độ'],['QUALITY','Chất lượng'],['COST','Hiệu quả chi phí']];

export function GuestOverview({data,onSection,RiskNote}){
 const {t,number,language}=useGuestLanguage();
 const {metrics,simulation,tickets}=data;
 const members=[{label:t("User"),value:simulation.users,weight:1,color:'#0ea998'},{label:t("Quản lý"),value:simulation.managers,weight:simulation.managerWeight??5,color:'#6c7cd4'}];
 const remaining=Math.max(0,Number(metrics.notRun)||0);
 const terminal=tickets.total==null?null:Math.max(0,tickets.total-tickets.open);
 return <section className="gd-overview" aria-label={t("Biểu đồ tổng quan")}>
  <Summary title={t("Tiến độ kiểm thử")} caption={t("Phạm vi case hiện tại")} action={t("Xem chi tiết tiến độ")} onOpen={()=>onSection('progress')}>
   <RingChart label={t("Tiến độ kiểm thử")} value={`${number(metrics.executionPercent)}%`} unit={t("đã test")} items={[{label:t("Đã test"),value:metrics.tested,color:'#0ea998'},{label:t("Chưa test"),value:remaining,color:'#dce5e7'}]}/>
   <RiskNote data={data} riskKey="PROGRESS"/>
  </Summary>
  <Summary title={t("Chất lượng kiểm thử")} caption={t("Phân bố kết quả hiện tại")} action={t("Xem chi tiết chất lượng")} onOpen={()=>onSection('progress')}>
   <QualityChart metrics={metrics}/><RiskNote data={data} riskKey="QUALITY"/>
  </Summary>
  <Summary title={t("Tình hình Ticket")} caption={t("Bug và QA trong dự án")} action={t("Xem rủi ro Ticket")} onOpen={()=>onSection('health')}>
   {terminal==null?<ComparisonBars label={t("Tình hình Ticket")} items={[{label:t("Còn xử lý"),value:tickets.open,color:'#e6a52c'},{label:t("Chờ xác minh"),value:tickets.awaitingVerification,color:'#6c7cd4'}]}/>:<RingChart label={t("Tình hình Ticket")} value={number(tickets.total)} unit={language==='ja'?'チケット':'Ticket'} items={[{label:t("Còn xử lý"),value:tickets.open,color:'#e6a52c'},{label:t("Đã kết thúc"),value:terminal,color:'#0ea998'}]}/>}
   <p className="gd-chart-context">{number(tickets.awaitingVerification)} {t("chờ xác minh ·")} {number(tickets.hiddenOpen)} {t("Ticket còn mở trong mục ẩn.")}</p>
  </Summary>
  <Summary title={t("Đánh Giá Chi Phí")} caption={t("Cơ cấu một ngày làm việc · đơn vị mô phỏng")} action={t("Xem chi tiết chi phí")} onOpen={()=>onSection('cost')}>
   <RingChart label={t("Cơ cấu chi phí một ngày")} value={number(simulation.dailyCost)} unit={t("đơn vị / ngày")} items={members.map(item=>({...item,value:item.value*(simulation.baseRate??500)*item.weight}))}/>
   <RiskNote data={data} riskKey="COST"/>
  </Summary>
  <Summary title={t("Cơ cấu nhân sự")} caption={t("Thành viên đang hoạt động")} action={t("Xem chi tiết nhân sự")} onOpen={()=>onSection('people')}>
   <RingChart label={t("Cơ cấu nhân sự")} value={number(Number(simulation.users)+Number(simulation.managers))} unit={t("thành viên")} items={members}/>
   <p className="gd-chart-context">{t("Năng suất giả định:")} {number(simulation.users*(simulation.casesPerUserDay??50))} {t("case/ngày.")}</p>
  </Summary>
  <Summary title={t("Sức khỏe dự án")} caption={t("Tín hiệu từ dữ liệu · không phải điểm nghiệm thu")} action={t("Xem sức khỏe và đề xuất AI")} onOpen={()=>onSection('health')}>
   <div className="gd-health-chart" role="img" aria-label={dimensions.map(([key,label])=>`${t(label)}: ${t(healthLabels[data.health.find(r=>r.key===key)?.severity]||healthLabels.INSUFFICIENT_DATA)}`).join('; ')}>
    {dimensions.map(([key,label])=>{const risk=data.health.find(r=>r.key===key),level=colors[risk?.severity]?risk.severity:'INSUFFICIENT_DATA';return <div key={key}><span>{t(label)}</span><div className="gd-health-scale">{Object.entries(colors).map(([severity,color])=><i key={severity} className={severity===level?'active':''} style={{'--signal-color':color}} title={t(healthLabels[severity])}>{severity===level?'●':''}</i>)}</div><strong style={{color:level==='INSUFFICIENT_DATA'?'#657982':colors[level]}}>{t(healthLabels[level])}</strong></div>;})}
   </div>
  </Summary>
 </section>;
}
function Summary({title,caption,action,onOpen,children}){

 return <section className="gd-card gd-summary-card"><header><h2>{title}</h2><p>{caption}</p></header><div className="gd-summary-body">{children}</div><button className="gd-summary-link" onClick={onOpen}>{action}<ArrowUpRight size={16}/></button></section>;
}
