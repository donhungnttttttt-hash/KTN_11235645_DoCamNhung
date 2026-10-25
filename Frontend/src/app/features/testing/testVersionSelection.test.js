import {expect,it} from 'vitest';
import {suggestedVersion,vietnamDate} from './testVersionSelection';
it('selects latest eligible version by Vietnam date including multiple versions on one day',()=>{
 const versions=[{id:1,createdAt:'2026-10-24T10:00:00Z'},{id:2,createdAt:'2026-10-24T17:01:00Z'},{id:3,createdAt:'2026-10-25T02:00:00Z'}];
 expect(vietnamDate('2026-10-24T17:01:00Z')).toBe('2026-10-25');
 expect(suggestedVersion(versions,'2026-10-23')).toBe('');
 expect(suggestedVersion(versions,'2026-10-24')).toBe('1');
 expect(suggestedVersion(versions,'2026-10-25')).toBe('3');
 expect(suggestedVersion(versions,'2026-10-26')).toBe('3');
});
