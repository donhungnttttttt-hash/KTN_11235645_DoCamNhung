# FR09 browser chat numeric archive regression — R08/A17

Root observed a stray literal `0` above transcript/settings/configuration after Admin selected project156 from the AI project catalog. JDBC supplies `archived:0`; `const archived=selectedProject?.archived` used in `{archived && <p>...}` lets React render the numeric false value as a text node.

Bounded fix in AiChat.jsx: normalize this UI condition with `Boolean(selectedProject?.archived)`. No API, archive permission, business data, provider/thread or send behavior changed. Boolean true archive behavior remains covered by the existing readonly-history test.

New public AiChat test uses production catalog adapter with Admin, project156/Feature187 and numeric `archived:0`; chooses the project through Phạm vi chat, then checks settings, ordinary transcript and configuration states. It inspects only standalone `0` text nodes in the scroll region where the archive conditional appears; the legitimate composer `0/2000` counter is explicitly retained. It also verifies the archived notice is absent.

RED at02:26:33: one actual unexpected direct text node (1 expected0), new test fails; other48 cases were deliberately filtered, not counted as skipped acceptance. One-line Boolean fix; combined AiChat/AiConnections and three navigation suites **90/90PASS across5files** at02:26:43. Build PASS1696modules, JS454.48kB/CSS159.68kB; scoped diff check PASS. Coverage not rerun in this bounded follow-up. Root's post-modal full974/105files/coverage was before this tiny archive fix and separate ProjectAccessNotice copy change; no new full-suite count invented here.

Skills: tdd-workflow for observed public RED→GREEN; frontend-patterns for normalizing data used by a JSX condition; security-review for preserving archive/send policy; verification-loop for explicit scoped/full/browser evidence separation. No browser, Maven, DB, provider call or source beyond the assigned AI files changed by this agent. Source frozen again after scoped GREEN/build; root owns actual browser recheck and any final consolidated run.
