import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { reportsApi } from './reports';
vi.mock('./client',()=>({apiRequest:vi.fn()}));
beforeEach(()=>vi.resetAllMocks());
it('omits empty filters and downloads a project-scoped binary workbook',async()=>{
  apiRequest.mockResolvedValue({});
  await reportsApi.summary(8,{cycleId:'',buildId:'7',page:0});
  expect(apiRequest).toHaveBeenLastCalledWith('/projects/8/reports/summary?buildId=7&page=0');
  await reportsApi.export(8,{cycleId:9,buildId:null});
  expect(apiRequest).toHaveBeenLastCalledWith('/projects/8/reports/export.xlsx?cycleId=9',{responseType:'blob'});
  await reportsApi.summary(8);await reportsApi.export(8);
  expect(apiRequest).toHaveBeenLastCalledWith('/projects/8/reports/export.xlsx?',{responseType:'blob'});
});
