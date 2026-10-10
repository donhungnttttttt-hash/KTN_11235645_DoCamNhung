import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { executionApi } from './execution';

vi.mock('./client', () => ({ apiRequest: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

describe('execution API boundary', () => {
  it('scopes all reads to the selected project and carries paging/filter values', async () => {
    apiRequest.mockResolvedValue({ items: [] });
    await executionApi.cycles(3, 2);
    await executionApi.cycle(3, 9);
    await executionApi.configurations(3, 9);
    await executionApi.runs(3, 9, { page: 2, mine: true, pendingBug: true });
    await executionApi.run(3, 12);
    await executionApi.assignments(3, 12);
    await executionApi.attempts(3, 12, 1);
    expect(apiRequest.mock.calls.map(([path]) => path)).toEqual([
      '/projects/3/test-cycles?page=2', '/projects/3/test-cycles/9', '/projects/3/test-cycles/9/configurations',
      '/projects/3/test-cycles/9/run-items?page=2&mine=true&pendingBug=true', '/projects/3/run-items/12',
      '/projects/3/run-items/12/assignments', '/projects/3/run-items/12/attempts?page=1',
    ]);
  });
  it.each([
    ['create', [3, { code: 'C1' }], '/projects/3/test-cycles', 'POST', { code: 'C1' }],
    ['configure', [3, 9, { buildId: 4 }], '/projects/3/test-cycles/9/configurations', 'POST', { buildId: 4 }],
    ['scope', [3, 9, { revisionIds: [7] }], '/projects/3/test-cycles/9/scope', 'POST', { revisionIds: [7] }],
    ['activate', [3, 9, 2], '/projects/3/test-cycles/9/activate', 'POST', { expectedVersion: 2 }],
    ['assign', [3, 12, { expectedVersion: 2 }], '/projects/3/run-items/12/assignment', 'PUT', { expectedVersion: 2 }],
    ['record', [3, 12, { requestKey: 'keep-on-retry' }], '/projects/3/run-items/12/attempts', 'POST', { requestKey: 'keep-on-retry' }],
  ])('%s gets a fresh CSRF token and forwards the server result', async (method, args, path, verb, body) => {
    apiRequest.mockResolvedValueOnce({ headerName: 'X-CSRF-TOKEN', token: 'fixture-token' }).mockResolvedValueOnce({ id: 19 });
    await expect(executionApi[method](...args)).resolves.toEqual({ id: 19 });
    expect(apiRequest.mock.calls[0]).toEqual(['/auth/csrf']);
    expect(apiRequest).toHaveBeenLastCalledWith(path, { method: verb, headers: { 'X-CSRF-TOKEN': 'fixture-token' }, body: JSON.stringify(body) });
  });
  it('does not send a mutation when session/CSRF acquisition fails', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('Phiên hết hạn'), { status: 401 }));
    await expect(executionApi.record(3, 12, {})).rejects.toMatchObject({ status: 401 });
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});
