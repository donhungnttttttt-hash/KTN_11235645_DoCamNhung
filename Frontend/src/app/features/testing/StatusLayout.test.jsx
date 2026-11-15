import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

// jsdom verifies the CSS contract, not rendered browser geometry.
describe('spreadsheet status layout contract',()=>{
 it('keeps the action group intrinsic instead of allowing row-height stretching',()=>{
  const style=document.createElement('style');
  style.textContent=readFileSync(resolve('src/app/features/testing/testing-spreadsheet.css'),'utf8');
  document.head.append(style);
  const root=document.createElement('div');root.className='testing-document testing-spreadsheet';
  root.innerHTML='<div class="testing-result-actions"><button class="td-result">Unexecuted</button><button class="td-result-history">Lịch sử Status</button></div>';
  document.body.append(root);
  try{const css=getComputedStyle(root.firstChild);expect(css.height).toBe('max-content');expect(css.justifyContent).toBe('start');expect(css.gap).toBe('6px');}
  finally{root.remove();style.remove();}
 });
});
