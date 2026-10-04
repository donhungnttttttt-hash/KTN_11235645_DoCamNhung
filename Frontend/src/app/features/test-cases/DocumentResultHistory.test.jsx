import React from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import {DocumentResultHistory} from './DocumentResultHistory';
import {testCasesApi} from '../../services/api/testCases';
vi.mock('../../services/api/testCases',()=>({testCasesApi:{documentResultHistory:vi.fn()}}));
it('loads real actor/time/transitions, retries and pages with the last history ID',async()=>{
  const user=userEvent.setup();const onExecution=vi.fn();
  testCasesApi.documentResultHistory.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValueOnce(Array.from({length:50},(_,i)=>({id:100-i,before:'OK',after:'P',actor:'Tester',occurredAt:'2026-10-04T12:00:00Z'}))).mockResolvedValueOnce([{id:50,before:'UNEXECUTED',after:'OK',actor:'PM',occurredAt:'2026-10-04T11:00:00Z'}]);
  render(<DocumentResultHistory projectId={1} documentId={9} row={{rowId:7,sourceId:'1'}} onClose={vi.fn()} onExecution={onExecution}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');await user.click(screen.getByRole('button',{name:'Thử lại'}));
  await screen.findByRole('button',{name:'Xem lịch sử cũ hơn'});expect(screen.getAllByText('Tester')).toHaveLength(50);
  await user.click(screen.getByRole('button',{name:'Xem lịch sử cũ hơn'}));await screen.findByText('UNEXECUTED');
  expect(testCasesApi.documentResultHistory).toHaveBeenLastCalledWith(1,9,7,51);
  expect(screen.getAllByRole('row')).toHaveLength(52);
  await user.click(screen.getByRole('button',{name:'Lịch sử / chứng cứ đợt kiểm thử'}));expect(onExecution).toHaveBeenCalledOnce();
});
