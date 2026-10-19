import React from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {FeatureForm} from './FeatureForm';
import {DocumentAssignments} from './DocumentAssignments';
import {DocumentCellEditor} from '../test-cases/DocumentCellEditor';
import {readFileSync} from 'node:fs';

vi.mock('../../services/api/projects',()=>({projectsApi:{listMembers:vi.fn().mockResolvedValue([])}}));
vi.mock('../../services/api/testCases',()=>({testCasesApi:{documentCellHistory:vi.fn().mockResolvedValue([])}}));

let styles;
beforeEach(()=>{
  // These are the new testing route's styles. Do not load the retired execution
  // stylesheet: it previously concealed this missing overlay dependency.
  styles=document.createElement('style');
  styles.textContent=['../test-cases/test-cases.css','../test-cases/test-documents.css','./testing.css']
    .map(file=>readFileSync(new URL(file,import.meta.url),'utf8')).join('\n');
  document.head.append(styles);
});
afterEach(()=>{cleanup();styles.remove();});

const cases=[
  ['Feature form',props=><FeatureForm projectId={1} {...props}/>,'Tên Feature'],
  ['assignment form',props=><DocumentAssignments projectId={1} documentId={2} data={{document:{version:0},selfMembershipId:10,rows:[{rowId:101,assigneeMembershipId:10}]}} {...props}/>,'Phạm vi case'],
  ['reused cell editor',props=><DocumentCellEditor projectId={1} documentId={2} cell={{row:{rowId:101,sourceId:'TC1'},index:1,label:'Nội dung',value:'Current',maxLength:8000}} {...props}/>,'Nội dung'],
];

test.each(cases)('%s remains a viewport overlay without retired execution CSS',async(_name,view,initialLabel)=>{
  const onClose=vi.fn();
  const trigger=document.createElement('button');trigger.textContent='Open';document.body.append(trigger);trigger.focus();
  const mounted=render(<section className="testing-page">{view({onClose,onSaved:vi.fn()})}</section>);
  const dialog=screen.getByRole('dialog'),overlay=dialog.parentElement,computed=getComputedStyle(overlay);
  expect(computed.position).toBe('fixed');
  expect(computed.inset).toBe('0');
  expect(computed.display).toBe('flex');
  expect(computed.alignItems).toBe('center');
  expect(computed.justifyContent).toBe('center');
  expect(Number(computed.zIndex)).toBeGreaterThanOrEqual(1000);
  expect(computed.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(dialog).maxHeight).toBe('calc(100dvh - 2rem)');
  expect(document.body.style.overflow).toBe('hidden');
  await waitFor(()=>expect(screen.getByLabelText(initialLabel)).toHaveFocus());
  fireEvent.keyDown(document,{key:'Escape'});expect(onClose).toHaveBeenCalledOnce();
  mounted.unmount();expect(trigger).toHaveFocus();expect(document.body.style.overflow).not.toBe('hidden');trigger.remove();
});

test.each(cases.slice(0,2))('%s keeps a long form scrollable inside its bounded panel',(_name,view)=>{
  render(<section className="testing-page">{view({onClose:vi.fn(),onSaved:vi.fn()})}</section>);
  const form=screen.getByRole('dialog').querySelector('form');
  expect(getComputedStyle(form).overflowY).toBe('auto');
  expect(getComputedStyle(form).minHeight).toBe('0');
});
