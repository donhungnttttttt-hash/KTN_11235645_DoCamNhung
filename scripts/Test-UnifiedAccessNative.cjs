const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {parseConfig,query}=require('./database/mysql-client.cjs');
const root=path.resolve(__dirname,'..');
function validateSchema(schema,existing,owned) {
  if(!/^tms_userstest_[a-f0-9]{12}$/.test(schema)||existing.includes(schema)&&owned!==schema) throw Error('Dedicated owned test schema required');
  return schema;
}
function validateBuildDirectory(repo,dir) {
  const expected=path.resolve(repo,'Backend/target/unified-access-verification');
  if(path.resolve(dir)!==expected)throw Error('Refusing to overwrite a non-test build directory');
  return expected;
}
function assertExecuted(suites) {
  if(suites.some(s=>/(?:Unified.*|GuestReporting|SystemAdminProvision)NativeTest/.test(s.name||'')&&s.skipped>0))throw Error('Required unified-access native suite was skipped');
  const result=suites.reduce((a,s)=>({executed:a.executed+s.tests-s.skipped,skipped:a.skipped+s.skipped,failures:a.failures+s.failures+s.errors}),{executed:0,skipped:0,failures:0});
  if(!result.executed||result.failures)throw Error('No passing executed tests: '+JSON.stringify(result));
  return result;
}
function provision(build) {
  const local=parseConfig(fs.readFileSync(path.join(root,'.env.mysql.local'),'utf8'));
  const configPath=path.join(build,'environment.json');
  if(fs.existsSync(configPath)) {
    const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
    validateSchema(config.schema,[config.schema],config.schema);
    if(config.owner!==root||!config.url.includes('/'+config.schema+'?'))throw Error('Test database ownership mismatch');
    return config;
  }
  const secretPath=process.env.TMS_TEST_ADMIN_CONFIG;
  if(!secretPath)throw Error('Set TMS_TEST_ADMIN_CONFIG to a private local MySQL admin JSON file (user/password); never pass a password on argv.');
  const admin=JSON.parse(fs.readFileSync(secretPath,'utf8'));
  const connection={...local,TMS_DB_NAME:'mysql',TMS_DB_USER:admin.user,TMS_DB_PASSWORD:admin.password};
  const existing=query('SHOW DATABASES',connection);
  const schema=validateSchema('tms_userstest_'+crypto.randomBytes(6).toString('hex'),existing,null);
  const user='ut_'+crypto.randomBytes(6).toString('hex'),password=crypto.randomBytes(32).toString('hex');
  // Names/password consist only of generated ASCII hex; none comes from a caller's SQL fragment.
  query(`CREATE DATABASE ${schema} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER '${user}'@'localhost' IDENTIFIED BY '${password}';
GRANT ALL PRIVILEGES ON ${schema}.* TO '${user}'@'localhost';`,connection);
  const config={owner:root,schema,user,password,url:`jdbc:mysql://${local.TMS_MYSQL_HOST}:${local.TMS_MYSQL_PORT}/${schema}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`};
  fs.writeFileSync(configPath,JSON.stringify(config));
  return config;
}
function main() {
  const index=process.argv.indexOf('--tests'),tests=index<0?'IdentityPolicyTest':process.argv[index+1];
  if(!tests||!/^[A-Za-z0-9_.,*#!+-]+$/.test(tests))throw Error('Invalid test selector');
  const build=validateBuildDirectory(root,path.join(root,'Backend/target/unified-access-verification'));
  fs.mkdirSync(build,{recursive:true});
  const config=provision(build);
  fs.cpSync(path.join(root,'Backend/src'),path.join(build,'src'),{recursive:true});
  fs.copyFileSync(path.join(root,'Backend/pom.xml'),path.join(build,'pom.xml'));
  const env={...process.env,TMS_TEST_USERS_URL:config.url,TMS_TEST_USERS_USER:config.user,TMS_TEST_USERS_PASSWORD:config.password,DEBUG:'false',TRACE:'false'};
  const result=cp.spawnSync('rtk',['proxy','cmd.exe','/d','/c','mvn','-B','-ntp','clean','verify','-Dtest='+tests],{cwd:build,env,encoding:'utf8',windowsHide:true,maxBuffer:48*1024*1024});
  const output=(result.stdout||'')+(result.stderr||'');
  const log=path.join(build,'last-test.log');fs.writeFileSync(log,output);
  console.log(output.split(/\r?\n/).filter(x=>/Tests run:|BUILD |ERROR|Total time/.test(x)).slice(-45).join('\n'));
  console.log('Log: '+log);
  if(result.status!==0){process.exitCode=result.status||1;return;}
  const reports=path.join(build,'target/surefire-reports');
  const suites=fs.readdirSync(reports).filter(x=>/^TEST-.*\.xml$/.test(x)).map(file=>{
    const xml=fs.readFileSync(path.join(reports,file),'utf8'),tag=xml.match(/<testsuite\s[^>]+>/)?.[0]||'';
    return {name:file,...Object.fromEntries(['tests','skipped','failures','errors'].map(key=>[key,Number(tag.match(new RegExp(key+'="(\\d+)"'))?.[1]||0)]))};
  });
  console.log('Verified: '+JSON.stringify(assertExecuted(suites)));
}
module.exports={validateSchema,validateBuildDirectory,assertExecuted};
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
