const fs=require('node:fs');
const path='Backend/src/main/java/vn/syp/tms/testcase/TestCaseService.java';
let s=fs.readFileSync(path,'utf8');
s=s.replaceAll('r.getCreatedAt(), r.getCreatedBy()','r.getCreatedAt(), r.getCreatedBy(), r.getCreatedByUserId()')
 .replaceAll('rev.getCreatedAt(), rev.getCreatedBy()','rev.getCreatedAt(), rev.getCreatedBy(), rev.getCreatedByUserId()')
 .replaceAll('r.getCreatedAt(),r.getCreatedBy()','r.getCreatedAt(),r.getCreatedBy(),r.getCreatedByUserId()');
// Every new revision carries the identity, while membership IDs remain compatible.
s=s.replaceAll('rev.setCreatedBy(memberId);\n        rev.setChecksum','rev.setCreatedBy(memberId);\n        rev.setCreatedByUserId(userId);\n        rev.setChecksum');
fs.writeFileSync(path,s);
