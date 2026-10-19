const fs=require('fs');
for(const [p,from,to] of [
 ['Backend/src/test/java/vn/syp/tms/workitem/DeveloperPermissionsTest.java','.membership(','.readMembership('],
 ['Backend/src/test/java/vn/syp/tms/filework/AdminWorkspaceFileReadNativeTest.java','expectedGroupVersion','expectedVersion'],
]) {const s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,s.replaceAll(from,to));}
