import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {GuestDashboard} from './GuestDashboard';
import {GuestLanguageProvider,GuestLanguagePicker} from '../../i18n/GuestLanguage';
const risk={key:'QUALITY',severity:'WATCH',message:'1 case NG; 1 Ticket còn nghĩa vụ xử lý. Tỷ lệ đã test không phải tỷ lệ nghiệm thu.',factsKey:'facts'};
const snapshot={project:{name:'Project'},metrics:{total:2,tested:1,ok:0,ng:1,pending:0,na:0,notRun:1,executionPercent:50},tickets:{total:1,open:1,awaitingVerification:0,hiddenOpen:0},people:[],features:[],history:[],simulation:{users:1,managers:0,dailyCost:500,assumptions:[]},health:[risk],advice:[{riskKey:'QUALITY',severity:'WATCH',evidence:risk.message,factsKey:'facts',state:'READY',generatedAt:new Date().toISOString(),text:'Legacy Vietnamese',texts:{ja:'NGの1ケースを優先して確認してください。',vi:'Ưu tiên xác minh 1 case NG.'}}],asOf:new Date().toISOString()};
it('removes customer reports and switches paired AI advice without another request',async()=>{
 const api={dashboard:vi.fn().mockResolvedValue(snapshot)};
 render(<GuestLanguageProvider><GuestLanguagePicker/><GuestDashboard projectId={1} api={api}/></GuestLanguageProvider>);
 expect(await screen.findByText('NGの1ケースを優先して確認してください。')).toBeVisible();
 expect(screen.queryByRole('button',{name:'レポート',exact:true})).toBeNull();
 expect(screen.queryByText('お客様向けレポート')).toBeNull();
 fireEvent.change(screen.getByLabelText('言語 / Ngôn ngữ'),{target:{value:'vi'}});
 expect(screen.getByText('Ưu tiên xác minh 1 case NG.')).toBeVisible();
 expect(screen.queryByText('NGの1ケースを優先して確認してください。')).toBeNull();
 expect(screen.queryByRole('button',{name:'Báo cáo',exact:true})).toBeNull();
 fireEvent.change(screen.getByLabelText('言語 / Ngôn ngữ'),{target:{value:'ja'}});
 expect(screen.getByText('NGの1ケースを優先して確認してください。')).toBeVisible();
 expect(api.dashboard).toHaveBeenCalledTimes(1);
});
it('does not display legacy or stale advice in the wrong language',async()=>{
 render(<GuestLanguageProvider><GuestDashboard projectId={1} api={{dashboard:vi.fn().mockResolvedValue({...snapshot,advice:[{...snapshot.advice[0],texts:{},text:'Legacy Vietnamese'}]})}}/></GuestLanguageProvider>);
 await screen.findByRole('region',{name:'概要グラフ'});
 expect(screen.queryByText(/Legacy Vietnamese/)).toBeNull();
 expect(screen.getByText('現在のデータに対するAI提案を待っています。')).toBeVisible();
});
