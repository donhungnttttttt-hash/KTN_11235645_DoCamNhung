import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { TestProgress } from './TestProgress';

it('exposes actual case counts and a named progress bar', () => {
  render(<TestProgress tested={3} total={5} label="Tiến độ file" />);
  const bar = screen.getByRole('progressbar', { name: 'Tiến độ file' });
  expect(bar).toHaveAttribute('aria-valuemin', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '5');
  expect(bar).toHaveAttribute('aria-valuenow', '3');
  expect(bar).toHaveAttribute('aria-valuetext', '3/5 case · 60%');
  expect(screen.getByText('3/5 case · 60%')).toBeVisible();
  expect(bar.closest('.test-progress')).not.toHaveClass('is-complete');
});

it('keeps a nearly complete result below 100 percent until every case is tested', () => {
  const view = render(<TestProgress tested={199} total={200} />);
  const bar = screen.getByRole('progressbar', { name: 'Tiến độ kiểm thử' });
  expect(bar).toHaveAttribute('aria-valuetext', '199/200 case · 99.5%');
  expect(bar.closest('.test-progress')).not.toHaveClass('is-complete');
  view.rerender(<TestProgress tested={200} total={200} />);
  expect(bar).toHaveAttribute('aria-valuetext', '200/200 case · 100%');
  expect(bar.closest('.test-progress')).toHaveClass('is-complete');
});

it.each([
  {tested: 1, total: 128, value: '1/128 case · 0.8%'},
  {tested: 9999, total: 10000, value: '9999/10000 case · 99.9%'},
])('shows fractional progress without rounding incomplete work to complete: $tested / $total', ({tested, total, value}) => {
  render(<TestProgress tested={tested} total={total}/>);
  const bar = screen.getByRole('progressbar');
  expect(bar).toHaveAttribute('aria-valuetext', value);
  expect(screen.getByText(value)).toBeVisible();
  expect(bar.closest('.test-progress')).not.toHaveClass('is-complete');
});

it('does not lose a whole percentage point to floating point rounding', () => {
  render(<TestProgress tested={29} total={100} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '29/100 case · 29%');
});

it('shows no cases as an empty state rather than completed work', () => {
  render(<TestProgress tested={0} total={0} />);
  const bar = screen.getByRole('progressbar');
  expect(screen.getByText('Chưa có case')).toBeVisible();
  expect(bar).toHaveAttribute('aria-valuenow', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '1');
  expect(bar).toHaveAttribute('aria-valuetext', 'Chưa có case');
  expect(bar.closest('.test-progress')).toHaveClass('is-empty');
  expect(bar.closest('.test-progress')).not.toHaveClass('is-complete');
});

it('clamps the accessible range while preserving the reported counts', () => {
  render(<TestProgress tested={6} total={5} />);
  const bar = screen.getByRole('progressbar');
  expect(bar).toHaveAttribute('aria-valuenow', '5');
  expect(bar).toHaveAttribute('aria-valuetext', '6/5 case · 100%');
  expect(bar.closest('.test-progress')).toHaveClass('is-complete');
});

it.each([
  { tested: -3, total: 5, value: '0/5 case · 0%', now: '0', max: '5' },
  { tested: Infinity, total: 5, value: '0/5 case · 0%', now: '0', max: '5' },
  { tested: 3, total: NaN, value: 'Chưa có case', now: '0', max: '1' },
  { tested: 3, total: -1, value: 'Chưa có case', now: '0', max: '1' },
])('keeps invalid counts within an accessible finite range: $tested / $total', ({ tested, total, value, now, max }) => {
  render(<TestProgress tested={tested} total={total} />);
  const bar = screen.getByRole('progressbar');
  expect(bar).toHaveAttribute('aria-valuenow', now);
  expect(bar).toHaveAttribute('aria-valuemax', max);
  expect(bar).toHaveAttribute('aria-valuetext', value);
  expect(bar.closest('.test-progress')).not.toHaveClass('is-complete');
});
