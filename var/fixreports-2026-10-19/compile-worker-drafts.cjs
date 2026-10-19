const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),xml=fs.readFileSync(path.join(__dirname,'export-parser-TEST.xml'),'utf8');
const match=xml.match(/<property name="java.class.path" value="([^"]+)"\s*\/>/);if(!match)throw Error('No captured test classpath');
const cp=match[1].replaceAll('&amp;','&').replaceAll('\\','/');const output=path.join(__dirname,'worker-draft-compile');fs.mkdirSync(output,{recursive:true});
const quote=value=>'"'+value.replaceAll('\\','/')+'"';const argfile=path.join(__dirname,'worker-draft-javac.args');
fs.writeFileSync(argfile,['-encoding','UTF-8','-cp',quote(cp),'-d',quote(output),quote(path.join(__dirname,'FeatureAiIntegrationTest.java')),quote(path.join(__dirname,'AiPortfolioContextTest.java'))].join('\n'));
const result=spawnSync('javac',['@'+argfile],{cwd:root,encoding:'utf8',shell:false});if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);if(result.error)throw Error('javac unavailable');process.exitCode=result.status??1;
