# Guest project dashboard — approved implementation

Authority: user approved implementation on 15/11/2026 after selecting the headcount cost simulation. This replaces the earlier contract/manual-cost proposals.

Guest has read-only access to assigned projects. Navigation: Tổng quan, Tiến độ & chất lượng, Đánh Giá Chi Phí, Nhân sự, Sức khỏe & AI, Báo cáo. Responsive teal/white layout, accessible charts with numeric tables, loading/error/empty states and no stale data after project/access changes. Latest user correction: remove the “Minh bạch từ dữ liệu” sidebar card; retain modeling assumptions within the cost assessment.

Use current Feature/file/case facts and current Ticket workflow; tested includes OK/NG/P/NA, never implies acceptance. Personnel includes active members, names and project responsibilities, no personal contact data or salaries. Count each member once.

Simulation: USER weight 1, project managers (PM or ADMIN actually assigned to project) weight 5, GUEST weight 0. Base 500 simulation units per person-day. Productivity assumption 50 cases/USER/working day; management weight never multiplies productivity. Monday–Friday working calendar is a stated sample assumption. Capture daily workforce and case scope, retaining historical snapshots; no invented historical staffing. Daily targets derived from the sample model, explicitly distinct from a contractual plan. Missing historical days remain missing. No contract or actual salary data.

Charts compare observed execution, simulated plan and simulated cost. Health flags are transparent rules with evidence; missing baseline means insufficient evidence, not healthy. Red bold compact recommendations under affected charts; automatic AI label and timestamp, never fabricate an AI result if provider unavailable. Notify active project managers in-app on new/worse/reopened risk, deduplicated; no external messaging.

Official reports remain editable Markdown proposals and require explicit manager publication for guests. Existing saved reports remain readable as previously published. Editing published content requires renewed publication. Markdown supports headings/emphasis/lists/tables/quotes/code/safe links; no executable HTML or remote images. Download remains Markdown.

AI receives only the safe dashboard projection, numerical facts, assumptions and missing-data notes. Full reports cover progress, quality, simulated costs, personnel, risks/actions and limitations. Automatic advice cannot change source records.

Keep system-design, preserve existing dirty changes and migration history. Add V44. Verify on isolated MySQL before local runtime update. No commit/push requested for this task.
