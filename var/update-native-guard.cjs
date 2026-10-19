const fs=require('fs');
for(const p of ['scripts/Test-FileWorkQaNative.cjs','scripts/Test-FileWorkQaNative.test.cjs','Backend/src/test/java/vn/syp/tms/filework/NativeFileWorkQaIntegrationTest.java','Backend/src/test/java/vn/syp/tms/filework/NativeFileWorkQaConcurrencyTest.java']){
 let s=fs.readFileSync(p,'utf8').replaceAll("'21':'26'","'21':'27'").replaceAll("['26']","['27']").replaceAll('V26','V27').replace('isEqualTo(26)','isEqualTo(27)').replace('flyway("26")','flyway("27")');fs.writeFileSync(p,s);
}
