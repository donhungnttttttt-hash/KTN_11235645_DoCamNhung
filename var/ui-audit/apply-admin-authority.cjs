const fs=require('fs');
function edit(p, pairs){let s=fs.readFileSync(p,'utf8');for(const [a,b] of pairs){if(!s.includes(a))throw Error(p+' missing '+a);s=s.replaceAll(a,b);}fs.writeFileSync(p,s);}
const fe='Frontend/src/app/';const be='Backend/src/main/java/vn/syp/tms/';
for(const p of ['features/test-cases/TestDocumentPage.jsx','features/test-cases/DocumentExecution.jsx'])edit(fe+p,[
 ["import { isProjectObserver }", "import { isProjectObserver, isProjectDeveloper, canManageProjectWork }"],
 ["const dev=hasRole?.('DEV') || project", "const dev=isProjectDeveloper(project,hasRole); // project"],
]);
edit(fe+'features/test-cases/TestDocumentPage.jsx',[
 ["const canAssign=!dev && !project.archived && project.projectRole==='PM';","const canAssign=canManageProjectWork(project,hasRole);"],
 ["!dev && project.projectRole==='PM' && !project.archived", "canAssign"],
 ["Unexecuted → OK → P → NG → Fixed → NA", "Unexecuted → OK → NG → P → NA → Unexecuted"]
]);
edit(fe+'features/test-cases/CaseDetailModal.jsx',[
 ["import { isProjectObserver }", "import { isProjectObserver, isProjectDeveloper, canManageProjectWork }"],
 ["currentProject.projectRole!=='DEV' && !hasRole?.('DEV')", "!isProjectDeveloper(currentProject,hasRole)"],
 ["writable && currentProject.projectRole === 'PM'", "writable && canManageProjectWork(currentProject,hasRole)"]
]);
edit(fe+'features/test-execution/ExecutionRunnerPage.jsx',[
 ["import { canManageProjectWork }", "import { canManageProjectWork, isProjectDeveloper }"],
 ["hasRole?.('DEV') || project?.projectRole==='DEV'", "isProjectDeveloper(project,hasRole)"],
 ["!dev && project?.projectRole === 'PM' && !project.archived", "manager"],
 ["r.assigneeUserId === user?.id", "(hasRole?.('ADMIN') || r.assigneeUserId === user?.id)"]
]);
for(const [p,repo,method] of [['testcase/TestCaseService.java','membershipRepository','getMemberId'],['rules/RuleService.java','membershipRepo','getMembershipId'],['handbook/HandbookService.java','membershipRepo','getMembershipId']]){
 let path=be+p,s=fs.readFileSync(path,'utf8');let re=new RegExp('private Long '+method+'\\(Long projectId, String userId\\) \\{[\\s\\S]*?\\n    \\}');
 if(!re.test(s))throw Error(path);s=s.replace(re,`private Long ${method}(Long projectId, String userId) {\n        return projectService.actorMembershipId(projectId,userId);\n    }`);
 fs.writeFileSync(path,s);
}
edit(be+'execution/ExecutionService.java',[
 ['if(num(r,"assigneeMembershipId")!=executor)', 'if(!projects.isGlobalAdmin(actor) && num(r,"assigneeMembershipId")!=executor)'],
 ['        eligibleMember(p,executor);', '        if(!projects.isGlobalAdmin(actor)) eligibleMember(p,executor);'],
 ['private long member(long p,String actor) { return num(row("SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE",p,actor),"id"); }','private long member(long p,String actor) { return projects.actorMembershipId(p,actor); }']
]);
edit('Backend/src/test/java/vn/syp/tms/project/CentralMembershipTest.java',[
 ['mock(ProjectAudit.class),users)', 'mock(ProjectAudit.class),users,mock(ProjectActorService.class))']
]);
