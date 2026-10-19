const fs = require('node:fs');

const reportPath = 'docs/reviews/2026-10-17-kl-documents-review.md';
const original = fs.readFileSync(reportPath, 'utf8');
const protectedInline = /(`[^`\n]*`|\]\([^\n)]*\))/g;
const compactReferences = /((?:D[1-5](?:-[PT]\d+)?|P\d{4}|T\d{3}|F\d{2}|V\d+|UC_\d+|SHA-256|p95|p99))/g;

function formatProse(value) {
  let result = value.replace(/(\d)(?=\p{L})/gu, '$1 ');
  result = result.split(compactReferences).map((part, index) =>
    index % 2 ? part : part.replace(/(\p{L})(?=\d)/gu, '$1 ')
  ).join('');
  result = result.replace(/([;:])(?=[\p{L}\d])/gu, '$1 ');
  result = result.replace(/,(?=[\p{L}\d])/gu, (comma, offset, text) =>
    /\d/.test(text[offset - 1] || '') && /\d/.test(text[offset + 1] || '') ? comma : ', '
  );
  result = result.replace(/\bi 18 n\b/g, 'i18n');
  result = result.replace(/([\p{L}*])\.(?=\d)/gu, '$1. ');
  result = result.replace(/\|(?=\S)/g, '| ');
  result = result.replace(/(?<=\S)\|/g, ' |');
  return result;
}

let formatted = original.split(protectedInline).map((part, index) =>
  index % 2 ? part : formatProse(part)
).join('');

for (const [before, after] of [
  ['schemaV12', 'schema V12'],
  ['trạngV29', 'trạng V29'],
  ['làV29', 'là V29'],
  ['sơđồ', 'sơ đồ'],
  ['filedrawio', 'file drawio'],
  ['exactbuild', 'đúng build'],
  ['BUGretest', 'xác minh BUG'],
  ['testlần', 'test lần'],
  ['5ởtrang', '5 ở trang'],
  ['5 ởtrang', '5 ở trang'],
]) formatted = formatted.replaceAll(before, after);

const inlineBefore = original.match(protectedInline) || [];
const inlineAfter = formatted.match(protectedInline) || [];
if (JSON.stringify(inlineBefore) !== JSON.stringify(inlineAfter)) {
  throw new Error('Refusing to change inline code or link destinations.');
}
fs.writeFileSync('var/kl-review-2026-10-17/report-before-format.md', original);
fs.writeFileSync(reportPath, formatted);
console.log(JSON.stringify({ formatted: true, originalLength: original.length,
  formattedLength: formatted.length, protectedInlineTokens: inlineBefore.length }));
