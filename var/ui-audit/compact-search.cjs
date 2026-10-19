const fs = require('fs');
const file = 'Frontend/src/app/features/admin/AdminProjects.jsx';
const before = fs.readFileSync(file, 'utf8');
const after = before.replace('<form onSubmit={e=>e.preventDefault()}>', '<form className="admin-list-search" onSubmit={e=>e.preventDefault()}>');
if (after === before) throw new Error('Expected project search form not found');
fs.writeFileSync(file, after);
