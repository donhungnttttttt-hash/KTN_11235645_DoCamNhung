// Read-only source/metadata census. A missing literal reference is NOT proof
// that a table is unused: JPA, Spring Session, Flyway and FK catalogs also use it.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const schemaText = read('docs/database/erd/schema.json');
const schema = JSON.parse(schemaText);
const groups = require('./database/diagram-groups.cjs');
const snapshot = JSON.parse(read('docs/uat/database-audit.json'));
const groupedTables = groups.flatMap(group => group.tables);
assert.deepEqual([...groupedTables].sort(), schema.tables.map(table => table.name).sort());
assert.equal(new Set(groupedTables).size, schema.tables.length);

function sources(directory) {
    return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
        const file = `${directory}/${entry.name}`;
        if (entry.isDirectory()) return sources(file);
        return file.endsWith('.java') ? [{ file, lines: read(file).split(/\r?\n/) }] : [];
    });
}
const runtime = sources('Backend/src/main/java');
const indexes = Object.values(Object.groupBy(schema.indexes, item => `${item.table}.${item.name}`)).map(rows => ({
    table: rows[0].table, name: rows[0].name, unique: !!rows[0].unique, columns: rows.map(row => row.column)
}));
const constraints = Object.values(Object.groupBy(schema.foreignKeys, item => `${item.table}.${item.name}`));
const duplicateIndexes = [];
const prefixCandidates = [];
for (const [position, index] of indexes.entries()) {
    for (const other of indexes.slice(position + 1).filter(item => item.table === index.table)) {
        if (JSON.stringify(index.columns) === JSON.stringify(other.columns)) duplicateIndexes.push([index, other]);
    }
    if (!index.unique) {
        for (const other of indexes.filter(item => item.table === index.table && item.columns.length > index.columns.length)) {
            if (index.columns.every((column, i) => column === other.columns[i])) prefixCandidates.push([index, other]);
        }
    }
}
const tables = schema.tables.map(table => {
    const pattern = new RegExp(`\\b${table.name}\\b`, 'i');
    return {
        table: table.name,
        group: groups.find(group => group.tables.includes(table.name)).name,
        columns: schema.columns.filter(column => column.table === table.name).length,
        outgoingForeignKeys: constraints.filter(rows => rows[0].table === table.name).length,
        incomingForeignKeys: constraints.filter(rows => rows[0].parent === table.name).length,
        indexes: indexes.filter(index => index.table === table.name),
        snapshotRows: snapshot.tables.find(item => item.name === table.name)?.count ?? null,
        literalRuntimeReferences: runtime.flatMap(source => source.lines.flatMap((line, i) => pattern.test(line) ? [{ file: source.file, line: i + 1 }] : []))
    };
});
const result = {
    generatedAt: new Date().toISOString(),
    mode: 'Offline review of current source and previously exported metadata; not a live database audit',
    schemaSource: 'docs/database/erd/schema.json', schemaGeneratedAt: schema.generatedAt,
    schemaSha256: crypto.createHash('sha256').update(schemaText).digest('hex'),
    rowCountsSource: 'docs/uat/database-audit.json', rowCountsCheckedAt: snapshot.checkedAt,
    limitations: ['Literal references include SQL/JPA mapping, but are not executed-query telemetry.',
        'No table is classified as unused automatically.',
        'Index comparison uses ordered column names only; verify type/prefix length/sort order/visibility and EXPLAIN before any DDL.',
        'Row counts are a dated demo snapshot, not current production volume or table storage bytes.'],
    totals: { tables: tables.length, columns: schema.columns.length, foreignKeys: constraints.length,
        compositeForeignKeys: constraints.filter(rows => rows.length > 1).length,
        indexes: indexes.length, primaryIndexes: indexes.filter(index => index.name === 'PRIMARY').length,
        uniqueSecondaryIndexes: indexes.filter(index => index.unique && index.name !== 'PRIMARY').length,
        nonUniqueIndexes: indexes.filter(index => !index.unique).length },
    duplicateIndexes, nonUniquePrefixCandidates: prefixCandidates, tables
};
const output = 'docs/reviews/database-usage-audit.json';
fs.writeFileSync(path.join(root, output), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, ...result.totals, exactDuplicateCandidates: duplicateIndexes.length,
    nonUniquePrefixCandidates: prefixCandidates.length, noLiteralReference: tables.filter(table => !table.literalRuntimeReferences.length).map(table => table.table) }, null, 2));
