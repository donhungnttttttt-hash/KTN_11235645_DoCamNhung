const fs=require('node:fs');
const path='docs/api/file-work.openapi.json';
const spec=JSON.parse(fs.readFileSync(path,'utf8'));
const base='/api/v1/projects/{projectId}';
const ref=name=>({$ref:'#/components/schemas/'+name});
const obj=properties=>({type:'object',properties,required:Object.keys(properties)});
const integer={type:'integer',format:'int64',minimum:0};
const id={...integer,minimum:1};
const time={type:'string',format:'date-time'};
const str={type:'string'};
spec.components.schemas.Preparation=obj({asOf:time,archived:{type:'boolean'},counts:obj(Object.fromEntries(['documents','approvedCases','testers','configuredDraftCycles','allocatedDevices','assignedGroups'].map(k=>[k,integer])))});
spec.components.schemas.ActionInboxItem=obj({kind:{type:'string',enum:['FILE','QA','BUG','RETEST']},id,title:str,status:str,updatedAt:time,ownerName:{type:'string',nullable:true},targetId:id});
spec.components.schemas.ActionInboxPage=obj({items:{type:'array',maxItems:100,items:ref('ActionInboxItem')},totalItems:integer,page:integer,pageSize:{type:'integer',minimum:1,maximum:100},totalPages:integer,asOf:time,projectWide:{type:'boolean'},archived:{type:'boolean'}});
for(const k of ['environmentName','deviceName','selectedBuildLabel']){spec.components.schemas.GroupSummary.properties[k]=str;spec.components.schemas.GroupSummary.required.push(k);}
const definitions=[
 ['/file-work-groups/preparation','fileWorkPreparation','Preparation','Current PM only; project preparation counts. Overview, not authorization to create scope or start a session.',[]],
 ['/action-inbox','actionInbox','ActionInboxPage','Live role-scoped queue; no write, read receipt or implicit completion. Archived project returns empty. Stable updatedAt DESC/kind/id DESC paging.',[
 {name:'page',in:'query',schema:{type:'integer',minimum:0,default:0}},
 {name:'size',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:20}},
 {name:'kind',in:'query',schema:{type:'string',enum:['','FILE','QA','BUG','RETEST'],default:''}}]]
];
let index=fs.readFileSync('docs/api/openapi.yaml','utf8');
for(const [suffix,operationId,response,description,parameters] of definitions){
 const template=structuredClone(spec.paths[base+'/file-work-groups/metadata']);
 template.get={...template.get,operationId,description,parameters};
 template.get.responses['200'].content['application/json'].schema=ref(response);
 spec.paths[base+suffix]=template;
 const route=base+suffix;
 index=index.replace('paths:\n','paths:\n  '+route+':\n    $ref: "./file-work.openapi.json#/paths/'+route.replaceAll('/','~1')+'"\n');
}
fs.writeFileSync(path,JSON.stringify(spec,null,2)+'\n');
fs.writeFileSync('docs/api/openapi.yaml',index);
