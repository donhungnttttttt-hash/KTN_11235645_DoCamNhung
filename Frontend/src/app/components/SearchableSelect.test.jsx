import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {SearchableSelect} from './SearchableSelect';
afterEach(cleanup);
it('opens a search above options, selects and restores focus',()=>{
 const change=vi.fn();render(<SearchableSelect label="Môi trường" value="" options={[{value:1,label:'iPad'},{value:2,label:'Android'}]} onChange={change}/>);
 const trigger=screen.getByRole('combobox');fireEvent.click(trigger);expect(trigger).toHaveAttribute('aria-expanded','true');
 const search=screen.getByRole('searchbox');fireEvent.change(search,{target:{value:'ipad'}});expect(screen.queryByRole('option',{name:'Android'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('option',{name:'iPad'}));expect(change).toHaveBeenCalledWith('1');expect(trigger).toHaveAttribute('aria-expanded','false');expect(trigger).toHaveFocus();
});
it('disabled options cannot be selected and Escape closes',()=>{
 const change=vi.fn();render(<SearchableSelect label="Version" value="1" options={[{value:1,label:'Old',disabled:true}]} onChange={change}/>);
 fireEvent.click(screen.getByRole('combobox'));fireEvent.click(screen.getByRole('option'));expect(change).not.toHaveBeenCalled();fireEvent.keyDown(screen.getByRole('searchbox'),{key:'Escape'});expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});
