process.env.SPRING_FLYWAY_LOCATIONS='classpath:db/migration,classpath:db/demo';
process.env.TMS_OPENAI_ENABLED='false';
const {spawnSync}=require('child_process');
const result=spawnSync('rtk',['proxy','node','scripts/Test-AdminNative.cjs','tms_docstest_202610100007',process.argv[2]||'AdminWorkspaceNativeTest'],{stdio:'inherit',env:process.env});
process.exitCode=result.status??1;
