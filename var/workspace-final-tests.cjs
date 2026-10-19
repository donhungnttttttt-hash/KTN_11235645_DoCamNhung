const fs=require('fs');const {spawnSync}=require('child_process');
const names=fs.readFileSync('var/workspace-unit-selector.txt','utf8').split(',').filter(n=>n!=='LocalDatabaseConfigurationTest').join(',')+',AdminWorkspaceNativeTest,AdminWorkspaceFileReadNativeTest,TestDocumentIntegrationTest,AdminNativeIntegrationTest';
const r=spawnSync('rtk',['proxy','node','var/test-admin-workspace.cjs',names],{stdio:'inherit'});process.exitCode=r.status??1;
