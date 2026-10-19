# FR-08 Note and independent FR-05 project information

Date: 2026-10-19. Branch: system-design. Scope owned by UI agent: new Notes backend/API and project settings UI; read-only ProjectOverview replacement. No commit, browser actions, service restart or database write performed by this agent. Root owns navigation integration/browser and runtime verification; core agent owns the only migration file.

## Implemented

- New `/api/v1/projects/{projectId}/notes`: paginated list, scoped read, create, optimistic-version update, soft delete. `GET` list response uses items/totalItems/page/size/totalPages. Create returns 201/Location; delete returns 204. Body is literal text, title max200, body max10000; versions required for update/delete. No attachments, CMS or approval flow.
- Backend package `Backend/src/main/java/vn/syp/tms/notes/`: ProjectNote, ProjectNotesDtos, ProjectNotesStore, ProjectNotesService, ProjectNotesController. Reads use existing project read guard; writes use ProjectService.lockWritableProject. Scoped lookup/conditional writes include project+note identity, active/archive predicate and version. Audit is in the same transaction, attributes actual identity user (including ADMIN without membership), contains no Note body. Deleted content is retained in project_notes.
- `Frontend/src/app/services/api/notes.js`: scoped read/pagination and CSRF on each write, propagating the same abort signal through CSRF and mutation. `ProjectNotes.jsx` supplies list/create/edit/delete-confirmation, read-only member view, pending/error/retry, text preservation on conflict, server-confirmed success, current-version re-edit, server pagination/empty-last-page recovery and project/capability reset. Note body/title render as escaped React text.
- `ProjectSettingsPage.jsx` supports `/settings/notes`, preserving general/members/rules/handbook. Existing project write predicate hides mutation actions for TESTER/DEV and archived projects; backend remains authoritative. Root must dispatch the route and replace the catalog sidebar entry after readiness checks.
- `ProjectOverview.jsx` now consumes actual ProjectProvider state, displays read-only ProjectInformation, and does not fetch workItemsApi.overview or qa.handoff. Generic create action, recent-work activity and legacy HandoffPanel retest workflow are removed from overview. HomePage shared component remains untouched.
- `ProjectInformation.jsx` renders approved `docs/content/spider-plus-project-overview.md` facts/links only when `project.code === 'SPIDER-PLUS'`. Other projects show their actual authorized description or a truthful empty-description state. No fuzzy name/ID mapping, CMS, link fetch, CAT integration or acceptance rule is introduced. Loading/denied project state hides prior content.
- Scoped styles `project-notes.css`, `project-information.css` reuse existing palette/type/button/table conventions, wrap text and retain responsive/touch/focus affordances.

## Schema handoff

Exact DDL was sent to `/root/fr_domain_audit`, the sole migration owner; no Flyway file created here:

```sql
CREATE TABLE project_notes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  lock_version BIGINT NOT NULL DEFAULT 0,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  archived_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_project_notes_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_project_notes_creator FOREIGN KEY (created_by) REFERENCES identity_users(id),
  CONSTRAINT fk_project_notes_editor FOREIGN KEY (updated_by) REFERENCES identity_users(id),
  INDEX ix_project_notes_list (project_id, archived_at, updated_at, id)
) ENGINE=InnoDB;
```

## RED → GREEN and evidence

Frontend RED 01:08:37: 4 behavior failures against old overview (missing approved scoped copy, missing project-state handling, unsafe/missing description display, generic create still present) plus Note suite failed import because feature did not exist. Backend initial attempt ended testCompile missing new types; this is **compile RED, not behavior evidence**. Types/store and a compilable service skeleton were then added. Root's coordinated Maven RED 01:11:18 compiled successfully and observed ProjectNotesServiceTest 8 tests, 5 failures +3 errors on UnsupportedOperationException. Service was then implemented; no further Maven was started by this agent because root serializes the shared target directory.

Frontend GREEN initially12, then36 tests; final scoped coverage run **38/38 tests across5 files PASS**:

```text
rtk proxy npm run test:coverage --
  src/app/features/projects/ProjectNotes.test.jsx
  src/app/features/projects/settings.test.jsx
  src/app/modules/ProjectOverview.test.jsx
  src/app/modules/ProjectOverview.permissions.test.jsx
  src/app/services/api/notes.test.js
  --coverage.include=src/app/features/projects/ProjectNotes.jsx
  --coverage.include=src/app/features/projects/ProjectInformation.jsx
  --coverage.include=src/app/features/projects/ProjectSettingsPage.jsx
  --coverage.include=src/app/modules/ProjectOverview.jsx
  --coverage.include=src/app/services/api/notes.js
  --coverage.reportsDirectory=../var/fixreports-2026-10-19/fr08-fe-coverage
```

Coverage measured for those5 production files: statements96.85%, branches94.32%, functions96.22%, lines100%. ProjectNotes94.84/92.85/93.54/100; ProjectInformation100/100/100/100; ProjectSettings100/97.29/100/100; ProjectOverview100/90/100/100; notes API100/100/100/100. Reports: `fr08-fe-coverage/coverage-summary.json`, HTML. These are component/mock-API tests, **not native HTTP/database/browser evidence**.

`rtk proxy npm run build`: PASS (1736 modules); existing warning for minified chunk >500kB. Lint and JS typecheck are not configured. `git diff --check` on owned tracked files: PASS, only LF→CRLF notices. Impeccable mechanical detector over Note/info/overview/scoped styles: `[]` findings; this does not prove visual/accessibility behavior.

Backend tests supplied for root's coordinated GREEN run:

- ProjectNotesServiceTest8: scoped read/list/count, deny before data access, mutation guard, saved identity, stale/scope conflict, conditional update/delete, validation/invalid IDs/page.
- ProjectNotesPolicyTest6: real ProjectService guards, ADMIN no membership, project PM write, global PM cannot read/write Note outside membership, TESTER/DEV member read only, archived project readable/no write.
- ProjectNotesSecurityTest4: session/CSRF, Bean Validation, authoritative principal identity and201Location, 404/403/409 propagation. Service mock at HTTP layer; policy tests separately exercise real guards.

Root coordinated latest run01:14:49: **18/18 PASS** (ProjectNotesPolicyTest6 + ProjectNotesSecurityTest4 + ProjectNotesServiceTest8). These cover mocked JDBC/service policy and MockMvc; they do not prove MySQL persistence. Earlier Security4 had2 failures because that compile captured the older generated-UUID principal while service stubs expected person; the fixed synthetic principal passed in the latest run. Native verification is **NOT_RUN** by this agent and remains a separate core/root gate. No backend coverage percentage claimed here.

## Skills applied

| Skill read | Use | Evidence |
| --- | --- | --- |
| brainstorming | Preserve confirmed C11/C14 brief; composition seam instead of adding subsystem/CMS | Prior ui-audit.md alternatives; root assigned concrete FR08/overview implementation |
| api-design | Scoped plural Notes resource, paginated list,201/204/422/404/409, expectedVersion | Controller/DTO/service/client and tests |
| security-review | Existing session/CSRF; role/scope before data; parameterized SQL; no HTML injection/secret logging | Security+policy/service tests, literal React text, JDBC placeholders |
| tdd-workflow | Tests first, explicit compile vs behavioral RED distinction, scoped coverage | RED chronology and measured report above |
| frontend-patterns | Small composed component, server pagination, remount by project/capability, abort guards | ProjectNotes and identity-switch/pending-save tests |
| frontend-ui-engineering | Existing design system, labeled controls, inline confirmation, loading/empty/error, focus/touch/overflow | Scoped CSS/component tests; browser handed to root |
| impeccable Operate | Familiar compact UI, read-only information hierarchy; craft-floor read immediately before UI edit | Context inspection in ui-audit.md; final mechanical detector empty |
| ui-ux-pro-max | Concrete navigation/back/deep-link and keyboard/touch guidance; no visual redesign | Local quick-reference200–206, ux-guidelines12/42; no generated design-system claimed |
| verification-loop | Scoped regression/coverage/build/security/diff inspection and honest remaining gates | FE38, coverage, build/detector; backend/native/browser pending root |

## Integration/remaining gates

1. Root: route `/settings/notes` and sidebar Note; navigate testing only after core replacements. Preserve all other settings tabs. No edits to AppRouter/Sidebar/routeInfo/MainLayout/AiChat/Admin/core document were made by this agent.
2. Root: DashboardPage currently mounts TestingOverview in a hidden wrapper; remove hidden management requests for TESTER/DEV via conditional mounting/capability as part of FR05/10 integration. ProjectOverview itself no longer fetches management data.
3. Core: include project_notes in the sole migration; test fresh/upgrade on isolated schema. Root: native CRUD/persistence/security/version and soft-delete-preservation tests after migration. Never apply test writes to main DB.
4. Root: explicit user authorization permits creating project code SPIDER-PLUS; create through allowed business path, preserve demo identity. This agent did not create it or touch main DB.
5. Root: coordinated `ProjectNotes*Test` GREEN and package coverage; browser320/768/1440, keyboard/focus, Note draft/conflict and link scope. No claim of native/migration/browser/UAT completion from FE mocks.

FR08 is implementation-ready pending integration/runtime gates; independent overview source is ready. Do not mark all FR05 or FR08 DONE from this artifact alone.
