const fs=require('fs');function edit(p,pairs){let s=fs.readFileSync(p,'utf8');for(const [a,b]of pairs){if(!s.includes(a))throw Error(p+' missing '+a);s=s.replaceAll(a,b);}fs.writeFileSync(p,s);}
const base='Backend/src/test/java/vn/syp/tms/';
edit(base+'project/AdminStateProjectionTest.java',[['mock(IdentityUserRepository.class))','mock(IdentityUserRepository.class),mock(ProjectActorService.class))']]);
edit(base+'qa/QaServiceTest.java',[['new FileWorkGuard(db,identities)','new FileWorkGuard(db,identities,mock(vn.syp.tms.project.ProjectActorService.class))']]);
edit(base+'workitem/DeveloperPermissionsTest.java',[['new QaService.Actor(7,true,false,false,true)','new QaService.Actor(7,true,false,false,true,false)']]);
edit(base+'admin/AdminWorkspaceNativeTest.java',[
 ['Global read access must neither create memberships nor grant business write permissions.','Global admin reads are side-effect free; writes retain the real admin actor.'],
 ['.value(false)', '.value(true)'],
 ['jsonPath("$.allowedTransitions").isEmpty()', 'jsonPath("$.allowedTransitions").isNotEmpty()'],
 ['observerCannotWriteWhileActualPmStillCan','globalAdminWritesWithoutActiveMembershipAndLosesAuthorityAfterDemotion'],
 ['.content(body)).andExpect(status().isNotFound());','.content(body)).andExpect(status().isCreated());'],
 ['assertThatThrownBy(()->projects.requireMembership(first,admin.getId())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);','projects.requireMembership(first,admin.getId());'],
 ['assertThatThrownBy(()->projects.requireProjectPm(first,admin.getId())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);',`projects.requireProjectPm(first,admin.getId());
        assertThat(jdbc.queryForObject("SELECT active FROM project_memberships WHERE project_id=? AND user_id=?",Boolean.class,first,admin.getId())).isFalse();
        assertThat(jdbc.queryForObject("SELECT project_role FROM project_memberships WHERE project_id=? AND user_id=?",String.class,first,admin.getId())).isEqualTo("MEMBER");
        jdbc.update("UPDATE identity_users SET role_code='TESTER' WHERE id=?",admin.getId());entityManager.clear();
        assertThatThrownBy(()->projects.requireMembership(first,admin.getId())).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);`],
 ['.content(body)).andExpect(status().isCreated());\n    }','.content(body.replace("workspace-denied","owner-create"))).andExpect(status().isCreated());\n    }']
]);
edit(base+'testcase/TestDocumentIntegrationTest.java',[
 ['with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isNotFound());\n        mvc.perform(put(endpoint).with(actor(pm))', 'with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isUnprocessableEntity());\n        mvc.perform(put(endpoint).with(actor(pm))'],
 ['cases.approveRevision(project,pm.getId(),caseId,revision);','cases.approveRevision(project,outsider.getId(),caseId,revision);'],
 ['put(endpoint).with(actor(pm)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isOk());\n        mvc.perform(put(endpoint).with(actor(pm))','put(endpoint).with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isOk());\n        mvc.perform(put(endpoint).with(actor(pm))'],
 ['}).andExpect(status().isNotFound());','}).andExpect(status().isNotFound());'],
 ['content("{\\"code\\":\\"MANUAL\\",\\"name\\":\\"Manual suite\\"}")).andExpect(status().isNotFound());','content("{\\"code\\":\\"MANUAL\\",\\"name\\":\\"Manual suite\\"}")).andExpect(status().isCreated());'],
 ['"/approve")).with(actor(outsider)).with(csrf())).andExpect(status().isNotFound());','"/approve")).with(actor(outsider)).with(csrf())).andExpect(status().isOk());'],
 ['with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isNotFound());','with(actor(outsider)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isConflict());']
].filter(([a,b])=>a!==b));
edit('Frontend/src/app/features/test-cases/document-editing.test.jsx',[
 ['supports keyboard editing and keeps observer cells read-only','supports keyboard editing for a global admin without membership'],
 ["fireEvent.doubleClick(await screen.findByText('Đăng nhập'));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Giao test lần 2'})).not.toBeInTheDocument();", "fireEvent.doubleClick(await screen.findByText('Đăng nhập'));expect(screen.getByRole('dialog')).toBeVisible();expect(screen.getByRole('button',{name:'Giao test lần 2'})).toBeInTheDocument();"]
]);
