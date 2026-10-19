const fs=require('node:fs');
const load=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const save=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
const tcFile='docs/api/test-cases.openapi.json',tc=load(tcFile);
const source=tc.paths['/api/v1/projects/{projectId}/test-documents/{id}/rows/{rowId}/second-test'];
const operation=structuredClone(source.put);
operation.operationId='approveTestDocumentRows';
operation.description='ADMIN or current project PM. CSRF required. Approve 1–500 selected current revisions in one transaction. Every row must belong to the same project/document; duplicates, archived cases, stale expectedRevisionId or unauthorized actors reject the whole batch. Already-approved current revisions are idempotent. Approval is explicit and does not assign or execute cases.';
operation.requestBody.content['application/json'].schema={$ref:'#/components/schemas/DocumentApprovalInput'};
operation.responses['200'].content['application/json'].schema={$ref:'#/components/schemas/DocumentApprovalResult'};
tc.paths['/api/v1/projects/{projectId}/test-documents/{id}/approvals']={parameters:source.parameters.filter(p=>p.name!=='rowId'),post:operation};
const positive={type:'integer',format:'int64',minimum:1};
tc.components.schemas.DocumentApprovalInput={type:'object',required:['rows'],properties:{rows:{type:'array',minItems:1,maxItems:500,items:{$ref:'#/components/schemas/DocumentApprovalRow'}}}};
tc.components.schemas.DocumentApprovalRow={type:'object',required:['rowId','expectedRevisionId'],properties:{rowId:positive,expectedRevisionId:positive}};
tc.components.schemas.DocumentApprovalResult={type:'object',required:['approvedCount'],properties:{approvedCount:{type:'integer',minimum:1,maximum:500}}};
source.put.description=source.put.description.replace('Project PM only','ADMIN or current project PM');
save(tcFile,tc);
const fwFile='docs/api/file-work.openapi.json',fw=load(fwFile);
// Remove the retired source-tuple uniqueness error; all case/run collision guards stay.
function update(value){if(Array.isArray(value)){for(let i=value.length-1;i>=0;i--){if(value[i]==='FILE_GROUP_EXISTS')value.splice(i,1);else update(value[i]);}}else if(value&&typeof value==='object')Object.values(value).forEach(update);}
update(fw);fw.info.description=(fw.info.description||'')+' Update 2026-10-11: one source document/cycle/configuration can have multiple groups assigned to different Testers; each group has a disjoint case scope. V29 preserves run uniqueness and project/source foreign keys.';save(fwFile,fw);
const psFile='docs/api/project-settings.openapi.json',ps=load(psFile);
function availability(value){if(!value||typeof value!=='object')return;if(value.properties?.membershipId&&value.properties?.active&&value.properties?.systemRole){value.properties.enabled={type:'boolean',description:'Current account availability, separate from active project membership. Locked/missing accounts cannot receive new work or device allocations.'};if(value.required&&!value.required.includes('enabled'))value.required.push('enabled');}Object.values(value).forEach(availability);}
availability(ps);save(psFile,ps);
