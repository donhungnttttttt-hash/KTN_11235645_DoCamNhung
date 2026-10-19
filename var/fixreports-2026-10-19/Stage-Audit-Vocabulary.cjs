// Candidate preparation only: writes exclusively under var, never Backend or the DB.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'audit-vocabulary-candidate');
fs.mkdirSync(out,{recursive:true});
const relative='Backend/src/main/java/vn/syp/tms/admin/AdminAuditLabels.java';
const baseline=fs.readFileSync(path.join(root,relative),'utf8');
if(!baseline.includes('private static final Map<String,String> LABELS=Map.ofEntries('))throw Error('Audit vocabulary baseline changed; reconcile candidate manually');
let labels=baseline.replace('private static final Map<String,String> LABELS=Map.ofEntries(','private static final Map<String,String> LABELS=labels();\n    private static Map<String,String> labels(){\n        var labels=new LinkedHashMap<String,String>(Map.ofEntries(');
labels=labels.replace('    );',`    ));
        labels.put("MANAGEMENT_REPORT","Báo cáo quản trị");
        labels.put("PROJECT_NOTE","Note dự án");
        labels.put("WORK_ITEM","Issue");
        labels.put("STATUS","Đổi trạng thái");
        labels.put("COMMENT","Thêm ghi chú");
        // Only the five known case Status values are translated; unknown audit codes remain raw.
        var statuses=List.of("UNEXECUTED","OK","NG","P","NA");
        for(String from:statuses)for(String to:statuses)
            labels.put("RESULT_"+from+"_"+to,"Status: "+statusLabel(from)+" → "+statusLabel(to));
        return Map.copyOf(labels);
    }
    private static String statusLabel(String status){return "UNEXECUTED".equals(status)?"Unexecuted":status;}`);
fs.writeFileSync(path.join(out,'AdminAuditLabels.java'),labels);
fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify({relative,sha256:crypto.createHash('sha256').update(baseline).digest('hex'),scope:'Labels only; raw audit rows/codes unchanged. Tests installed first for observed RED.'},null,2)+'\n');
const nativeRelative='Backend/src/test/java/vn/syp/tms/admin/AdminNativeIntegrationTest.java';
const native=fs.readFileSync(path.join(root,nativeRelative),'utf8'),end=native.lastIndexOf('}');
if(end<0||native.includes('auditNewFlowVocabularySearchMatchesDisplayedLabelsAcrossPages'))throw Error('Native audit candidate already applied or source shape changed');
const method=fs.readFileSync(path.join(out,'native-method.java.fragment'),'utf8');
fs.writeFileSync(path.join(out,'AdminNativeIntegrationTest.java'),native.slice(0,end)+method+native.slice(end));
fs.writeFileSync(path.join(out,'native-baseline.json'),JSON.stringify({relative:nativeRelative,sha256:crypto.createHash('sha256').update(native).digest('hex')},null,2)+'\n');
console.log('Prepared production labels + unit3/native1 test candidates outside Backend. No source apply/Maven/DB execution.');
