import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ResultCycleButton } from './ResultCycleButton';

it('starts unexecuted and cycles through the requested order without opening a dialog', async () => {
  function Harness() {
    const [value, setValue] = useState('');
    return <ResultCycleButton value={value} sourceId="1" onChange={setValue} />;
  }
  const user = userEvent.setup(); render(<Harness />);
  const button = screen.getByRole('button', { name: 'Kết quả test case 1' });
  expect(button).toHaveTextContent('Unexecuted');
  for (const value of ['OK', 'P', 'NG', 'Fixed', 'NA', 'Unexecuted']) {
    await user.click(button);
    expect(button).toHaveTextContent(value);
    expect(screen.queryByRole('dialog')).toBeNull();
  }
});

it('supports keyboard activation and normalizes stored aliases', async () => {
  const change = vi.fn(), user = userEvent.setup();
  render(<ResultCycleButton value="PENDING" sourceId="2" onChange={change} />);
  const button = screen.getByRole('button', { name: 'Kết quả test case 2' });
  expect(button).toHaveTextContent('P');
  button.focus(); await user.keyboard('{Enter}');
  expect(change).toHaveBeenCalledWith('NG');
});

it('does not change a disabled result', async () => {
  const change = vi.fn(), user = userEvent.setup();
  render(<ResultCycleButton value="NOT_RUN" sourceId="3" onChange={change} disabled />);
  await user.click(screen.getByRole('button', { name: 'Kết quả test case 3' }));
  expect(change).not.toHaveBeenCalled();
});
