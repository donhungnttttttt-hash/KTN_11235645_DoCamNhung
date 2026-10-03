import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { projectsApi } from './projects';
vi.mock('./client', () => ({ apiRequest: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); apiRequest.mockResolvedValue({ headerName: 'X-CSRF-TOKEN', token: 'fixture-token' }); });

it('archives a catalog through the actual DELETE route with CSRF', async () => {
  await projectsApi.archiveCatalog(3, 'builds', 7, 2);
  expect(apiRequest).toHaveBeenNthCalledWith(1, '/auth/csrf');
  expect(apiRequest).toHaveBeenNthCalledWith(2, '/projects/3/catalogs/builds/7?expectedVersion=2', {
    method: 'DELETE', headers: { 'X-CSRF-TOKEN': 'fixture-token' },
  });
});
