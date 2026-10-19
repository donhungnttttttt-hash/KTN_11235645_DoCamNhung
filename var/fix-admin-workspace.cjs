const fs=require('fs');
const base='Backend/src/main/java/vn/syp/tms/';
function edit(path,fn){const p=base+path;const old=fs.readFileSync(p,'utf8');const next=fn(old);if(next===old)throw Error('No edit: '+p);fs.writeFileSync(p,next);}
edit('project/ProjectService.java',s=>{
 const start=s.indexOf('        List<ProjectMembership> memberships =',s.indexOf('public List<ProjectDtos.ProjectSummary> list'));
 const end=s.indexOf('\n    }',start);
 s=s.slice(0,start)+`        boolean admin = "ADMIN".equals(identityService.current(userId).getRole());
        var roles = membershipRepository.findByUserIdAndActiveTrue(userId).stream()
                .collect(Collectors.toMap(ProjectMembership::getProjectId, ProjectMembership::getProjectRole));
        var visible = admin ? projectRepository.findAll(org.springframework.data.domain.Sort.by("id"))
                : projectRepository.findAllById(roles.keySet()).stream()
                    .sorted(java.util.Comparator.comparing(Project::getId)).toList();
        return visible.stream().map(p -> new ProjectDtos.ProjectSummary(p.getId(), p.getCode(), p.getName(),
                p.getDescription(), p.getTimezone(), p.getArchivedAt() != null, p.getLockVersion(), roles.get(p.getId())))
                .toList();`+s.slice(end);
 s=s.replace('public ProjectDtos.ProjectDetail get(Long projectId, String userId) {\n        requireMembership','public ProjectDtos.ProjectDetail get(Long projectId, String userId) {\n        requireReadAccess');
 s=s.replace('if (!identityService.isAdmin(userId)) requireMembership(projectId, userId);','requireReadAccess(projectId, userId);');
 s=s.replace('    public void requireMembership(',`    /** Global ADMIN can inspect every existing project without acquiring a project role. */
    public void requireReadAccess(Long projectId, String userId) {
        if ("ADMIN".equals(identityService.current(userId).getRole())) {
            if (!projectRepository.existsById(java.util.Objects.requireNonNull(projectId)))
                throw new BusinessException(404, "NOT_FOUND", "Không tìm thấy dự án.");
        } else requireMembership(projectId, userId);
    }

    public void requireMembership(`);
 return s;
});
for(const p of ['catalog/CatalogService.java','handbook/HandbookService.java','rules/RuleService.java','testcase/TestCaseService.java','admin/DeviceInventoryService.java'])edit(p,s=>s.replaceAll('.requireMembership(','.requireReadAccess('));
// Only read entry points change; canonical execution and document-result writes remain strict.
for(const [p,lines] of [['execution/ExecutionService.java',[65,80,149]],['testcase/TestDocumentService.java',[43,53,93,106]]])edit(p,s=>s.split('\n').map((line,i)=>lines.includes(i+1)?line.replace('.requireMembership(','.requireReadAccess('):line).join('\n'));
for(const [p,who,flag,record] of [['qa/QaService.java','user','write','new Actor(0,false,false,false,project.get("archivedAt")!=null)'],['filework/FileWorkGuard.java','actor','pmWrite','new Actor(0,false,false,project.get("archivedAt")!=null)'],['filework/FileWorkService.java','actor','pmWrite','new Actor(0,false,false,project.get("archivedAt")!=null)']])edit(p,s=>s.replace('        var member=db.row("SELECT id,project_role AS projectRole FROM project_memberships',`        // Membership ID 0 is a read-only observer, never a persisted/assignable member.
        if(!${flag} && "ADMIN".equals(account.getRole()) && db.rows(
            "SELECT id FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE FOR UPDATE",p,${who}).isEmpty())
            return ${record};
        var member=db.row("SELECT id,project_role AS projectRole FROM project_memberships`));
edit('workitem/WorkItemService.java',s=>{
 s=s.replace('    public Map<String,Object> writable(',`    /** Read-only projection. ID 0 cannot authorize assignments, comments, or execution. */
    public Map<String,Object> readMembership(long p,String actor) {
        return db.row("""
            SELECT COALESCE(m.id,0) AS id,
                CASE WHEN u.role_code='DEV' THEN 'DEV' ELSE m.project_role END AS role,u.role_code AS systemRole
            FROM identity_users u JOIN projects p ON p.id=?
            LEFT JOIN project_memberships m ON m.project_id=p.id AND m.user_id=u.id AND m.active=TRUE
            WHERE u.id=? AND u.enabled=TRUE AND (u.role_code='ADMIN' OR m.id IS NOT NULL)
            """,p,actor);
    }
    public Map<String,Object> writable(`);
 const start=s.indexOf('    public Map<String,Object> overview('),end=s.indexOf('    public Map<String,Object> create(');
 let reads=s.slice(start,end).replaceAll('membership(p,actor)','readMembership(p,actor)');
 reads=reads.replace('"canCreate",!current.archived()','"canCreate",current.membershipId()>0&&!current.archived()');
 reads=reads.replaceAll('!developer(member) || ownBug(member,item)','number(member,"id")>0 && (!developer(member) || ownBug(member,item))');
 return s.slice(0,start)+reads+s.slice(end);
});
for(const p of ['reporting/ReportingService.java','retest/RetestService.java','integration/RedmineService.java'])edit(p,s=>s.replaceAll('work.membership(', 'work.readMembership('));
edit('admin/ProjectStatusReportService.java',s=>s.replace('  else pm="PM".equals(membership(actor,projectId,false).get("role"))&&!"DEV".equals(role);',`  else if("ADMIN".equals(role)) {
   var members=db.rows("SELECT project_role AS role FROM project_memberships WHERE project_id=? AND user_id=? AND active=TRUE",projectId,actor);
   pm=!members.isEmpty()&&"PM".equals(members.getFirst().get("role"));
  } else pm="PM".equals(membership(actor,projectId,false).get("role"))&&!"DEV".equals(role);`));
edit('filework/ActionInboxService.java',s=>s.replaceAll('actor.pm()', 'projectWide').replace('        var parts=', '        boolean projectWide=actor.pm() || actor.membershipId()==0;\n        var parts='));
