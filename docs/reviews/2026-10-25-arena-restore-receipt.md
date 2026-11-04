# Arena AR-09 — historical evidence and actual restore

Executed 03/11/2026 on `system-design`, from the dirty workspace based on `ba2ccb5`. This is an isolated synthetic restore receipt. Main application schema/storage/runtime were not used, migrated, restarted or overwritten. No commit/push/merge/deploy was performed. Browser/human UAT remains separate in AR-10.

## Targets and provenance

| Purpose | Schema on existing native `127.0.0.1:3307` | Storage under `var/arena-followup/ar09-restore-provision-20261103/` |
| --- | --- | --- |
| Source core V40 | `tms_docstest_affc0a0ecf79` | `source/attachments` |
| First destination, failed and preserved | `tms_docstest_1d66102ab984` | `destination/attachments` |
| New destination, full restore PASS | `tms_docstest_7f393dfc8d07` | `destination-v3/attachments` |

Server UUID: `86c95a0d-67d4-11f1-9ed7-0a002700001a`. Source had 37 successful core migrations, final `40 / V40__project_archive_legacy_exception.sql / checksum85023296`, with 95 base tables and one view. Each destination was created separately and proven to have zero objects before its own import. Private configuration was loaded from the prepared target records; credentials were never supplied on the command line or printed.

Original provenance: `.superpowers/sdd/2026-10-25-arena-followup/restore-provision/targets.json` and per-target `target.json`/`provision-receipt.json`. New destination: `restore-provision-retry/destination-v3/summary.json`, manifest SHA-256 `237e73b62d71b78ec37c15bea8cde32a4a8239564754e418d84d0157cb3c8b89`, provenance SHA-256 `c675ca0d32348786f94f88daeae804459420509ef6d4118525ebf02d1fcacb18`. These records were checked against actual selected database/server identity. Every storage path and ancestor was checked for symlink/junction/canonical-path mismatch; storage writes used create-new semantics. No Spring writer was started on either restore source or destination, and other database connections to the selected target were checked before work.

## Reviewed historical fixture

The reviewed v2 SQL has SHA-256 `e74eef3ed4398eaa444255f276edb6e1fed1201652570bfb8a4c10ce9e393c08`; review v1 is preserved separately. It adds 33 synthetic rows with FK checks enabled, using exact owned IDs. Project `909001`; PM/USER/GUEST memberships `909001..909003`; outside USER has no membership. Accounts use deliberately unusable `!AR09-no-login` hashes; no Admin/registry row is changed. Primary numeric IDs are `909001` per table, except rule versions `909001` and `909002`.

The history includes a closed cycle, pinned run revision, NG execution, submitted BUG_ONLY retest, current coverage state, PASS verification, FIXED closure decision and work-item history. Active rule version is `909002`, while the old bug and historical context retain pin `909001`. Three exact project/id updates complete the circular current-version/latest-attempt references after their inserts. No retired HTTP mutation was used to create history. Original 24-row workbook bytes are retained while one historical case is represented; this deliberately small historical subset is not a claim of full import-parser acceptance.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Original SQL dump | 178639 | `69fb62502dc61405e6c4cb989b345af617db5360082c75e54cb763afb87c9ff3` |
| Final target import SQL | 178619 | `4e7f186384428d24f7b9c620039d61c12a6f591003eb6df12794031d9853ff60` |
| Attachment `90900000-0000-4000-8000-000000000001` | 51 | `ee2d14b09b1f174f566d039e4d1c5d6e250feb812d9aa4ca2e595550a2548461` |
| Original `arena-inline-strings.xlsx` stored in `import_batches.source_workbook` | 4579 | `8806d11e640cca40834cbd930a73204ec1974a37ee06cca667adf5a9a706c76b` |

The 51-byte PDF-like blob is a synthetic byte-download fixture. It does not prove valid PDF rendering. Metadata references it from both verification and closure history.

## Backup, failed attempt, successful restore

`Backup-Database.cjs --config <explicit-source-private-config>` was used with the existing native client. A reproduced manifest defect was corrected: schema and attachment root now reflect the selected configuration. Backup remains read-only and excludes session rows while retaining their DDL. It neither copies nor validates blobs; the separate guarded procedure inventoried and copied blob bytes, then checked source DB/blob inventories again for stability.

The first real import stopped before the final view and session-table DDL. Destination retained 93 base tables and no view; all 93 table row hashes and primary-key inventories were subsequently proven equal to source. The dump retained the source view account as `DEFINER`; differing scoped destination authority is the inferred failure cause. The original helper withheld the entire mysql error and did not retain its numeric code, so that diagnosis is not presented as a captured error code. This attempt is **FAIL**, not restore PASS. No reset/drop or suffix execution was performed. Failure and read-only partial inventory remain under `var/arena-followup/ar09-restored-20261103-v2/` and `ar09-recovery-review-v1/partial-proof.json`.

A third, new empty destination was prepared and the entire dump imported there. The original dump is immutable. The import transform changes exactly one reviewed source `DEFINER` to `CURRENT_USER`, preserves `SQL SECURITY DEFINER`, and allows exact quoted source-schema remapping (actual source-schema-qualified reference count was zero). Transform counts and both hashes are in `ar09-restored-20261103-v3/restore-started.json`. Future mysql failures retain only numeric code/SQLSTATE/line, without SQL or credentials.

Full restore result: **95 base tables, one view, 95 total rows including 33 fixture rows and 37 Flyway rows; 240 FK constraints checked, zero orphans**. Every base-table primary-key inventory and complete row hash equals source. Original XLSX, rule versions, old pins, decisions/history and every attachment byte/size/hash match. Missing metadata blobs fail the procedure; a successful DB import alone cannot pass it. The destination view canonical definition equals source after normalizing owner/schema (SHA-256 `f8889f68b82a937a1996112012072b952472b74c52cf57552fa23f8b396e3c07`), and the scoped destination account successfully reads `COUNT(*)=1` from that view.

Measured import plus blob copy: **4162.9401 ms**; guarded import and full inventory verification: **47055.6268 ms**. These are measured rehearsal times for 178639 SQL bytes and 51 external blob bytes. **RPO/RTO is not assessed: G05 has no approved threshold.** Before any future runtime reads this restore, override `TMS_ATTACHMENT_ROOT` to the absolute `destination-v3/attachments` root shown in the receipt; no startup cleanup/runtime was invoked by this procedure.

## Endpoint and protection inventory

All paths below are relative to `/api/v1/projects/{projectId}`. Source inspection establishes route availability; the tests named below prove only the exercised cases.

| Historical route family | Boundary |
| --- | --- |
| GET `/work-items/{workId}/attachments`, `/{attachmentId}/content` | Authorized historical metadata/download retained. Native HTTP proves PM/USER original bytes, outside-project404, GUEST403, missingblob503 with metadata retained. Download uses attachment disposition, `nosniff`, sandbox CSP and no-store. |
| POST/DELETE `/work-items/{workId}/attachments[/id]` | Retired410 `USE_FEATURE_ISSUES`; HTTP tests compare all project rows and complete blob-name/hash inventory before/after. |
| GET `/test-cycles`, cycle detail/configurations/run-items; `/run-items/{id}` and assignments/attempts | Legacy historical reads remain routed through existing project checks. |
| GET work-item history/retest summary and retest requests; GET `/bug-rule-versions` and versions | Existing historical reads/configuration remain. Rules are not reattached to Ticket workflow. |
| POST old import/cycle/run/filework/retest/closure/approval/QA/work-item mutations | Existing retirement interception remains; current Feature/Ticket workflow is not revived. Existing native retirement cases verify410 and unchanged project rows. |

## Verification and evidence

| Check | Result | Local evidence |
| --- | --- | --- |
| Backup behavior RED | 1 expected failure: selected schema reported `tms`; 5 existing PASS | Task report records command and failing assertion. |
| Backup behavior GREEN | 6/6 PASS, zero skips | `rtk proxy node --test scripts/Backup-Database.test.cjs` |
| Offline evidence tests and owned Maven verify/package | 40/40 PASS, zero skips/failures/errors | `var/arena-followup/ar09-offline-1793719786710/{maven.log,build/target/surefire-reports}` |
| Guarded native HTTP retirement and historical evidence | 27/27 PASS, zero skips/failures/errors | `var/arena-followup/ar09-native-legacy-20261103-v3/{receipt.json,maven.log,build/target/surefire-reports}` |
| DB/blob restore and canonical view read | PASS | `var/arena-followup/ar09-restored-20261103-v3/{restore-receipt.json,destination-after.json,view-proof.json}` |
| Restored metadata/blob service/controller read, without Spring startup | 4/4 PASS, zero skips; complete DB/blob before/after inventory unchanged | `var/arena-followup/ar09-restored-read-1793721780990/{receipt.json,maven.log,build/target/surefire-reports}` |

Native HTTP tests use the separately guarded `tms_docstest_8503212e9a14` integration target and its own attachment root, preserving the two registered Admins. They do not write the backup source or restore destination. Direct restored reads are distinguished from full HTTP request-security checks; no GUEST HTTP200 claim is made from service calls.

Warnings: RTK has no installed hook (commands are still explicitly prefixed); expected Git LF/CRLF notices; JVM dynamic-agent/class-sharing warnings; Flyway warns MySQL9.7 is newer than its tested support. No frontend/browser/live-provider test was run. Offline JaCoCo measured `EvidenceService` line54/66=81.82%, branch24/56=42.86%; `EvidenceContent` line29/30=96.67%, branch55/66=83.33%. This is scoped measured coverage, not an 80% all-metrics or whole-app claim. Node VM test coverage did not enumerate production files and is **NOT_MEASURED** despite the runner's empty 100% summary.

Skills applied: `tdd-workflow` for the backup RED/minimal correction/GREEN; `security-review` for request-role/project boundaries, file headers, credential handling and guarded storage; `verification-loop` for owned builds, exact test XML/counts, row/blob/FK/view receipts and limitations. Task-level self-review/report: `.superpowers/sdd/2026-10-25-arena-followup/AR-09-report.md`.
