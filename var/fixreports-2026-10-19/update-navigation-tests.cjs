const fs=require('fs');
const p='Frontend/src/app/routes/navigation.test.jsx',s=fs.readFileSync(p,'utf8');
fs.writeFileSync(p,`import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, ApiError, onUnauthorized } from '../services/api/client';
import { fileWorkApi, executionDownload } from '../services/api/fileWork';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

`+s.slice(s.lastIndexOf("describe('file-work download transport'")));
const audit='Frontend/src/app/layouts/ui-audit.test.jsx';
fs.writeFileSync(audit,fs.readFileSync(audit,'utf8').replaceAll('activeRoute="/tests"','activeRoute="/board/testing"').replaceAll("name:'Thư viện test case'","name:'Quản lý kiểm thử'").replace('/tests/documents/5?caseId=405','/board/testing/features/42/documents/5?caseId=405'));
const scroll='Frontend/src/App.scroll.test.jsx';
fs.writeFileSync(scroll,fs.readFileSync(scroll,'utf8').replace('Thư viện test case · TMS','Luồng kiểm thử đã thay đổi · TMS').replace('Đợt kiểm thử · TMS','Luồng kiểm thử đã thay đổi · TMS'));
