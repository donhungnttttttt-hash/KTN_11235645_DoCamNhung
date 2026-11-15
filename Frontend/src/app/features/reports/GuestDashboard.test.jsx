import React from 'react';
import {expect,it,vi} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {GuestDashboard} from './GuestDashboard';
import {GuestLanguageProvider,GuestLanguagePicker} from '../../i18n/GuestLanguage';
vi.mock('./ReadOnlyProjectReports',()=>({ReadOnlyProjectReports:()=> <div>Báo cáo đã công bố</div>}));
const snapshot={project:{id:1,name:'Dự án khách',code:'P1'},metrics:{total:200,tested:100,ok:80,ng:20,pending:0,na:0,notRun:100,executionPercent:50,passPercent:40},features:[{id:1,name:'Đăng nhập',total:200,tested:100,ok:80}],people:[{membershipId:1,name:'An',responsibility:'USER',ownedFiles:2,initialCases:20}],tickets:{open:3,awaitingVerification:1},history:[],simulation:{baseRate:500,managerWeight:5,casesPerUserDay:50,users:4,managers:1,dailyCost:4500,cumulativeCost:0,plannedCases:0,dueCases:0,assumptions:['Mô phỏng theo đầu người']},health:[{key:'QUALITY',severity:'WATCH',message:'20 case NG',section:'quality'}],advice:[],asOf:'2026-11-15T04:00:00Z'};
it('switches guest captions and number formats without changing costs, data or the active tab',async()=>{
 const api={dashboard:vi.fn().mockResolvedValue(snapshot)};
 render(<GuestLanguageProvider><GuestLanguagePicker/><GuestDashboard projectId={1} api={api}/></GuestLanguageProvider>);
 const overview=await screen.findByRole('region',{name:'概要グラフ'});
 expect(within(overview).getByRole('img',{name:/1日あたりのコスト内訳/})).toHaveAttribute('aria-label',expect.stringContaining('2,500'));
 expect(screen.getByText('Dự án khách')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'コスト評価',exact:true}));
 expect(screen.getByText('4,500')).toBeVisible();
 fireEvent.change(screen.getByLabelText('言語 / Ngôn ngữ'),{target:{value:'vi'}});
 expect(screen.getByRole('heading',{level:1,name:'Đánh Giá Chi Phí'})).toBeVisible();
 expect(screen.getByText('4.500')).toBeVisible();
 expect(api.dashboard).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByLabelText('言語 / Ngôn ngữ'),{target:{value:'ja'}});
 fireEvent.click(screen.getByRole('button',{name:'メンバー',exact:true}));
 expect(screen.getByText('An')).toBeVisible();
 expect(screen.getByRole('navigation',{name:'お客様メニュー'})).toBeVisible();
});
it('shows customer sections and clearly labeled modeled costs without fabricating history',async()=>{
 const api={dashboard:vi.fn().mockResolvedValue(snapshot)};render(<GuestDashboard projectId={1} api={api}/>);
 await screen.findAllByText('50%');expect(screen.getByRole('navigation',{name:'Menu khách hàng'})).toBeVisible();
 expect(screen.queryByText('Minh bạch từ dữ liệu')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Đánh Giá Chi Phí'}));expect(screen.getByText('4.500')).toBeVisible();
 expect(screen.getByText(/Chưa có lịch sử quan sát/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Nhân sự'}));expect(screen.getByText('An')).toBeVisible();
 expect(screen.queryByRole('button',{name:'Báo cáo'})).toBeNull();
});
it('removes old project facts while switching and on denied access',async()=>{
 const api={dashboard:vi.fn().mockResolvedValueOnce(snapshot).mockRejectedValueOnce(Object.assign(new Error('Không còn quyền'),{status:403}))};
 const view=render(<GuestDashboard projectId={1} api={api}/>);await screen.findAllByText('50%');
 view.rerender(<GuestDashboard projectId={2} api={api}/>);expect(screen.queryAllByText('50%')).toHaveLength(0);
 expect(await screen.findByRole('alert')).toHaveTextContent('Không còn quyền');expect(screen.queryByText('Đăng nhập')).toBeNull();
});
it('hides AI advice when its numerical input fingerprint no longer matches',async()=>{
 const value={...snapshot,health:[{...snapshot.health[0],factsKey:'new-staffing'}],advice:[{riskKey:'QUALITY',severity:'WATCH',state:'READY',texts:{vi:'Nhận xét cũ về nhân sự',ja:'以前の提案です。'},evidence:'20 case NG',factsKey:'old-staffing',generatedAt:new Date().toISOString()}]};
 render(<GuestDashboard projectId={1} api={{dashboard:vi.fn().mockResolvedValue(value)}}/>);await screen.findAllByText('50%');
 expect(screen.queryAllByText(/Nhận xét cũ về nhân sự/)).toHaveLength(0);
});

it('summarizes overview in charts without embedding the detailed tabs',async()=>{
 render(<GuestDashboard projectId={1} api={{dashboard:vi.fn().mockResolvedValue(snapshot)}}/>);
 const overview=await screen.findByRole('region',{name:'Biểu đồ tổng quan'});
 expect(within(overview).getAllByRole('img').length).toBeGreaterThanOrEqual(6);
 expect(screen.queryByRole('table')).toBeNull();
 expect(screen.queryByText('An')).toBeNull();
 expect(screen.queryByText('Cách tính và giới hạn mô hình')).toBeNull();
 expect(screen.queryByText('Khoảng xem')).toBeNull();
 fireEvent.click(within(overview).getByRole('button',{name:'Xem chi tiết nhân sự'}));
 expect(screen.getByText('An')).toBeVisible();
 expect(screen.queryByRole('region',{name:'Biểu đồ tổng quan'})).toBeNull();
});

it('resets only the content scroll position when a guest switches sections',async()=>{
 render(<GuestDashboard projectId={1} api={{dashboard:vi.fn().mockResolvedValue(snapshot)}}/>);
 await screen.findByRole('region',{name:'Biểu đồ tổng quan'});
 const main=screen.getByRole('main');main.scrollTop=500;
 fireEvent.click(screen.getByRole('button',{name:'Nhân sự'}));
 expect(main.scrollTop).toBe(0);
 expect(screen.getByRole('navigation',{name:'Menu khách hàng'})).toBeVisible();
});
it('keeps health signals unknown for missing evidence and navigates from each chart',async()=>{
 const value={...snapshot,health:[],tickets:{total:0,open:0,awaitingVerification:0},people:[],simulation:{...snapshot.simulation,users:0,managers:0,dailyCost:0}};
 render(<GuestDashboard projectId={1} api={{dashboard:vi.fn().mockResolvedValue(value)}}/>);
 const overview=await screen.findByRole('region',{name:'Biểu đồ tổng quan'});
 expect(within(overview).getAllByText('Chưa đủ dữ liệu')).toHaveLength(3);
 expect(within(overview).getByRole('img',{name:'Tình hình Ticket: Còn xử lý 0, Đã kết thúc 0'})).toBeVisible();
 for(const [action,heading] of [['Xem chi tiết tiến độ','Tiến độ & chất lượng'],['Xem chi tiết chất lượng','Tiến độ & chất lượng'],['Xem rủi ro Ticket','Sức khỏe & AI'],['Xem chi tiết chi phí','Đánh Giá Chi Phí'],['Xem sức khỏe và đề xuất AI','Sức khỏe & AI']]){
  fireEvent.click(screen.getByRole('button',{name:action}));expect(screen.getByRole('heading',{level:1,name:heading})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Tổng quan',exact:true}));
 }
 expect(screen.queryByRole('button',{name:/Báo cáo dành cho khách hàng/})).toBeNull();
});
