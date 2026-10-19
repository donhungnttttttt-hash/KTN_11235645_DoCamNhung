# FR-01 core contract proposal

2026-10-19; **proposal for root decision, no source or migration applied**. Owner after root acceptance: `fr_domain_audit`, exclusively new migration V31+ and core FR02/03 backend. Root owns final shared contract and integration. Source audit: [domain-audit.md](domain-audit.md). Main DB `tms`, port3307, V30 is **root-reported read-only evidence**. Existing isolated schemas `tms_docstest_202610080023/24/25` are candidates only; their version/content is unverified, no write authorized by this proposal. No server/container create/run/restart, no main DB writes.

## Decision and alternatives

Use additive `testing_features` → existing `import_batches` documents → fresh document-owned `test_cases`/current revisions/rows/overlays. Keep current document reconstruction/export interface; replace legacy result/assignment workflow on Feature-owned records. This is an architectural contract change within the already approved FR plan, with no new business interview or general approval round.

| Option | Decision |
| --- | --- |
| Extend old cycles/file-work and make configuration/run optional | Reject: old cycle activation, pin/approval, run/config and physical device assumptions leak into every caller |
| New Feature + extend existing documents/cases | Select: preserves workbook handling and edited-content projection, isolates new workflow with limited migration |
| New parallel Feature/file/case subsystem | Reject: duplicates Excel/content/export behavior and creates two competing ownership models |

## Proposed additive DDL

Identifiers are BIGINT; actual actors are `identity_users.id VARCHAR(36)`, never fabricated ADMIN memberships. In all examples `project_id` is included in FK/lookups. Add-only migration(s), next version rechecked before writing; no drop/rename/cleanup in copy migration.

```sql
CREATE TABLE testing_features (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  environment VARCHAR(1000) NOT NULL DEFAULT '',
  description VARCHAR(4000) NOT NULL DEFAULT '',
  archived_at DATETIME(6) NULL,
  lock_version BIGINT NOT NULL DEFAULT 0,
  migration_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL,
  source_cycle_id BIGINT NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_feature_scope(project_id,id),
  UNIQUE KEY uq_feature_migration(project_id,migration_key),
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(project_id,source_cycle_id) REFERENCES test_cycles(project_id,id),
  FOREIGN KEY(created_by) REFERENCES identity_users(id),
  FOREIGN KEY(updated_by) REFERENCES identity_users(id),
  CHECK(CHAR_LENGTH(TRIM(name))>0 AND lock_version>=0),
  INDEX ix_feature_list(project_id,archived_at,id)
);

ALTER TABLE import_batches
  ADD feature_id BIGINT NULL,
  ADD archived_at DATETIME(6) NULL,
  ADD lock_version BIGINT NOT NULL DEFAULT 0,
  ADD source_batch_id BIGINT NULL,
  ADD CONSTRAINT uq_document_feature UNIQUE(project_id,feature_id,id),
  ADD CONSTRAINT uq_document_clone UNIQUE(feature_id,source_batch_id),
  ADD CONSTRAINT fk_document_feature FOREIGN KEY(project_id,feature_id)
    REFERENCES testing_features(project_id,id),
  ADD CONSTRAINT fk_document_source FOREIGN KEY(project_id,source_batch_id)
    REFERENCES import_batches(project_id,id),
  ADD CONSTRAINT ck_document_version CHECK(lock_version>=0),
  ADD INDEX ix_feature_documents(project_id,feature_id,status,archived_at,id);

ALTER TABLE test_cases
  ADD owning_document_id BIGINT NULL,
  ADD CONSTRAINT uq_case_document UNIQUE(project_id,owning_document_id,id),
  ADD CONSTRAINT fk_case_document FOREIGN KEY(project_id,owning_document_id)
    REFERENCES import_batches(project_id,id);

-- Nullable guard column leaves old rows intact; new rows MUST set it=batch_id.
ALTER TABLE import_rows
  ADD owning_document_id BIGINT NULL,
  ADD source_import_row_id BIGINT NULL,
  ADD CONSTRAINT ck_row_owner CHECK(owning_document_id IS NULL OR owning_document_id=batch_id),
  ADD CONSTRAINT uq_row_clone UNIQUE(batch_id,source_import_row_id),
  ADD CONSTRAINT uq_row_document_scope UNIQUE(project_id,batch_id,id),
  ADD CONSTRAINT fk_row_owned_case FOREIGN KEY(project_id,owning_document_id,target_case_id)
    REFERENCES test_cases(project_id,owning_document_id,id);

CREATE TABLE test_document_assignments (
  project_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  row_id BIGINT NOT NULL,
  assignee_membership_id BIGINT NULL,
  first_tester_membership_id BIGINT NULL,
  latest_tester_membership_id BIGINT NULL,
  PRIMARY KEY(project_id,row_id),
  FOREIGN KEY(project_id,document_id,row_id)
    REFERENCES import_rows(project_id,batch_id,id),
  FOREIGN KEY(project_id,assignee_membership_id)
    REFERENCES project_memberships(project_id,id),
  FOREIGN KEY(project_id,first_tester_membership_id)
    REFERENCES project_memberships(project_id,id),
  FOREIGN KEY(project_id,latest_tester_membership_id)
    REFERENCES project_memberships(project_id,id),
  INDEX ix_document_owner(project_id,document_id,assignee_membership_id,row_id)
);
```

Assignment rows are initialized for every new case row with nullable owner; there is exactly one current owner per row, hence overlap cannot be persisted. The redundant three-column unique index on import_rows is intentional to enforce that assignment row belongs to that document without duplicating test_case_id.

`test_document_assignment_changes`: append-only `id,project_id,document_id,row_id,previous_membership_id,new_membership_id,first_tester_membership_id,latest_tester_membership_id,actor_id VARCHAR(36),changed_at,document_version,request_key`; same scoped row and membership/identity FKs. It records responsibility change, not execution. Reuse `project_audit` for command-level events; detailed records remain independently queryable.

`test_document_commands`: `id,project_id,document_id,actor_id,request_key CHAR(36),request_checksum CHAR(64),action,response_json JSON,created_at`; UNIQUE `(project_id,document_id,request_key)` for assignment/archive result-loss retry. Same key+actor+checksum returns original response; different payload/actor is 409 `IDEMPOTENCY_CONFLICT`. Existing row Status idempotency fields stay authoritative for Status.

`testing_feature_commands`: same command fields with `feature_id` replacing document_id and UNIQUE `(project_id,request_key)`. Records Feature create/archive/restore idempotence; create writes command after Feature insert in the same transaction and retry is discovered before inserting Feature. A reused key with mismatched action/actor/checksum is 409. Lock existing project row to serialize Feature creation/retry, so absent command cannot race two inserts. No hard unique Feature-name rule is introduced.

Migration provenance: use feature `migration_key='CYCLE:<id>'` or `'ORPHAN'`, document `source_batch_id`, row `source_import_row_id`; separate `testing_migration_case_map(project_id,feature_id,document_id,old_case_id,old_revision_id,new_case_id,new_revision_id)` with scoped unique document/old-case keys and FKs. Do not attach source FK identities to mutable new identities. Store exception/count/content/hash manifest as a reviewed artifact/job output; no raw workbook/content dump in normal logs.

**Intentional schema choices:** no unique Feature name (not a confirmed rule), no checksum uniqueness, no FK from free-text environment to catalogs, no Feature cycle status/config/run requirement, no cascade delete. Legacy nullable columns allow old data to coexist; application must require ownership fields for all new Feature documents. Fresh cases use collision-safe internal `XLSX-{newBatch}-{rowNumber}`; preserve source display ID and source caseNo in immutable import JSON. Clone a document-specific suite to prevent archival coupling.

## HTTP/DTO contract

All paths below start `/api/v1/projects/{projectId}`. Existing session auth/CSRF, flat success DTOs, `ApiError(code,message,fieldErrors,requestId)` and zero-based pagination remain. `p=projectId`, `f=featureId`, `d=documentId`. `featureId` is never an authority claim; server joins p/f/d/row IDs.

| Method/path | Request → result | Access |
| --- | --- | --- |
| GET `/features?page=0&size=20&keyword=&archived=false` | Page<FeatureSummary> | project reader; ADMIN global |
| POST `/features` | `{name,environment,description,requestKey}` → 201 Feature, Location | PM of p / ADMIN |
| GET `/features/{f}` | Feature | project reader; ADMIN global |
| PUT `/features/{f}` | `{name,environment,description,expectedVersion}` → Feature | PM / ADMIN |
| POST `/features/{f}/archive` | `{expectedVersion,requestKey}` → Feature | PM / ADMIN |
| POST `/features/{f}/restore` | `{expectedVersion,requestKey}` → Feature | PM / ADMIN |
| GET `/features/{f}/documents?page=0&size=20&keyword=` | Existing document Page plus ownership/progress | project reader; ADMIN global |
| POST `/features/{f}/import-previews` | multipart `file`; Feature required by path → existing preview DTO plus `featureId` | PM / ADMIN |
| GET `/features/{f}/import-previews/{id}` | existing preview DTO plus `featureId` | same existing preview owner rules, PM/Admin only |
| POST `/features/{f}/import-previews/{id}/commit` | no body → document summary with featureId | PM / ADMIN |
| POST `/features/{f}/documents/{d}/archive` | `{expectedVersion,requestKey}` → document summary | PM / ADMIN |
| GET `/test-documents/{d}` | reuse current Detail, add Feature metadata/assignment/progress | project reader; ADMIN global |
| GET `/test-documents/{d}/export?original=false` | reuse original/current XLSX download | project reader; ADMIN global |
| PUT `/test-documents/{d}/rows/{row}/cells/{column}` | existing `{value,expectedVersion,expectedRevisionId}` | preserve cell-edit permission unless FR spec explicitly changes; Feature guard mandatory |
| GET `/test-documents/{d}/assignments` | `{documentId,featureId,version,items:[...]}` | project reader; ADMIN global |
| PUT `/test-documents/{d}/assignments` | assignment command below → updated assignment view | PM/Admin all; Tester own only |
| GET `/test-documents/{d}/assignment-history?before=0` | `{items,nextBefore}` max50 | project reader; ADMIN global |
| PUT `/test-documents/{d}/rows/{row}/result` | existing `{status,expectedVersion,requestKey}` → result plus progress | PM/Admin; assigned active Tester |

Feature: `{id,projectId,name,environment,description,version,archivedAt,createdAt,updatedAt,documentCount,caseCount,testedCaseCount,progressPercent}`. Page: `{items,totalItems,page,pageSize,totalPages}`. Summary adds `featureId,featureName,version,archivedAt,caseCount,testedCaseCount,progressPercent,assignees`; keep existing `sourceCounts,resultCounts` only as clearly labelled compatibility fields, never substitute source workbook counts for new progress.

Detail `document.featureId` and `document.version` accompany existing `rows,headers,columns,cellVersions`; each row adds `assigneeMembershipId,assigneeName,firstTesterName,latestTesterName,canUpdateResult`. Existing `resultUpdatedBy` means actual actor. New feature-owned details return `secondTests=[]` (compatibility), no legacy run/cycle navigation. Core reads one authoritative count aggregate: `SUM(result_status<>'UNEXECUTED')/COUNT(*)`; empty document is `0/0`, `progressPercent=0`, `caseCount=0`.

All text plain, trimmed at validation: name1–255, environment0–1000, description0–4000. `size`1–100, page0–100000, keyword0–255, positive IDs, expectedVersion>=0, requestKey UUID. Search token semantics must match FR07 AND/diacritic/case normalization; list/count use same predicate. New writer only accepts `UNEXECUTED|OK|NG|P|NA`; old FIXED remains historical only. 401/CSRF unchanged; 404 scoped resource unavailable; 403 known action forbidden; 409 VERSION_CONFLICT/ASSIGNMENT_CONFLICT/ARCHIVED/IDEMPOTENCY_CONFLICT; 422 INVALID_SCOPE/TESTER_REQUIRED/VALIDATION_ERROR; 410 preview expired.

### Assignment command and concurrency

```json
{
  "expectedVersion": 7,
  "requestKey": "ad22da75-a4e9-4ccf-84f8-6f110b2db109",
  "changes": [
    {"assigneeMembershipId": 21, "rowIds": [101, 102, 103]},
    {"assigneeMembershipId": 34, "rowIds": [104, 105]}
  ]
}
```

Each `changes` entry replaces only that named person's scope in this document; omitted people remain unchanged. Empty `rowIds` releases that person's current scope. PM/Admin may change several people atomically; Tester may send exactly their own active TESTER membership and may select currently unassigned or already self-owned rows. PM's simultaneous A/B boundary adjustment validates the complete final assignment; Tester's request never implicitly removes another person's rows. One/two/unlimited responsible people supported without a hard max2 rule. IDs refer to imported **case rows**, not Excel raw row numbers; UI's 1–40 range resolves the ordered case list and sends stable row IDs. Duplicate entry/row, row outside d, inactive/non-Tester recipient and final overlap reject entire command.

Transaction order: actual identity lock → project current archive/read permission → Feature lock → document `FOR UPDATE` → selected/current rows in ID order → compare document version → validate final ownership → write history/assignments → increment document lock_version once → save idempotent response. Status writer takes same Feature/document locks before row lock, serializing status/reassignment and archive. It compares **row resultVersion**, not document version; a concurrent assignment is checked against latest owner before Status change. Import also locks Feature, preventing commit into archived Feature. Normal row Status/cell changes may update document updatedAt but need not increment assignment/document version; assignments/archive do.

`ProjectService.lockWritableProject` already enforces PM/Admin; **do not call it for Tester assignment/Status**. New core guard must lock current identity/project scalar state and require project read membership + role + row authority, preserving global ADMIN without membership. Only PM/Admin manages Feature/import/archive. DEV reads only and never changes Status or responsibility. No build, device, allocation, approved revision, cycle, run or session is required.

Two display columns represent assignment, consistent with root's `GLOSSARY.md`: firstTester is the first person assigned responsibility and is set once; latestTester is the latest different assignment after the first, replacing any earlier latest value. A release alone does not invent a new tester. Resetting current Status to UNEXECUTED does not erase those identities or assignment history. `resultUpdatedBy` always records actual caller; neither assignment column invents execution history. ADMIN changing Status on an unassigned row leaves assignment columns empty and records ADMIN as actual result actor. This deterministic display rule implements C03 without run creation or third/fourth columns.

## Import, migration and compatibility

New nested import path requires Feature. Existing project-only upload path can accept optional `featureId` only during migration; if absent it remains a legacy path temporarily and cannot create visible new Feature records. Final FR11 disables old mutation paths or requires explicit Feature; it must never infer a random Feature. Existing project-only read paths can remain adapters that resolve `document.featureId`, require its project/context, and return that Feature; old document bookmarks use provenance mapping and explain ambiguous one-to-many choices rather than silently pick.

For new Feature imports, idempotence is preview/commit ID and command, **not project checksum**. Remove both project/customer checksum return and project/checksum/importer return from new path; optional same-Feature reupload warning is informational, not a hidden cross-Feature ownership shortcut. New case identities and fresh document suites generated for both INTERNAL_V1 and CUSTOMER_V1; parse/upload validation remains intact. No parser rewrite.

Migration stage: additive DDL then copy job / append-only Java Flyway data migration after isolated proof. Source remains untouched. Mapping distinct union of file-work group, document-retest run and direct case run associations; create Feature for every old cycle, one orphan Feature/project if needed; copy complete document once per mapped Feature. Preserve original workbook hash, complete raw JSON, source headers/order/mapping, current canonical revision content, each V27 cell overlay. Reset only old current results/assignments/actor-history in new copies; old source graph retained. Data migration author records original import account/provenance, not an arbitrary ADMIN; current revision author can preserve old identity/membership via V26. Missing/corrupt workbook, invalid JSON, unresolved source association or current pointer produce an exception manifest and block that affected mapping, not fabricate a binary or silently drop content. Root must choose whether exceptions abort whole migration versus copy job returning partial blocked status before implementing; recommendation **preflight complete validation before any copy; atomic copy per document; do not mark migration complete while exceptions exist**.

Rehearsal only after explicit target schema discovery/isolation verification; existing candidate names are not evidence of emptiness. Upgrade fixture V30→new and fresh migrations; replay zero additional copies; workbook/current effective content equality; original downloads unchanged; mutating A leaves B unchanged; unrelated users/projects/device/AI config/chat counts/checksums untouched. Restore from verified backup plus compatible app is the runtime rollback path, no edits to V1–V30 and no delete cleanup in copy migration. Main runtime remains V30 until separately authorized and reviewed application step.

## Acceptance and skills evidence

Tests at existing document/HTTP seam: A01 roles and fake p/f/d/row IDs; A02 two Features same workbook plus canonical/noncanonical edit independence for both formats; A03 full migration mapping/workbook/effective-content and replay; A04 concurrent assignment/stale version with only own-scope replacement; A05 reassignment after Status preserves result, two columns and real actor; A06 exact3/5 including P/NA, empty0%; A19 archive/restore/soft file removal preserves binary/content/links; A20 operates with no cycle/run/device rows. Schema inspection alone does not satisfy these.

Skills read before this proposal: `codebase-design`, `domain-modeling`, `deprecation-and-migration` (prior audit); `api-design`, `to-spec`, `security-review`, `brainstorming` (this pass). Applied respectively: reuse document seam; clear ownership/actor terms; additive/provenance/restore; concrete route/DTO/error/version contract; local synthesis/test seam; scoped IDs/roles/CSRF/parameterized SQL; architecture alternatives and risk comparison. `impeccable/SKILL.md` was read but **not applied** to this backend-only DDL/API proposal; UI design remains its task owner. FR plan/user directions override skill defaults to publish issue, commit, reopen decisions, or seek general implementation approval. Source reads/`rtk rg` only; tests NOT_RUN, coverage NOT_MEASURED, DB/service/Git mutations none.
