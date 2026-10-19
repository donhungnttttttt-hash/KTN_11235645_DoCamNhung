import {describe,it,expect} from 'vitest';
import {matchesSearch,searchTokens} from './multiWordSearch';

describe('multi-word literal search',()=>{
 it('matches every token across fields regardless of Vietnamese accents, case or order',()=>{
  expect(matchesSearch(['Cẩm','Nhung'],'  NHUNG   cam ')).toBe(true);
  expect(matchesSearch(['Đỗ Cẩm Nhung'],'DO\tNHUNG')).toBe(true);
  expect(matchesSearch(['Ca\u0302\u0309m Nhung'],'cam nhung')).toBe(true);
  expect(matchesSearch(['Cẩm Nhung'],'cam absent')).toBe(false);
  expect(matchesSearch([null,'Cẩm Nhung'],' ')).toBe(true);
  expect(searchTokens('ĐỖ đỗ')).toEqual(['do']);
 });
 it('treats percent, underscore and quotes as literal characters',()=>{
  expect(matchesSearch(["case_10% 'quoted'"],"10% case_ 'quoted'")).toBe(true);
  expect(matchesSearch(['caseX10'],'case_')).toBe(false);
  expect(matchesSearch(['anything'],'%')).toBe(false);
 });
});
