import {expect,it} from 'vitest';
import {translateGuest} from './GuestLanguage';
import {guestEvidence} from './guestEvidence';
it('translates generated health evidence while preserving the facts and original Vietnamese',()=>{
 const message='29 case NG; 32 Ticket còn nghĩa vụ xử lý. Tỷ lệ đã test không phải tỷ lệ nghiệm thu.';
 expect(guestEvidence(message,(key,args)=>translateGuest('ja',key,args))).toBe('NG 29ケース、対応が必要なチケット 32件。テスト実施率は受入承認率ではありません。');
 expect(guestEvidence(message,(key,args)=>translateGuest('vi',key,args))).toBe(message);
 expect(guestEvidence('Nhận xét riêng của khách hàng',key=>translateGuest('ja',key))).toBe('Nhận xét riêng của khách hàng');
});
