const fs=require('node:fs');
const s=fs.readFileSync('Frontend/src/app/features/test-cases/ImportExcelDialog.jsx','utf8');
const block=s.slice(s.indexOf('              <div className="text-sm">'),s.indexOf('\n            </div>\n          )}'));
fs.writeFileSync('Frontend/src/app/features/test-cases/ExcelImportPreview.jsx',`import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { TableScroll } from '../../components/TableScroll';

export function ExcelImportPreview({ previewData }) {
  const [errorsOnly, setErrorsOnly] = useState(false);
  return <div className="space-y-4">
${block.replace(/^.*status === "COMMITTED".*$/m,'')}
  </div>;
}
`);
