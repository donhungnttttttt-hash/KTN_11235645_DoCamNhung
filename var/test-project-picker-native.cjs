const {spawnSync}=require('node:child_process');
// The existing isolated AI test schema includes opt-in local demo migrations V20/V22.
const result=spawnSync('rtk',['proxy','node','scripts/Test-AdminNative.cjs','tms_docstest_202610100007','AdminNativeIntegrationTest,AdminOverviewServiceTest'],{
 stdio:'inherit',env:{...process.env,SPRING_FLYWAY_LOCATIONS:'classpath:db/migration,classpath:db/demo',TMS_OPENAI_ENABLED:'false'}
});
process.exitCode=result.status??1;
