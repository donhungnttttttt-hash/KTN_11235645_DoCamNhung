import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectOverview } from './ProjectOverview';
import { useProjectData } from '../features/work-items/ProjectData';
import { workItemsApi } from '../services/api/workItems';

vi.mock('../features/work-items/ProjectData', () => ({ useProjectData: vi.fn(), presentItem: x => x }));
vi.mock('../services/api/workItems', () => ({ workItemsApi: { overview: vi.fn() } }));
vi.mock('../features/work-items/HomePage', () => ({ default: () => <div>Overview loaded</div> }));
beforeEach(() => {
  useProjectData.mockReturnValue({ projectId: 1, writable: true, metadata: { canCreate: false } });
  workItemsApi.overview.mockResolvedValue({ items: [], statuses: [], milestones: [] });
});

it('does not offer Dev a creation action rejected by the API', async () => {
  const navigate = vi.fn(), user = userEvent.setup();
  render(<ProjectOverview navigate={navigate} />);
  await screen.findByText('Overview loaded');
  const create = screen.getByRole('button', { name: 'Thêm công việc' });
  expect(create).toBeDisabled();
  await user.click(create);
  expect(navigate).not.toHaveBeenCalled();
});

it('permits creation after server metadata grants permission', async () => {
  useProjectData.mockReturnValue({ projectId: 1, writable: true, metadata: { canCreate: true } });
  const navigate = vi.fn(), user = userEvent.setup();
  render(<ProjectOverview navigate={navigate} />);
  await screen.findByText('Overview loaded');
  await user.click(screen.getByRole('button', { name: 'Thêm công việc' }));
  expect(navigate).toHaveBeenCalledWith('/board/new');
});
