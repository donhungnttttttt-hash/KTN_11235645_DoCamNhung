import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import {AdminDevices} from './AdminDevices';

describe('device editors in long inventories', () => {
  const assets = Array.from({length:20}, (_, index) => ({id:index+1,assetCode:`IPAD-${index+1}`,model:'iPad',status:'AVAILABLE',version:0}));
  const api = () => ({assets:vi.fn().mockResolvedValue({items:assets,totalElements:30}),projects:vi.fn().mockResolvedValue({items:[],totalElements:0})});

  it.each([['Sửa', 'Sửa máy'], ['Bàn giao', 'Bàn giao IPAD-20'], ['Thu hồi', 'Thu hồi IPAD-20']])('brings %s into view and returns focus to the originating row on cancel', async (action, title) => {
    const inventoryApi = api();
    if (action === 'Thu hồi') {
      inventoryApi.assets.mockResolvedValue({items:assets.map(asset=>({...asset,status:'ALLOCATED'})),totalElements:30});
      inventoryApi.allocations = vi.fn().mockResolvedValue({items:[{id:100,version:0,projectName:'Demo',recipientName:'Tester'}]});
    }
    render(<AdminDevices api={inventoryApi}/>);
    const trigger = await screen.findByRole('button', {name:`${action} IPAD-20`,exact:true});
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole('heading', {name:title,exact:true})).toHaveFocus();
    const cancel = screen.getByRole('button', {name:'Hủy',exact:true});
    cancel.focus();
    fireEvent.click(cancel);
    expect(trigger).toHaveFocus();
  });

  it('does not steal focus back when the user leaves the editor to filter the inventory', async () => {
    render(<AdminDevices api={api()}/>);
    const trigger = await screen.findByRole('button', {name:'Sửa IPAD-20',exact:true});
    trigger.focus();
    fireEvent.click(trigger);
    const search = screen.getByLabelText('Tìm mã / model / serial');
    search.focus();
    fireEvent.change(search, {target:{value:'IPAD-2'}});
    expect(search).toHaveFocus();
    expect(screen.queryByRole('heading',{name:'Sửa máy'})).not.toBeInTheDocument();
  });
});
