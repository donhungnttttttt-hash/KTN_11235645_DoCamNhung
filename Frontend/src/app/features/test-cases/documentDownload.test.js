import {describe,it,expect} from 'vitest';
import {documentExportName} from './documentDownload';
describe('customer export filenames',()=>{
 it('distinguishes the updated document from the original without losing its Japanese name',()=>{
   expect(documentExportName('(タブレット)_VI.xlsx',false)).toBe('(タブレット)_VI-cap-nhat.xlsx');
   expect(documentExportName('(タブレット)_VI.xlsx',true)).toBe('(タブレット)_VI.xlsx');
 });
 it('always supplies an xlsx extension for generated exports',()=>{
   expect(documentExportName('TEST.XLSX',false)).toBe('TEST-cap-nhat.xlsx');
   expect(documentExportName('',false)).toBe('test-cases-cap-nhat.xlsx');
 });
});
