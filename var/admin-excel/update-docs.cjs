const fs=require('node:fs');
const p='docs/api/test-cases.openapi.json',api=JSON.parse(fs.readFileSync(p,'utf8'));
for(const name of ['Revision','RevisionSummary']) {
 api.components.schemas[name].properties.createdBy.nullable=true;
 api.components.schemas[name].properties.createdBy.description='Project membership ID; null for global ADMIN imports without membership.';
 api.components.schemas[name].properties.createdByUserId={type:'string',maxLength:36,nullable:true,description:'Identity ID of the actual author; historical revisions may omit this field.'};
}
fs.writeFileSync(p,JSON.stringify(api,null,2)+'\n');
const path='docs/planning/STATUS.json',status=JSON.parse(fs.readFileSync(path,'utf8'));
status.adminExcelImport={status:'IN_PROGRESS',requestedAt:'2026-10-10',plan:'docs/planning/2026-10-10-admin-excel-import.md',scope:'Global ADMIN import without membership; multi-file preview/commit; responsive document library.',migration:'V26',pushed:false};
fs.writeFileSync(path,JSON.stringify(status,null,2)+'\n');
