const fs = require('node:fs');
const path = require('node:path');
const frontend = path.resolve('Frontend');
for (const name of ['.result-color-preview.html','.result-color-preview.jsx']) {
  const file = path.resolve(frontend, name);
  if (path.dirname(file) !== frontend || fs.lstatSync(file).isSymbolicLink()) throw new Error('Unexpected preview path.');
  const contents = fs.readFileSync(file);
  const marker = name.endsWith('.html') ? 'Kiểm tra màu kết quả TMS' : 'palette-preview';
  if (!contents.toString('utf8').includes(marker)) throw new Error('Preview was changed; refusing to remove.');
  fs.writeFileSync(path.join('var/result-colors-2026-10-18',name.slice(1)), contents, {flag:'wx'});
  fs.unlinkSync(file);
}
console.log('Removed only the two temporary preview files; copies retained with the review evidence.');
