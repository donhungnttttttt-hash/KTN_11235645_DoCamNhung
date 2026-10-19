const fs=require('fs');
let prefix=fs.readFileSync('Backend/src/test/java/vn/syp/tms/admin/AdminWorkspaceNativeTest.java','utf8').split('    @Autowired MockMvc')[0];
prefix=prefix.replace('package vn.syp.tms.admin;','package vn.syp.tms.filework;').replace('class AdminWorkspaceNativeTest','class AdminWorkspaceFileReadNativeTest');
const body=`    @Autowired MockMvc mvc; @Autowired IdentityUserRepository users;
    @Autowired javax.sql.DataSource dataSource; @Autowired JdbcTemplate jdbc;
    @Autowired vn.syp.tms.qa.QaService qa;
    NativeFqFixture f; IdentityUser admin; long group,run;
    @BeforeEach void fixture() throws Exception {
        admin=users.saveAndFlush(new IdentityUser("observe."+UUID.randomUUID().toString().substring(0,8),"Observer","SECRET","ADMIN"));
        var c=org.springframework.jdbc.datasource.DataSourceUtils.getConnection(Objects.requireNonNull(dataSource));
        try { f=NativeFqFixture.seed(c,false);run=f.run(c);group=f.group(c,run); }
        finally {org.springframework.jdbc.datasource.DataSourceUtils.releaseConnection(c,dataSource);}
    }
    @org.springframework.lang.NonNull RequestPostProcessor actor() {
        return Objects.requireNonNull(authentication(new UsernamePasswordAuthenticationToken(new SessionPrincipal(admin.getId(),0L),null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))));
    }
    @Test void observesImportedCasePinnedRunsAndFileExportWithoutExecutionAuthority() throws Exception {
        String p="/api/v1/projects/"+f.project;
        for(String tail:List.of("/test-documents/"+f.document,"/test-documents/"+f.document+"/export","/test-cases/"+f.testCase,"/test-cases/"+f.testCase+"/revisions","/run-items/"+run,"/run-items/"+run+"/attempts","/file-work-groups/"+group,"/file-work-groups/"+group+"/execution","/file-work-groups/"+group+"/sessions","/file-work-groups/"+group+"/export"))
            mvc.perform(get(p+tail).with(actor())).andExpect(result->assertThat(result.getResponse().getStatus()).as(tail+": "+result.getResponse().getContentAsString()).isEqualTo(200));
        mvc.perform(get(p+"/file-work-groups/"+group).with(actor())).andExpect(jsonPath("$.capabilities.canAssign").value(false));
        mvc.perform(post(p+"/file-work-groups/"+group+"/sessions").with(actor()).with(csrf()).contentType("application/json").content("{\\"allocationId\\":"+f.allocation+",\\"buildId\\":"+f.build+",\\"expectedGroupVersion\\":0,\\"requestKey\\":\\"observer-start\\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(put(p+"/test-documents/"+f.document+"/rows/"+f.row+"/result").with(actor()).with(csrf()).contentType("application/json").content("{\\"status\\":\\"NG\\",\\"expectedVersion\\":3,\\"requestKey\\":\\"observer-result\\"}"))
            .andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM execution_attempts WHERE project_id=?",Long.class,f.project)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_memberships WHERE user_id=?",Long.class,admin.getId())).isZero();
    }
    @Test void readsQaAndProjectInboxButCannotAnswerOrAssign() throws Exception {
        var created=qa.create(f.project,f.tester,new vn.syp.tms.qa.QaDtos.Create("Visible QA","Expected behavior?","MEDIUM",null,null,f.document,null,null,f.revision,"qa-observer-0001"));
        String p="/api/v1/projects/"+f.project;
        mvc.perform(get(p+"/qa/"+created.item().id()).with(actor())).andExpect(status().isOk())
            .andExpect(jsonPath("$.item.title").value("Visible QA"))
            .andExpect(jsonPath("$.item.capabilities.canAssign").value(false)).andExpect(jsonPath("$.item.capabilities.canAnswer").value(false));
        mvc.perform(get(p+"/work-items/"+created.item().id()).with(actor())).andExpect(status().isOk()).andExpect(jsonPath("$.canComment").value(false));
        mvc.perform(get(p+"/action-inbox").param("kind","QA").with(actor())).andExpect(status().isOk()).andExpect(jsonPath("$.projectWide").value(true)).andExpect(jsonPath("$.items[0].id").value(created.item().id()));
        mvc.perform(post(p+"/qa/"+created.item().id()+"/start").with(actor()).with(csrf()).contentType("application/json").content("{\\"reason\\":\\"Not assigned\\",\\"expectedVersion\\":0,\\"requestKey\\":\\"observer-qa-start\\"}"))
            .andExpect(status().isNotFound());
    }
}
`;
fs.writeFileSync('Backend/src/test/java/vn/syp/tms/filework/AdminWorkspaceFileReadNativeTest.java',prefix+body);
