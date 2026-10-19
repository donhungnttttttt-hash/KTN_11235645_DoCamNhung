const fs=require('fs');const be='Backend/src/main/java/vn/syp/tms/';const fe='Frontend/src/app/';
function edit(p,pairs){let s=fs.readFileSync(p,'utf8');for(const [a,b]of pairs){if(!s.includes(a))throw Error(p+' missing '+a);s=s.replaceAll(a,b);}fs.writeFileSync(p,s);}
edit(be+'filework/FileWorkSessionService.java',[
 ['var caller=guard.authorize(p,actor,false);key(input.requestKey());','var caller=guard.authorize(p,actor,false,true);key(input.requestKey());'],
 ['AND al.recipient_membership_id=? AND al.returned_at IS NULL','AND (? OR al.recipient_membership_id=?) AND al.returned_at IS NULL'],
 ['ORDER BY a.id,al.id",p,caller.membershipId());','ORDER BY a.id,al.id",p,caller.admin(),caller.membershipId());'],
 ['if(number(session,"executorMembershipId")!=caller.membershipId())return caps;','if(!caller.admin() && number(session,"executorMembershipId")!=caller.membershipId())return caps;']
]);
edit(be+'retest/RetestService.java',[
 ['number(request,"assigneeMembershipId")==number(member,"id") && items.stream().allMatch(i->number(i,"assigneeMembershipId")==number(member,"id"))', '("ADMIN".equals(member.get("systemRole")) || number(request,"assigneeMembershipId")==number(member,"id")) && items.stream().allMatch(i->number(i,"assigneeMembershipId")==number(request,"assigneeMembershipId"))'],
 ['if(number(request,"assigneeMembershipId")!=author)', 'if(!"ADMIN".equals(member.get("systemRole")) && number(request,"assigneeMembershipId")!=author)'],
 ['eligibleMember(p,author);version', 'if(!"ADMIN".equals(member.get("systemRole"))) eligibleMember(p,author);version'],
 ['if(number(run,"assigneeMembershipId")!=author)', 'if(number(run,"assigneeMembershipId")!=number(request,"assigneeMembershipId"))']
]);
edit(be+'execution/ExecutionService.java',[
 ["AND q.verification_scope='FULL_CASE' AND q.status='OPEN' AND q.assignee_membership_id=? AND q.build_id=?", "AND q.verification_scope='FULL_CASE' AND q.status='OPEN' AND (? OR q.assignee_membership_id=?) AND q.build_id=?"],
 ['p,requestId,coverageItemId,id,executor,input.buildId());','p,requestId,coverageItemId,id,projects.isGlobalAdmin(actor),executor,input.buildId());']
]);
edit(be+'admin/ProjectStatusReportService.java',[
 ['var member=membership(actor,projectId,true);','boolean admin="ADMIN".equals(users.getFirst().get("role"));\n  var member=admin?Map.<String,Object>of("role","PM"):membership(actor,projectId,true);']
]);
for(const p of ['TestDocumentPage.jsx','DocumentExecution.jsx']){
 const path=fe+'features/test-cases/'+p;let s=fs.readFileSync(path,'utf8').replace(/; \/\/ project[^\n]*/g,';');
 if(p==='DocumentExecution.jsx')s=s.replace(', canManageProjectWork','');
 fs.writeFileSync(path,s);
}
edit(fe+'features/test-execution/AttemptDialog.jsx',[
 ['readOnly = false })', 'readOnly = false, globalAdmin = false })'],
 ['String(run.assigneeUserId) === String(currentUserId)', '(globalAdmin || String(run.assigneeUserId) === String(currentUserId))']
]);
for(const p of ['features/test-execution/ExecutionRunnerPage.jsx','features/test-cases/DocumentExecution.jsx'])edit(fe+p,[['<AttemptDialog ',"<AttemptDialog globalAdmin={hasRole?.('ADMIN')} "]]);
// Keep unit fixtures explicit about their non-admin actor and inject the new actor resolver.
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
for(const p of files('Backend/src/test/java').filter(p=>p.endsWith('.java'))){let s=fs.readFileSync(p,'utf8'),before=s;
 s=s.replace(/new (QaService|FileWorkGuard|FileWorkService)\.Actor\((\d+),(true|false|pm),(true|false|tester),(true|false|dev)(,false)?\)/g,(match,type,...v)=>match.slice(0,-1)+',false)');
 s=s.replaceAll('new FileWorkGuard(db,identity)','new FileWorkGuard(db,identity,mock(vn.syp.tms.project.ProjectActorService.class))');
 s=s.replaceAll('new FileWorkService(db,identity,execution,audit,new ObjectMapper().findAndRegisterModules(),sessionService)','new FileWorkService(db,identity,execution,audit,new ObjectMapper().findAndRegisterModules(),sessionService,mock(vn.syp.tms.project.ProjectActorService.class))');
 if(s!==before)fs.writeFileSync(p,s);
}
for(const p of ['testcase/TestCaseService.java','rules/RuleService.java','handbook/HandbookService.java']){
 let path=be+p,s=fs.readFileSync(path,'utf8').replace('import vn.syp.tms.project.ProjectMembership;\n','');
 if(p!=='testcase/TestCaseService.java')s=s.replace('    private final MembershipRepository membershipRepo;\n','').replace('        this.membershipRepo = membershipRepo;\n','');
 fs.writeFileSync(path,s);
}
