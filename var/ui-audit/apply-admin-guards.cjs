const fs=require('fs');const be='Backend/src/main/java/vn/syp/tms/';
function edit(p, pairs){let s=fs.readFileSync(p,'utf8');for(const [a,b] of pairs){if(!s.includes(a))throw Error(p+' missing '+a);s=s.replaceAll(a,b);}fs.writeFileSync(p,s);}
edit(be+'filework/FileWorkService.java',[
 ['    private final FileWorkSessionService sessions;','    private final FileWorkSessionService sessions;\n    private final vn.syp.tms.project.ProjectActorService actors;'],
 ['ObjectMapper json,FileWorkSessionService sessions)', 'ObjectMapper json,FileWorkSessionService sessions,vn.syp.tms.project.ProjectActorService actors)'],
 ['this.sessions=sessions;', 'this.sessions=sessions;this.actors=actors;'],
 ['public record Actor(long membershipId,boolean pm,boolean tester,boolean archived) {}','public record Actor(long membershipId,boolean pm,boolean tester,boolean archived,boolean admin) {}'],
 [`        // Membership ID 0 is a read-only observer, never a persisted/assignable member.
        if(!pmWrite && "ADMIN".equals(account.getRole()) && db.rows(
            "SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,actor).isEmpty())
            return new Actor(0,false,false,project.get("archivedAt")!=null);`,
 `        if("ADMIN".equals(account.getRole())) {
            boolean archived=project.get("archivedAt")!=null;
            if(pmWrite && archived)fail(409,"ARCHIVED","Dự án đã được lưu trữ.");
            return new Actor(pmWrite?actors.forWrite(p,actor):actors.existing(p,actor),true,true,archived,true);
        }`],
 ['new Actor(number(member,"id"),pm,tester,archived)', 'new Actor(number(member,"id"),pm,tester,archived,false)'],
 ['new FileWorkGuard.Actor(caller.membershipId(),caller.pm(),caller.tester(),caller.archived())','new FileWorkGuard.Actor(caller.membershipId(),caller.pm(),caller.tester(),caller.archived(),caller.admin())']
]);
edit(be+'qa/QaService.java',[
 ['public record Actor(long membershipId, boolean pm, boolean tester, boolean dev, boolean archived) {}','public record Actor(long membershipId, boolean pm, boolean tester, boolean dev, boolean archived, boolean admin) {}'],
 [`        // Membership ID 0 is a read-only observer, never a persisted/assignable member.
        if(!write && "ADMIN".equals(account.getRole()) && db.rows(
            "SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,user).isEmpty())
            return new Actor(0,false,false,false,project.get("archivedAt")!=null);`,
 `        if("ADMIN".equals(account.getRole())) {
            boolean archived=project.get("archivedAt")!=null;
            if(write && archived)fail(409,"ARCHIVED","Dự án đã lưu trữ.");
            return new Actor(identity.adminActor(p,user,write),true,true,false,archived,true);
        }`],
 ['globalDev&&"DEV".equals(member.get("projectRole")),project.get("archivedAt")!=null)', 'globalDev&&"DEV".equals(member.get("projectRole")),project.get("archivedAt")!=null,false)'],
 ['boolean assigned=actor.dev()&&Objects.equals(item.get("assigneeMembershipId"),actor.membershipId());','boolean assigned=actor.admin() || actor.dev()&&Objects.equals(item.get("assigneeMembershipId"),actor.membershipId());'],
 ['boolean creator=Objects.equals(item.get("createdBy"),actor.membershipId());','boolean creator=actor.admin() || Objects.equals(item.get("createdBy"),actor.membershipId());'],
 ['private void authorizeAction(Actor actor,Map<String,Object> item,String action) {','private void authorizeAction(Actor actor,Map<String,Object> item,String action) {\n        if(actor.admin())return;']
]);
edit(be+'workitem/WorkItemService.java',[
 ['return db.row("SELECT m.id,CASE WHEN u.role_code=\'DEV\' THEN \'DEV\' ELSE m.project_role END AS role,u.role_code AS systemRole FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.user_id=? AND m.active=TRUE AND u.enabled=TRUE",p,actor);',
 'return db.row("SELECT m.id,CASE WHEN u.role_code=\'ADMIN\' THEN \'PM\' WHEN u.role_code=\'DEV\' THEN \'DEV\' ELSE m.project_role END AS role,u.role_code AS systemRole FROM project_memberships m JOIN identity_users u ON u.id=m.user_id WHERE m.project_id=? AND m.user_id=? AND (m.active=TRUE OR u.role_code=\'ADMIN\') AND u.enabled=TRUE",p,actor);'],
 ["CASE WHEN u.role_code='DEV' THEN 'DEV' ELSE m.project_role END AS role,u.role_code AS systemRole", "CASE WHEN u.role_code='ADMIN' THEN 'PM' WHEN u.role_code='DEV' THEN 'DEV' ELSE m.project_role END AS role,u.role_code AS systemRole"],
 ['var member=membership(p,actor);', 'qa.authorize(p,actor,true);\n        var member=membership(p,actor);'],
 ['current.membershipId()>0&&!current.archived()', '(current.admin() || current.membershipId()>0)&&!current.archived()'],
 ['number(member,"id")>0 &&', '("ADMIN".equals(member.get("systemRole")) || number(member,"id")>0) &&']
]);
edit(be+'filework/FileWorkSessionService.java',[
 ['var caller=guard.authorize(p,actor,false);key(input.requestKey());', 'var caller=guard.authorize(p,actor,false,true);key(input.requestKey());'],
 ['AND al.recipient_membership_id=? AND al.returned_at IS NULL', 'AND (? OR al.recipient_membership_id=?) AND al.returned_at IS NULL'],
 ['p,caller.membershipId());\n        var result', 'p,caller.admin(),caller.membershipId());\n        var result'],
 ['if(number(session,"executorMembershipId")!=caller.membershipId())return caps;', 'if(!caller.admin() && number(session,"executorMembershipId")!=caller.membershipId())return caps;']
]);
