const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'../..');
const target=path.join(process.env.TEMP||os.tmpdir(),'codex-uiux-audit-2026-10-19-handoff.md');
if(fs.existsSync(target))throw Error('Preserve earlier handoff; choose a checkpoint file');
const text=`# Handoff: UI/UX audit, 19 October 2026

Workspace: ${root}. Branch remains system-design. This turn was audit-only, with no product fixes, restart/migration/config changes or commit/push. Main business data was read only; writes used the already isolated local test schema. No credentials are stored in this handoff.

Read the deliverables rather than repeating this audit:
- ${root}/docs/reviews/2026-10-19-uiux-system-audit.md
- ${root}/docs/reviews/2026-10-19-uiux-system-coverage.md
- ${root}/docs/reviews/2026-10-19-uiux-system-repair-plan.md
- ${root}/docs/planning/STATUS.json (uiuxAudit20261019; FR-12/S11 still IN_REVIEW)

Evidence index and final gate: ${root}/var/uiux-audit-2026-10-19/final-verification.json and browser-ledger.json. Fixture IDs and final state: fixture-final-receipt.json in the same directory. Preserve those fixtures and historical evidence; do not delete/reset them for cleanup. Audit-generated docs and evidence are uncommitted, alongside substantial earlier work.

There are 13 stable UX findings and 12 source-risk groups, not a claim every control has failed or passed. The coverage matrix has 92 route/variant/component/adapter entries, not 92 distinct screens. Existing focused component tests passed78/78; no new coverage measurement or all-UI claim. Actual upload remains tool-limited despite the user confirming the extension setting is on; do not blame the user or bypass browser settings. Report download browser wait timed out, while HTTP byte proof is separate. Live AI/OAuth, physical touch, AT,200%zoom and several button/state journeys remain NOT_RUN.

The user answered the archive-policy question: ADMIN may explicitly confirm a reasoned exception for retained legacy cycles/retests blocking project archive, preserving history. Do not ask again; do not broaden this to other blockers. See UX-002/RX-02 for precise limits. This policy is documented only, not implemented.

Next session: follow the user's next instruction. If implementation is assigned, start with RX-01 or the requested repair, reproduce the behavioral failure first, then keep tests and real route/browser verification scoped. Do not restart the roadmap automatically. Do not commit/push/merge/deploy unless separately requested. If only reporting is requested, use these docs and keep gaps visible.

## Suggested skills

Read SKILL.md for using-superpowers, implement and executing-plans when execution is authorized; frontend-ui-engineering and frontend-patterns for modal/state/navigation; api-design and security-review for archive/capability/conflict boundaries; tdd or test-driven-development as one behavioral RED→GREEN loop; e2e-testing plus verification-before-completion for evidence; requesting-code-review/receiving-code-review for independent review. Use impeccable Operate only for measured UI refinements, preserving the existing system. Read AGENTS/RTK and planning context first.

Browser audit sessions were logged out and the temporary viewport reset; no tab needs to survive this reporting task. Current services were left running. Revalidate identities/source/runtime before a later test; prior endpoint/port evidence is not permanent configuration truth.
`;
fs.writeFileSync(target,text,{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'handoff-location.json'),JSON.stringify({path:target,sensitiveValuesIncluded:false,workspaceDocumentContentDuplicated:false},null,2)+'\n');
console.log(JSON.stringify({handoff:target}));
