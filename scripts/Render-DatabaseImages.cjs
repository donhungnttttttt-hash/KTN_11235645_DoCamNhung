// Static ERD images from the exported schema. Does not connect to or modify MySQL.
// Install drawing tools separately from the app:
// rtk proxy npm install --prefix scratch/erd-renderer --no-audit --no-fund @viz-js/viz@3.31.0 sharp@0.35.5
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const drawingRequire = createRequire(path.join(root, 'scratch/erd-renderer/package.json'));
const { instance } = drawingRequire('@viz-js/viz');
const sharp = drawingRequire('sharp');
const groups = require('./database/diagram-groups.cjs');
const source = fs.readFileSync(path.join(root, 'docs/database/erd/schema.json'));
const schema = JSON.parse(source);
const outputDir = path.join(root, 'docs/database/erd/images');
const tableNames = schema.tables.map(table => table.name);
const byTable = new Map(tableNames.map(name => [name, schema.columns.filter(column => column.table === name)]));
const grouped = groups.flatMap(group => group.tables);
assert.equal(new Set(grouped).size, grouped.length, 'A table belongs to more than one group');
assert.deepEqual([...grouped].sort(), [...tableNames].sort(), 'Groups must cover the exact schema');
const foreignKeys = [];
for (const row of schema.foreignKeys) {
  let fk = foreignKeys.find(item => item.table === row.table && item.name === row.name);
  if (!fk) {
    fk = { id: `F${String(foreignKeys.length + 1).padStart(3, '0')}`, table: row.table, name: row.name, parent: row.parent, mappings: [] };
    foreignKeys.push(fk);
  }
  assert.equal(fk.parent, row.parent);
  assert(byTable.get(row.table)?.some(column => column.name === row.column), `Missing child column: ${row.table}.${row.column}`);
  assert(byTable.get(row.parent)?.some(column => column.name === row.parentColumn), `Missing parent column: ${row.parent}.${row.parentColumn}`);
  fk.mappings.push({ child: row.column, parent: row.parentColumn });
}
const html = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const quote = value => JSON.stringify(String(value));
const nodeId = table => `t${tableNames.indexOf(table)}`;
const portId = (table, column) => `c${byTable.get(table).findIndex(item => item.name === column)}`;
const isFk = (table, column) => schema.foreignKeys.some(item => item.table === table && item.column === column);
const singleUnique = (table, column) => {
  const names = new Set(schema.indexes.filter(index => index.table === table && index.unique && index.column === column).map(index => index.name));
  return [...names].some(name => schema.indexes.filter(index => index.table === table && index.name === name).length === 1);
};
function tableLabel(table, external, relevantColumns) {
  const columns = byTable.get(table).filter(column => !external || column.key === 'PRI' || relevantColumns.has(column.name));
  const header = external ? '#e1e9ef' : '#c6e3f7';
  const fill = external ? '#f3f6f8' : '#edf6fc';
  const rows = columns.map(column => {
    const flags = [column.key === 'PRI' ? 'PK' : '', isFk(table, column.name) ? 'FK' : '', column.key !== 'PRI' && singleUnique(table, column.name) ? 'UQ' : '', column.nullable === 'YES' ? 'NULL' : '', column.extra.includes('auto_increment') ? 'AI' : '', column.extra.includes('GENERATED') ? 'GEN' : ''].filter(Boolean).join(' ');
    return `<TR><TD PORT="${portId(table, column.name)}" ALIGN="LEFT">${html(column.name)}</TD><TD ALIGN="LEFT"><FONT COLOR="#455a70">${html(column.type)}</FONT></TD><TD PORT="p${portId(table, column.name)}" ALIGN="LEFT"><FONT COLOR="#355f88" POINT-SIZE="11">${flags || ' '}</FONT></TD></TR>`;
  });
  return `<TABLE BORDER="1" COLOR="#c1d6e7" CELLBORDER="0" CELLSPACING="0" CELLPADDING="7" BGCOLOR="${fill}"><TR><TD COLSPAN="3" BGCOLOR="${header}" HEIGHT="36"><FONT POINT-SIZE="16" COLOR="#123f66"><B>${html(table)}</B></FONT>${external ? '<BR/><FONT POINT-SIZE="11" COLOR="#63788c">Tham chiếu ngoài nhóm · chỉ hiện cột khóa liên quan</FONT>' : ''}</TD></TR><TR><TD ALIGN="LEFT"><FONT COLOR="#8299ad" POINT-SIZE="10">CỘT</FONT></TD><TD ALIGN="LEFT"><FONT COLOR="#8299ad" POINT-SIZE="10">KIỂU MYSQL</FONT></TD><TD ALIGN="LEFT"><FONT COLOR="#8299ad" POINT-SIZE="10">KHÓA / THUỘC TÍNH</FONT></TD></TR>${rows.join('')}</TABLE>`;
}
function cardinality(fk) {
  const children = fk.mappings.map(mapping => mapping.child);
  const optionalParent = byTable.get(fk.table).some(column => children.includes(column.name) && column.nullable === 'YES');
  const uniqueIndexes = new Map();
  for (const index of schema.indexes.filter(item => item.table === fk.table && item.unique)) {
    if (!uniqueIndexes.has(index.name)) uniqueIndexes.set(index.name, []);
    uniqueIndexes.get(index.name).push(index.column);
  }
  const maxOneChild = [...uniqueIndexes.values()].some(columns => columns.every(column => children.includes(column)));
  return { parent: optionalParent ? '0..1' : '1', child: maxOneChild ? '0..1' : '0..N' };
}
function renderDot(names, title, full) {
  const selected = new Set(names);
  const edges = foreignKeys.filter(fk => selected.has(fk.table));
  const externals = new Map();
  for (const fk of edges) {
    if (!selected.has(fk.parent)) {
      if (!externals.has(fk.parent)) externals.set(fk.parent, new Set());
      for (const mapping of fk.mappings) externals.get(fk.parent).add(mapping.parent);
    }
  }
  const statement = table => `${nodeId(table)} [id=${quote(`table-${table}`)}, label=<${tableLabel(table, false)}>];`;
  const lines = [
    'digraph ERD {',
    `graph [rankdir=LR, bgcolor="white", fontname="Arial", fontsize=25, fontcolor="#173f62", pad="0.45", nodesep="0.42", ranksep="1.3", splines=polyline, outputorder=edgesfirst, newrank=true, labelloc=t, label=${quote(title)}];`,
    'node [shape=plain, fontname="Arial", fontsize=13, fontcolor="#20374a"];',
    'edge [color="#85a6c5", penwidth=1.15, arrowsize=0.7, fontname="Arial", fontsize=9, fontcolor="#517798"];'
  ];
  if (full) {
    // The complete graph is intentionally unclustered: membership/audit links
    // otherwise stretch cluster boxes across most of the poster. Group images
    // provide the domain boundaries without sacrificing full-poster readability.
    lines.push(...groups.flatMap(group => group.tables).map(statement));
  } else {
    lines.push(...names.map(statement));
    for (const [table, columns] of externals) lines.push(`${nodeId(table)} [id=${quote(`ref-${table}`)}, label=<${tableLabel(table, true, columns)}>];`);
  }
  for (const fk of edges) {
    // One line per FK constraint, including composite keys. Prefer its specific entity ID as the visual port.
    const mapping = [...fk.mappings].reverse().find(item => item.child !== 'project_id') || fk.mappings[0];
    const card = cardinality(fk);
    const tooltip = `${fk.id} ${fk.name}: ${fk.table}(${fk.mappings.map(item => item.child).join(', ')}) → ${fk.parent}(${fk.mappings.map(item => item.parent).join(', ')})`;
    lines.push(`${nodeId(fk.parent)}:p${portId(fk.parent, mapping.parent)}:e -> ${nodeId(fk.table)}:${portId(fk.table, mapping.child)}:w [id=${quote(fk.id)}, dir=both, arrowtail=${quote(card.parent === '1' ? 'teetee' : 'teeodot')}, arrowhead=${quote(card.child === '0..N' ? 'crowodot' : 'teeodot')}, tooltip=${quote(tooltip)}];`);
  }
  lines.push('}');
  return { dot: lines.join('\n'), edges, externalTables: externals.size };
}
const slugs = ['01-danh-tinh-dang-nhap', '02-du-an-cau-hinh', '03-thu-vien-test-case-excel', '04-thuc-thi-kiem-thu', '05-cong-viec-bug', '06-retest-dong-loi', '07-tich-hop-redmine', '08-nen-tang-ky-thuat'];
async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const viz = await instance();
  const summary = {
    source: '../schema.json', sourceGeneratedAt: schema.generatedAt,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
    database: schema.database, flywayVersion: schema.migrations.at(-1).version,
    tables: tableNames.length, columns: schema.columns.length, foreignKeys: foreignKeys.length,
    renderer: Object.fromEntries([['viz', '@viz-js/viz'], ['sharp', 'sharp']].map(([key, name]) => [key, JSON.parse(fs.readFileSync(path.join(root, 'scratch/erd-renderer/node_modules', name, 'package.json'), 'utf8')).version])), images: []
  };
  const plans = [
    { slug: '00-toan-bo-56-bang', title: `DATABASE TMS · ${tableNames.length} BẢNG · ${schema.columns.length} CỘT · ${foreignKeys.length} KHÓA NGOẠI`, names: tableNames, full: true },
    ...groups.map((group, i) => ({ slug: slugs[i], title: `${group.name.toLocaleUpperCase('vi')} · ${group.tables.length} BẢNG`, names: group.tables, full: false }))
  ];
  for (const plan of plans) {
    const graph = renderDot(plan.names, plan.title, plan.full);
    const result = viz.render(graph.dot, { format: 'svg', engine: 'dot' });
    assert.equal(result.status, 'success', JSON.stringify(result.errors));
    // WASM Graphviz lacks some non-ASCII width metrics; the SVG/PNG renderer uses
    // installed Arial. Keep this known warning visible and reject other warnings.
    const unexpected = result.errors.filter(error => !/no value for width of non-ASCII character/.test(error.message));
    assert.equal(unexpected.length, 0, JSON.stringify(unexpected));
    assert.equal((result.output.match(/class="node"/g) || []).length, plan.names.length + graph.externalTables);
    assert.equal((result.output.match(/class="edge"/g) || []).length, graph.edges.length);
    // Graphviz emits points. Wrap it in a pixel-sized SVG with a plain readable caption.
    const view = result.output.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    const width = Math.ceil(Math.max(view[2], 1150));
    const height = Math.ceil(view[3] + 100);
    const inner = result.output.slice(result.output.indexOf('>', result.output.indexOf('<svg')) + 1, result.output.lastIndexOf('</svg>'));
    const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(schema.generatedAt));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${inner}<g font-family="Arial" font-size="12" fill="#587087"><text x="32" y="${height - 72}">PK: khóa chính · FK: khóa ngoại · UQ: unique một cột · NULL: cho phép rỗng · AI: tự tăng · GEN: cột sinh tự động</text><text x="32" y="${height - 51}">Cột không ghi NULL là NOT NULL. Đường nối: một ràng buộc FK (kể cả khóa ghép); chân quạ: nhiều; vòng tròn: có thể không có.</text><text x="32" y="${height - 30}">${plan.full ? 'Đủ mọi bảng và FK vật lý. Không vẽ thêm liên kết chỉ tồn tại trong logic ứng dụng.' : 'Bảng xanh: đủ cột trong nhóm. Bảng xám: khóa tham chiếu ngoài nhóm. Chỉ vẽ FK đi từ bảng trong nhóm.'}</text><text x="32" y="${height - 9}">Nguồn: tms · Flyway V${html(summary.flywayVersion)} · metadata ${html(date)} (giờ Việt Nam) · Chi tiết khóa ghép: foreign-keys.csv</text></g></svg>`;
    fs.writeFileSync(path.join(outputDir, `${plan.slug}.svg`), svg);
    fs.writeFileSync(path.join(outputDir, `${plan.slug}.dot`), graph.dot + '\n');
    const scale = Math.min(plan.full ? 1.7 : 2, 14500 / Math.max(width, height), Math.sqrt(140_000_000 / (width * height)));
    const png = await sharp(Buffer.from(svg), { limitInputPixels: 200_000_000, density: 72 * scale }).png().toFile(path.join(outputDir, `${plan.slug}.png`));
    summary.images.push({ file: `${plan.slug}.png`, title: plan.title, tables: plan.names.length, columns: schema.columns.filter(column => plan.names.includes(column.table)).length, externalTables: graph.externalTables, foreignKeys: graph.edges.length, width: png.width, height: png.height, layoutWarnings: result.errors.map(error => error.message) });
    console.log(JSON.stringify(summary.images.at(-1)));
  }
  const csvCell = value => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [['id', 'constraint', 'child_table', 'child_columns', 'parent_table', 'parent_columns', 'parent_per_child', 'children_per_parent'], ...foreignKeys.map(fk => [fk.id, fk.name, fk.table, fk.mappings.map(item => item.child).join(', '), fk.parent, fk.mappings.map(item => item.parent).join(', '), cardinality(fk).parent, cardinality(fk).child])].map(row => row.map(csvCell).join(',')).join('\r\n');
  fs.writeFileSync(path.join(outputDir, 'foreign-keys.csv'), '\ufeff' + csv + '\r\n');
  assert.equal(summary.images.slice(1).reduce((sum, item) => sum + item.tables, 0), tableNames.length);
  assert.equal(summary.images.slice(1).reduce((sum, item) => sum + item.columns, 0), schema.columns.length);
  assert.equal(summary.images.slice(1).reduce((sum, item) => sum + item.foreignKeys, 0), foreignKeys.length);
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`Verified: ${tableNames.length} tables, ${schema.columns.length} columns, ${foreignKeys.length} FK constraints; ${summary.images.length} static PNG/SVG images.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
