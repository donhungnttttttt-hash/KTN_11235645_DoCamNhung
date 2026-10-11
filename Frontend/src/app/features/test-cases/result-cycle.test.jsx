import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ResultCycleButton } from './ResultCycleButton';
import { canManageProjectWork, isProjectObserver } from '../projects/projectAccess';

function Cell() {
  const [value, setValue] = useState('UNEXECUTED');
  return <ResultCycleButton value={value} sourceId="1" onChange={setValue}/>;
}
describe('document result cycle and global administrator', () => {
  it('starts unexecuted and cycles once per click in the requested order', async () => {
    const user=userEvent.setup();render(<Cell/>);
    const button=screen.getByRole('button',{name:'Kết quả test case 1'});
    expect(button).toHaveTextContent('Unexecuted');
    for(const expected of ['OK','NG','P','NA','Unexecuted','OK']) {
      await user.click(button);expect(button).toHaveTextContent(expected);
    }
  });
  it('grants global admin project operations without requiring a project role', () => {
    const admin=role=>role==='ADMIN';
    for(const projectRole of [null,'MEMBER','DEV','TESTER','PM']) {
      expect(isProjectObserver({projectRole},admin)).toBe(false);
      expect(canManageProjectWork({projectRole},admin)).toBe(true);
    }
    expect(canManageProjectWork({archived:true},admin)).toBe(false);
    expect(canManageProjectWork({projectRole:'TESTER'},()=>false)).toBe(false);
  });
});
