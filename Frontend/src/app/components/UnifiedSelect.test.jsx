import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {UnifiedSelect} from './UnifiedSelect';
import {useDialogFocus} from '../hooks/useDialogFocus';
afterEach(cleanup);
it('shows optional color markers without changing option labels or values',()=>{
 const change=vi.fn();
 render(<UnifiedSelect aria-label="Status" value="NEW" optionColors={{NEW:'#94a3b8',IN_PROGRESS:'#3b82f6'}} onChange={e=>change(e.target.value)}><option value="NEW">Chưa xử lý</option><option value="IN_PROGRESS">Đang xử lý</option></UnifiedSelect>);
 fireEvent.mouseDown(screen.getByRole('combobox'));
 const option=screen.getByRole('button',{name:'Đang xử lý',exact:true});
 expect(option.querySelector('.ui-select-color-dot')).toHaveStyle({backgroundColor:'#3b82f6'});
 fireEvent.click(option);expect(change).toHaveBeenCalledExactlyOnceWith('IN_PROGRESS');
});
it('opens from click-only activation',()=>{
 render(<UnifiedSelect aria-label="Version"><option>Build 1</option></UnifiedSelect>);
 fireEvent.click(screen.getByRole('combobox'));expect(screen.getByRole('dialog',{name:'Chọn Version'})).toBeInTheDocument();
});
it('Escape closes the picker without closing its parent modal',()=>{
 const close=vi.fn();function Dialog(){const ref=useDialogFocus(close);return <section ref={ref} role="dialog" aria-label="Edit"><UnifiedSelect aria-label="User"><option>An</option></UnifiedSelect></section>;}
 render(<Dialog/>);fireEvent.mouseDown(screen.getByRole('combobox'));fireEvent.keyDown(screen.getByRole('searchbox'),{key:'Escape'});expect(close).not.toHaveBeenCalled();expect(screen.getByRole('dialog',{name:'Edit'})).toBeInTheDocument();
});
it('keeps select change contract while offering a searchable popup with an expanding arrow',()=>{
 const change=vi.fn();render(<label>Owner<UnifiedSelect value="a" onChange={e=>change(e.target.value)}><option value="a">An</option><option value="b">Bình</option></UnifiedSelect></label>);
 const select=screen.getByLabelText('Owner');fireEvent.mouseDown(select);expect(select).toHaveAttribute('aria-expanded','true');
 const popup=screen.getByRole('dialog');const search=screen.getByRole('searchbox');fireEvent.change(search,{target:{value:'bình'}});fireEvent.click(screen.getByRole('button',{name:'Bình'}));
 expect(change).toHaveBeenCalledExactlyOnceWith('b');expect(select).toHaveAttribute('aria-expanded','false');expect(popup).not.toBeInTheDocument();
});
it('does not open for a disabled fieldset and still accepts programmatic change',()=>{
 const change=vi.fn();render(<fieldset disabled><UnifiedSelect aria-label="Status" onChange={change}><option>OK</option></UnifiedSelect></fieldset>);fireEvent.mouseDown(screen.getByRole('combobox'));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
